import type { Design } from "./types";
import { importDesignCopies } from "./backup";
import { withDesignStar } from "./stars";

export const TRASH_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
export const isTrashed = (design: Design) => design.trashedAt !== undefined;
export const trashExpired = (design: Design, now = Date.now()) => isTrashed(design) && now - design.trashedAt! >= TRASH_RETENTION_MS;
export type TrashTarget = { id: string; trashedAt: number };

export function renameDesign(library: Design[], id: string, name: string, now = Date.now()): Design[] {
  const title = name.trim();
  if (!title) throw Error("Enter a name for your design.");
  return library.map(design => design.id === id && !isTrashed(design) && design.name !== title ? { ...design, name: title, updatedAt: now } : design);
}

export function duplicateDesign(library: Design[], id: string): Design[] {
  const original = library.find(design => design.id === id && !isTrashed(design));
  if (!original) return library;
  return importDesignCopies(library, [{ ...withDesignStar(original, false), name: `Copy of ${original.name}` }]);
}

export function trashDesign(library: Design[], id: string, now = Date.now()): Design[] {
  return library.map(design => design.id === id && !isTrashed(design) ? { ...design, trashedAt: now } : design);
}

export function restoreDesign(library: Design[], target: TrashTarget, now = Date.now()): Design[] {
  return library.map(design => {
    if (design.id !== target.id || design.trashedAt !== target.trashedAt || trashExpired(design, now)) return design;
    const restored = { ...design, updatedAt: now };
    delete restored.trashedAt;
    return restored;
  });
}

/** Delete only the trashed versions the user saw in the confirmation dialog. */
export function deleteTrashedDesigns(library: Design[], targets: TrashTarget[]): Design[] {
  const selected = new Map(targets.map(target => [target.id, target.trashedAt]));
  return library.filter(design => !isTrashed(design) || selected.get(design.id) !== design.trashedAt);
}

/** Local retention is enforced while the library is open, never by a server. */
export function pruneExpiredTrash(library: Design[], now = Date.now()): Design[] {
  const retained = library.filter(design => !trashExpired(design, now));
  return retained.length === library.length ? library : retained;
}
