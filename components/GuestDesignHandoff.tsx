"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@isdead/design";
import { BP } from "@/lib/basepath";
import { acknowledgeGuestHandoff, type GuestHandoff } from "@/lib/isdead-auth/handoff";
import { copyGuestDesigns, designStorageKey, handoffDestination, readGuestDesigns } from "@/lib/design/guest-handoff";
import { downloadDesignBackup } from "@/lib/design/backup";
import { isDesignLibrary } from "@/lib/design/validate";
import { localMemorySnapshot } from "@/lib/useLocal";

/** Also mounted after reload while the verified guest cookie still awaits acknowledgment. */
export function GuestDesignHandoff({ handoff, to }: { handoff: GuestHandoff; to?: string }) {
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [backupError, setBackupError] = useState("");
  const inFlight = useRef<Promise<Awaited<ReturnType<typeof copyGuestDesigns>>> | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const { guestId, accountId } = handoff;
  useEffect(() => { heading.current?.focus(); }, [error]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    let active = true;
    // Reuse work through StrictMode's setup/cleanup cycle; a retry starts only after rejection.
    const work = inFlight.current ??= (async () => {
      const copied = await copyGuestDesigns(window.localStorage, { guestId, accountId }, ns => localMemorySnapshot(ns, "designs"));
      await acknowledgeGuestHandoff(`${BP}/api/session/guest`, { guestId, accountId });
      return copied;
    })();
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

  const backup = (namespace: string, saved: boolean) => {
    setBackupError("");
    try {
      const memory = localMemorySnapshot(namespace, "designs");
      if (!saved && memory && ["saved", "unsaved", "conflict"].includes(memory.status) && isDesignLibrary(memory.value)) { downloadDesignBackup(memory.value); return; }
      const raw = localStorage.getItem(designStorageKey(namespace));
      try { downloadDesignBackup(readGuestDesigns(raw)); }
      catch {
        // Keep corrupt bytes recoverable too, without treating them as a valid import file.
        const url = URL.createObjectURL(new Blob([raw ?? ""], { type: "text/plain" }));
        const link = document.createElement("a");
        link.href = url; link.download = "canvaisdead-saved-data-recovery.txt";
        document.body.appendChild(link); link.click(); link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
      }
    } catch { setBackupError("The backup could not be read. Keep this tab open and restore browser storage access before retrying."); }
  };
  return <section className="guest-handoff" aria-labelledby="guest-handoff-title" aria-busy={!error}>
    <h1 ref={heading} tabIndex={-1} id="guest-handoff-title">{error ? "Your guest designs need attention" : "Bringing your guest designs with you…"}</h1>
    <p>Designs stay in this browser. Your guest originals are kept, and existing account designs are preserved.</p>
    {error ? <>
      <p role="alert">{error}</p>
      <p>Keep this tab open to protect unsaved edits. Download backups before reloading or leaving.</p>
      <div className="guest-handoff__actions">
        <Button variant="primary" onClick={() => { setError(""); setAttempt(value => value + 1); }}>Retry copying</Button>
        <Button variant="outline" onClick={() => backup(guestId, false)}>Download guest edits</Button>
        <Button variant="outline" onClick={() => backup(guestId, true)}>Download saved guest data</Button>
        <Button variant="outline" onClick={() => backup(accountId, false)}>Download account edits</Button>
        <Button variant="outline" onClick={() => backup(accountId, true)}>Download saved account data</Button>
      </div>
      {backupError && <p role="alert">{backupError}</p>}
      <form method="post" action={`${BP}/api/session/logout`}><Button variant="ghost">Sign out and keep guest session</Button></form>
    </> : <p role="status">Copying designs locally…</p>}
  </section>;
}
