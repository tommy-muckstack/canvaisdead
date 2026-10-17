import type { CanvasDesign, El, ElementLink, Page } from "./types";
import { editableSelectionIds } from "./groups";
import { touch } from "./ops";

export const MAX_LINK_LENGTH = 4096;
/** No URL is fetched while editing, rendering, importing or exporting a link. */
export function normalizeLinkURL(input: string): string | null {
  const value = input.trim();
  // eslint-disable-next-line no-control-regex -- Controls can disguise executable schemes.
  if (!value || value.length > MAX_LINK_LENGTH || /[\x00-\x20\x7f\\]/.test(value)) return null;
  const explicit = /^[a-z][a-z\d+.-]*:/i.test(value);
  if (!explicit && (!value.includes(".") || value.startsWith("//"))) return null;
  try {
    const url = new URL(explicit ? value : `https://${value}`);
    if (!["https:", "http:", "mailto:", "tel:"].includes(url.protocol) || url.username || url.password) return null;
    if (["http:", "https:"].includes(url.protocol) ? !url.hostname : !url.pathname) return null;
    return url.href.length <= MAX_LINK_LENGTH ? url.href : null;
  } catch { return null; }
}
export function validElementLink(value: unknown): value is ElementLink {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const link = value as ElementLink;
  return link.kind === "url" ? typeof link.url === "string" && normalizeLinkURL(link.url) === link.url :
    link.kind === "page" && typeof link.pageId === "string" && link.pageId.length > 0 && link.pageId.length <= 512;
}
export function linkLabel(link: ElementLink, pages: readonly Page[]) {
  if (link.kind === "url") return link.url;
  const index = pages.findIndex(page => page.id === link.pageId);
  return index < 0 ? "Page unavailable" : `Page ${index + 1}${pages[index].title ? `: ${pages[index].title}` : ""}`;
}
export function setElementLinks(design: CanvasDesign, ids: readonly string[], link: ElementLink | null): CanvasDesign {
  if (link !== null && !validElementLink(link)) return design;
  const editable = new Set(editableSelectionIds(design.els, ids)); let changed = false;
  const els = design.els.map(element => {
    if (!editable.has(element.id) || JSON.stringify(element.link ?? null) === JSON.stringify(link)) return element;
    changed = true; const next = { ...element };
    if (link) next.link = { ...link }; else delete next.link;
    return next;
  });
  return changed ? touch({ ...design, els }) : design;
}
/** Copy page references together with their page IDs; unavailable targets stay explicit. */
export function remapElementLinks(elements: El[], pages: ReadonlyMap<string, string>): El[] {
  return elements.map(element => element.link?.kind === "page" && pages.has(element.link.pageId) ?
    { ...element, link: { kind: "page", pageId: pages.get(element.link.pageId)! } } : element);
}
