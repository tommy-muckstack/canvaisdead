import { describe, expect, it } from "vitest";
import { saveArtwork, starDesign, withDesignStar } from "@/lib/design/stars";
import { blankDesign, makeEl } from "@/lib/design/ops";
import { pageCanvas } from "@/lib/design/pages";
import { duplicateDesign, restoreDesign, trashDesign } from "@/lib/design/library";
import { importDesignCopies, parseDesignBackup, serializeDesignBackup } from "@/lib/design/backup";
import { designBackupBlob, readDesignBackup } from "@/lib/design/backup-file";
import { readDesignRecords } from "@/lib/design/record-file";
import { isDesignLibrary } from "@/lib/design/validate";
import { createDesignStore } from "@/lib/design/local-store";
import { copyGuestDesigns } from "@/lib/design/guest-handoff";
import { DesignConflict, type DesignRecord, type DesignRepository } from "@/lib/design/repository";
import { safeProps } from "@/lib/analytics/taxonomy";

function design() { const d = blankDesign({ w: 800, h: 600 }, "Favorite"); return { ...d, updatedAt: 100, els: [makeEl("text", d, { text: "Artwork unchanged" })] }; }
function repository() {
  const records = new Map<string, DesignRecord>(); let sequence = 0, fail = false;
  const repo: DesignRepository = {
    read: async owner => records.get(owner) ?? { revision: null, legacy: null, value: [] },
    write: async (owner, previous, value) => {
      if (fail) throw new DOMException("full", "QuotaExceededError");
      if ((records.get(owner)?.revision ?? null) !== previous.revision) throw new DesignConflict();
      const next = { revision: String(++sequence), value }; records.set(owner, next); return next;
    },
  }; return { repo, records, fail: (value: boolean) => { fail = value; } };
}
describe("personal starred designs", () => {
  it("limits favorite analytics to the action and surface without design identifiers or names", () => {
    expect(safeProps("app_design_starred", { starred: true, origin: "editor", id: "private", name: "Private design", design: design() })).toEqual({ starred: true, origin: "editor" });
    expect(safeProps("app_design_starred", { starred: false, origin: "library" })).toEqual({ starred: false, origin: "library" });
    expect(safeProps("app_design_starred", { starred: "private-name", origin: "library" })).toBeNull();
  });
  it("changes only the chosen active design's star, preserving artwork, order and modified time", () => {
    const one = design(), two = { ...design(), id: "other" }, library = [one, two];
    const next = starDesign(library, one.id, true);
    expect(next).toEqual([{ ...one, starred: true }, two]); expect(pageCanvas(next[0]).els).toBe(one.els); expect(next[1]).toBe(two);
    expect(starDesign(next, one.id, true)[0]).toBe(next[0]); expect(starDesign(next, one.id, false)).toEqual(library);
    const trashed = trashDesign(next, one.id, 200); expect(starDesign(trashed, one.id, false)).toEqual(trashed);
    expect(restoreDesign(trashed, { id: one.id, trashedAt: 200 }, 300)[0].starred).toBe(true);
    expect(library[0]).not.toHaveProperty("starred"); expect(isDesignLibrary([{ ...one, starred: "yes" }])).toBe(false);
  });
  it("keeps current favorite metadata through old artwork history and does not resurrect Trash", () => {
    const original = design(), starred = withDesignStar(original, true), edited = { ...original, name: "Edited", updatedAt: 150 };
    expect(saveArtwork([starred], edited)[0]).toEqual({ ...edited, starred: true });
    expect(saveArtwork([original], starred)[0]).toEqual(original);
    const trash = trashDesign([starred], original.id, 200); expect(saveArtwork(trash, edited)).toEqual(trash);
    expect(duplicateDesign([starred], starred.id)[0].starred).toBeUndefined(); expect(starred.starred).toBe(true);
  });
  it("round-trips favorites in version 12 backups and recovery copies, rejecting downgrade and invalid metadata", async () => {
    const d = withDesignStar(design(), true), json = serializeDesignBackup([d]), blob = designBackupBlob([d]);
    expect(JSON.parse(json).version).toBe(12); expect(parseDesignBackup(json)).toEqual([d]); expect(await readDesignBackup(blob)).toEqual([d]);
    const [copy] = importDesignCopies([d], await readDesignBackup(blob)); expect(copy.starred).toBe(true); expect(copy.id).not.toBe(d.id);
    expect(() => parseDesignBackup(json.replace('"version": 12', '"version": 11'))).toThrow("Starred designs require");
    await expect(readDesignRecords(new Blob([(await blob.text()).replace('"version":12', '"version":11')]))).rejects.toThrow("Starred designs require");
    expect(() => parseDesignBackup(json.replace('"starred": true', '"starred": 1'))).toThrow("invalid design data");
    expect(JSON.parse(serializeDesignBackup([design()])).version).toBeLessThan(12);
  });
  it("retains failed favorites for retry and prevents stale tabs overwriting artwork", async () => {
    const f = repository(), d = design(); f.records.set("owner", { revision: "initial", value: [d] });
    const a = createDesignStore("owner", f.repo), b = createDesignStore("owner", f.repo); await Promise.all([a.load(), b.load()]);
    f.fail(true); expect(await a.set(p => starDesign(p, d.id, true))).toBe(false); expect(a.getSnapshot().status).toBe("unsaved");
    expect(f.records.get("owner")!.value).toEqual([d]); expect(a.getSnapshot().value[0].starred).toBe(true);
    f.fail(false); expect(await a.retry()).toBe(true);
    expect(await b.set(p => saveArtwork(p, { ...d, name: "Stale artwork" }))).toBe(false); expect(b.getSnapshot().status).toBe("conflict");
    expect(f.records.get("owner")!.value).toEqual([{ ...d, starred: true }]);
  });
  it("keeps account favorites isolated and copies guest favorites without replacing either library", async () => {
    const f = repository(), d = withDesignStar(design(), true), other = { ...design(), id: d.id, name: "Account original" };
    const handoff = { guestId: "g_abcdefghijklmno", accountId: "account" };
    f.records.set(handoff.guestId, { revision: "guest", value: [d] }); f.records.set(handoff.accountId, { revision: "account", value: [other] });
    const result = await copyGuestDesigns(f.repo, handoff), account = f.records.get(handoff.accountId)!.value;
    expect(account).toEqual([{ ...d, id: result.designIds.get(d.id) }, other]); expect(f.records.get(handoff.guestId)!.value).toEqual([d]);
    expect((await copyGuestDesigns(f.repo, handoff)).copied).toBe(0); expect(account[1].starred).toBeUndefined();
  });
});
