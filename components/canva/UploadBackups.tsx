"use client";
import { useEffect, useRef, useState } from "react";
import { readUploadBackup, uploadBackupBlob, UPLOAD_BACKUP_EXTENSION } from "@/lib/uploads/backup";
import { downloadLocalFile } from "@/lib/uploads/download";
import type { useUploads } from "./useUploads";
import { track, EVENTS } from "@/lib/analytics";

function cancellable<T>(work: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const abort = () => reject(new DOMException("Backup cancelled", "AbortError"));
    signal.addEventListener("abort", abort, { once: true });
    void work.then(resolve, reject).finally(() => signal.removeEventListener("abort", abort));
    if (signal.aborted) abort();
  });
}

export function UploadBackups({ uploads, onImported }: { uploads: ReturnType<typeof useUploads>; onImported: () => void }) {
  const input = useRef<HTMLInputElement>(null), controller = useRef<AbortController | null>(null), alive = useRef(false);
  const [busy, setBusy] = useState(false), [saving, setSaving] = useState(false), [message, setMessage] = useState(""), [error, setError] = useState("");
  useEffect(() => { alive.current = true; return () => { alive.current = false; controller.current?.abort(); }; }, []);
  useEffect(() => {
    if (!busy) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn);
  }, [busy]);
  async function run(file?: File) {
    if (controller.current) return;
    const task = new AbortController(); controller.current = task; setBusy(true); setError(""); setMessage(file ? "Checking uploads backup…" : "Waiting for imports to finish…");
    const progress = (done: number, total: number) => { if (alive.current && !task.signal.aborted) setMessage(`${file ? "Checking" : "Backing up"} uploads: ${done} of ${total}…`); };
    try {
      if (file) {
        const items = await readUploadBackup(file, { signal: task.signal, progress });
        task.signal.throwIfAborted(); if (!alive.current) return;
        if (!items.length) { setMessage("This backup contains no uploads."); return; }
        await uploads.readSnapshot(); // Preserve an unreadable existing library for recovery.
        task.signal.throwIfAborted(); if (!alive.current) return;
        setSaving(true); setMessage("Saving restored copies in this browser…");
        const result = await uploads.store.enqueueCopies(items);
        track(result.length === items.length ? EVENTS.app_backup_completed : EVENTS.app_backup_failed, { action: "import", library: "uploads" });
        if (!alive.current) return;
        onImported();
        setMessage(`${result.length} of ${items.length} uploads restored as new copies in Images.${result.length < items.length ? " Retry failed files in the import list below; keep this tab open." : ""}`);
      } else {
        const complete = await cancellable(uploads.store.settle(), task.signal);
        task.signal.throwIfAborted(); if (!alive.current) return;
        const snapshot = await uploads.readSnapshot();
        const blob = await uploadBackupBlob(snapshot.assets, { signal: task.signal, progress });
        task.signal.throwIfAborted(); if (!alive.current) return;
        downloadLocalFile(blob, `canvaisdead-uploads${UPLOAD_BACKUP_EXTENSION}`);
        track(EVENTS.app_backup_completed, { action: "download", library: "uploads" });
        setMessage(`Backup download started with ${snapshot.assets.length} saved uploads, including Trash.${complete ? "" : " Failed imports are not included; keep their original files."}`);
      }
    } catch (cause) {
      if (!task.signal.aborted) track(EVENTS.app_backup_failed, { action: file ? "import" : "download", library: "uploads" });
      if (alive.current) {
        setMessage("");
        if (task.signal.aborted) setMessage("Backup cancelled. Existing uploads have not been changed.");
        else setError(cause instanceof Error ? cause.message : "The uploads backup could not be read or created. Try again.");
      }
    } finally {
      if (controller.current === task) controller.current = null;
      if (alive.current) { setBusy(false); setSaving(false); }
    }
  }
  return <details className="cv-upload-backups"><summary>Back up or restore uploads</summary>
    <p>Back up saved originals and Trash to your device. Restore adds new copies to Images, including files backed up from Trash. Existing files stay intact.</p>
    <div><button type="button" disabled={busy} onClick={() => { void run(); }}>Back up uploads</button>
      <button type="button" disabled={busy} onClick={() => input.current?.click()}>Restore uploads</button>
      {busy && !saving && <button type="button" onClick={() => controller.current?.abort()}>Cancel backup</button>}
    </div>
    <input ref={input} type="file" accept={UPLOAD_BACKUP_EXTENSION} aria-label="Restore uploads backup" hidden onChange={event => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ""; if (file) void run(file); }} />
    <p role="status" aria-live="polite">{message}</p>{error && <p className="cv-upload-error" role="alert">{error}</p>}
  </details>;
}
