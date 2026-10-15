import type { CanvasDesign, El, ImageCrop } from "./types";
import type { Handle } from "./ops";

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
export function validImageCrop(value: unknown): value is ImageCrop {
  if (!value || typeof value !== "object") return false;
  const c = value as ImageCrop;
  return [c.x, c.y, c.w, c.h, c.sourceW, c.sourceH].every(Number.isFinite) && c.sourceW >= 1 && c.sourceH >= 1 && c.x >= 0 && c.y >= 0 && c.w > 0 && c.h > 0 && c.x + c.w <= c.sourceW + 1e-7 && c.y + c.h <= c.sourceH + 1e-7;
}
export function coverImageCrop(width: number, height: number, sourceW: number, sourceH: number): ImageCrop {
  if (![width, height, sourceW, sourceH].every(n => Number.isFinite(n) && n > 0)) throw new Error("This image has invalid dimensions.");
  const k = Math.max(width / sourceW, height / sourceH), w = Math.min(sourceW, width / k), h = Math.min(sourceH, height / k);
  return { x: Math.max(0, (sourceW - w) / 2), y: Math.max(0, (sourceH - h) / 2), w, h, sourceW, sourceH };
}
/** The visible source window shared by crop editing and both export renderers. */
export function visibleImageCrop(e: El, sourceW: number, sourceH: number): ImageCrop {
  const c = e.imageCrop;
  if (!c) return coverImageCrop(e.w, e.h, sourceW, sourceH);
  const inner = coverImageCrop(e.w, e.h, c.w, c.h);
  return { ...c, x: c.x + inner.x, y: c.y + inner.y, w: inner.w, h: inner.h };
}
export function beginImageCrop(e: El, sourceW: number, sourceH: number): El {
  if (e.type !== "image" || e.locked || !e.src || e.w <= 0 || e.h <= 0) throw new Error("Select an unlocked image to crop.");
  return { ...e, imageCrop: visibleImageCrop(e, sourceW, sourceH) };
}
function localDelta(e: El, dx: number, dy: number) {
  const angle = e.rotation * Math.PI / 180, k = e.w / e.imageCrop!.w;
  return { x: (dx * Math.cos(angle) + dy * Math.sin(angle)) / k * (e.flipX ? -1 : 1), y: (-dx * Math.sin(angle) + dy * Math.cos(angle)) / k * (e.flipY ? -1 : 1) };
}
/** Change the frame while keeping every source pixel in the same page location. */
function frameForCrop(e: El, c: ImageCrop): El {
  const old = e.imageCrop!, k = e.w / old.w, w = c.w * k, h = c.h * k;
  const dx = (c.x + c.w / 2 - old.x - old.w / 2) * k * (e.flipX ? -1 : 1), dy = (c.y + c.h / 2 - old.y - old.h / 2) * k * (e.flipY ? -1 : 1), angle = e.rotation * Math.PI / 180;
  return { ...e, x: e.x + e.w / 2 + dx * Math.cos(angle) - dy * Math.sin(angle) - w / 2, y: e.y + e.h / 2 + dx * Math.sin(angle) + dy * Math.cos(angle) - h / 2, w, h, imageCrop: c };
}
export function panImageCrop(e: El, dx: number, dy: number): El {
  if (!e.imageCrop || e.locked || ![dx, dy].every(Number.isFinite)) return e;
  const c = e.imageCrop, delta = localDelta(e, dx, dy);
  return { ...e, imageCrop: { ...c, x: clamp(c.x - delta.x, 0, c.sourceW - c.w), y: clamp(c.y - delta.y, 0, c.sourceH - c.h) } };
}
export function resizeImageCrop(e: El, handle: Handle, dx: number, dy: number, ratio: number | null = null): El {
  if (!e.imageCrop || e.locked || ![dx, dy].every(Number.isFinite) || (ratio !== null && (!Number.isFinite(ratio) || ratio <= 0))) return e;
  const c = e.imageCrop, delta = localDelta(e, dx, dy);
  // Handles name page-frame sides; reflected images expose the opposite source side.
  const horizontal = (handle.includes("w") ? -1 : handle.includes("e") ? 1 : 0) * (e.flipX ? -1 : 1), vertical = (handle.includes("n") ? -1 : handle.includes("s") ? 1 : 0) * (e.flipY ? -1 : 1);
  const minW = Math.min(c.w, c.w / e.w), minH = Math.min(c.h, c.h / e.h);
  let x = c.x, y = c.y, w = c.w, h = c.h;
  if (ratio === null) {
    if (horizontal < 0) { x = clamp(c.x + delta.x, 0, c.x + c.w - minW); w = c.x + c.w - x; }
    if (horizontal > 0) w = clamp(c.w + delta.x, minW, c.sourceW - c.x);
    if (vertical < 0) { y = clamp(c.y + delta.y, 0, c.y + c.h - minH); h = c.y + c.h - y; }
    if (vertical > 0) h = clamp(c.h + delta.y, minH, c.sourceH - c.y);
  } else {
    const anchorX = c.x + (horizontal < 0 ? c.w : horizontal > 0 ? 0 : c.w / 2), anchorY = c.y + (vertical < 0 ? c.h : vertical > 0 ? 0 : c.h / 2);
    const maxW = horizontal < 0 ? anchorX : horizontal > 0 ? c.sourceW - anchorX : 2 * Math.min(anchorX, c.sourceW - anchorX);
    const maxH = vertical < 0 ? anchorY : vertical > 0 ? c.sourceH - anchorY : 2 * Math.min(anchorY, c.sourceH - anchorY);
    const dw = horizontal * delta.x, dh = vertical * delta.y;
    const wanted = horizontal && (!vertical || Math.abs(dw) >= Math.abs(dh * ratio)) ? c.w + dw : (c.h + dh) * ratio;
    w = clamp(wanted, Math.min(Math.max(minW, minH * ratio), Math.min(maxW, maxH * ratio)), Math.min(maxW, maxH * ratio)); h = w / ratio;
    x = anchorX - (horizontal < 0 ? w : horizontal > 0 ? 0 : w / 2); y = anchorY - (vertical < 0 ? h : vertical > 0 ? 0 : h / 2);
  }
  return frameForCrop(e, { ...c, x: Math.max(0, x), y: Math.max(0, y), w, h });
}
export function ratioImageCrop(e: El, ratio: number): El {
  if (!e.imageCrop || e.locked || !Number.isFinite(ratio) || ratio <= 0) return e;
  const c = e.imageCrop, inner = coverImageCrop(ratio, 1, c.w, c.h);
  return frameForCrop(e, { ...c, x: c.x + inner.x, y: c.y + inner.y, w: inner.w, h: inner.h });
}
export function imageCropZoom(e: El) {
  const c = e.imageCrop!;
  return coverImageCrop(e.w, e.h, c.sourceW, c.sourceH).w / c.w;
}
export function zoomImageCrop(e: El, zoom: number, limit = Math.max(10, e.imageCrop ? imageCropZoom(e) : 10)): El {
  if (!e.imageCrop || e.locked || !Number.isFinite(zoom)) return e;
  const c = e.imageCrop, cover = coverImageCrop(e.w, e.h, c.sourceW, c.sourceH), k = clamp(zoom, 1, Math.max(10, limit)), w = cover.w / k, h = cover.h / k;
  return { ...e, imageCrop: { ...c, x: clamp(c.x + c.w / 2 - w / 2, 0, c.sourceW - w), y: clamp(c.y + c.h / 2 - h / 2, 0, c.sourceH - h), w, h } };
}
export function resetImageCrop(e: El): El {
  if (!e.imageCrop || e.locked) return e;
  const c = e.imageCrop, k = Math.min(e.w / c.sourceW, e.h / c.sourceH), w = c.sourceW * k, h = c.sourceH * k;
  return { ...e, x: e.x + (e.w - w) / 2, y: e.y + (e.h - h) / 2, w, h, imageCrop: { ...c, x: 0, y: 0, w: c.sourceW, h: c.sourceH } };
}
/** Commit only to the unchanged source element; keep grouping, locks and newer edits. */
export function applyImageCrop(design: CanvasDesign, original: El, preview: El): CanvasDesign {
  if (original.locked || design.els.find(e => e.id === original.id) !== original || !preview.imageCrop || !validImageCrop(preview.imageCrop)) return design;
  const patch = { x: preview.x, y: preview.y, w: preview.w, h: preview.h, imageCrop: { ...preview.imageCrop } };
  if (![patch.x, patch.y, patch.w, patch.h].every(Number.isFinite) || patch.w <= 0 || patch.h <= 0) return design;
  return { ...design, updatedAt: Date.now(), els: design.els.map(e => e === original ? { ...e, ...patch } : e) };
}
