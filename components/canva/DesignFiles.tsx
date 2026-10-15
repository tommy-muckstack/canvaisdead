"use client";
import { useRef, useState } from "react";
import type { Design } from "@/lib/design/types";
import { downloadDesignBackup, importDesignCopies } from "@/lib/design/backup";

import { readDesignBackup } from "@/lib/design/backup-file";
import { trackWebsite } from "@/lib/analytics/client";

export function DesignFiles({ designs, onImport }: { designs: Design[]; onImport: (update: (previous: Design[]) => Design[]) => Promise<boolean> }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function importFile(file: File) {
    setBusy(true); setMessage(""); setError("");
    try {
      const imported = await readDesignBackup(file);
      if (!imported.length) { setMessage("This backup contains no designs."); return; }
      if (await onImport(previous => importDesignCopies(previous, imported))) {
        trackWebsite("website_backup_completed", { action: "import" });
        setMessage(`${imported.length} ${imported.length === 1 ? "design imported as a new copy" : "designs imported as new copies"}.`);
      } else {
        setMessage("Backup read. Imported designs are available in this tab; check the save status before closing.");
      }
    } catch (cause) {
      trackWebsite("website_backup_failed", { action: "import" });
      setError(cause instanceof Error ? cause.message : "The backup could not be read. Try choosing the file again.");
    } finally { setBusy(false); }
  }
  return <div className="cv-design-files" aria-label="Local design files">
    <div className="cv-design-files__actions">
      <button type="button" className="cx-btn" onClick={() => input.current?.click()} disabled={busy}>{busy ? "Importing…" : "Import backup"}</button>
      <button type="button" className="cx-btn" disabled={!designs.length || busy} onClick={() => {
        setError("");
        try { downloadDesignBackup(designs); trackWebsite("website_backup_completed", { action: "download" }); } catch { trackWebsite("website_backup_failed", { action: "download" }); setError("The backup could not be downloaded. Try again."); }
      }}>Back up designs</button>
      <input ref={input} type="file" accept=".canvaisdead,.json,application/json,application/x-canvaisdead-backup" aria-label="Import design backup" hidden onChange={event => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (file) void importFile(file);
      }} />
    </div>
    <p className="ids-muted">Designs and images stay on this device. Import a backup as new copies.</p>
    {designs.some(design => design.trashedAt !== undefined) && <p className="ids-muted">Backups include Trash. Imported copies return to All projects.</p>}
    <p role="status" aria-live="polite">{message}</p>
    {error && <p role="alert">{error}</p>}
  </div>;
}
