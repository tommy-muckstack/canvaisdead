import type { Design, El, ElType, SizePreset } from "./types";

export const SIZES: SizePreset[] = [
  { id: "ig-post", label: "Instagram post", w: 1080, h: 1080, hint: "1080 × 1080" },
  { id: "story", label: "Story", w: 1080, h: 1920, hint: "1080 × 1920" },
  { id: "presentation", label: "Presentation", w: 1920, h: 1080, hint: "1920 × 1080" },
  { id: "poster", label: "Poster", w: 1200, h: 1800, hint: "2 : 3" },
  { id: "doc", label: "Doc (US Letter)", w: 816, h: 1056, hint: "8.5 × 11 in" },
  { id: "card", label: "Business card", w: 1050, h: 600, hint: "3.5 × 2 in" },
  { id: "yt-thumb", label: "YouTube thumbnail", w: 1280, h: 720, hint: "1280 × 720" },
  { id: "logo", label: "Logo", w: 500, h: 500, hint: "500 × 500" },
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
  e.x = over.x ?? Math.round((d.w - e.w) / 2); e.y = over.y ?? Math.round((d.h - (e.h || (e.fontSize ?? 40) * 1.2)) / 2);
  return e;
}

// ---- text layout (measure injected so it runs in node tests and in the browser) ----
export type Measure = (text: string, fontSize: number, fontFamily: string, fontWeight: number) => number;
export const approxMeasure: Measure = (t, size, _f, weight) => t.length * size * (weight >= 700 ? 0.58 : 0.54);
export function wrapText(text: string, maxW: number, size: number, family: string, weight: number, measure: Measure): string[] {
  const out: string[] = [];
  for (const para of text.split("\n")) {
    if (!para.trim()) { out.push(""); continue; }
    let line = "";
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const next = line ? line + " " + word : word;
      if (line && measure(next, size, family, weight) > maxW) { out.push(line); line = word; } else line = next;
    }
    out.push(line);
  }
  return out;
}
export function textHeight(e: El, measure: Measure): number {
  const lines = wrapText(e.text ?? "", e.w, e.fontSize ?? 32, e.fontFamily ?? "", e.fontWeight ?? 400, measure);
  return Math.max(1, lines.length) * (e.fontSize ?? 32) * (e.lineHeight ?? 1.2);
}
export function elHeight(e: El, measure: Measure) { return e.type === "text" ? textHeight(e, measure) : e.type === "line" ? Math.max(e.h, e.strokeWidth) : e.h; }

// ---- immutable edits ----
export const touch = (d: Design): Design => ({ ...d, updatedAt: Date.now() });
export const addEl = (d: Design, e: El): Design => touch({ ...d, els: [...d.els, e] });
export const patchEl = (d: Design, id: string, p: Partial<El>): Design => touch({ ...d, els: d.els.map(e => (e.id === id ? { ...e, ...p } : e)) });
export const removeEls = (d: Design, ids: string[]): Design => touch({ ...d, els: d.els.filter(e => !ids.includes(e.id)) });
export function duplicateEl(d: Design, id: string): { design: Design; id: string | null } {
  const e = d.els.find(x => x.id === id); if (!e) return { design: d, id: null };
  const c = { ...e, id: uid(), x: e.x + 24, y: e.y + 24 };
  return { design: addEl(d, c), id: c.id };
}
export type Z = "front" | "back" | "forward" | "backward";
export function reorder(d: Design, id: string, z: Z): Design {
  const i = d.els.findIndex(e => e.id === id); if (i < 0) return d;
  const els = d.els.slice(); const [e] = els.splice(i, 1);
  const j = z === "front" ? els.length : z === "back" ? 0 : z === "forward" ? Math.min(els.length, i + 1) : Math.max(0, i - 1);
  els.splice(j, 0, e); return touch({ ...d, els });
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
export function hitTest(d: Design, x: number, y: number, measure: Measure = approxMeasure): El | null {
  for (let i = d.els.length - 1; i >= 0; i--) {
    const e = d.els[i]; if (e.locked) continue; const h = elHeight(e, measure), pad = e.type === "line" ? 8 : 0;
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
/** Resize from a handle (unrotated math; good enough for rotation 0 and near-multiples). Keeps min size 8. */
export function resizeBox(r: Rect, h: Handle, dx: number, dy: number, keepRatio = false): Rect {
  let { x, y, w, h: hh } = r; const ratio = r.w / (r.h || 1);
  if (h.includes("e")) w = r.w + dx; if (h.includes("s")) hh = r.h + dy; if (h.includes("w")) { w = r.w - dx; x = r.x + dx; } if (h.includes("n")) { hh = r.h - dy; y = r.y + dy; }
  if (keepRatio && h.length === 2) { const nh = w / ratio; if (h.includes("n")) y = r.y + r.h - nh; hh = nh; }
  if (w < 8) { if (h.includes("w")) x -= 8 - w; w = 8; } if (hh < 8) { if (h.includes("n")) y -= 8 - hh; hh = 8; }
  return { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(hh) };
}

// ---- history ----
export type History = { past: Design[]; present: Design; future: Design[] };
export const hist = (d: Design): History => ({ past: [], present: d, future: [] });
export function commit(h: History, next: Design, limit = 100): History { return next === h.present ? h : { past: [...h.past, h.present].slice(-limit), present: next, future: [] }; }
export const undo = (h: History): History => (h.past.length ? { past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future] } : h);
export const redo = (h: History): History => (h.future.length ? { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1) } : h);

// ---- SVG export ----
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const starPts = (w: number, h: number) => Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 0.42 : 1; return `${(w / 2 + (Math.cos(a) * w * r) / 2).toFixed(1)},${(h / 2 + (Math.sin(a) * h * r) / 2).toFixed(1)}`; }).join(" ");
export function elementSVG(e: El, measure: Measure = approxMeasure): string {
  const h = elHeight(e, measure), cx = e.x + e.w / 2, cy = e.y + h / 2;
  const tr = `${e.rotation ? ` transform="rotate(${e.rotation} ${cx} ${cy})"` : ""} opacity="${e.opacity}"`;
  const paint = `fill="${e.fill}" stroke="${e.strokeWidth ? e.stroke : "none"}" stroke-width="${e.strokeWidth}"`;
  switch (e.type) {
    case "rect": return `<rect x="${e.x}" y="${e.y}" width="${e.w}" height="${e.h}" rx="${Math.min(e.radius, e.w / 2, e.h / 2)}" ${paint}${tr}/>`;
    case "ellipse": return `<ellipse cx="${cx}" cy="${e.y + e.h / 2}" rx="${e.w / 2}" ry="${e.h / 2}" ${paint}${tr}/>`;
    case "triangle": return `<polygon points="${e.x + e.w / 2},${e.y} ${e.x + e.w},${e.y + e.h} ${e.x},${e.y + e.h}" ${paint}${tr}/>`;
    case "star": return `<polygon points="${starPts(e.w, e.h).split(" ").map(p => { const [a, b] = p.split(",").map(Number); return `${(a + e.x).toFixed(1)},${(b + e.y).toFixed(1)}`; }).join(" ")}" ${paint}${tr}/>`;
    case "line": return `<line x1="${e.x}" y1="${e.y}" x2="${e.x + e.w}" y2="${e.y}" stroke="${e.stroke}" stroke-width="${e.strokeWidth}" stroke-linecap="round"${tr}/>`;
    case "image": return e.src ? `<image href="${esc(e.src)}" x="${e.x}" y="${e.y}" width="${e.w}" height="${e.h}" preserveAspectRatio="xMidYMid slice"${tr}/>` : "";
    case "text": {
      const size = e.fontSize ?? 32, lh = size * (e.lineHeight ?? 1.2), lines = wrapText(e.text ?? "", e.w, size, e.fontFamily ?? "", e.fontWeight ?? 400, measure);
      const ax = e.align === "center" ? e.x + e.w / 2 : e.align === "right" ? e.x + e.w : e.x, anchor = e.align === "center" ? "middle" : e.align === "right" ? "end" : "start";
      return `<text font-family="${esc(e.fontFamily ?? "sans-serif")}" font-size="${size}" font-weight="${e.fontWeight ?? 400}"${e.italic ? ' font-style="italic"' : ""} fill="${e.fill}" text-anchor="${anchor}"${tr}>${lines.map((l, i) => `<tspan x="${ax}" y="${e.y + size + i * lh - size * 0.18}">${esc(l) || "&#160;"}</tspan>`).join("")}</text>`;
    }
  }
}
export function toSVG(d: Design, measure: Measure = approxMeasure): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${d.w}" height="${d.h}" viewBox="0 0 ${d.w} ${d.h}"><rect width="${d.w}" height="${d.h}" fill="${d.bg}"/>${d.els.map(e => elementSVG(e, measure)).join("")}</svg>`;
}

export const dateLabel = (t: number) => new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric" });
