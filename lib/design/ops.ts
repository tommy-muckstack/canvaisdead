import type { CanvasDesign as Design, Design as DocumentDesign, El, ElType, SizePreset } from "./types";
import { duplicateGroupedElements, editableSelectionIds, normalizeGroups, reorderGroupedElements } from "./groups";
import { letterSpacingPixels, textAnchorFraction, validLetterSpacing, validTextAnchor } from "./text-spacing";
import { imageFlipSVG } from "./image-flip";

export const SIZES: SizePreset[] = [
  { id: "ig-post", label: "Instagram post", w: 1080, h: 1080, hint: "1080 × 1080" },
  { id: "story", label: "Story", w: 1080, h: 1920, hint: "1080 × 1920" },
  { id: "presentation", label: "Presentation", w: 1920, h: 1080, hint: "1920 × 1080" },
  { id: "poster", label: "Poster", w: 1200, h: 1800, hint: "2 : 3" },
  { id: "doc", label: "Doc (US Letter)", w: 816, h: 1056, hint: "8.5 × 11 in" },
  { id: "card", label: "Business card", w: 1050, h: 600, hint: "3.5 × 2 in" },
  { id: "yt-thumb", label: "YouTube thumbnail", w: 1280, h: 720, hint: "1280 × 720" },
  { id: "logo", label: "Logo", w: 500, h: 500, hint: "500 × 500" },
  { id: "a4", label: "A4 document", w: 794, h: 1123, hint: "210 × 297 mm" },
  { id: "portrait", label: "Instagram portrait", w: 1080, h: 1350, hint: "4 : 5" },
];
export const FONTS = [
  { label: "Jakarta Sans", css: '"IsDead Plus Jakarta Sans", system-ui, sans-serif' },
  { label: "Georgia", css: "Georgia, 'Times New Roman', serif" },
  { label: "Trebuchet", css: "'Trebuchet MS', Verdana, sans-serif" },
  { label: "Courier", css: "'Courier New', ui-monospace, monospace" },
  { label: "Impact", css: "Impact, 'Arial Narrow Bold', sans-serif" },
];
export const PALETTE = ["#0E1318", "#FFFFFF", "#7D2AE8", "#00C4CC", "#FF5757", "#FFBD59", "#5CE1E6", "#38B6FF", "#7ED957", "#FF66C4", "#8C52FF", "#C9E4DE"];

let seq = 0;
export const uid = (p = "e") => `${p}_${Date.now().toString(36)}${(seq++).toString(36)}${Math.random().toString(36).slice(2, 5)}`;

export function blankDesign(size: Pick<SizePreset, "w" | "h">, name = "Untitled design"): Design {
  return { id: uid("d"), name, w: size.w, h: size.h, bg: "#FFFFFF", els: [], updatedAt: Date.now() };
}

const base = (type: ElType): El => ({ id: uid(), type, x: 0, y: 0, w: 200, h: 200, rotation: 0, opacity: 1, fill: "#7D2AE8", stroke: "#000000", strokeWidth: 0, radius: 0 });
export function makeEl(type: ElType, d: Pick<Design, "w" | "h">, over: Partial<El> = {}): El {
  const e = base(type), s = Math.min(d.w, d.h);
  if (type === "text") Object.assign(e, { w: Math.round(d.w * 0.6), h: 0, fill: "#0E1318", text: "Add a heading", fontSize: Math.round(s * 0.08), fontFamily: FONTS[0].css, fontWeight: 700, align: "left", lineHeight: 1.2 });
  else if (type === "line") Object.assign(e, { w: Math.round(s * 0.4), h: 0, stroke: "#0E1318", strokeWidth: Math.max(4, Math.round(s * 0.006)), fill: "none" });
  else if (type === "image") Object.assign(e, { w: Math.round(s * 0.4), h: Math.round(s * 0.4) });
  else { const n = Math.round(s * 0.3); Object.assign(e, { w: n, h: n, radius: type === "rect" ? 0 : 0 }); }
  Object.assign(e, over);
  e.x = over.x ?? Math.round((d.w - e.w) / 2); e.y = over.y ?? Math.round((d.h - (e.h || (e.fontSize ?? 40) * (e.lineHeight ?? 1.2))) / 2);
  return e;
}

// ---- text layout (measure injected so it runs in node tests and in the browser) ----
export type Measure = (text: string, fontSize: number, fontFamily: string, fontWeight: number, italic?: boolean, letterSpacingEm?: number) => number;
const graphemeSegmenter = typeof Intl.Segmenter === "function" ? new Intl.Segmenter(undefined, { granularity: "grapheme" }) : null;
export const graphemes = (text: string) => graphemeSegmenter ? Array.from(graphemeSegmenter.segment(text), part => part.segment) : Array.from(text);
export const approxMeasure: Measure = (t, size, _f, weight, _italic, spacing = 0) => Math.max(0, graphemes(t).length * size * ((weight >= 700 ? 0.58 : 0.54) + spacing));
export const textDecoration = (e: Pick<El, "underline" | "strikethrough">): string =>
  [e.underline && "underline", e.strikethrough && "line-through"].filter(Boolean).join(" ") || "none";
export function wrapText(text: string, maxW: number, size: number, family: string, weight: number, measure: Measure, italic = false, letterSpacingEm = 0): string[] {
  const out: string[] = [];
  const width = Number.isNaN(maxW) ? 0 : Math.max(0, maxW);
  const fits = (value: string) => measure(value, size, family, weight, italic, letterSpacingEm) <= width;
  for (const para of text.split(/\r\n?|\n/)) {
    let line = "";
    for (const token of para.match(/[ \t]+|[^ \t]+/g) ?? []) {
      // Preserved spaces can hang at a soft line end, as in the editing textarea.
      if (/^[ \t]+$/.test(token) || fits(line + token)) { line += token; continue; }
      if (line) { out.push(line); line = ""; }
      if (fits(token)) { line = token; continue; }
      const characters = graphemes(token);
      let start = 0;
      while (start < characters.length) {
        // Use grapheme boundaries on current engines, or code points on older
        // engines without Intl.Segmenter. A single oversized glyph may overflow.
        let low = start + 1, high = characters.length, end = low;
        while (low <= high) {
          const mid = Math.floor((low + high) / 2);
          if (fits(characters.slice(start, mid).join(""))) { end = mid; low = mid + 1; }
          else high = mid - 1;
        }
        const part = characters.slice(start, end).join("");
        if (end < characters.length) out.push(part); else line = part;
        start = end;
      }
    }
    out.push(line);
  }
  return out;
}
export function textHeight(e: El, measure: Measure): number {
  const lines = wrapText(e.text ?? "", e.w, e.fontSize ?? 32, e.fontFamily ?? "", e.fontWeight ?? 400, measure, e.italic, e.letterSpacingEm);
  return Math.max(1, lines.length) * (e.fontSize ?? 32) * (e.lineHeight ?? 1.2);
}
export function elHeight(e: El, measure: Measure) { return e.type === "text" ? textHeight(e, measure) : e.type === "line" ? Math.max(e.h, e.strokeWidth) : e.h; }

// ---- immutable edits ----
export const touch = <T extends DocumentDesign>(d: T): T => ({ ...d, updatedAt: Date.now() });
export const addEl = (d: Design, e: El): Design => touch({ ...d, els: [...d.els, e] });
/** Preserve the selected text anchor when content or typography changes its height. */
export function reflowTextElement(e: El, p: Partial<El>, measure: Measure = approxMeasure): El {
  if (e.type !== "text" && (p.letterSpacingEm !== undefined || p.textAnchor !== undefined)) return e;
  if (e.locked || (p.letterSpacingEm !== undefined && !validLetterSpacing(p.letterSpacingEm)) || (p.textAnchor !== undefined && !validTextAnchor(p.textAnchor)) || (p.lineHeight !== undefined && (!Number.isFinite(p.lineHeight) || p.lineHeight <= 0))) return e;
  if (Object.entries(p).every(([key, value]) => e[key as keyof El] === value)) return e;
  const next = { ...e, ...p };
  if (e.type !== "text" || p.x !== undefined || p.y !== undefined || !["text", "w", "fontSize", "fontFamily", "fontWeight", "italic", "lineHeight", "letterSpacingEm"].some(key => key in p)) return next;
  const before = elHeight(e, measure), after = elHeight(next, measure);
  if (before === after && e.w === next.w) return next;
  const positioned = anchoredBox({ ...e, h: before }, next.w, after, { x: 0.5, y: textAnchorFraction(next) });
  return { ...next, x: positioned.x, y: positioned.y };
}
export function patchEl(d: Design, id: string, p: Partial<El>, measure: Measure = approxMeasure): Design {
  const target = d.els.find(e => e.id === id);
  if (!target || target.locked) return d;
  const next = reflowTextElement(target, p, measure);
  return next === target ? d : touch({ ...d, els: d.els.map(e => e.id === id ? next : e) });
}
export function setElementLocked(d: Design, id: string, locked: boolean): Design {
  const target = d.els.find(e => e.id === id);
  if (!target || !!target.locked === locked) return d;
  return touch({ ...d, els: d.els.map(e => e.id === id ? { ...e, locked } : e) });
}
export function removeEls(d: Design, ids: string[]): Design {
  const removable = new Set(editableSelectionIds(d.els, ids)), els = d.els.filter(e => !removable.has(e.id));
  return els.length === d.els.length ? d : touch({ ...d, els: normalizeGroups(els) });
}
export function duplicateEl(d: Design, id: string): { design: Design; id: string | null } {
  const e = d.els.find(x => x.id === id); if (!e) return { design: d, id: null };
  const result = duplicateGroupedElements(d, [id], () => uid());
  return { design: result.design, id: result.ids[0] };
}
export type Z = "front" | "back" | "forward" | "backward";
export function reorder(d: Design, id: string, z: Z): Design {
  const els = reorderGroupedElements(d.els, [id], z);
  return els.every((e, i) => e === d.els[i]) ? d : touch({ ...d, els });
}
export type AlignTo = "left" | "center" | "right" | "top" | "middle" | "bottom";
export function alignEl(d: Design, id: string, a: AlignTo, measure: Measure = approxMeasure): Design {
  const e = d.els.find(x => x.id === id); if (!e) return d; const h = elHeight(e, measure);
  const p: Partial<El> = a === "left" ? { x: 0 } : a === "center" ? { x: Math.round((d.w - e.w) / 2) } : a === "right" ? { x: d.w - e.w }
    : a === "top" ? { y: 0 } : a === "middle" ? { y: Math.round((d.h - h) / 2) } : { y: d.h - h };
  return patchEl(d, id, p);
}
export function resizeCanvas(d: Design, w: number, h: number): Design {
  const sx = w / d.w, sy = h / d.h, k = Math.min(sx, sy);
  return touch({ ...d, w, h, els: d.els.map(e => ({ ...e, x: Math.round(e.x * sx), y: Math.round(e.y * sy), w: Math.round(e.w * k), h: Math.round(e.h * k), fontSize: e.fontSize ? Math.round(e.fontSize * k) : e.fontSize, strokeWidth: e.strokeWidth })) });
}

// ---- geometry ----
export type Rect = { x: number; y: number; w: number; h: number };
export function rotatePoint(px: number, py: number, cx: number, cy: number, deg: number) {
  const r = (deg * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r), dx = px - cx, dy = py - cy;
  return { x: cx + dx * c - dy * s, y: cy + dx * s + dy * c };
}
export function hitTest(d: Design, x: number, y: number, measure: Measure = approxMeasure, includeLocked = false): El | null {
  for (let i = d.els.length - 1; i >= 0; i--) {
    const e = d.els[i]; if (e.locked && !includeLocked) continue; const h = elHeight(e, measure), pad = e.type === "line" ? 8 : 0;
    const p = rotatePoint(x, y, e.x + e.w / 2, e.y + h / 2, -e.rotation);
    if (p.x >= e.x - pad && p.x <= e.x + e.w + pad && p.y >= e.y - pad && p.y <= e.y + h + pad) return e;
  }
  return null;
}
/** Snap a moving box to canvas edges/center and other elements' edges/centers within `th` px. Returns the adjusted x,y plus the guide lines hit. */
export function snapMove(d: Design, moving: Rect, ignoreId: string, th = 6, measure: Measure = approxMeasure) {
  const xs: number[] = [0, d.w / 2, d.w], ys: number[] = [0, d.h / 2, d.h];
  for (const e of d.els) if (e.id !== ignoreId) { const h = elHeight(e, measure); xs.push(e.x, e.x + e.w / 2, e.x + e.w); ys.push(e.y, e.y + h / 2, e.y + h); }
  let { x, y } = moving; const gx: number[] = [], gy: number[] = [];
  const cand = (pts: number[], o: number, size: number) => { let best: { d: number; adj: number; g: number } | null = null;
    for (const f of [0, 0.5, 1]) for (const t of pts) { const dd = t - (o + size * f); if (Math.abs(dd) <= th && (!best || Math.abs(dd) < Math.abs(best.d))) best = { d: dd, adj: dd, g: t }; } return best; };
  const bx = cand(xs, x, moving.w), by = cand(ys, y, moving.h);
  if (bx) { x += bx.adj; gx.push(bx.g); } if (by) { y += by.adj; gy.push(by.g); }
  return { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100, guides: { x: gx, y: gy } };
}
export type Handle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";
type RotatedRect = Rect & { rotation?: number };
const oppositeAnchor = (handle: Handle) => ({ x: handle.includes("w") ? 1 : handle.includes("e") ? 0 : 0.5, y: handle.includes("n") ? 1 : handle.includes("s") ? 0 : 0.5 });

/** Position new dimensions around an unchanged anchor in canvas coordinates. */
function anchoredBox(original: RotatedRect, w: number, h: number, anchor: { x: number; y: number }): Rect {
  const rotation = original.rotation ?? 0;
  const fixed = rotatePoint(original.x + original.w * anchor.x, original.y + original.h * anchor.y, original.x + original.w / 2, original.y + original.h / 2, rotation);
  const offset = rotatePoint((anchor.x - 0.5) * w, (anchor.y - 0.5) * h, 0, 0, rotation);
  return { x: fixed.x - offset.x - w / 2, y: fixed.y - offset.y - h / 2, w, h };
}

/** Pointer deltas are in canvas coordinates. Preserve the opposite edge/corner at every angle. */
export function resizeBox(r: RotatedRect, handle: Handle, dx: number, dy: number, keepRatio = false, minWidth = 8, minHeight = 8): Rect {
  const local = rotatePoint(dx, dy, 0, 0, -(r.rotation ?? 0));
  const sx = handle.includes("e") ? 1 : handle.includes("w") ? -1 : 0;
  const sy = handle.includes("s") ? 1 : handle.includes("n") ? -1 : 0;
  let w = sx ? Math.max(minWidth, r.w + sx * local.x) : r.w;
  let h = sy ? Math.max(minHeight, r.h + sy * local.y) : r.h;
  if (keepRatio && sx && sy && r.w > 0 && r.h > 0) {
    const horizontal = sx * local.x / r.w, vertical = sy * local.y / r.h;
    const growth = Math.abs(horizontal) >= Math.abs(vertical) ? horizontal : vertical;
    const factor = Math.max(minWidth / r.w, minHeight / r.h, 1 + growth);
    w = r.w * factor; h = r.h * factor;
  }
  return anchoredBox(r, w, h, oppositeAnchor(handle));
}

/** Text side handles reflow; corners scale type while keeping the opposite corner fixed. */
export function resizeElement(element: El, handle: Handle, dx: number, dy: number, keepRatio = false, measure: Measure = approxMeasure): Partial<El> {
  const box = { ...element, h: elHeight(element, measure) };
  const corner = handle.length === 2;
  const text = element.type === "text";
  const fontSize = element.fontSize ?? 32;
  const minimumWidth = text ? Math.max(40, corner ? element.w * 8 / fontSize : 0) : 8;
  const resized = resizeBox(box, handle, dx, dy, keepRatio || (text && corner), minimumWidth, text ? 0 : 8);
  if (!text) return { ...resized, h: element.type === "line" ? 0 : resized.h };
  const nextFontSize = corner ? Math.max(8, fontSize * resized.w / Math.max(element.w, 1)) : fontSize;
  const nextHeight = elHeight({ ...element, w: resized.w, fontSize: nextFontSize }, measure);
  const anchor = oppositeAnchor(handle);
  if (!corner) anchor.y = textAnchorFraction(element);
  const positioned = anchoredBox(box, resized.w, nextHeight, anchor);
  return { x: positioned.x, y: positioned.y, w: positioned.w, fontSize: nextFontSize };
}

// ---- history ----
export type History<T extends DocumentDesign = DocumentDesign> = { past: T[]; present: T; future: T[] };
export const hist = <T extends DocumentDesign>(d: T): History<T> => ({ past: [], present: d, future: [] });
export function commit<T extends DocumentDesign>(h: History<T>, next: T, limit = 100): History<T> { return next === h.present ? h : { past: [...h.past, h.present].slice(-limit), present: next, future: [] }; }
export const undo = <T extends DocumentDesign>(h: History<T>): History<T> => (h.past.length ? { past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future] } : h);
export const redo = <T extends DocumentDesign>(h: History<T>): History<T> => (h.future.length ? { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1) } : h);

// ---- SVG export ----
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const starPts = (w: number, h: number) => Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 0.42 : 1; return `${(w / 2 + (Math.cos(a) * w * r) / 2).toFixed(1)},${(h / 2 + (Math.sin(a) * h * r) / 2).toFixed(1)}`; }).join(" ");
export function elementSVG(e: El, measure: Measure = approxMeasure): string {
  const h = elHeight(e, measure), cx = e.x + e.w / 2, cy = e.y + h / 2;
  const tr = `${e.rotation ? ` transform="rotate(${e.rotation} ${cx} ${cy})"` : ""} opacity="${e.opacity}"`;
  const paint = `fill="${esc(e.fill)}" stroke="${e.strokeWidth ? esc(e.stroke) : "none"}" stroke-width="${e.strokeWidth}"`;
  switch (e.type) {
    case "rect": return `<rect x="${e.x}" y="${e.y}" width="${e.w}" height="${e.h}" rx="${Math.min(e.radius, e.w / 2, e.h / 2)}" ${paint}${tr}/>`;
    case "ellipse": return `<ellipse cx="${cx}" cy="${e.y + e.h / 2}" rx="${e.w / 2}" ry="${e.h / 2}" ${paint}${tr}/>`;
    case "triangle": return `<polygon points="${e.x + e.w / 2},${e.y} ${e.x + e.w},${e.y + e.h} ${e.x},${e.y + e.h}" ${paint}${tr}/>`;
    case "star": return `<polygon points="${starPts(e.w, e.h).split(" ").map(p => { const [a, b] = p.split(",").map(Number); return `${(a + e.x).toFixed(1)},${(b + e.y).toFixed(1)}`; }).join(" ")}" ${paint}${tr}/>`;
    case "line": return `<line x1="${e.x}" y1="${e.y}" x2="${e.x + e.w}" y2="${e.y}" stroke="${esc(e.stroke)}" stroke-width="${e.strokeWidth}" stroke-linecap="round"${tr}/>`;
    case "image": {
      if (!e.src) return "";
      const c = e.imageCrop, flip = imageFlipSVG(e), imageTr = flip ? "" : tr;
      const image = c ? `<svg x="${e.x}" y="${e.y}" width="${e.w}" height="${e.h}" viewBox="${c.x} ${c.y} ${c.w} ${c.h}" preserveAspectRatio="xMidYMid slice" overflow="hidden"${imageTr}><image href="${esc(e.src)}" width="${c.sourceW}" height="${c.sourceH}" preserveAspectRatio="none"/></svg>` : `<image href="${esc(e.src)}" x="${e.x}" y="${e.y}" width="${e.w}" height="${e.h}" preserveAspectRatio="xMidYMid slice"${imageTr}/>`;
      return flip ? `<g${tr}><g transform="${flip}">${image}</g></g>` : image;
    }
    case "text": {
      const size = e.fontSize ?? 32, lh = size * (e.lineHeight ?? 1.2), lines = wrapText(e.text ?? "", e.w, size, e.fontFamily ?? "", e.fontWeight ?? 400, measure, e.italic, e.letterSpacingEm);
      const ax = e.align === "center" ? e.x + e.w / 2 : e.align === "right" ? e.x + e.w : e.x, anchor = e.align === "center" ? "middle" : e.align === "right" ? "end" : "start";
      const decoration = textDecoration(e), tracking = e.letterSpacingEm ? ` letter-spacing="${letterSpacingPixels(e)}"` : "";
      return `<text xml:space="preserve" style="white-space:pre" font-family="${esc(e.fontFamily ?? "sans-serif")}" font-size="${size}" font-weight="${e.fontWeight ?? 400}"${e.italic ? ' font-style="italic"' : ""}${tracking}${decoration !== "none" ? ` text-decoration="${decoration}"` : ""} fill="${esc(e.fill)}" text-anchor="${anchor}"${tr}>${lines.map((l, i) => `<tspan x="${ax}" y="${e.y + size + i * lh - size * 0.18}">${esc(l) || "&#160;"}</tspan>`).join("")}</text>`;
    }
  }
}
export function toSVG(d: Design, measure: Measure = approxMeasure, options: { scale?: number; transparent?: boolean } = {}): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(d.w * (options.scale ?? 1))}" height="${Math.round(d.h * (options.scale ?? 1))}" viewBox="0 0 ${d.w} ${d.h}">${options.transparent ? "" : `<rect width="${d.w}" height="${d.h}" fill="${esc(d.bg)}"/>`}${d.els.map(e => elementSVG(e, measure)).join("")}</svg>`;
}

export const dateLabel = (t: number) => new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric" });
