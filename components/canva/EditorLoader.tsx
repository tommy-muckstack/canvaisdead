"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useDesignLibrary } from "@/lib/useDesignLibrary";
import { isTrashed } from "@/lib/design/library";
import type { Design, El } from "@/lib/design/types";
import { downloadDesignBackup, importDesignCopies } from "@/lib/design/backup";
import { copyElements } from "@/lib/design/groups";
import { uid as newId } from "@/lib/design/ops";
import { trackWebsite } from "@/lib/analytics/client";
import { Editor } from "./Editor";
import { SaveNotice } from "./SaveNotice";
import { DesignCreationProvider } from "./DesignCreation";
type EditorLoaderProps = { uid: string; id: string; guest?: boolean };
export function EditorLoader(props: EditorLoaderProps) {
  // A new design/account owns a new async operation and creation-dialog lifetime.
  return <EditorSession key={`${props.uid}:${props.id}`} {...props} />;
}
function EditorSession({ uid, id, guest = false }: EditorLoaderProps) {
  const [designs, setDesigns, ready, save] = useDesignLibrary(uid);
  const router = useRouter(), alive = useRef(false), pendingCopy = useRef<string | null>(null), copyBusy = useRef(false);
  const [copying, setCopying] = useState(false);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const openCopy = (saved: boolean) => {
    if (!alive.current) return;
    if (saved && pendingCopy.current) {
      trackWebsite("website_design_created", { source: "copy" });
      router.push(`/app/design/${pendingCopy.current}`);
    } else { copyBusy.current = false; setCopying(false); }
  };
  const copy = async (source: Design) => {
    if (copyBusy.current || save.status !== "saved") return;
    // A later autosave may already have persisted a previously failed copy.
    if (pendingCopy.current) { copyBusy.current = true; setCopying(true); openCopy(true); return; }
    const imported = importDesignCopies(designs, [{ ...source, name: `Copy of ${source.name}` }])[0];
    const independentElements = (elements: El[]) => copyElements(elements, () => newId(), () => newId("g"));
    const next = "pages" in imported
      ? { ...imported, pages: imported.pages.map(page => ({ ...page, els: independentElements(page.els) })) }
      : { ...imported, els: independentElements(imported.els) };
    pendingCopy.current = next.id; copyBusy.current = true; setCopying(true);
    // Insert a single immutable snapshot. A failed write retains this same copy
    // for Retry; a second click cannot create a second pending duplicate.
    const saved = await setDesigns(previous => [next, ...previous]);
    openCopy(saved && await save.retry());
  };
  const copySave = { ...save, retry: async () => { const saved = await save.retry(); openCopy(saved); return saved; } };
  const onSave = useCallback((design: Design) => { void setDesigns(previous => previous.map(item => item.id === design.id && !isTrashed(item) ? design : item)); }, [setDesigns]);
  if (!ready) return <div className="cd" aria-busy>Loading…</div>;
  if (save.status === "load-error") return <div className="cd"><SaveNotice save={save} /></div>;
  const d = designs.find(x => x.id === id);
  if (d && isTrashed(d)) return <div className="cd"><SaveNotice save={save} onBackup={() => downloadDesignBackup(designs)} /><h2>This design is in Trash.</h2><p>Restore it from <Link href="/app/projects?view=trash">Trash</Link> to keep editing.</p></div>;
  if (!d) return <div className="cd"><h2>That design isn't in this browser.</h2><p className="ids-muted">Designs are saved in your browser. <Link href="/app">Back to your designs</Link></p></div>;
  return <DesignCreationProvider uid={uid}><Editor uid={uid} initial={d} onSave={onSave} save={copySave} guest={guest} copying={copying} onCopy={copy} onBackup={() => downloadDesignBackup(designs)} /></DesignCreationProvider>;
}
