import type { CanvasDesign, El } from "./types";
import { copyElements, editableSelectionIds, groupMembers, normalizeGroups } from "./groups";
import { parseDesignBackup } from "./backup";
import { makeEl, touch, uid, type Measure } from "./ops";
import { selectedElements, selectionBounds } from "./selection";

export const ELEMENT_CLIPBOARD_MIME = "application/x-canvaisdead-elements+json";
export const MAX_CLIPBOARD_BYTES = 50 * 1024 * 1024;
export const MAX_PASTED_TEXT = 100_000;
const MARKER = "data-canvaisdead-clipboard";
export type ElementClipboard = { format: "canvaisdead-elements"; version: 1 | 2 | 3 | 4 | 5; source: { designId: string; pageId: string }; w: number; h: number; els: El[] };
export type ClipboardFormats = { json: string; html: string; text: string };
export type PasteResult = { design: CanvasDesign; ids: string[] };
export type PastePoint = { x: number; y: number };
const invalid = () => new Error("The clipboard contains invalid or unsupported artwork.");
const bytes = (text: string, limit = MAX_CLIPBOARD_BYTES) => { if (text.length > limit || new Blob([text]).size > limit) throw new Error("Copy fewer elements. Clipboard artwork is limited to 50 MB."); };

// Transfer selected artwork only, never names, notes, account state or unknown fields.
function portableElement(e: El): El {
  const result: El = { id: e.id, type: e.type, x: e.x, y: e.y, w: e.w, h: e.h, rotation: e.rotation, opacity: e.opacity, fill: e.fill, stroke: e.stroke, strokeWidth: e.strokeWidth, radius: e.radius };
  for (const key of ["locked", "text", "fontSize", "fontFamily", "fontWeight", "italic", "underline", "strikethrough", "align", "lineHeight", "letterSpacingEm", "textAnchor", "listStyle", "src", "flipX", "flipY"] as const) {
    if (e[key] !== undefined) Object.assign(result, { [key]: e[key] });
  }
  if (e.groupPath) result.groupPath = [...e.groupPath];
  if (e.imageCrop) { const { x, y, w, h, sourceW, sourceH } = e.imageCrop; result.imageCrop = { x, y, w, h, sourceW, sourceH }; }
  return result;
}
export function canCutSelection(design: CanvasDesign, ids: readonly string[]) {
  const selected = selectedElements(design, ids);
  return selected.length > 0 && editableSelectionIds(design.els, ids).length === selected.length;
}
export function selectionClipboard(design: CanvasDesign, ids: readonly string[], pageId: string): ElementClipboard {
  const members = selectedElements(design, ids), selected = new Set(members.map(e => e.id));
  if (!members.length) throw new Error("Select an element to copy.");
  const complete = new Set(members.flatMap(e => e.groupPath ?? []).filter(id => groupMembers(design.els, id).every(member => selected.has(member))));
  const els = normalizeGroups(members.map(e => {
    const copy = portableElement(e), path = copy.groupPath?.filter(id => complete.has(id));
    if (path?.length) copy.groupPath = path; else delete copy.groupPath;
    return copy;
  }));
  return parseElementClipboard(JSON.stringify({ format: "canvaisdead-elements", version: els.some(e => e.listStyle !== undefined) ? 5 : els.some(e => e.flipX !== undefined || e.flipY !== undefined) ? 4 : els.some(e => e.letterSpacingEm !== undefined || e.textAnchor !== undefined) ? 3 : els.some(e => e.imageCrop) ? 2 : 1, source: { designId: design.id, pageId }, w: design.w, h: design.h, els }));
}
export function parseElementClipboard(raw: string): ElementClipboard {
  bytes(raw);
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw invalid(); }
  if (!value || typeof value !== "object" || !("format" in value) || value.format !== "canvaisdead-elements" || !("version" in value) || ![1, 2, 3, 4, 5].includes(value.version as number) || !("source" in value)) throw invalid();
  const packet = value as ElementClipboard, source = packet.source;
  if (!source || typeof source.designId !== "string" || !source.designId || source.designId.length > 512 || typeof source.pageId !== "string" || !source.pageId || source.pageId.length > 512 || !Array.isArray(packet.els) || !packet.els.length) throw invalid();
  try {
    // Share the portable-artwork boundary with backups: finite geometry, valid
    // groups, plain paint and embedded raster media only; never fetch a URL.
    parseDesignBackup(JSON.stringify({ format: "canvaisdead", version: packet.version === 5 ? 8 : packet.version + 2, designs: [{ id: "clipboard", name: "", w: packet.w, h: packet.h, updatedAt: 0, bg: "#fff", els: packet.els }] }));
  } catch { throw invalid(); }
  return { format: "canvaisdead-elements", version: packet.version, source: { designId: source.designId, pageId: source.pageId }, w: packet.w, h: packet.h, els: packet.els.map(portableElement) };
}
function base64(text: string) {
  const data = new TextEncoder().encode(text); let binary = "";
  for (let i = 0; i < data.length; i += 8192) binary += String.fromCharCode(...data.subarray(i, i + 8192));
  return btoa(binary);
}
function unbase64(text: string) {
  try { return new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(atob(text), c => c.charCodeAt(0))); }
  catch { throw invalid(); }
}
const escape = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
export function clipboardFormats(packet: ElementClipboard): ClipboardFormats {
  const json = JSON.stringify(packet); bytes(json);
  const text = packet.els.filter(e => e.type === "text").map(e => e.listStyle ? (e.text ?? "").split(/\r\n?|\n/).map((line, i) => `${e.listStyle === "number" ? `${i + 1}.` : "•"} ${line}`).join("\n") : e.text ?? "").join("\n") || `${packet.els.length} CanvaIsDead element${packet.els.length === 1 ? "" : "s"}`;
  return { json, text, html: `<div ${MARKER}="${base64(json)}">${escape(text).replace(/\n/g, "<br>")}</div>` };
}
/** Read our marker as data without parsing/executing foreign HTML or loading images. */
export function richClipboard(formats: { json?: string; html?: string }): ElementClipboard | null {
  if (formats.json) return parseElementClipboard(formats.json);
  if (!formats.html?.includes(MARKER)) return null;
  bytes(formats.html, MAX_CLIPBOARD_BYTES * 2);
  const encoded = formats.html.match(/data-canvaisdead-clipboard\s*=\s*(["'])([a-z0-9+/=]+)\1/i)?.[2];
  if (!encoded) throw invalid();
  return parseElementClipboard(unbase64(encoded));
}

function append(design: CanvasDesign, elements: El[]): PasteResult {
  return { design: touch({ ...design, els: [...design.els, ...elements] }), ids: elements.map(e => e.id) };
}
export function pasteElements(design: CanvasDesign, packet: ElementClipboard, options: { step?: number; at?: PastePoint; measure?: Measure } = {}): PasteResult {
  const used = new Set(design.els.flatMap(e => [e.id, ...e.groupPath ?? []]));
  const nextId = (prefix: string) => { let id = uid(prefix); while (used.has(id)) id = uid(prefix); used.add(id); return id; };
  const copies = copyElements(packet.els, () => nextId("e"), () => nextId("g")), box = selectionBounds(copies, options.measure)!;
  const step = options.step ?? 0, at = options.at ?? (design.w !== packet.w || design.h !== packet.h ? { x: design.w / 2, y: design.h / 2 } : null);
  const offset = options.at ? 0 : step * 24;
  const dx = (at ? at.x - box.x - box.w / 2 : 0) + offset, dy = (at ? at.y - box.y - box.h / 2 : 0) + offset;
  if (![box.x, box.y, box.w, box.h, dx, dy].every(Number.isFinite)) throw invalid();
  return append(design, copies.map(e => ({ ...e, x: e.x + dx, y: e.y + dy })));
}
export function pasteText(design: CanvasDesign, text: string, at?: PastePoint, measure?: Measure): PasteResult {
  if (!text.trim()) throw new Error("The clipboard has no text or supported artwork to paste.");
  if (text.length > MAX_PASTED_TEXT) throw new Error("Paste fewer than 100,000 text characters at once.");
  const element = makeEl("text", design, { text: text.replace(/\r\n?/g, "\n").replace(/\0/g, ""), lineHeight: 1.4, fontWeight: 400, fontSize: Math.max(8, Math.min(32, Math.round(Math.min(design.w, design.h) * .04))) });
  const box = selectionBounds([element], measure)!, center = at ?? { x: design.w / 2, y: design.h / 2 };
  return append(design, [{ ...element, x: center.x - box.w / 2, y: center.y - box.h / 2 }]);
}
export function pasteImages(design: CanvasDesign, images: { src: string; w: number; h: number }[], at?: PastePoint): PasteResult {
  if (!images.length) throw new Error("The clipboard has no supported images.");
  const center = at ?? { x: design.w / 2, y: design.h / 2 };
  return append(design, images.map((image, i) => {
    if (![image.w, image.h].every(n => Number.isFinite(n) && n > 0) || !/^data:image\/(?:png|jpeg|webp|gif|avif);base64,[a-z0-9+/]+={0,2}$/i.test(image.src)) throw invalid();
    const k = Math.min(1, design.w * .6 / image.w, design.h * .6 / image.h), w = image.w * k, h = image.h * k;
    return makeEl("image", design, { src: image.src, w, h, x: center.x - w / 2 + i * 24, y: center.y - h / 2 + i * 24 });
  }));
}
