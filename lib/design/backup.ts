import type { Design } from "./types";
import { uid } from "./ops";
import { isDesignLibrary } from "./validate";

export const MAX_BACKUP_BYTES = 50 * 1024 * 1024;

export function serializeDesignBackup(designs: Design[]) {
  return JSON.stringify({ format: "canvaisdead", version: 1, designs }, null, 2);
}

// Only self-contained media and plain colors are portable. SVG paint-server URLs
// and external image references would make reopening a backup contact a server.
const localImage = /^data:image\/(?:png|jpeg|webp|gif|avif);base64,[a-z0-9+/]+={0,2}$/i;
const plainColor = /^(?:#[a-f0-9]{3,4}|#[a-f0-9]{6}|#[a-f0-9]{8}|[a-z]+|(?:rgb|hsl)a?\([\d\s.,%+\-/deg]+\))$/i;
export function parseDesignBackup(text: string): Design[] {
  if (new Blob([text]).size > MAX_BACKUP_BYTES) throw new Error("Choose a backup smaller than 50 MB.");
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new Error("This file is not a valid CanvaIsDead backup."); }
  if (!value || typeof value !== "object" || !("format" in value) || value.format !== "canvaisdead" || !("version" in value)) {
    throw new Error("Choose a CanvaIsDead backup (.json) file.");
  }
  if (value.version !== 1) throw new Error("This backup version is not supported. Open it in a compatible version of CanvaIsDead.");
  if (!("designs" in value) || !isDesignLibrary(value.designs)) throw new Error("This backup contains invalid design data. No designs were imported.");
  const designs = value.designs;
  for (const design of designs) {
    if (!plainColor.test(design.bg) || new Set(design.els.map(element => element.id)).size !== design.els.length) {
      throw new Error("This backup contains invalid design data. No designs were imported.");
    }
    for (const element of design.els) {
      if (!plainColor.test(element.fill) || !plainColor.test(element.stroke) || element.w < 0 || element.h < 0 || element.radius < 0 || element.strokeWidth < 0 || element.opacity < 0 || element.opacity > 1 || (element.fontSize !== undefined && element.fontSize <= 0) || (element.lineHeight !== undefined && element.lineHeight <= 0)) {
        throw new Error("This backup contains invalid design data. No designs were imported.");
      }
      if (element.src && !localImage.test(element.src)) throw new Error("This backup contains an external or unsupported image. Use a backup with embedded PNG, JPEG, WebP, GIF or AVIF images.");
    }
  }
  return designs;
}

/** Import as new copies, retaining every existing design and all embedded media. */
export function importDesignCopies(existing: Design[], imported: Design[]): Design[] {
  const ids = new Set(existing.map(design => design.id));
  const copies = imported.map(design => {
    let id = uid("d");
    while (ids.has(id)) id = uid("d");
    ids.add(id);
    return { ...design, id, updatedAt: Date.now(), els: design.els.map(element => ({ ...element })) };
  });
  return [...copies, ...existing];
}

/** Download directly to the device; no upload, API call or hosted storage. */
export function downloadDesignBackup(designs: Design[]) {
  const blob = new Blob([serializeDesignBackup(designs)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "canvaisdead-designs.json";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
