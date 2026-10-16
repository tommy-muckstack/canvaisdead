import type { Design } from "./types";
import { uid } from "./ops";
import { isDesignLibrary } from "./validate";
import { designPages } from "./pages";
import { copyElements } from "./groups";
import { designBackupBlob } from "./backup-file";
import { hasTextCurves, hasTextEffects, hasTextLists } from "./record-file";

export { MAX_BACKUP_BYTES, parseDesignBackup, validateDesignBackup } from "./backup-validation";

export function serializeDesignBackup(designs: Design[]) {
  const elements = isDesignLibrary(designs) ? designs.flatMap(design => designPages(design).flatMap(page => page.els)) : [];
  const version = hasTextCurves(designs) ? 10 : hasTextEffects(designs) ? 9 : hasTextLists(designs) ? 8 : elements.some(e => e.flipX !== undefined || e.flipY !== undefined) ? 6 : elements.some(e => e.letterSpacingEm !== undefined || e.textAnchor !== undefined) ? 5 : elements.some(e => e.imageCrop) ? 4 : elements.some(e => e.groupPath?.length) ? 3 : 2;
  return JSON.stringify({ format: "canvaisdead", version, designs }, null, 2);
}

/** Import as new copies, retaining every existing design and all embedded media. */
export function importDesignCopies(existing: Design[], imported: Design[]): Design[] {
  const ids = new Set(existing.map(design => design.id));
  const copies = imported.map(design => {
    let id = uid("d");
    while (ids.has(id)) id = uid("d");
    ids.add(id);
    const content = "pages" in design
      ? { pages: design.pages.map(page => ({ ...page, id: uid("p"), els: copyElements(page.els) })) }
      : { els: copyElements(design.els) };
    const copy = { ...design, ...content, id, updatedAt: Date.now() };
    // A backup is an explicit recovery operation. Imported copies are active,
    // even when the original was in Trash or its retention period has expired.
    delete copy.trashedAt;
    return copy;
  });
  return [...copies, ...existing];
}

/** Download directly to the device; no upload, API call or hosted storage. */
export function downloadDesignBackup(designs: Design[]) {
  const blob = designBackupBlob(designs);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "canvaisdead-designs.canvaisdead";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
