import type { Design, Page } from "./types";
import { copyElements } from "./groups";
import { designPages, MAX_PAGES } from "./pages";
import { touch, uid } from "./ops";

export type ProjectPagePlacement = "replace" | "add";
export const PROJECT_PAGE_DRAG_TYPE = "application/x-canvaisdead-project-pages";
export function readProjectPageDrag(text: string): { designId: string; pageIds: string[] } | null {
  if (!text || text.length > 64_000) return null;
  try {
    const value = JSON.parse(text);
    return value && typeof value.designId === "string" && value.designId.length > 0 && Array.isArray(value.pageIds) && value.pageIds.length > 0 && value.pageIds.length <= MAX_PAGES && value.pageIds.every((id: unknown) => typeof id === "string" && id.length > 0) && new Set(value.pageIds).size === value.pageIds.length ? { designId: value.designId, pageIds: value.pageIds } : null;
  } catch { return null; }
}
export const emptyProjectPage = (page: Page) => !page.els.length && !page.title.trim() && !page.notes?.trim() && ["#fff", "#ffffff", "white"].includes(page.bg.toLowerCase());

/** Independent editable pages; source order and destination identity are retained. */
export function copyProjectPages(destination: Design, source: Design, pageIds: readonly string[], targetId: string, placement: ProjectPagePlacement, newId = uid) {
  const existing = designPages(destination), available = designPages(source), selected = new Set(pageIds);
  const targetIndex = existing.findIndex(page => page.id === targetId), pages = available.filter(page => selected.has(page.id));
  if (destination.trashedAt !== undefined || source.trashedAt !== undefined || targetIndex < 0 || !pages.length || pages.length !== pageIds.length) throw Error("These pages are no longer available. Choose them again in Projects.");
  if (existing.length + pages.length - (placement === "replace" ? 1 : 0) > MAX_PAGES) throw Error(`Designs can have up to ${MAX_PAGES} pages. Choose fewer pages or remove a page first.`);
  const used = new Set([...existing, ...available].flatMap(page => [page.id, ...page.els.flatMap(element => [element.id, ...(element.groupPath ?? [])])]));
  const fresh = (prefix: string) => {
    for (let attempt = 0; attempt < 100; attempt++) { const id = newId(prefix); if (id && !used.has(id)) { used.add(id); return id; } }
    throw Error("Could not create independent page identifiers. Try again.");
  };
  const mapping = new Map(pages.map((page, index) => [page.id, placement === "replace" && index === 0 ? targetId : fresh("p")]));
  const scale = Math.min(destination.w / source.w, destination.h / source.h), dx = (destination.w - source.w * scale) / 2, dy = (destination.h - source.h * scale) / 2;
  let removedLinks = 0;
  const copies = pages.map(page => ({ ...page, id: mapping.get(page.id)!, els: copyElements(page.els, () => fresh("e"), () => fresh("g")).map(element => {
    const next = { ...element, x: element.x * scale + dx, y: element.y * scale + dy, w: element.w * scale, h: element.h * scale, strokeWidth: element.strokeWidth * scale, radius: element.radius * scale,
      ...(element.type === "text" || element.fontSize !== undefined ? { fontSize: (element.fontSize ?? 32) * scale } : {}) };
    if (element.link?.kind === "url") next.link = { ...element.link };
    if (element.link?.kind === "page") {
      const originalTarget = element.link.pageId, mapped = mapping.get(originalTarget);
      if (mapped) next.link = { kind: "page", pageId: mapped };
      else if (source.id === destination.id && existing.some(page => page.id === originalTarget)) next.link = { ...element.link };
      else { delete next.link; removedLinks++; }
    }
    return next;
  }) }));
  const next = [...existing]; next.splice(targetIndex + (placement === "add" ? 1 : 0), placement === "replace" ? 1 : 0, ...copies);
  const design: Design = touch({ id: destination.id, name: destination.name, w: destination.w, h: destination.h, updatedAt: destination.updatedAt,
    ...(destination.starred !== undefined ? { starred: destination.starred } : {}), pages: next });
  return { design, pageIds: copies.map(page => page.id), removedLinks };
}
