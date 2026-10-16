import { canonicalContent } from "./content-hash";

/** Preserve unreadable payload bytes too. Never JSON-stringify a Blob into {}. */
export async function designRecoveryFile(raw: unknown) {
  if (raw && typeof raw === "object" && "data" in raw && raw.data instanceof Blob) {
    return { blob: raw.data, name: "canvaisdead-saved-data-recovery.canvaisdead" };
  }
  const parts: BlobPart[] = []; let pending = 0;
  for (const part of canonicalContent(raw)) {
    parts.push(part); pending += part.length;
    if (pending >= 1024 * 1024) { pending = 0; await new Promise<void>(resolve => setTimeout(resolve, 0)); }
  }
  return { blob: new Blob(parts, { type: "application/json" }), name: "canvaisdead-saved-data-recovery.txt" };
}
