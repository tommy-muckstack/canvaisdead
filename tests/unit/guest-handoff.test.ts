import { afterEach, describe, expect, it, vi } from "vitest";
import { copyGuestDesigns, designStorageKey, handoffDestination } from "@/lib/design/guest-handoff";
import { blankDesign, makeEl } from "@/lib/design/ops";
import { createLocalStore } from "@/lib/local-store";
import { isDesignLibrary } from "@/lib/design/validate";
import { acknowledgeGuestHandoff, readGuestHandoff, HANDOFF_ACCOUNT_HEADER, HANDOFF_GUEST_HEADER } from "@/lib/isdead-auth/handoff";
import { newGuestId, signGuest, verifyGuest } from "@/lib/isdead-auth/server";
import type { Design } from "@/lib/design/types";

const handoff = { guestId: "g_abcdefghijklmno", accountId: "account-one" };
const sourceKey = designStorageKey(handoff.guestId), targetKey = designStorageKey(handoff.accountId);
function fixture(source: Design[] = [blankDesign({ w: 800, h: 600 })], target: Design[] = []) {
  const values = new Map([[sourceKey, JSON.stringify(source)], [targetKey, JSON.stringify(target)]]);
  const storage = { getItem: vi.fn((key: string) => values.get(key) ?? null), setItem: vi.fn((key: string, value: string) => { values.set(key, value); }) };
  return { source, target, values, storage, saved: () => JSON.parse(values.get(targetKey)!) as Design[] };
}
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("guest designs remain local across sign-in", () => {
  it("copies every page, note and embedded image, preserving both libraries and account IDs", async () => {
    const image = makeEl("image", { w: 800, h: 600 }, { src: "data:image/png;base64,YWJjZA==" });
    const source: Design = { id: "same-id", name: "Guest deck", w: 800, h: 600, updatedAt: 1, pages: [
      { id: "one", title: "First", bg: "#fff", notes: "Private notes", els: [image] },
      { id: "two", title: "Second", bg: "#ff0", els: [] },
    ] };
    const existing = { ...blankDesign({ w: 100, h: 100 }), id: "same-id", name: "Account original" };
    const f = fixture([source], [existing]), original = f.values.get(sourceKey);
    const result = await copyGuestDesigns(f.storage, handoff);
    expect(result.copied).toBe(1);
    expect(f.saved()).toEqual([{ ...source, id: result.designIds.get(source.id) }, existing]);
    expect(f.values.get(sourceKey)).toBe(original);
    expect(f.storage.setItem).toHaveBeenCalledTimes(1);
    expect(f.storage.setItem.mock.calls[0][0]).toBe(targetKey);
    expect(result.designIds.get(source.id)).not.toBe(source.id);
  });

  it("retries without duplication or replacing later edits to imported copies", async () => {
    const f = fixture();
    await copyGuestDesigns(f.storage, handoff);
    f.values.set(targetKey, JSON.stringify(f.saved().map(design => ({ ...design, name: "Edited in account" }))));
    const result = await copyGuestDesigns(f.storage, handoff);
    expect(result.copied).toBe(0);
    expect(f.saved()).toHaveLength(1);
    expect(f.saved()[0].name).toBe("Edited in account");
    expect(f.storage.setItem).toHaveBeenCalledTimes(1);
  });

  it("canonicalizes JSON property ordering and keeps newer guest versions as separate copies", async () => {
    const f = fixture();
    await copyGuestDesigns(f.storage, handoff);
    const reversed = Object.fromEntries(Object.entries(f.source[0]).reverse());
    f.values.set(sourceKey, JSON.stringify([reversed]));
    expect((await copyGuestDesigns(f.storage, handoff)).copied).toBe(0);
    f.values.set(sourceKey, JSON.stringify([{ ...reversed, name: "New guest edit" }]));
    expect((await copyGuestDesigns(f.storage, handoff)).copied).toBe(1);
    expect(f.saved()).toHaveLength(2);
  });

  it("retains unsaved/conflicting in-memory versions as well as the saved guest library", async () => {
    const f = fixture();
    const store = createLocalStore(sourceKey, [], () => f.storage, isDesignLibrary);
    store.load();
    f.values.set(sourceKey, JSON.stringify([{ ...f.source[0], name: "Other tab's saved version" }]));
    store.set([{ ...f.source[0], name: "This tab's unsaved edits" }]);
    expect(store.getSnapshot().status).toBe("conflict");
    const result = await copyGuestDesigns(f.storage, handoff, ns => ns === handoff.guestId ? store.getSnapshot() : undefined);
    expect(f.saved().map(design => design.name)).toEqual(["Other tab's saved version", "This tab's unsaved edits"]);
    expect(result.designIds.get(f.source[0].id)).toBe(f.saved()[1].id);
    expect(store.getSnapshot().status).toBe("conflict");
  });

  it.each(["source", "target"])("preserves corrupt %s storage instead of replacing it", async which => {
    const f = fixture();
    f.values.set(which === "source" ? sourceKey : targetKey, "{broken");
    const before = [...f.values];
    await expect(copyGuestDesigns(f.storage, handoff)).rejects.toThrow("could not be read");
    expect([...f.values]).toEqual(before);
    expect(f.storage.setItem).not.toHaveBeenCalled();
  });

  it("rejects ambiguous duplicate design IDs", async () => {
    const f = fixture();
    f.values.set(sourceKey, JSON.stringify([f.source[0], { ...f.source[0], name: "Other" }]));
    await expect(copyGuestDesigns(f.storage, handoff)).rejects.toThrow("could not be read");
    expect(f.storage.setItem).not.toHaveBeenCalled();
  });

  it("keeps both originals on quota failure and succeeds after storage becomes available", async () => {
    const f = fixture(), before = [...f.values];
    f.storage.setItem.mockImplementationOnce(() => { throw new DOMException("Storage full", "QuotaExceededError"); });
    await expect(copyGuestDesigns(f.storage, handoff)).rejects.toThrow("Browser storage could not save");
    expect([...f.values]).toEqual(before);
    expect((await copyGuestDesigns(f.storage, handoff)).copied).toBe(1);
  });

  it("never writes after a denied read", async () => {
    const f = fixture();
    f.storage.getItem.mockImplementation(() => { throw new Error("Storage denied"); });
    await expect(copyGuestDesigns(f.storage, handoff)).rejects.toThrow("Browser storage is unavailable");
    expect(f.storage.setItem).not.toHaveBeenCalled();
  });

  it("detects guest changes during hashing and reads current account data after hashing", async () => {
    const f = fixture();
    const first = copyGuestDesigns(f.storage, handoff);
    f.values.set(sourceKey, JSON.stringify([{ ...f.source[0], name: "Changed while copying" }]));
    await expect(first).rejects.toThrow("changed while copying");
    expect(f.storage.setItem).not.toHaveBeenCalled();
    const second = copyGuestDesigns(f.storage, handoff);
    const account = { ...blankDesign({ w: 500, h: 500 }), name: "New account design" };
    f.values.set(targetKey, JSON.stringify([account]));
    await second;
    expect(f.saved()).toContainEqual(account);
  });

  it("does not discard pending account edits during a full-page navigation", async () => {
    const f = fixture();
    await expect(copyGuestDesigns(f.storage, handoff, ns => ns === handoff.accountId ? { value: [], status: "unsaved" } : undefined)).rejects.toThrow("account has unsaved edits");
    expect(f.storage.setItem).not.toHaveBeenCalled();
  });

  it("detects newly changed in-memory guest edits before writing", async () => {
    const f = fixture();
    let memory = { value: [{ ...f.source[0], name: "Pending" }], status: "unsaved" as const };
    const work = copyGuestDesigns(f.storage, handoff, ns => ns === handoff.guestId ? memory : undefined);
    memory = { ...memory, value: [{ ...f.source[0], name: "Newer pending" }] };
    await expect(work).rejects.toThrow("changed while copying");
    expect(f.storage.setItem).not.toHaveBeenCalled();
  });

  it("gives a recoverable error when secure-context hashing is unavailable", async () => {
    const f = fixture();
    vi.stubGlobal("crypto", undefined);
    await expect(copyGuestDesigns(f.storage, handoff)).rejects.toThrow("HTTPS");
    expect(f.storage.setItem).not.toHaveBeenCalled();
  });

  it("does not write for empty guest libraries or touch unrelated account storage", async () => {
    const f = fixture([]);
    f.values.set("canvaisdead:someone-else:designs", "untouched");
    expect((await copyGuestDesigns(f.storage, handoff)).copied).toBe(0);
    expect(f.storage.setItem).not.toHaveBeenCalled();
    expect(f.values.get("canvaisdead:someone-else:designs")).toBe("untouched");
  });

  it("rewrites only the copied design ID in the editor/presenter return path", () => {
    const ids = new Map([["old id", "new-id"]]);
    expect(handoffDestination("/canvaisdead/app/design/old%20id/present?mode=presenter&page=2", ids)).toBe("/canvaisdead/app/design/new-id/present?mode=presenter&page=2");
    expect(handoffDestination("/canvaisdead/app/projects", ids)).toBe("/canvaisdead/app/projects");
    expect(handoffDestination("/canvaisdead/app/design/%bad", ids)).toBe("/canvaisdead/app/design/%bad");
  });
});

describe("verified guest handoff protocol", () => {
  it("acknowledges only identity metadata with same-origin credentials and no design body", async () => {
    vi.useFakeTimers();
    const send = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 204 }));
    await acknowledgeGuestHandoff("/canvaisdead/api/session/guest", handoff, send);
    expect(send).toHaveBeenCalledWith("/canvaisdead/api/session/guest", expect.objectContaining({ method: "DELETE", credentials: "same-origin", headers: {
      [HANDOFF_GUEST_HEADER]: handoff.guestId, [HANDOFF_ACCOUNT_HEADER]: handoff.accountId,
    } }));
    expect(send.mock.calls[0][1]?.body).toBeUndefined();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("surfaces account-change errors and clears its timeout", async () => {
    vi.useFakeTimers();
    const send = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ error: "The signed-in account changed. Reload to continue safely." }, { status: 409 }));
    await expect(acknowledgeGuestHandoff("/guest", handoff, send)).rejects.toThrow("account changed");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("aborts stalled acknowledgment so the user can retry", async () => {
    vi.useFakeTimers();
    const send = vi.fn<typeof fetch>().mockImplementation((_url, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
    }));
    const result = expect(acknowledgeGuestHandoff("/guest", handoff, send)).rejects.toThrow("confirmation timed out");
    await vi.advanceTimersByTimeAsync(15_000);
    await result;
    expect(send.mock.calls[0][1]?.signal?.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("keeps network failures separate from successful authentication", async () => {
    const send = vi.fn<typeof fetch>().mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(acknowledgeGuestHandoff("/guest", handoff, send)).rejects.toThrow("designs were copied locally");
  });

  it("handles optional headers, encoded account IDs and rejects partial/invalid receipts", () => {
    expect(readGuestHandoff(new Headers())).toBeNull();
    const headers = new Headers({ [HANDOFF_GUEST_HEADER]: handoff.guestId, [HANDOFF_ACCOUNT_HEADER]: encodeURIComponent("user/with spaces") });
    expect(readGuestHandoff(headers)).toEqual({ guestId: handoff.guestId, accountId: "user/with spaces" });
    headers.delete(HANDOFF_ACCOUNT_HEADER);
    expect(() => readGuestHandoff(headers)).toThrow("could not be confirmed");
    headers.set(HANDOFF_ACCOUNT_HEADER, "%invalid");
    expect(() => readGuestHandoff(headers)).toThrow("could not be confirmed");
  });

  it("verifies signed guest cookies and safely rejects Unicode/tampered signatures", () => {
    vi.stubEnv("AUTH_SECRET", "test-only-guest-handoff-key");
    const id = newGuestId(), signed = signGuest(id);
    expect(verifyGuest(signed)).toBe(id);
    expect(verifyGuest(signed.slice(0, -1) + "é")).toBeNull();
    expect(verifyGuest(signed + "x")).toBeNull();
    expect(verifyGuest(signGuest("invalid-id"))).toBeNull();
    expect(verifyGuest(undefined)).toBeNull();
  });
});
