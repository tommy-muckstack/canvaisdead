import type { CanvasDesign, Design, Page, PagedDesign } from "./types";
import { resizeCanvas, touch, uid } from "./ops";

export const MAX_PAGES = 350;

/** Legacy reads are deterministic and do not write or mutate stored data. */
export function designPages(design: Design): Page[] {
  return "pages" in design ? design.pages : [{ id: `${design.id}:page-1`, title: "", ...(design.notes !== undefined ? { notes: design.notes } : {}), bg: design.bg, els: design.els }];
}

export function pageCanvas(design: Design, pageId = designPages(design)[0].id): CanvasDesign {
  const page = designPages(design).find(item => item.id === pageId);
  if (!page) throw new Error("Page no longer exists.");
  return { id: design.id, name: design.name, w: design.w, h: design.h, updatedAt: design.updatedAt, bg: page.bg, els: page.els };
}

function withPages(design: Design, pages: Page[]): PagedDesign {
  return touch({ id: design.id, name: design.name, w: design.w, h: design.h, updatedAt: design.updatedAt, ...(design.trashedAt !== undefined ? { trashedAt: design.trashedAt } : {}), pages });
}

/** Merge only this page's content into the latest document, never other pages. */
export function editPage(design: Design, pageId: string, update: (page: CanvasDesign) => CanvasDesign): Design {
  const pages = designPages(design), page = pages.find(item => item.id === pageId);
  if (!page) return design;
  const current = pageCanvas(design, pageId), next = update(current);
  if (next === current || (next.bg === current.bg && next.els === current.els)) return design;
  if (!("pages" in design)) return touch({ ...design, bg: next.bg, els: next.els });
  return withPages(design, pages.map(item => item.id === pageId ? { ...item, bg: next.bg, els: next.els } : item));
}

export function addPage(design: Design, afterId: string, id = uid("p")): Design {
  const pages = designPages(design), index = pages.findIndex(page => page.id === afterId);
  if (index < 0 || pages.length >= MAX_PAGES || pages.some(page => page.id === id)) return design;
  const next = [...pages];
  next.splice(index + 1, 0, { id, title: "", bg: "#FFFFFF", els: [] });
  return withPages(design, next);
}

export function duplicatePage(design: Design, pageId: string, id = uid("p")): Design {
  const pages = designPages(design), index = pages.findIndex(page => page.id === pageId);
  if (index < 0 || pages.length >= MAX_PAGES || pages.some(page => page.id === id)) return design;
  const next = [...pages], original = pages[index];
  next.splice(index + 1, 0, { ...original, id, els: original.els.map(element => ({ ...element, id: uid() })) });
  return withPages(design, next);
}

export function deletePage(design: Design, pageId: string): Design {
  const pages = designPages(design);
  if (pages.length === 1 || !pages.some(page => page.id === pageId)) return design;
  return withPages(design, pages.filter(page => page.id !== pageId));
}

export function movePage(design: Design, pageId: string, toIndex: number): Design {
  const pages = designPages(design), from = pages.findIndex(page => page.id === pageId);
  if (from < 0 || !Number.isInteger(toIndex) || toIndex < 0 || toIndex >= pages.length || from === toIndex) return design;
  const next = [...pages], [page] = next.splice(from, 1);
  next.splice(toIndex, 0, page);
  return withPages(design, next);
}

export function titlePage(design: Design, pageId: string, title: string): Design {
  const pages = designPages(design), page = pages.find(item => item.id === pageId);
  if (!page || page.title === title) return design;
  return withPages(design, pages.map(item => item.id === pageId ? { ...item, title } : item));
}

export function resizeDesign(design: Design, w: number, h: number): Design {
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0 || (w === design.w && h === design.h)) return design;
  if (!("pages" in design)) return resizeCanvas(design, w, h);
  const pages = design.pages.map(page => ({ ...page, els: resizeCanvas(pageCanvas(design, page.id), w, h).els }));
  return { ...withPages(design, pages), w, h };
}

/** Notes are private presentation metadata, never canvas text or exported slide art. */
export function setPageNotes(design: Design, pageId: string, notes: string): Design {
  const pages = designPages(design), page = pages.find(item => item.id === pageId);
  if (!page || (page.notes ?? "") === notes) return design;
  return withPages(design, pages.map(item => item.id === pageId ? { ...item, notes } : item));
}
