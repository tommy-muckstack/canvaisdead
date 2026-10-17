import type { Design } from "./types";

/** Organization metadata never changes artwork timestamps or undo history. */
export function withDesignStar<T extends Design>(design: T, starred: boolean): T {
  if (!!design.starred === starred) return design;
  const next = { ...design };
  if (starred) next.starred = true; else delete next.starred;
  return next;
}
export function starDesign(library: Design[], id: string, starred: boolean): Design[] {
  return library.map(design => design.id === id && design.trashedAt === undefined ? withDesignStar(design, starred) : design);
}
/** Artwork history may hold older metadata; retain the current account's star. */
export function saveArtwork(library: Design[], design: Design): Design[] {
  return library.map(item => item.id === design.id && item.trashedAt === undefined ? withDesignStar(design, !!item.starred) : item);
}
