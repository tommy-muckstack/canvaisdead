// Browser-only PNG/JPG renderer (Canvas 2D). The SVG string is the source of truth for the editor; this mirrors it for raster export.
import type { CanvasDesign as Design, El } from "./types";
import { elHeight, graphemes, textLayout, type Measure } from "./ops";
import { visibleImageCrop } from "./image-crop";
import { letterSpacingPixels } from "./text-spacing";
import { imageFlipMatrix } from "./image-flip";
import { textEffectBackground, textEffectPaints, type TextPaint } from "./text-effects";
export const canvasMeasure = (ctx: CanvasRenderingContext2D): Measure => (t, size, fam, weight, italic, spacing = 0) => {
  ctx.font = `${italic ? "italic " : ""}${weight} ${size}px ${fam}`;
  if (typeof ctx.letterSpacing === "string") { ctx.letterSpacing = `${size * spacing}px`; return ctx.measureText(t).width; }
  // Older browsers can still lay out SVG artwork; raster export checks support separately.
  return Math.max(0, ctx.measureText(t).width + graphemes(t).length * size * spacing);
};
const loadImg = (src: string) => new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
export async function prepareExportFonts(elements: El[]): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) return;
  const fonts = new Set(elements.filter(element => element.type === "text").map(element => `${element.italic ? "italic " : ""}${element.fontWeight ?? 400} ${element.fontSize ?? 32}px ${element.fontFamily ?? "sans-serif"}`));
  // A hidden page's font may not have been used by the editor yet.
  if (document.fonts.load) await Promise.all([...fonts].map(font => document.fonts.load(font)));
  await document.fonts.ready;
}
export function rasterDimensions(d: Pick<Design, "w" | "h">, scale: number): { width: number; height: number } {
  const width = Math.round(d.w * scale), height = Math.round(d.h * scale);
  if (!Number.isFinite(scale) || scale <= 0 || !Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1) throw new Error("Choose a valid download size.");
  if (width > 8192 || height > 8192 || width * height > 32_000_000) throw new Error("This size is too large to render in the browser. Choose a smaller size or SVG.");
  return { width, height };
}
export type RasterOptions = { transparent?: boolean; quality?: number; opaque?: boolean };
export async function renderToCanvas(d: Design, scale = 1, options: RasterOptions = {}): Promise<HTMLCanvasElement> {
  const { width, height } = rasterDimensions(d, scale);
  const cv = document.createElement("canvas"); cv.width = width; cv.height = height;
  const ctx = cv.getContext("2d");
  if (!ctx) throw new Error("This browser could not create a canvas for download.");
  ctx.scale(scale, scale);
  try {
    await prepareExportFonts(d.els);
    if (options.opaque) { ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, d.w, d.h); }
    if (!options.transparent) { ctx.fillStyle = d.bg; ctx.fillRect(0, 0, d.w, d.h); }
    const m = canvasMeasure(ctx);
    for (const e of d.els) {
      if (e.type === "text" && e.textEffect) await drawTextEffect(ctx, e, scale, width, height);
      else await drawEl(ctx, e, m);
    }
    return cv;
  } catch (error) { cv.width = 0; cv.height = 0; throw error; }
}
/** Composite each effect pass once, then apply object opacity to the finished group. */
async function drawTextEffect(ctx: CanvasRenderingContext2D, e: El, scale: number, width: number, height: number) {
  const group = document.createElement("canvas"), layer = document.createElement("canvas");
  group.width = layer.width = width; group.height = layer.height = height;
  try {
    const groupContext = group.getContext("2d"), layerContext = layer.getContext("2d");
    if (!groupContext || !layerContext) throw Error("This browser could not create a canvas for text effects.");
    const measure = canvasMeasure(layerContext), { lines, height: textHeight } = textLayout(e, measure), background = textEffectBackground(e, lines, measure);
    if (background.length && e.textEffect) {
      groupContext.save(); groupContext.scale(scale, scale);
      if (e.rotation) { groupContext.translate(e.x + e.w / 2, e.y + textHeight / 2); groupContext.rotate(e.rotation * Math.PI / 180); groupContext.translate(-e.x - e.w / 2, -e.y - textHeight / 2); }
      groupContext.globalAlpha = 1 - e.textEffect.transparency / 100; groupContext.fillStyle = e.textEffect.color;
      groupContext.beginPath(); background.forEach(r => groupContext.roundRect(r.x, r.y, r.w, r.h, r.r)); groupContext.fill(); groupContext.restore();
    }
    for (const paint of textEffectPaints(e)) {
      layerContext.clearRect(0, 0, width, height); layerContext.save(); layerContext.scale(scale, scale);
      await drawEl(layerContext, { ...e, opacity: 1, textEffect: undefined }, measure, paint); layerContext.restore();
      groupContext.save(); groupContext.globalAlpha = paint.opacity;
      if (paint.blur) {
        if (typeof groupContext.filter !== "string") throw Error("This browser cannot render blurred text effects. Download SVG or update your browser.");
        groupContext.filter = `blur(${paint.blur * scale}px)`;
      }
      groupContext.drawImage(layer, 0, 0); groupContext.restore();
    }
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = e.opacity; ctx.drawImage(group, 0, 0); ctx.restore();
  } finally { group.width = layer.width = 0; group.height = layer.height = 0; }
}
async function drawEl(ctx: CanvasRenderingContext2D, e: El, m: Measure, effectPaint?: TextPaint) {
  const h = elHeight(e, m); ctx.save(); ctx.globalAlpha = e.opacity;
  if (e.rotation) { ctx.translate(e.x + e.w / 2, e.y + h / 2); ctx.rotate((e.rotation * Math.PI) / 180); ctx.translate(-(e.x + e.w / 2), -(e.y + h / 2)); }
  const paint = () => { if (e.fill && e.fill !== "none") { ctx.fillStyle = e.fill; ctx.fill(); } if (e.strokeWidth) { ctx.strokeStyle = e.stroke; ctx.lineWidth = e.strokeWidth; ctx.stroke(); } };
  ctx.beginPath();
  if (e.type === "rect") { const r = Math.min(e.radius, e.w / 2, e.h / 2); ctx.roundRect(e.x, e.y, e.w, e.h, r); paint(); }
  else if (e.type === "ellipse") { ctx.ellipse(e.x + e.w / 2, e.y + e.h / 2, e.w / 2, e.h / 2, 0, 0, Math.PI * 2); paint(); }
  else if (e.type === "triangle") { ctx.moveTo(e.x + e.w / 2, e.y); ctx.lineTo(e.x + e.w, e.y + e.h); ctx.lineTo(e.x, e.y + e.h); ctx.closePath(); paint(); }
  else if (e.type === "star") { for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 0.42 : 1, px = e.x + e.w / 2 + (Math.cos(a) * e.w * r) / 2, py = e.y + e.h / 2 + (Math.sin(a) * e.h * r) / 2; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); } ctx.closePath(); paint(); }
  else if (e.type === "line") { ctx.strokeStyle = e.stroke; ctx.lineWidth = e.strokeWidth; ctx.lineCap = "round"; ctx.moveTo(e.x, e.y); ctx.lineTo(e.x + e.w, e.y); ctx.stroke(); }
  else if (e.type === "image" && e.src) {
    const img = await loadImg(e.src), c = visibleImageCrop(e, img.width, img.height), flip = imageFlipMatrix(e);
    if (flip) ctx.transform(...flip);
    ctx.beginPath(); ctx.rect(e.x, e.y, e.w, e.h); ctx.clip();
    ctx.drawImage(img, c.x * img.width / c.sourceW, c.y * img.height / c.sourceH, c.w * img.width / c.sourceW, c.h * img.height / c.sourceH, e.x, e.y, e.w, e.h);
  }
  else if (e.type === "text") {
    const size = e.fontSize ?? 32, { lines } = textLayout(e, m);
    const paints = effectPaint ? [effectPaint] : textEffectPaints(e);
    // Measuring wrapping changes ctx.font; restore the complete style before painting.
    ctx.font = `${e.italic ? "italic " : ""}${e.fontWeight ?? 400} ${size}px ${e.fontFamily ?? "sans-serif"}`;
    if (typeof ctx.letterSpacing === "string") ctx.letterSpacing = `${letterSpacingPixels(e)}px`;
    else if (e.letterSpacingEm) throw new Error("This browser cannot render letter spacing in PNG, JPG or PDF. Download SVG or update your browser.");
    ctx.textAlign = e.align ?? "left"; ctx.textBaseline = "alphabetic";
    for (const paint of paints) {
      ctx.save(); ctx.fillStyle = paint.fill;
      if (paint.dx || paint.dy) ctx.translate(paint.dx, paint.dy);
      const paintText = (text: string, x: number, y: number) => {
        if (paint.stroke && paint.width) { ctx.strokeStyle = paint.stroke; ctx.lineWidth = paint.width; ctx.lineJoin = "round"; ctx.strokeText(text, x, y); }
        if (paint.fill !== "none") ctx.fillText(text, x, y);
      };
      lines.forEach(({ text: line, x: ax, y: baseline, marker }) => {
        if (marker) {
          ctx.textAlign = "right"; if (typeof ctx.letterSpacing === "string") ctx.letterSpacing = "0px";
          paintText(marker.text, marker.x, baseline);
          ctx.textAlign = e.align ?? "left"; if (typeof ctx.letterSpacing === "string") ctx.letterSpacing = `${letterSpacingPixels(e)}px`;
        }
        paintText(line, ax, baseline);
        if (!line || (!e.underline && !e.strikethrough)) return;
        const width = ctx.measureText(line).width;
        const left = ax - (e.align === "center" ? width / 2 : e.align === "right" ? width : 0);
        ctx.strokeStyle = paint.fill === "none" ? paint.stroke ?? e.fill : paint.fill; ctx.lineWidth = Math.max(1, size / 16); ctx.lineCap = "butt";
        for (const offset of [e.underline ? size * 0.1 : null, e.strikethrough ? -size * 0.3 : null]) {
          if (offset === null) continue;
          ctx.beginPath(); ctx.moveTo(left, baseline + offset); ctx.lineTo(left + width, baseline + offset); ctx.stroke();
        }
      });
      ctx.restore();
    }
  }
  ctx.restore();
}
export async function exportBlob(d: Design, fmt: "png" | "jpg", scale = 1, options: RasterOptions = {}): Promise<Blob> {
  const cv = await renderToCanvas(d, scale, { ...options, ...(fmt === "jpg" ? { transparent: false, opaque: true } : {}) });
  try {
    return await new Promise<Blob>((res, rej) => cv.toBlob(b => (b ? res(b) : rej(new Error("This browser could not encode the download."))), fmt === "png" ? "image/png" : "image/jpeg", options.quality ?? 0.92));
  } finally { cv.width = 0; cv.height = 0; }
}
