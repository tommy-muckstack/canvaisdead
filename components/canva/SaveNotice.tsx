"use client";
import { useState } from "react";
import type { SaveState } from "@/lib/local-store";

export function SaveNotice({ save, onBackup }: { save: SaveState; onBackup?: () => void }) {
  const [backupError, setBackupError] = useState("");
  if (!save.error) return null;
  return <div className="cv-save-notice" role="alert">
    <p>{save.error}</p>
    {onBackup && <button type="button" onClick={() => {
      setBackupError("");
      try { onBackup(); } catch { setBackupError("The backup could not be created. Keep this tab open and try again."); }
    }}>Download backup</button>}
    {backupError && <p role="alert">{backupError}</p>}
    {save.status !== "conflict" && <button type="button" onClick={save.retry}>{save.status === "load-error" ? "Retry reading designs" : "Retry saving"}</button>}
  </div>;
}
