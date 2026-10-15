import { describe, expect, it, vi } from "vitest";
import { createDesignStore } from "@/lib/design/local-store";
import { DesignConflict, type DesignRecord, type DesignRepository } from "@/lib/design/repository";
import { blankDesign, makeEl } from "@/lib/design/ops";
import { copyGuestDesigns, guestDesignStorage } from "@/lib/design/guest-handoff";
import { parseDesignBackup, serializeDesignBackup } from "@/lib/design/backup";
import { createPresentationReader } from "@/lib/design/presentation";

const deferred = <T>() => { let resolve!: (value: T) => void, reject!: (error: unknown) => void; const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const design = (name = "Original") => blankDesign({ w: 800, h: 600 }, name);
function fixture() {
  const records = new Map<string, DesignRecord>(), writes = vi.fn(); let revision = 0;
  const repository: DesignRepository = {
    read: async owner => records.get(owner) ?? { revision: null, value: [], legacy: null },
    write: async (owner, expected, value) => {
      if ((records.get(owner)?.revision ?? null) !== expected.revision) throw new DesignConflict();
      const next = { revision: String(++revision), value }; records.set(owner, next); writes(owner, value); return next;
    },
  };
  return { records, writes, repository };
}
describe("asynchronous device-local design persistence", () => {
  it("does not expose a successful save until commit, and coalesces edits made while a write is pending", async () => {
    const f = fixture(), gate = deferred<void>(), started = deferred<void>(), write = f.repository.write;
    let calls = 0; f.repository.write = async (...args) => { if (++calls === 1) { started.resolve(); await gate.promise; } return write(...args); };
    const store = createDesignStore("one", f.repository); await store.load(); const d = design();
    let finished = false; const first = store.set([d]).then(saved => { finished = true; return saved; }); await started.promise;
    const second = store.set(previous => [{ ...previous[0], name: "Intermediate" }]), third = store.set(previous => [{ ...previous[0], name: "Latest" }]);
    expect(finished).toBe(false); expect(store.getSnapshot()).toMatchObject({ status: "saving", value: [{ name: "Latest" }] }); expect(f.records.size).toBe(0);
    gate.resolve(); expect(await Promise.all([first, second, third])).toEqual([true, true, true]);
    expect(f.writes).toHaveBeenCalledTimes(2); expect(f.records.get("one")!.value[0].name).toBe("Latest"); expect(store.getSnapshot().status).toBe("saved");
  });
  it("retains the latest edits on failure and retries the same design without duplicating it", async () => {
    const f = fixture(), write = f.repository.write; let full = true;
    f.repository.write = async (...args) => { if (full) throw new DOMException("full", "QuotaExceededError"); return write(...args); };
    const store = createDesignStore("one", f.repository); await store.load(); const d = design();
    expect(await store.set([d])).toBe(false); expect(store.getSnapshot()).toMatchObject({ status: "unsaved", value: [d] }); expect(f.records.size).toBe(0);
    full = false; expect(await store.retry()).toBe(true); expect(f.records.get("one")!.value).toEqual([d]); expect(f.writes).toHaveBeenCalledTimes(1);
  });
  it("fails closed after read errors and retries without replacing unreadable data", async () => {
    const f = fixture(), read = f.repository.read; f.records.set("one", { revision: "a", value: [design()] });
    f.repository.read = async () => { throw Error("unavailable"); };
    const store = createDesignStore("one", f.repository); expect(await store.load()).toBe(false); expect(await store.set([])).toBe(false); expect(f.writes).not.toHaveBeenCalled();
    f.repository.read = read; expect(await store.retry()).toBe(true); expect(store.getSnapshot().value).toEqual(f.records.get("one")!.value);
  });
  it("rejects stale tab writes and retains both saved and unsaved versions for recovery", async () => {
    const f = fixture(), a = createDesignStore("one", f.repository), b = createDesignStore("one", f.repository); await Promise.all([a.load(), b.load()]);
    const one = design("First tab"), two = design("Second tab"); expect(await a.set([one])).toBe(true); expect(await b.set([two])).toBe(false);
    expect(b.getSnapshot()).toMatchObject({ status: "conflict", value: [two] }); expect(await b.retry()).toBe(false); expect(f.records.get("one")!.value).toEqual([one]);
    expect(await b.set([{ ...two, name: "More edits retained" }])).toBe(false); expect(b.getSnapshot().value[0].name).toBe("More edits retained");
  });
  it("ignores obsolete background checks and does not adopt a different tab's library over an open editor", async () => {
    const f = fixture(), store = createDesignStore("one", f.repository); await store.load(); const gate = deferred<DesignRecord>(), read = f.repository.read;
    f.repository.read = () => gate.promise; const check = store.check(); const d = design(); await store.set([d]); gate.resolve({ revision: null, value: [], legacy: null }); await check;
    expect(store.getSnapshot()).toMatchObject({ status: "saved", value: [d] });
    f.repository.read = read; f.records.set("one", { revision: "external", value: [design("Other tab")] }); await store.check();
    expect(store.getSnapshot()).toMatchObject({ status: "conflict", value: [d] });
  });
  it("isolates accounts, skips identical updates, and separates notification errors from successful writes", async () => {
    const f = fixture(), one = createDesignStore("one", f.repository, () => { throw Error("BroadcastChannel denied"); }), two = createDesignStore("two", f.repository);
    await Promise.all([one.load(), two.load()]); const d = design(); expect(await one.set([d])).toBe(true); expect(await one.set(previous => [...previous])).toBe(true);
    expect(f.writes).toHaveBeenCalledTimes(1); expect(two.getSnapshot().value).toEqual([]); expect(await one.set([d, d])).toBe(false);
  });
  it("persists a 50 MiB original through reload, backup import and presentation without downsampling", async () => {
    const f = fixture(), d = design();
    const bytes = Buffer.alloc(50 * 1024 * 1024, 23), src = `data:image/png;base64,${bytes.toString("base64")}`;
    d.els = [makeEl("image", d, { src, w: 800, h: 400 })];
    const store = createDesignStore("one", f.repository); await store.load(); expect(await store.set([d])).toBe(true);
    const reload = createDesignStore("one", f.repository); await reload.load(); expect(reload.getSnapshot().value[0]).toEqual(d);
    const backup = serializeDesignBackup(reload.getSnapshot().value); expect(new Blob([backup]).size).toBeGreaterThan(50 * 1024 * 1024);
    const recovered = parseDesignBackup(backup); expect(recovered[0]).toEqual(d);
    const presentation = createPresentationReader(d.id, () => f.repository.read("one")); await presentation.read(); expect(presentation.getSnapshot().design).toEqual(d);
    // This checks encoded-byte capacity, not browser image decoding or IndexedDB quotas.
  }, 30_000);
  it("copies saved and pending guest versions only after account commit and retries idempotently", async () => {
    const f = fixture(), handoff = { guestId: "g_abcdefghijklmno", accountId: "one" }, d = design("Saved guest");
    f.records.set(handoff.guestId, { revision: "guest", value: [d] });
    const memory = { value: [{ ...d, name: "Pending guest" }], status: "saving" as const };
    const copied = await copyGuestDesigns(guestDesignStorage(f.repository), handoff, owner => owner === handoff.guestId ? memory : undefined);
    expect(copied.copied).toBe(2); expect(f.records.get("one")!.value.map(d => d.name)).toEqual(["Saved guest", "Pending guest"]);
    expect((await copyGuestDesigns(guestDesignStorage(f.repository), handoff, owner => owner === handoff.guestId ? memory : undefined)).copied).toBe(0);
    expect(f.records.get(handoff.guestId)!.value).toEqual([d]);
  });
  it("ignores a presentation read that completes after live updates are cancelled", async () => {
    const gate = deferred<DesignRecord>(), d = design(), reader = createPresentationReader(d.id, () => gate.promise);
    const work = reader.read(); reader.cancel(); gate.resolve({ revision: "one", value: [d] }); await work; expect(reader.getSnapshot().design).toBeNull();
  });
  it("does not acknowledge a guest handoff when account edits become pending during the commit", async () => {
    const f = fixture(), handoff = { guestId: "g_abcdefghijklmno", accountId: "one" }, d = design("Guest");
    f.records.set(handoff.guestId, { revision: "guest", value: [d] });
    const write = f.repository.write; let editing = false;
    f.repository.write = async (...args) => { const saved = await write(...args); editing = true; return saved; };
    await expect(copyGuestDesigns(guestDesignStorage(f.repository), handoff, owner => owner === "one" && editing ? { status: "saving", value: [design("New account work")] } : undefined)).rejects.toThrow("account has unsaved edits");
    expect(f.records.get("one")!.value[0].name).toBe("Guest"); expect(f.records.get(handoff.guestId)!.value).toEqual([d]);
  });
});
