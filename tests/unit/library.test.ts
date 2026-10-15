import { describe, expect, it, vi } from "vitest";
import { addEl, blankDesign, makeEl } from "@/lib/design/ops";
import { addPage, designPages, setPageNotes } from "@/lib/design/pages";
import { importDesignCopies, parseDesignBackup, serializeDesignBackup } from "@/lib/design/backup";
import { deleteTrashedDesigns, duplicateDesign, isTrashed, pruneExpiredTrash, renameDesign, restoreDesign, trashDesign, trashExpired, TRASH_RETENTION_MS } from "@/lib/design/library";
import { isDesignLibrary } from "@/lib/design/validate";
import { createLocalStore } from "@/lib/local-store";
import { createPresentationReader } from "@/lib/design/presentation";
import { eventProperties } from "@/lib/analytics/schema";

function fixture() {
  const flat = blankDesign({ w: 800, h: 600 }, "Original");
  const art = addEl(addEl(flat, makeEl("text", flat, { text: "Keep this", locked: true, rotation: 20 })), makeEl("image", flat, { src: "data:image/png;base64,AA==" }));
  const noted = setPageNotes(art, designPages(art)[0].id, "Private notes");
  return addPage(noted, designPages(noted)[0].id);
}

describe("local library actions", () => {
  it("renames only the chosen active design and rejects empty names", () => {
    const d = fixture(), other = fixture(), library = [d, other];
    const renamed = renameDesign(library, d.id, "  New title  ", 100);
    expect(renamed[0]).toEqual({ ...d, name: "New title", updatedAt: 100 });
    expect(renamed[1]).toBe(other); expect(d.name).toBe("Original");
    expect(() => renameDesign(library, d.id, "  \n")).toThrow("Enter a name");
    expect(renameDesign(library, d.id, d.name)[0]).toBe(d);
    expect(renameDesign(trashDesign(library, d.id, 0), d.id, "No")[0].name).toBe("Original");
  });

  it("duplicates every page, note, embedded image and lock without sharing mutable objects", () => {
    const d = fixture(), result = duplicateDesign([d], d.id), copy = result[0];
    expect(result[1]).toBe(d); expect(copy.id).not.toBe(d.id); expect(copy.name).toBe("Copy of Original");
    expect(copy.w).toBe(d.w); expect(copy.h).toBe(d.h);
    const pages = designPages(copy), originals = designPages(d);
    expect(pages).toHaveLength(2); expect(pages[0].id).not.toBe(originals[0].id);
    expect(pages[0].notes).toBe(originals[0].notes); expect(pages[0].els).toEqual(originals[0].els);
    pages[0].els[0].text = "Only in the copy"; pages[0].notes = "Changed";
    expect(originals[0].els[0].text).toBe("Keep this"); expect(originals[0].notes).toBe("Private notes");
    const twice = duplicateDesign(result, d.id);
    expect(new Set(twice.map(design => design.id)).size).toBe(3);
  });

  it("also duplicates legacy flat designs without dropping notes or editing the original", () => {
    const d = { ...blankDesign({ w: 400, h: 300 }), notes: "Legacy notes" };
    const result = duplicateDesign([d], d.id);
    expect(designPages(result[0])[0].notes).toBe("Legacy notes");
    expect(designPages(result[0])[0].id).not.toBe(designPages(d)[0].id);
    expect(result[1]).toBe(d);
    const trash = trashDesign([d], d.id, 0);
    expect(duplicateDesign(trash, d.id)).toBe(trash);
  });

  it("moves to Trash without losing content and restores the same id", () => {
    const d = fixture(), trashed = trashDesign([d], d.id, 1000);
    expect(isTrashed(trashed[0])).toBe(true); expect(trashed[0]).toEqual({ ...d, trashedAt: 1000 });
    expect(trashDesign(trashed, d.id, 2000)).toEqual(trashed);
    const restored = restoreDesign(trashed, { id: d.id, trashedAt: 1000 }, 3000);
    expect(restored[0]).toEqual({ ...d, updatedAt: 3000 });
    expect(designPages(restored[0])).toEqual(designPages(d));
  });

  it("expires exactly after 30 days and never expires active designs", () => {
    const d = fixture(), old = trashDesign([d], d.id, 0)[0], library = [old];
    expect(trashExpired(old, TRASH_RETENTION_MS - 1)).toBe(false);
    expect(trashExpired(old, TRASH_RETENTION_MS)).toBe(true);
    expect(pruneExpiredTrash(library, TRASH_RETENTION_MS - 1)).toBe(library);
    expect(pruneExpiredTrash([old, d], TRASH_RETENTION_MS)).toEqual([d]);
    expect(restoreDesign(library, { id: d.id, trashedAt: 0 }, TRASH_RETENTION_MS)).toEqual(library);
    expect(pruneExpiredTrash(library, -1)).toBe(library);
  });

  it("permanent deletion and Undo cannot affect restored or subsequently trashed versions", () => {
    const d = fixture(), other = fixture(), trashed = trashDesign([d, other], d.id, 0);
    const target = { id: d.id, trashedAt: 0 };
    expect(deleteTrashedDesigns(trashed, [target])).toEqual([other]);
    const restored = restoreDesign(trashed, target, 1000);
    expect(deleteTrashedDesigns(restored, [target])).toEqual(restored);
    const trashedAgain = trashDesign(restored, d.id, 2000);
    expect(deleteTrashedDesigns(trashedAgain, [target])).toEqual(trashedAgain);
    expect(restoreDesign(trashedAgain, target, 3000)).toEqual(trashedAgain);
    expect(deleteTrashedDesigns(trashed, [{ id: other.id, trashedAt: 0 }])).toEqual(trashed);
  });

  it("backs up Trash metadata but imports active copies even after expiration", () => {
    const d = fixture(), trashed = trashDesign([d], d.id, 0), parsed = parseDesignBackup(serializeDesignBackup(trashed));
    expect(parsed).toEqual(trashed);
    const result = importDesignCopies([d], parsed);
    expect(isTrashed(result[0])).toBe(false); expect(result[0].id).not.toBe(d.id);
    expect(pruneExpiredTrash(result, TRASH_RETENTION_MS * 2)).toBe(result);
    expect(result[1]).toBe(d);
  });

  it("rejects malformed Trash timestamps and ambiguous library ids before any write", () => {
    const d = fixture();
    for (const trashedAt of [-1, Infinity, NaN, "0", null]) expect(isDesignLibrary([{ ...d, trashedAt }])).toBe(false);
    expect(isDesignLibrary([{ ...d, trashedAt: 0 }])).toBe(true);
    expect(isDesignLibrary([d, { ...d }])).toBe(false);
    expect(isDesignLibrary([{ ...d, id: "" }])).toBe(false);
    const setItem = vi.fn(), store = createLocalStore("designs", [], () => ({ getItem: () => JSON.stringify([d, d]), setItem }), isDesignLibrary);
    expect(store.load()).toBe(false); expect(store.set([])).toBe(false); expect(setItem).not.toHaveBeenCalled();
  });

  it("keeps a failed copy in memory and retries without duplicating it again", () => {
    const d = fixture(); let raw = JSON.stringify([d]), full = true;
    const storage = { getItem: () => raw, setItem: (_key: string, value: string) => { if (full) throw Error("Quota"); raw = value; } };
    const store = createLocalStore("designs", [], () => storage, isDesignLibrary);
    store.load(); expect(store.set(previous => duplicateDesign(previous, d.id))).toBe(false);
    expect(JSON.parse(raw)).toEqual([d]); expect(store.getSnapshot().value).toHaveLength(2);
    const copyId = store.getSnapshot().value[0].id;
    full = false; expect(store.retry()).toBe(true);
    expect(JSON.parse(raw)[0].id).toBe(copyId); expect(JSON.parse(raw)).toHaveLength(2);
  });

  it("does not overwrite a newer saved library during deletion or expiry", () => {
    const d = fixture(), trashed = trashDesign([d], d.id, 0);
    let raw = JSON.stringify(trashed); const setItem = vi.fn((_key: string, value: string) => { raw = value; });
    const store = createLocalStore("designs", [], () => ({ getItem: () => raw, setItem }), isDesignLibrary);
    store.load(); raw = JSON.stringify([d]);
    expect(store.set(previous => pruneExpiredTrash(previous, TRASH_RETENTION_MS))).toBe(false);
    expect(store.getSnapshot().status).toBe("conflict"); expect(JSON.parse(raw)).toEqual([d]); expect(setItem).not.toHaveBeenCalled();
  });

  it("stops presenting a trashed design and can read it again after restoration", () => {
    const d = fixture(); let raw = JSON.stringify([d]);
    const reader = createPresentationReader("designs", d.id, () => ({ getItem: () => raw }));
    reader.read(); expect(reader.getSnapshot().design).toEqual(d);
    raw = JSON.stringify(trashDesign([d], d.id, 0)); reader.read(); expect(reader.getSnapshot().design).toBeNull();
    raw = JSON.stringify([d]); reader.read(); expect(reader.getSnapshot().design).toEqual(d);
  });

  it("never sends names, ids, content or Trash timestamps in lifecycle analytics", () => {
    for (const event of ["website_design_renamed", "website_design_trashed", "website_design_restored", "website_design_deleted"]) {
      expect(eventProperties(event, { name: "Private", id: "private", trashedAt: 1, design: fixture() })).toEqual({});
    }
    expect(eventProperties("website_design_created", { source: "copy", name: "Private" })).toEqual({ source: "copy" });
  });
});
