import { MAX_UPLOAD_BYTES, MAX_UPLOAD_PIXELS, uploadName, type Upload } from "./model";

export function imageMime(bytes: Uint8Array): string | null {
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.slice(start, end));
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((n, i) => bytes[i] === n)) return "image/png";
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return "image/jpeg";
  if (["GIF87a", "GIF89a"].includes(ascii(0, 6))) return "image/gif";
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  if (ascii(4, 8) === "ftyp" && [8, 16, 20, 24, 28].some(i => ["avif", "avis"].includes(ascii(i, i + 4)))) return "image/avif";
  return null;
}
const abort = (signal?: AbortSignal) => { if (signal?.aborted) throw new DOMException("Import cancelled", "AbortError"); };
export async function localImageBlob(file: Blob, signal?: AbortSignal) {
  abort(signal);
  if (!file.size || file.size > MAX_UPLOAD_BYTES) throw Error("Choose an image between 1 byte and 50 MB.");
  const bytes = new Uint8Array(await file.slice(0, 32).arrayBuffer()); abort(signal);
  const mime = imageMime(bytes); if (!mime) throw Error("This format is not supported yet. Choose PNG, JPEG, WebP, GIF or AVIF.");
  return file.slice(0, file.size, mime);
}
async function decode(blob: Blob, signal?: AbortSignal) {
  abort(signal); const url = URL.createObjectURL(blob), image = new Image();
  try {
    await new Promise<void>((resolve, reject) => {
      const stop = () => { done(); image.src = ""; reject(new DOMException("Import cancelled", "AbortError")); };
      const done = () => { signal?.removeEventListener("abort", stop); image.onload = null; image.onerror = null; };
      image.onload = () => { done(); resolve(); }; image.onerror = () => { done(); reject(Error("This image could not be decoded. Try another copy of the file.")); };
      signal?.addEventListener("abort", stop, { once: true }); image.src = url;
    });
    abort(signal); const width = image.naturalWidth, height = image.naturalHeight;
    if (!width || !height || width * height > MAX_UPLOAD_PIXELS) throw Error("Choose an image with at most 250 million pixels.");
    const ratio = Math.min(1, 240 / Math.max(width, height)), canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * ratio)); canvas.height = Math.max(1, Math.round(height * ratio));
    const context = canvas.getContext("2d"); if (!context) throw Error("Image previews are unavailable in this browser.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const thumbnail = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(Error("Could not create an image preview.")), "image/png"));
    abort(signal); return { width, height, thumbnail };
  } finally { image.src = ""; URL.revokeObjectURL(url); }
}
export async function prepareUpload(file: File, id: string, signal?: AbortSignal): Promise<Upload> {
  const original = await localImageBlob(file, signal), preview = await decode(original, signal), now = Date.now();
  return { version: 1, id, name: uploadName(file.name || "Untitled image"), mime: original.type, ...preview, createdAt: now, updatedAt: now, original };
}
/** Encode original bytes, without canvas recompression, URLs or server access. */
export async function imageDataURL(blob: Blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer()), parts: string[] = [];
  for (let i = 0; i < bytes.length; i += 32766) parts.push(btoa(String.fromCharCode(...bytes.subarray(i, i + 32766))));
  return `data:${blob.type};base64,${parts.join("")}`;
}
export async function originalClipboardImage(blob: Blob) {
  const original = await localImageBlob(blob), preview = await decode(original);
  return { src: await imageDataURL(original), w: preview.width, h: preview.height };
}
