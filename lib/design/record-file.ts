import type { Design } from "./types";

export const DESIGN_RECORD_HEADER = { format: "canvaisdead", version: 7, encoding: "json-records" };
/** Version 8 carries list formatting; older readers must not silently lose it. */
export function hasTextLists(value: unknown): boolean {
  const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
  return Array.isArray(value) && value.some(design => record(design) && (Array.isArray(design.pages) ? design.pages : [design]).some(page => record(page) && Array.isArray(page.els) && page.els.some(element => record(element) && element.listStyle !== undefined)));
}
const CHUNK = 32_768;
export const MAX_DESIGN_RECORD = 256 * 1024;
const invalid = () => Error("This backup is incomplete or invalid. No designs were imported.");

/** Bounded JSON records avoid building a single library-sized JavaScript string.
 * Strings, including original data URLs, are split losslessly into UTF-16 chunks.
 * The final complete record is required, so truncation cannot import a partial library.
 */
function* designRecords(designs: Design[]): Generator<Blob> {
  function emit(value: unknown) {
    const text = JSON.stringify(value) + "\n", part = new Blob([text]);
    if (part.size > MAX_DESIGN_RECORD) throw Error("This design contains an unsupported backup field.");
    return part;
  }
  function* encode(value: unknown, depth = 0): Generator<Blob> {
    if (depth > 64) throw Error("This design contains unsupported nested data.");
    if (typeof value === "string") {
      yield emit(["string"]);
      for (let i = 0; i < value.length; i += CHUNK) yield emit(["chunk", value.slice(i, i + CHUNK)]);
      yield emit(["end-string"]);
    } else if (Array.isArray(value)) {
      yield emit(["array"]); for (const item of value) yield* encode(item ?? null, depth + 1); yield emit(["end"]);
    } else if (value && typeof value === "object") {
      if (![Object.prototype, null].includes(Object.getPrototypeOf(value))) throw Error("This design contains unsupported data. Existing saved data has not been changed.");
      yield emit(["object"]);
      for (const [key, item] of Object.entries(value)) if (item !== undefined) { yield emit(["key", key]); yield* encode(item, depth + 1); }
      yield emit(["end"]);
    } else if (value === null || typeof value === "boolean" || (typeof value === "number" && Number.isFinite(value))) yield emit(["value", value]);
    else throw Error("This design contains unsupported backup data.");
  }
  yield emit({ ...DESIGN_RECORD_HEADER, version: hasTextLists(designs) ? 8 : 7 }); yield* encode(designs); yield emit(["complete"]);
}
export const designRecordsBlob = (designs: Design[]) => new Blob([...designRecords(designs)], { type: "application/x-canvaisdead-backup" });
/** Autosave yields while encoding, so pending edits can coalesce without blocking input. */
export async function designStorageBlob(designs: Design[]) {
  const parts: Blob[] = []; let pending = 0;
  for (const part of designRecords(designs)) {
    parts.push(part); pending += part.size;
    if (pending >= 1024 * 1024) { pending = 0; await new Promise<void>(resolve => setTimeout(resolve, 0)); }
  }
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
    finish: () => { if (!complete) throw invalid(); return root; },
  };
}

/** Decode the shared storage/backup payload without imposing portable-import restrictions.
 * Callers validate the reconstructed value for their own trust boundary.
 */
export async function readDesignRecords(file: Blob): Promise<unknown> {
  const prefix = await file.slice(0, MAX_DESIGN_RECORD).text(), firstLine = prefix.split("\n", 1)[0];
  let header: unknown; try { header = JSON.parse(firstLine); } catch { throw invalid(); }
  if (!header || typeof header !== "object" || !("encoding" in header)) throw invalid();
  if (!("format" in header) || header.format !== DESIGN_RECORD_HEADER.format || !("version" in header) || ![7, 8].includes(header.version as number) || header.encoding !== DESIGN_RECORD_HEADER.encoding) throw Error("This backup version is not supported. Open it in a compatible version of CanvaIsDead.");
  const parser = recordReader(), reader = file.stream().getReader(), decoder = new TextDecoder("utf-8", { fatal: true });
  let buffer = "", line = 0;
  const consume = (text: string) => {
    if (new Blob([text]).size > MAX_DESIGN_RECORD) throw invalid();
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
      if (buffer.length > MAX_DESIGN_RECORD) throw invalid();
      if (next.done) break;
    }
    if (buffer.trim()) consume(buffer);
    const value = parser.finish();
    if (header.version === 7 && hasTextLists(value)) throw Error("Text lists require backup version 8. No designs were imported.");
    return value;
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}
