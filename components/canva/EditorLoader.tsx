"use client";
import Link from "next/link";
import { useCallback } from "react";
import { useDesignLibrary } from "@/lib/useDesignLibrary";
import { isTrashed } from "@/lib/design/library";
import type { Design } from "@/lib/design/types";
import { downloadDesignBackup } from "@/lib/design/backup";
import { Editor } from "./Editor";
import { SaveNotice } from "./SaveNotice";
export function EditorLoader({ uid, id, guest = false }: { uid: string; id: string; guest?: boolean }) {
  const [designs, setDesigns, ready, save] = useDesignLibrary(uid);
  const onSave = useCallback((design: Design) => { void setDesigns(previous => previous.map(item => item.id === design.id && !isTrashed(item) ? design : item)); }, [setDesigns]);
  if (!ready) return <div className="cd" aria-busy>Loading…</div>;
  if (save.status === "load-error") return <div className="cd"><SaveNotice save={save} /></div>;
  const d = designs.find(x => x.id === id);
  if (d && isTrashed(d)) return <div className="cd"><SaveNotice save={save} onBackup={() => downloadDesignBackup(designs)} /><h2>This design is in Trash.</h2><p>Restore it from <Link href="/app/projects?view=trash">Trash</Link> to keep editing.</p></div>;
  if (!d) return <div className="cd"><h2>That design isn't in this browser.</h2><p className="ids-muted">Designs are saved in your browser. <Link href="/app">Back to your designs</Link></p></div>;
  return <Editor key={`${uid}:${d.id}`} uid={uid} initial={d} onSave={onSave} save={save} guest={guest} onBackup={() => downloadDesignBackup(designs)} />;
}
