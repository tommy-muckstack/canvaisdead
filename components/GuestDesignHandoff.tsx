"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@isdead/design";
import { BP } from "@/lib/basepath";
import { acknowledgeGuestHandoff, type GuestHandoff } from "@/lib/isdead-auth/handoff";
import { copyGuestDesigns, handoffDestination } from "@/lib/design/guest-handoff";
import { downloadDesignBackup } from "@/lib/design/backup";
import { isDesignLibrary } from "@/lib/design/validate";
import { designMemorySnapshot } from "@/lib/useDesignLibrary";
import { createDesignRepository } from "@/lib/design/repository";
import { createUploadRepository } from "@/lib/uploads/repository";
import { copyGuestUploads, transferGuestWorkspace } from "@/lib/uploads/guest-handoff";
import { notifyUploadChange, uploadMemoryStore, useUploads } from "./canva/useUploads";
import { downloadLocalFile } from "@/lib/uploads/download";
import { uploadFilename } from "@/lib/uploads/model";

/** Also mounted after reload while the verified guest cookie still awaits acknowledgment. */
export function GuestDesignHandoff({ handoff, to }: { handoff: GuestHandoff; to?: string }) {
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [backupError, setBackupError] = useState("");
  const [progress, setProgress] = useState("Preparing local files…");
  const uploads = useUploads(handoff.guestId), accountUploads = useUploads(handoff.accountId);
  const inFlight = useRef<Promise<Awaited<ReturnType<typeof copyGuestDesigns>>> | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const { guestId, accountId } = handoff;
  useEffect(() => { heading.current?.focus(); }, [error]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    let active = true;
    // Reuse work through StrictMode's setup/cleanup cycle; a retry starts only after rejection.
    const work = inFlight.current ??= transferGuestWorkspace(
      () => copyGuestUploads({ guestId, accountId }, createUploadRepository(guestId), createUploadRepository(accountId), uploadMemoryStore,
        (done, total) => setProgress(`Copying uploads locally: ${done} of ${total}…`), () => notifyUploadChange(accountId)),
      () => copyGuestDesigns(createDesignRepository(), { guestId, accountId }, designMemorySnapshot,
        (done, total) => setProgress(`Copying designs locally: ${done} of ${total}…`)),
      () => { setProgress("Confirming sign-in…"); return acknowledgeGuestHandoff(`${BP}/api/session/guest`, { guestId, accountId }); },
    );
    work.then(result => {
      if (!active) return;
      window.removeEventListener("beforeunload", warn);
      window.location.replace(handoffDestination(to ?? location.pathname + location.search + location.hash, result.designIds));
    }).catch(reason => {
      if (!active) return;
      inFlight.current = null;
      setError(reason instanceof Error ? reason.message : "Browser storage is unavailable. Retry copying or download a backup.");
    });
    return () => { active = false; window.removeEventListener("beforeunload", warn); };
  }, [guestId, accountId, to, attempt]);

  const backup = async (namespace: string, saved: boolean) => {
    setBackupError("");
    try {
      const memory = designMemorySnapshot(namespace);
      if (!saved && memory && ["saved", "saving", "unsaved", "conflict"].includes(memory.status) && isDesignLibrary(memory.value)) { downloadDesignBackup(memory.value); return; }
      const repository = createDesignRepository();
      try { downloadDesignBackup((await repository.read(namespace)).value); }
      catch {
        // Keep corrupt bytes recoverable too, without treating them as a valid import file.
        const raw = await repository.recover!(namespace);
        const url = URL.createObjectURL(new Blob([JSON.stringify(raw, null, 2)], { type: "text/plain" }));
        const link = document.createElement("a");
        link.href = url; link.download = "canvaisdead-saved-data-recovery.txt";
        document.body.appendChild(link); link.click(); link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
      }
    } catch { setBackupError("The backup could not be read. Keep this tab open and restore browser storage access before retrying."); }
  };
  return <section className="guest-handoff" aria-labelledby="guest-handoff-title" aria-busy={!error}>
    <h1 ref={heading} tabIndex={-1} id="guest-handoff-title">{error ? "Your guest files need attention" : "Bringing your designs and uploads with you…"}</h1>
    <p>Designs and uploads stay in this browser. Your guest originals are kept, and existing account files are preserved.</p>
    {error ? <>
      <p role="alert">{error}</p>
      <p>Keep this tab open to protect unsaved edits. Download backups before reloading or leaving.</p>
      <UploadRecovery uploads={uploads} label="Guest" />
      <UploadRecovery uploads={accountUploads} label="Account" />
      <div className="guest-handoff__actions">
        <Button variant="primary" onClick={() => { setError(""); setProgress("Preparing local files…"); setAttempt(value => value + 1); }}>Retry copying</Button>
        <Button variant="outline" onClick={() => backup(guestId, false)}>Download guest edits</Button>
        <Button variant="outline" onClick={() => backup(guestId, true)}>Download saved guest data</Button>
        <Button variant="outline" onClick={() => backup(accountId, false)}>Download account edits</Button>
        <Button variant="outline" onClick={() => backup(accountId, true)}>Download saved account data</Button>
      </div>
      {backupError && <p role="alert">{backupError}</p>}
      <form method="post" action={`${BP}/api/session/logout`}><Button variant="ghost">Sign out and keep guest session</Button></form>
    </> : <p role="status">{progress}</p>}
  </section>;
}

function UploadRecovery({ uploads, label }: { uploads: ReturnType<typeof useUploads>; label: string }) {
  return <>
      {uploads.jobs.length > 0 && <ul className="cv-upload-jobs" aria-label={`${label} imports`}>{uploads.jobs.map(job => <li key={job.id}>
        <span>{label}: {job.name}</span><small role="status">{job.status === "failed" ? job.error : job.status === "saving" ? "Saving on this device…" : "Preparing import…"}</small>
        <div><button type="button" onClick={() => { const file = uploads.store.pendingFile(job.id); if (file) downloadLocalFile(file, file.name); }}>Download original</button>
          {job.status === "failed" && <><button type="button" onClick={() => { void uploads.store.retry(job.id); }}>Retry import</button><button type="button" onClick={() => uploads.store.dismiss(job.id)}>Skip this import</button></>}
        </div>
      </li>)}</ul>}
      {uploads.assets.length > 0 && <details><summary>Download {label.toLowerCase()} original files</summary><ul className="cv-upload-jobs">{uploads.assets.map(item => <li key={item.id}><span>{item.name}{item.trashedAt === undefined ? "" : " (Trash)"}</span><button type="button" onClick={() => downloadLocalFile(item.original, uploadFilename(item))}>Download original</button></li>)}</ul></details>}
  </>;
}
