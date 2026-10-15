import type { Design } from "./types";
import { MAX_BACKUP_BYTES, parseDesignBackup, validateDesignBackup } from "./backup-validation";

const HEADER = { format: "canvaisdead", version: 7, encoding: "json-records" };
const CHUNK = 32_768, MAX_RECORD = 256 * 1024;
const invalid = () => Error("This backup is incomplete or invalid. No designs were imported.");

/** Bounded JSON records avoid building a single library-sized JavaScript string.
 * Strings, including original data URLs, are split losslessly into UTF-16 chunks.
 * The final complete record is required, so truncation cannot import a partial library.
 */
export function designBackupBlob(designs: Design[]) {
  validateDesignBackup({ format: "canvaisdead", version: 6, designs });
  const parts: Blob[] = [];
  function emit(value: unknown) {
    const text = JSON.stringify(value) + "\n", part = new Blob([text]);
    if (part.size > MAX_RECORD) throw Error("This design contains an unsupported backup field.");
    parts.push(part);
  }
  function encode(value: unknown, depth = 0) {
    if (depth > 64) throw Error("This design contains unsupported nested data.");
    if (typeof value === "string") {
      emit(["string"]);
      for (let i = 0; i < value.length; i += CHUNK) emit(["chunk", value.slice(i, i + CHUNK)]);
      emit(["end-string"]);
    } else if (Array.isArray(value)) {
      emit(["array"]); for (const item of value) encode(item ?? null, depth + 1); emit(["end"]);
    } else if (value && typeof value === "object") {
      emit(["object"]);
      for (const [key, item] of Object.entries(value)) if (item !== undefined) { emit(["key", key]); encode(item, depth + 1); }
      emit(["end"]);
    } else if (value === null || typeof value === "boolean" || (typeof value === "number" && Number.isFinite(value))) emit(["value", value]);
    else throw Error("This design contains unsupported backup data.");
  }
  emit(HEADER); encode(designs); emit(["complete"]);
  return new Blob(parts, { type: "application/x-canvaisdead-backup" });
}

type Frame = { kind: "array"; value: unknown[] } | { kind: "object"; value: Record<string, unknown>; key?: string } | { kind: "string"; parts: string[] };
function recordReader() {
  const stack: Frame[] = []; let root: unknown, assigned = false, complete = false;
  const accept = (value: unknown) => {
    const frame = stack.at(-1);
    if (!frame) { if (assigned) throw invalid(); root = value; assigned = true; }
    else if (frame.kind === "array") frame.value.push(value);
    else if (frame.kind === "object" && frame.key !== undefined) { frame.value[frame.key] = value; delete frame.key; }
    else throw invalid();
  };
  return {
    record(value: unknown) {
      if (complete || !Array.isArray(value) || typeof value[0] !== "string") throw invalid();
      const [tag, data] = value, frame = stack.at(-1);
      if (value.length !== (["key", "chunk", "value"].includes(tag) ? 2 : 1)) throw invalid();
      if (frame?.kind === "string" && tag !== "chunk" && tag !== "end-string") throw invalid();
      if (["array", "object", "string"].includes(tag)) {
        if (stack.length > 64 || (!frame && assigned) || (frame?.kind === "object" && frame.key === undefined)) throw invalid();
        stack.push(tag === "array" ? { kind: "array", value: [] } : tag === "object" ? { kind: "object", value: Object.create(null) } : { kind: "string", parts: [] });
      } else if (tag === "key") {
        if (frame?.kind !== "object" || frame.key !== undefined || typeof data !== "string" || Object.hasOwn(frame.value, data)) throw invalid();
        frame.key = data;
      } else if (tag === "chunk") {
        if (frame?.kind !== "string" || typeof data !== "string" || data.length > CHUNK) throw invalid(); frame.parts.push(data);
      } else if (tag === "end-string") {
        if (frame?.kind !== "string") throw invalid(); stack.pop(); accept(frame.parts.join(""));
      } else if (tag === "end") {
        if (!frame || frame.kind === "string" || (frame.kind === "object" && frame.key !== undefined)) throw invalid(); stack.pop(); accept(frame.value);
      } else if (tag === "value") {
        if (data !== null && typeof data !== "boolean" && !(typeof data === "number" && Number.isFinite(data))) throw invalid(); accept(data);
      } else if (tag === "complete") {
        if (!assigned || stack.length) throw invalid(); complete = true;
      } else throw invalid();
    },
    finish: () => { if (!complete) throw invalid(); return validateDesignBackup({ format: "canvaisdead", version: 6, designs: root }); },
  };
}

/** Legacy JSON remains supported; v7 has no total-file cap and is decoded record by record.
 * The reconstructed editable library still needs to fit browser memory and available storage.
 */
export async function readDesignBackup(file: Blob): Promise<Design[]> {
  const prefix = await file.slice(0, MAX_RECORD).text(), firstLine = prefix.split("\n", 1)[0];
  let header: unknown; try { header = JSON.parse(firstLine); } catch { /* Pretty-printed legacy JSON. */ }
  if (!header || typeof header !== "object" || !("encoding" in header)) {
    if (file.size > MAX_BACKUP_BYTES) throw Error("Legacy JSON backups are limited to 256 MiB. Use a .canvaisdead backup for larger libraries.");
    return parseDesignBackup(await file.text());
  }
  if (!("format" in header) || header.format !== HEADER.format || !("version" in header) || header.version !== HEADER.version || header.encoding !== HEADER.encoding) throw Error("This backup version is not supported. Open it in a compatible version of CanvaIsDead.");
  const parser = recordReader(), reader = file.stream().getReader(), decoder = new TextDecoder("utf-8", { fatal: true });
  let buffer = "", line = 0;
  const consume = (text: string) => {
    if (new Blob([text]).size > MAX_RECORD) throw invalid();
    if (line++ === 0) return;
    if (!text.trim()) return;
    let value: unknown; try { value = JSON.parse(text); } catch { throw invalid(); }
    parser.record(value);
  };
  try {
    while (true) {
      const next = await reader.read(); buffer += decoder.decode(next.value, { stream: !next.done });
      let end: number;
      while ((end = buffer.indexOf("\n")) !== -1) { consume(buffer.slice(0, end)); buffer = buffer.slice(end + 1); }
      if (buffer.length > MAX_RECORD) throw invalid();
      if (next.done) break;
    }
    if (buffer.trim()) consume(buffer);
    return parser.finish();
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}
