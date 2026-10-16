import { describe, expect, it, vi } from "vitest";
import { copyGuestUploads, guestUploadReceipt, transferGuestWorkspace } from "@/lib/uploads/guest-handoff";
import { createUploadStore } from "@/lib/uploads/store";
import { changeUpload, UPLOAD_RETENTION_MS, type Upload } from "@/lib/uploads/model";
import type { UploadReceipt, UploadTransferRepository } from "@/lib/uploads/repository";

const handoff = { guestId: "g_abcdefghijklmno", accountId: "account-one" };
const asset = (id = "a", name = "Original.png"): Upload => ({ version: 1, id, name, mime: "image/png", width: 100, height: 50, createdAt: 100, updatedAt: 100, original: new Blob([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], { type: "image/png" }), thumbnail: new Blob(["preview"], { type: "image/png" }) });
const deferred = <T>() => { let resolve!: (value: T) => void; const promise = new Promise<T>(yes => { resolve = yes; }); return { promise, resolve }; };
function memory() {
  const assets = new Map<string, Upload>(), receipts = new Map<string, UploadReceipt>(); let version = 0;
  const repository: UploadTransferRepository = {
    list: async () => [...assets.values()], snapshot: async () => ({ revision: String(version), assets: [...assets.values()] }), revision: async () => String(version),
    add: async item => { assets.set(item.id, item); version++; },
    change: async targets => { for (const { id, action } of targets) { const before = assets.get(id); if (before) { const after = changeUpload(before, action); if (after) assets.set(id, after); else assets.delete(id); version++; } } },
    adopt: async (item, receipt) => { if (receipts.has(item.id)) return false; if (assets.has(item.id)) throw Error("collision"); assets.set(item.id, item); receipts.set(item.id, receipt); version++; return true; },
  };
  return { assets, receipts, repository };
}
describe("guest upload transfer", () => {
  it("copies unplaced originals and nonexpired Trash, preserving bytes, timestamps and account files", async () => {
    const source = memory(), target = memory(), original = asset(), trashed = { ...asset("b"), trashedAt: Date.now() - 1000 }, expired = { ...asset("c"), trashedAt: Date.now() - UPLOAD_RETENTION_MS - 1000 };
    for (const file of [original, trashed, expired]) await source.repository.add(file);
    await target.repository.add(asset("existing")); const progress = vi.fn();
    const result = await copyGuestUploads(handoff, source.repository, target.repository, undefined, progress);
    expect(result.copied).toBe(2); expect(source.assets.size).toBe(3); expect(target.assets.get("existing")).toBeDefined();
    const copied = [...target.assets.values()].filter(item => item.id !== "existing");
    expect(copied[0]).toMatchObject({ name: original.name, original: original.original, thumbnail: original.thumbnail, createdAt: 100 }); expect(copied[0].id).not.toBe(original.id);
    expect(copied[1].trashedAt).toBe(trashed.trashedAt); expect(progress.mock.calls).toEqual([[0, 2], [1, 2], [2, 2]]);
  });
  it("uses stable content IDs, distinguishing changed bytes, names, Trash generations and guest owners", async () => {
    const original = asset(), receipt = await guestUploadReceipt(handoff.guestId, original);
    expect(await guestUploadReceipt(handoff.guestId, { ...original })).toEqual(receipt);
    for (const changed of [{ ...original, name: "Renamed.png" }, { ...original, trashedAt: 1 }, { ...original, original: new Blob(["different"], { type: "image/png" }) }]) expect((await guestUploadReceipt(handoff.guestId, changed)).id).not.toBe(receipt.id);
    expect((await guestUploadReceipt("g_anotherguestid", original)).id).not.toBe(receipt.id);
  });
  it("keeps the guest session recoverable when either library cannot be read", async () => {
    for (const unreadable of ["source", "target"] as const) {
      const source = memory(), target = memory(), acknowledge = vi.fn(async () => {}), designs = vi.fn(async () => ({}));
      await source.repository.add(asset()); await target.repository.add(asset("account"));
      const repository = unreadable === "source" ? source.repository : target.repository, snapshot = repository.snapshot;
      repository.snapshot = async () => { throw Error("Saved uploads could not be read"); };
      await expect(transferGuestWorkspace(() => copyGuestUploads(handoff, source.repository, target.repository), designs, acknowledge)).rejects.toThrow("could not be read");
      expect(acknowledge).not.toHaveBeenCalled(); expect(designs).not.toHaveBeenCalled();
      expect([...source.assets.keys()]).toEqual(["a"]); expect([...target.assets.keys()]).toEqual(["account"]);
      repository.snapshot = snapshot;
      await transferGuestWorkspace(() => copyGuestUploads(handoff, source.repository, target.repository), designs, acknowledge);
      expect(acknowledge).toHaveBeenCalledOnce(); expect(target.assets.size).toBe(2);
    }
  });
  it("retries partial commits without overwriting renamed or permanently deleted account copies", async () => {
    const source = memory(), target = memory(); await source.repository.add(asset()); await source.repository.add(asset("b"));
    const adopt = target.repository.adopt; let full = true, calls = 0;
    target.repository.adopt = async (...args) => { if (++calls === 2 && full) throw new DOMException("Full", "QuotaExceededError"); return adopt(...args); };
    await expect(copyGuestUploads(handoff, source.repository, target.repository)).rejects.toThrow("Full"); expect(target.assets.size).toBe(1);
    const first = [...target.assets.keys()][0]; await target.repository.change([{ id: first, action: { kind: "rename", name: "Account edit.png" } }]); full = false;
    expect((await copyGuestUploads(handoff, source.repository, target.repository)).copied).toBe(1); expect(target.assets.get(first)?.name).toBe("Account edit.png");
    target.assets.delete(first); expect((await copyGuestUploads(handoff, source.repository, target.repository)).copied).toBe(0); expect(target.assets.has(first)).toBe(false);
    // This double verifies transfer contracts. The browser suite verifies real atomic receipts.
  });
  it("detects new source writes during copying and checks again before acknowledgment", async () => {
    const source = memory(), target = memory(); await source.repository.add(asset()); const adopt = target.repository.adopt;
    target.repository.adopt = async (...args) => { const copied = await adopt(...args); await source.repository.add(asset("new")); return copied; };
    await expect(copyGuestUploads(handoff, source.repository, target.repository)).rejects.toThrow("changed while copying");
    target.repository.adopt = adopt; const result = await copyGuestUploads(handoff, source.repository, target.repository);
    await source.repository.add(asset("later")); await expect(result.assertCurrent()).rejects.toThrow("changed while copying");
  });
  it("waits for active imports and blocks acknowledgment while a failed import is retained", async () => {
    const source = memory(), target = memory(), gate = deferred<void>(); let full = true;
    const prepare = async (_file: File, id: string) => { await gate.promise; if (full) throw Error("Could not decode"); return asset(id); };
    const store = createUploadStore(source.repository, prepare), work = store.enqueue([new File(["original"], "original.png")]);
    let settled = false; const waiting = store.settle().then(value => { settled = true; return value; }); await Promise.resolve(); expect(settled).toBe(false);
    gate.resolve(); await work; expect(await waiting).toBe(false); expect(store.pendingFile(store.getSnapshot().jobs[0].id)?.name).toBe("original.png");
    await expect(copyGuestUploads(handoff, source.repository, target.repository, owner => owner === handoff.guestId ? store : undefined)).rejects.toThrow("imports still need attention");
    full = false; await store.retry(store.getSnapshot().jobs[0].id);
    expect((await copyGuestUploads(handoff, source.repository, target.repository, owner => owner === handoff.guestId ? store : undefined)).copied).toBe(1);
  });
  it("waits for file-management transactions and protects pending account imports too", async () => {
    const source = memory(), target = memory(), gate = deferred<void>(); await source.repository.add(asset());
    const change = source.repository.change; source.repository.change = async targets => { await gate.promise; await change(targets); };
    const store = createUploadStore(source.repository, async (_f, id) => asset(id)); await store.load();
    const rename = store.change([{ id: "a", action: { kind: "rename", name: "Pending rename.png" } }]); expect(store.pending()).toBe(true);
    const copy = copyGuestUploads(handoff, source.repository, target.repository, owner => owner === handoff.guestId ? store : undefined);
    gate.resolve(); await rename; await copy; expect([...target.assets.values()][0].name).toBe("Pending rename.png");
    const account = createUploadStore(target.repository, async () => { throw Error("Account import failed"); }); await account.enqueue([new File(["file"], "account.png")]);
    await expect(copyGuestUploads(handoff, source.repository, target.repository, owner => owner === handoff.accountId ? account : undefined)).rejects.toThrow("imports still need attention");
  });
  it("acknowledges only after both local transfers and final validation succeed", async () => {
    const events: string[] = [], assertCurrent = vi.fn(async () => { events.push("check"); });
    expect(await transferGuestWorkspace(async () => { events.push("uploads"); return { assertCurrent }; }, async () => { events.push("designs"); return "done"; }, async () => { events.push("ack"); })).toBe("done");
    expect(events).toEqual(["uploads", "designs", "check", "ack"]);
    for (const phase of ["uploads", "designs", "check"]) {
      const ack = vi.fn(async () => {}), fail = async (name: string) => { if (name === phase) throw Error(phase); };
      await expect(transferGuestWorkspace(async () => { await fail("uploads"); return { assertCurrent: () => fail("check") }; }, () => fail("designs"), ack)).rejects.toThrow(phase); expect(ack).not.toHaveBeenCalled();
    }
  });
  it("detects a newly queued import after the copy and before the final check", async () => {
    const source = memory(), target = memory(), gate = deferred<void>(); await source.repository.add(asset());
    const store = createUploadStore(source.repository, async (_file, id) => { await gate.promise; return asset(id); });
    const copied = await copyGuestUploads(handoff, source.repository, target.repository, owner => owner === handoff.guestId ? store : undefined);
    const work = store.enqueue([new File(["later"], "later.png")]);
    await expect(copied.assertCurrent()).rejects.toThrow("imports still need attention"); gate.resolve(); await work;
    await expect(copied.assertCurrent()).rejects.toThrow("changed while copying");
  });
  it("rejects invalid identities/data and isolates notification failures from committed files", async () => {
    const source = memory(), target = memory(); await source.repository.add(asset());
    await expect(copyGuestUploads({ ...handoff, guestId: "wrong" }, source.repository, target.repository)).rejects.toThrow("Invalid");
    await expect(guestUploadReceipt(handoff.guestId, { ...asset(), version: 2 } as unknown as Upload)).rejects.toThrow("Invalid");
    expect((await copyGuestUploads(handoff, source.repository, target.repository, undefined, undefined, () => { throw Error("Message blocked"); })).copied).toBe(1);
  });
});
