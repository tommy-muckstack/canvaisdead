import type { Design } from "./types";
import { isDesignLibrary } from "./validate";
import { designPages } from "./pages";

export const MAX_BACKUP_BYTES = 256 * 1024 * 1024;

// Only self-contained media and plain colors are portable. SVG paint-server URLs
// and external image references would make reopening a backup contact a server.
const localImage = /^data:image\/(?:png|jpeg|webp|gif|avif);base64,[a-z0-9+/]+={0,2}$/i;
const plainColor = /^(?:#[a-f0-9]{3,4}|#[a-f0-9]{6}|#[a-f0-9]{8}|[a-z]+|(?:rgb|hsl)a?\([\d\s.,%+\-/deg]+\))$/i;
export function parseDesignBackup(text: string): Design[] {
  if (text.length > MAX_BACKUP_BYTES || new Blob([text]).size > MAX_BACKUP_BYTES) throw new Error("Choose a backup no larger than 256 MiB.");
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new Error("This file is not a valid CanvaIsDead backup."); }
  return validateDesignBackup(value);
}

export function validateDesignBackup(value: unknown): Design[] {
  if (!value || typeof value !== "object" || !("format" in value) || value.format !== "canvaisdead" || !("version" in value)) {
    throw new Error("Choose a CanvaIsDead backup (.json) file.");
  }
  if (![1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12].includes(value.version as number)) throw new Error("This backup version is not supported. Open it in a compatible version of CanvaIsDead.");
  if (!("designs" in value) || !isDesignLibrary(value.designs)) throw new Error("This backup contains invalid design data. No designs were imported.");
  const designs = value.designs;
  if ((value.version as number) < 12 && designs.some(design => design.starred !== undefined)) throw Error("Starred designs require backup version 12. No designs were imported.");
  for (const design of designs) for (const page of designPages(design)) {
    if (!plainColor.test(page.bg) || new Set(page.els.map(element => element.id)).size !== page.els.length) {
      throw new Error("This backup contains invalid design data. No designs were imported.");
    }
    for (const element of page.els) {
      if (element.link !== undefined && (value.version as number) < 11) throw new Error("Links require backup version 11. No designs were imported.");
      if (element.textCurve !== undefined && (value.version as number) < 10) throw new Error("Curved text requires backup version 10. No designs were imported.");
      if (element.textEffect !== undefined && (value.version as number) < 9) throw new Error("Text effects require backup version 9. No designs were imported.");
      if (element.listStyle !== undefined && (value.version as number) < 8) throw new Error("Text lists require backup version 8. No designs were imported.");
      if (element.groupPath && (value.version as number) < 3) throw new Error("Grouped designs require backup version 3 or later. No designs were imported.");
      if (element.imageCrop && (value.version as number) < 4) throw new Error("Cropped images require backup version 4 or later. No designs were imported.");
      if ((element.letterSpacingEm !== undefined || element.textAnchor !== undefined) && (value.version as number) < 5) throw new Error("Text spacing and anchors require backup version 5. No designs were imported.");
      if ((element.flipX !== undefined || element.flipY !== undefined) && (value.version as number) < 6) throw new Error("Flipped images require backup version 6 or later. No designs were imported.");
      if (!plainColor.test(element.fill) || !plainColor.test(element.stroke) || element.w < 0 || element.h < 0 || element.radius < 0 || element.strokeWidth < 0 || element.opacity < 0 || element.opacity > 1 || (element.fontSize !== undefined && element.fontSize <= 0) || (element.lineHeight !== undefined && element.lineHeight <= 0)) {
        throw new Error("This backup contains invalid design data. No designs were imported.");
      }
      if (element.src && !localImage.test(element.src)) throw new Error("This backup contains an external or unsupported image. Use a backup with embedded PNG, JPEG, WebP, GIF or AVIF images.");
    }
  }
  return designs;
}

