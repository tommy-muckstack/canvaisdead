// Browser-only PNG/JPG renderer (Canvas 2D). The SVG string is the source of truth for the editor; this mirrors it for raster export.
import type { Design, El } from "./types";
import { elHeight, wrapText, type Measure } from "./ops";
export const canvasMeasure = (ctx: CanvasRenderingContext2D): Measure => (t, size, fam, weight) => { ctx.font = `${weight} ${size}px ${fam}`; return ctx.measureText(t).width; };
const loadImg = (src: string) => new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
export async function renderToCanvas(d: Design, scale = 1): Promise<HTMLCanvasElement> {
  const cv = document.createElement("canvas"); cv.width = Math.round(d.w * scale); cv.height = Math.round(d.h * scale);
  const ctx = cv.getContext("2d")!; ctx.scale(scale, scale);
  try { await document.fonts.ready; } catch { /* older engines */ }
  ctx.fillStyle = d.bg; ctx.fillRect(0, 0, d.w, d.h);
  const m = canvasMeasure(ctx);
  for (const e of d.els) await drawEl(ctx, e, m);
  return cv;
}
async function drawEl(ctx: CanvasRenderingContext2D, e: El, m: Measure) {
  const h = elHeight(e, m); ctx.save(); ctx.globalAlpha = e.opacity;
  if (e.rotation) { ctx.translate(e.x + e.w / 2, e.y + h / 2); ctx.rotate((e.rotation * Math.PI) / 180); ctx.translate(-(e.x + e.w / 2), -(e.y + h / 2)); }
  const paint = () => { if (e.fill && e.fill !== "none") { ctx.fillStyle = e.fill; ctx.fill(); } if (e.strokeWidth) { ctx.strokeStyle = e.stroke; ctx.lineWidth = e.strokeWidth; ctx.stroke(); } };
  ctx.beginPath();
  if (e.type === "rect") { const r = Math.min(e.radius, e.w / 2, e.h / 2); ctx.roundRect(e.x, e.y, e.w, e.h, r); paint(); }
  else if (e.type === "ellipse") { ctx.ellipse(e.x + e.w / 2, e.y + e.h / 2, e.w / 2, e.h / 2, 0, 0, Math.PI * 2); paint(); }
  else if (e.type === "triangle") { ctx.moveTo(e.x + e.w / 2, e.y); ctx.lineTo(e.x + e.w, e.y + e.h); ctx.lineTo(e.x, e.y + e.h); ctx.closePath(); paint(); }
  else if (e.type === "star") { for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 0.42 : 1, px = e.x + e.w / 2 + (Math.cos(a) * e.w * r) / 2, py = e.y + e.h / 2 + (Math.sin(a) * e.h * r) / 2; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.closePath(); paint(); }
  else if (e.type === "line") { ctx.strokeStyle = e.stroke; ctx.lineWidth = e.strokeWidth; ctx.lineCap = "round"; ctx.moveTo(e.x, e.y); ctx.lineTo(e.x + e.w, e.y); ctx.stroke(); }
  else if (e.type === "image" && e.src) { const img = await loadImg(e.src); const k = Math.max(e.w / img.width, e.h / img.height), sw = e.w / k, sh = e.h / k; ctx.beginPath(); ctx.rect(e.x, e.y, e.w, e.h); ctx.clip(); ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, e.x, e.y, e.w, e.h); }
  else if (e.type === "text") {
    const size = e.fontSize ?? 32, lh = size * (e.lineHeight ?? 1.2); ctx.font = `${e.italic ? "italic " : ""}${e.fontWeight ?? 400} ${size}px ${e.fontFamily}`; ctx.fillStyle = e.fill; ctx.textAlign = e.align ?? "left"; ctx.textBaseline = "alphabetic";
    const lines = wrapText(e.text ?? "", e.w, size, e.fontFamily ?? "", e.fontWeight ?? 400, m); const ax = e.align === "center" ? e.x + e.w / 2 : e.align === "right" ? e.x + e.w : e.x;
    lines.forEach((l, i) => ctx.fillText(l, ax, e.y + size + i * lh - size * 0.18));
  }
  ctx.restore();
}
export async function exportBlob(d: Design, fmt: "png" | "jpg", scale = 1): Promise<Blob> {
  const cv = await renderToCanvas(d, scale);
  return new Promise((res, rej) => cv.toBlob(b => (b ? res(b) : rej(new Error("export failed"))), fmt === "png" ? "image/png" : "image/jpeg", 0.92));
}
