import type { Design } from "./types";
import { MAX_BACKUP_BYTES, parseDesignBackup, validateDesignBackup } from "./backup-validation";
import { designRecordsBlob, MAX_DESIGN_RECORD, readDesignRecords } from "./record-file";

/** Portable files retain stricter color/media checks than existing local records. */
export function designBackupBlob(designs: Design[]) {
  validateDesignBackup({ format: "canvaisdead", version: 11, designs });
  return designRecordsBlob(designs);
}

/** Legacy JSON remains supported; v7–v11 records are decoded incrementally. */
export async function readDesignBackup(file: Blob): Promise<Design[]> {
  const prefix = await file.slice(0, MAX_DESIGN_RECORD).text(), firstLine = prefix.split("\n", 1)[0];
  let header: unknown; try { header = JSON.parse(firstLine); } catch { /* Pretty-printed legacy JSON. */ }
  if (!header || typeof header !== "object" || !("encoding" in header)) {
    if (file.size > MAX_BACKUP_BYTES) throw Error("Legacy JSON backups are limited to 256 MiB. Use a .canvaisdead backup for larger libraries.");
    return parseDesignBackup(await file.text());
  }
  return validateDesignBackup({ format: "canvaisdead", version: 11, designs: await readDesignRecords(file) });
}
