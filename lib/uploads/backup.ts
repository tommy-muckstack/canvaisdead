import { imageMime } from "./image";
import { MAX_UPLOAD_BYTES, uploadName, validUpload, type Upload } from "./model";

export const UPLOAD_BACKUP_EXTENSION = ".canvaisdead-uploads";
const MAGIC = "CanvaIsDead uploads\n", END = "END\n", MAX_RECORD = 64 * 1024, MAX_PREVIEW = 1024 * 1024;
type Options = { signal?: AbortSignal; progress?: (complete: number, total: number) => void };
const invalid = () => Error("This uploads backup is incomplete or invalid. No files were imported.");
const check = (signal?: AbortSignal) => { if (signal?.aborted) throw new DOMException("Backup cancelled", "AbortError"); };
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const size = (value: unknown, max: number): value is number => Number.isSafeInteger(value) && (value as number) > 0 && (value as number) <= max;
const hash = (value: unknown): value is string => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
async function digest(blob: Blob, signal?: AbortSignal) {
  check(signal);
  if (!globalThis.crypto?.subtle) throw Error("Open this site over HTTPS to back up or restore uploads.");
  const bytes = await blob.arrayBuffer(); check(signal);
  const result = await crypto.subtle.digest("SHA-256", bytes); check(signal);
  return Array.from(new Uint8Array(result), n => n.toString(16).padStart(2, "0")).join("");
}
function record(value: unknown) {
  const bytes = new TextEncoder().encode(JSON.stringify(value)), length = new Uint8Array(4);
  if (bytes.length > MAX_RECORD) throw invalid();
  new DataView(length.buffer).setUint32(0, bytes.length, true);
  return new Blob([length, bytes]);
}
async function media(item: Upload, signal?: AbortSignal) {
  check(signal);
  if (!validUpload(item) || item.thumbnail.size > MAX_PREVIEW || uploadName(item.name) !== item.name) throw invalid();
  if (imageMime(new Uint8Array(await item.original.slice(0, 32).arrayBuffer())) !== item.mime || imageMime(new Uint8Array(await item.thumbnail.slice(0, 32).arrayBuffer())) !== "image/png") throw invalid();
  check(signal);
}

/** Binary Blob parts keep original files intact without a whole-library string/buffer.
 * Each bounded JSON record precedes its original and preview. A final marker is mandatory.
 */
export async function uploadBackupBlob(items: readonly Upload[], { signal, progress = () => {} }: Options = {}) {
  check(signal);
  if (new Set(items.map(item => item.id)).size !== items.length) throw invalid();
  const parts: BlobPart[] = [MAGIC, record({ format: "canvaisdead-uploads", version: 1, count: items.length })];
  progress(0, items.length);
  for (const [index, item] of items.entries()) {
    await media(item, signal);
    const originalHash = await digest(item.original, signal), thumbnailHash = await digest(item.thumbnail, signal);
    const { id, name, mime, width, height, createdAt, updatedAt, trashedAt } = item;
    parts.push(record({ id, name, mime, width, height, createdAt, updatedAt, trashedAt, originalBytes: item.original.size, thumbnailBytes: item.thumbnail.size, originalHash, thumbnailHash }), item.original, item.thumbnail);
    progress(index + 1, items.length);
  }
  check(signal); parts.push(END);
  return new Blob(parts, { type: "application/x-canvaisdead-uploads" });
}

/** Validate the complete archive before handing any files to the import queue. */
export async function readUploadBackup(file: Blob, { signal, progress = () => {} }: Options = {}): Promise<Upload[]> {
  let offset = 0;
  const take = (length: number) => {
    check(signal);
    if (!Number.isSafeInteger(length) || length < 0 || offset + length > file.size) throw invalid();
    const part = file.slice(offset, offset + length); offset += length; return part;
  };
  const read = async () => {
    const length = new DataView(await take(4).arrayBuffer()).getUint32(0, true);
    if (!size(length, MAX_RECORD)) throw invalid();
    try { return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(await take(length).arrayBuffer())) as unknown; }
    catch (error) { if (signal?.aborted) throw error; throw invalid(); }
  };
  if (await take(MAGIC.length).text() !== MAGIC) throw Error("Choose a CanvaIsDead uploads backup (.canvaisdead-uploads).");
  const header = await read();
  if (!object(header) || header.format !== "canvaisdead-uploads" || header.version !== 1) throw Error("This uploads backup version is not supported.");
  if (!Number.isSafeInteger(header.count) || (header.count as number) < 0) throw invalid();
  const count = header.count as number, items: Upload[] = [], ids = new Set<string>();
  progress(0, count);
  for (let i = 0; i < count; i++) {
    const meta = await read();
    if (!object(meta) || !size(meta.originalBytes, MAX_UPLOAD_BYTES) || !size(meta.thumbnailBytes, MAX_PREVIEW) || !hash(meta.originalHash) || !hash(meta.thumbnailHash) || typeof meta.mime !== "string") throw invalid();
    const original = take(meta.originalBytes).slice(0, meta.originalBytes, meta.mime), thumbnail = take(meta.thumbnailBytes).slice(0, meta.thumbnailBytes, "image/png");
    const { id, name, mime, width, height, createdAt, updatedAt, trashedAt } = meta;
    const item = { version: 1, id, name, mime, width, height, createdAt, updatedAt, ...(trashedAt === undefined ? {} : { trashedAt }), original, thumbnail };
    if (!validUpload(item) || ids.has(item.id)) throw invalid();
    await media(item, signal);
    if (await digest(original, signal) !== meta.originalHash || await digest(thumbnail, signal) !== meta.thumbnailHash) throw Error("This uploads backup contains damaged file data. No files were imported.");
    ids.add(item.id); items.push(item); progress(i + 1, count);
  }
  if (await take(END.length).text() !== END || offset !== file.size) throw invalid();
  check(signal); return items;
}
