import type { CanvasDesign } from "@/lib/design/types";
import { makeEl, touch } from "@/lib/design/ops";

export const UPLOAD_MIME_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/avif"] as const;
export const UPLOAD_ACCEPT = UPLOAD_MIME_TYPES.join(",");
export const UPLOAD_DRAG_TYPE = "application/x-canvaisdead-upload";
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
export const MAX_UPLOAD_PIXELS = 250_000_000;
export const UPLOAD_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
export type Upload = { version: 1; id: string; name: string; mime: string; width: number; height: number; createdAt: number; updatedAt: number; trashedAt?: number; original: Blob; thumbnail: Blob };
export type UploadAction = { kind: "rename"; name: string } | { kind: "trash" } | { kind: "restore" | "delete"; trashedAt: number };
export function uploadName(name: string) { const value = [...name].filter(char => char.charCodeAt(0) >= 32 && char.charCodeAt(0) !== 127 && char !== "/" && char !== "\\").join("").trim().slice(0, 200); if (!value) throw Error("Enter a file name."); return value; }
export function validUpload(value: unknown): value is Upload {
  if (!value || typeof value !== "object") return false;
  const v = value as Upload;
  return v.version === 1 && typeof v.id === "string" && !!v.id && v.id.length <= 128 && typeof v.name === "string" && !!v.name.trim() && v.name.length <= 200 && UPLOAD_MIME_TYPES.includes(v.mime as typeof UPLOAD_MIME_TYPES[number]) &&
    [v.width, v.height].every(n => Number.isInteger(n) && n > 0) && v.width * v.height <= MAX_UPLOAD_PIXELS &&
    [v.createdAt, v.updatedAt].every(n => Number.isFinite(n) && n >= 0) && (v.trashedAt === undefined || (Number.isFinite(v.trashedAt) && v.trashedAt >= 0)) &&
    v.original instanceof Blob && v.original.type === v.mime && v.original.size > 0 && v.original.size <= MAX_UPLOAD_BYTES && v.thumbnail instanceof Blob && v.thumbnail.type === "image/png" && v.thumbnail.size > 0;
}
export const expiredUpload = (item: Upload, now = Date.now()) => item.trashedAt !== undefined && now - item.trashedAt >= UPLOAD_RETENTION_MS;
/** Apply only the requested field to the latest stored record; never resurrect stale trash. */
export function changeUpload(item: Upload, action: UploadAction, now = Date.now()): Upload | null {
  if (action.kind === "rename") return item.trashedAt === undefined ? { ...item, name: uploadName(action.name), updatedAt: now } : item;
  if (action.kind === "trash") return item.trashedAt === undefined ? { ...item, trashedAt: now, updatedAt: now } : item;
  if (item.trashedAt !== action.trashedAt) return item;
  if (action.kind === "delete") return null;
  if (expiredUpload(item, now)) return item;
  const restored = { ...item, updatedAt: now }; delete restored.trashedAt; return restored;
}
export function findUploads(items: readonly Upload[], query: string, trash = false) {
  const words = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return items.filter(item => (item.trashedAt !== undefined) === trash && words.every(word => `${item.name} ${item.mime}`.toLocaleLowerCase().includes(word))).sort((a, b) => b.createdAt - a.createdAt || a.id.localeCompare(b.id));
}
export type UploadedImage = { src: string; w: number; h: number };
export function insertUploadedImages(design: CanvasDesign, images: UploadedImage[], point = { x: design.w / 2, y: design.h / 2 }) {
  if (!images.length || ![point.x, point.y].every(Number.isFinite)) return { design, ids: [] };
  if (images.some(image => ![image.w, image.h].every(n => Number.isFinite(n) && n > 0) || !/^data:image\/(?:png|jpeg|webp|gif|avif);base64,[a-z0-9+/]+={0,2}$/i.test(image.src))) throw Error("This image could not be inserted.");
  const els = images.map((image, i) => { const k = Math.min(1, design.w * .6 / image.w, design.h * .6 / image.h), w = image.w * k, h = image.h * k; return makeEl("image", design, { src: image.src, w, h, x: point.x - w / 2 + i * 24, y: point.y - h / 2 + i * 24 }); });
  return { design: touch({ ...design, els: [...design.els, ...els] }), ids: els.map(e => e.id) };
}
export function uploadFilename(item: Upload) {
  const extension = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif", "image/avif": "avif" }[item.mime];
  return /\.(png|jpe?g|webp|gif|avif)$/i.test(item.name) ? item.name : `${item.name}.${extension}`;
}
