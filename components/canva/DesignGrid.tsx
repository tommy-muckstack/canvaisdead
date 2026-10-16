"use client";
import Link from "next/link";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import type { Design } from "@/lib/design/types";
import { dateLabel } from "@/lib/design/ops";
import { pageCanvas } from "@/lib/design/pages";
import { deleteTrashedDesigns, duplicateDesign, isTrashed, renameDesign, restoreDesign, trashDesign, trashExpired, TRASH_RETENTION_MS, type TrashTarget } from "@/lib/design/library";
import { trackWebsite } from "@/lib/analytics/client";
import { Ic } from "./Ic";
import { DesignArtwork } from "./Artwork";

type Action = "copy" | "trash" | "restore" | "delete";
type UpdateLibrary = (update: (previous: Design[]) => Design[]) => Promise<boolean>;

function DesignCard({ design, disabled, onRename, onAction }: { design: Design; disabled: boolean; onRename: (name: string) => void; onAction: (action: Action) => void }) {
  const [menu, setMenu] = useState(false), [editing, setEditing] = useState(false);
  const [name, setName] = useState(design.name), [error, setError] = useState("");
  const card = useRef<HTMLDivElement>(null), trigger = useRef<HTMLButtonElement>(null), menuRef = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null), title = useRef<HTMLButtonElement>(null);
  const openAtEnd = useRef(false);
  const id = useId(), trashed = isTrashed(design);
  useEffect(() => {
    if (!menu) return;
    const items = menuRef.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)");
    items?.[openAtEnd.current ? items.length - 1 : 0]?.focus();
    const outside = (event: PointerEvent) => { if (event.target instanceof Node && !card.current?.contains(event.target)) setMenu(false); };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [menu]);
  useEffect(() => { if (editing) { input.current?.focus(); input.current?.select(); } }, [editing]);
  const startRename = () => { setMenu(false); setName(design.name); setError(""); setEditing(true); };
  const stopRename = () => { setEditing(false); requestAnimationFrame(() => title.current?.focus()); };
  function menuKey(event: KeyboardEvent<HTMLDivElement>) {
    const items = [...(menuRef.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? [])];
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); setMenu(false); trigger.current?.focus(); }
    else if (event.key === "Tab") { setMenu(false); trigger.current?.focus(); }
    else if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : (index + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
      items[next]?.focus();
    }
  }
  const action = (value: Action) => { setMenu(false); onAction(value); };
  return <div ref={card} className={"cd-card" + (menu ? " cd-card--menu" : "")} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setMenu(false); }}>
    {trashed ? <div className="cd-thumb" aria-hidden><DesignArtwork design={pageCanvas(design)} /></div> : <Link href={`/app/design/${design.id}`} className="cd-thumb" aria-label={`Open ${design.name}`}><DesignArtwork design={pageCanvas(design)} /></Link>}
    <div className="cd-meta">
      {editing ? <form className="cd-rename" onSubmit={event => {
        event.preventDefault();
        if (!name.trim()) { setError("Enter a name for your design."); input.current?.focus(); return; }
        onRename(name); stopRename();
      }} onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); stopRename(); } }}>
        <input ref={input} aria-label="Design name" aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined} value={name} onChange={event => { setName(event.target.value); setError(""); }} disabled={disabled} />
        <div><button type="submit" disabled={disabled}>Save</button><button type="button" onClick={stopRename}>Cancel</button></div>
        {error && <span id={`${id}-error`} role="alert">{error}</span>}
      </form> : trashed ? <b>{design.name}</b> : <button ref={title} className="cd-title" aria-label={`Rename ${design.name}`} disabled={disabled} onClick={startRename}><b>{design.name}</b><Ic n="edit" s={16} /></button>}
      <span className="ids-muted">{trashed ? `In Trash until ${dateLabel(design.trashedAt! + TRASH_RETENTION_MS)}` : `${design.w}×${design.h} · ${dateLabel(design.updatedAt)}`}</span>
    </div>
    <button ref={trigger} type="button" className="cd-more" aria-label={`More options for ${design.name}`} aria-expanded={menu} aria-controls={menu ? `${id}-menu` : undefined} aria-haspopup="menu" disabled={disabled} onClick={() => { openAtEnd.current = false; setMenu(!menu); }} onKeyDown={event => {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); openAtEnd.current = event.key === "ArrowUp"; setMenu(true); }
    }}><Ic n="more" /></button>
    {menu && <div ref={menuRef} id={`${id}-menu`} role="menu" aria-label={`Options for ${design.name}`} className="cd-menu" onKeyDown={menuKey}>
      {trashed ? <>
        <button role="menuitem" tabIndex={-1} disabled={disabled} onClick={() => action("restore")}><Ic n="undo" s={18} />Restore</button>
        <button role="menuitem" tabIndex={-1} disabled={disabled} className="cd-danger" onClick={() => action("delete")}><Ic n="trash" s={18} />Delete permanently</button>
      </> : <>
        <button role="menuitem" tabIndex={-1} disabled={disabled} onClick={startRename}><Ic n="edit" s={18} />Rename</button>
        <button role="menuitem" tabIndex={-1} disabled={disabled} onClick={() => action("copy")}><Ic n="copy" s={18} />Make a copy</button>
        <button role="menuitem" tabIndex={-1} disabled={disabled} onClick={() => action("trash")}><Ic n="trash" s={18} />Move to Trash</button>
      </>}
    </div>}
  </div>;
}

function DeleteConfirmation({ name, disabled, onCancel, onConfirm }: { name?: string; disabled: boolean; onCancel: () => void; onConfirm: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null), id = useId();
  useEffect(() => { const node = dialog.current; node?.showModal(); return () => node?.close(); }, []);
  return <dialog ref={dialog} className="cd-confirm" aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`} onCancel={event => { event.preventDefault(); onCancel(); }}>
    <h2 id={`${id}-title`}>{name !== undefined ? "Permanently delete this design?" : "Empty Trash?"}</h2>
    <p id={`${id}-description`}>{name !== undefined ? `“${name || "Untitled design"}” will be permanently deleted from this browser.` : "All designs currently in Trash will be permanently deleted from this browser."} This cannot be undone.</p>
    {disabled && <p role="alert">Resolve the save notice before deleting designs.</p>}
    <div><button className="cx-btn" autoFocus onClick={onCancel}>Cancel</button><button className="cx-btn cd-danger-button" disabled={disabled} onClick={onConfirm}>{name !== undefined ? "Delete permanently" : "Empty Trash"}</button></div>
  </dialog>;
}

export function DesignGrid({ designs, trashedDesigns, onUpdate, disabled, trash = false }: { designs: Design[]; trashedDesigns: Design[]; onUpdate: UpdateLibrary; disabled: boolean; trash?: boolean }) {
  const [message, setMessage] = useState("");
  const [undo, setUndo] = useState<TrashTarget | null>(null);
  const [confirmation, setConfirmation] = useState<{ targets: TrashTarget[]; name?: string } | null>(null);
  const container = useRef<HTMLDivElement>(null);
  const focus = () => { requestAnimationFrame(() => container.current?.focus()); };
  const announce = (saved: boolean, success: string) => { setMessage(saved ? success : "Change kept in this tab. Check the save notice before leaving."); };
  async function restore(target: TrashTarget) {
    if (!trashedDesigns.some(design => design.id === target.id && design.trashedAt === target.trashedAt && !trashExpired(design))) {
      setMessage("This design is no longer available to restore."); setUndo(null); focus(); return;
    }
    const saved = await onUpdate(previous => restoreDesign(previous, target));
    if (saved) trackWebsite("website_design_restored", {});
    announce(saved, "Design restored."); setUndo(null); focus();
  }
  async function action(design: Design, value: Action) {
    setUndo(null);
    if (value === "delete") { setConfirmation({ name: design.name, targets: [{ id: design.id, trashedAt: design.trashedAt! }] }); return; }
    if (value === "restore") { restore({ id: design.id, trashedAt: design.trashedAt! }); return; }
    if (value === "copy") {
      const saved = await onUpdate(previous => duplicateDesign(previous, design.id));
      if (saved) trackWebsite("website_design_created", { source: "copy" });
      announce(saved, "Design copied.");
    } else {
      const trashedAt = Date.now(), saved = await onUpdate(previous => trashDesign(previous, design.id, trashedAt));
      if (saved) { trackWebsite("website_design_trashed", {}); setUndo({ id: design.id, trashedAt }); }
      announce(saved, "Design moved to Trash.");
    }
    focus();
  }
  return <div ref={container} className="cd-library" tabIndex={-1} aria-label={trash ? "Trashed designs" : "Design library"}>
    {trash && <div className="cd-trash-info"><p>Designs stay in Trash for 30 days. Expired designs are removed when you open this library. Backups you have downloaded stay on your device.</p><button className="cx-btn" disabled={disabled || !trashedDesigns.length} onClick={() => setConfirmation({ targets: trashedDesigns.map(design => ({ id: design.id, trashedAt: design.trashedAt! })) })}>Empty Trash</button></div>}
    <div className="cd-library-notice"><span role="status" aria-live="polite">{message}</span>{undo && <button className="cx-btn" disabled={disabled} onClick={() => restore(undo)}>Undo</button>}</div>
    <div className="cd-grid" data-testid="designs">{designs.map(design => <DesignCard key={design.id} design={design} disabled={disabled} onAction={value => action(design, value)} onRename={async name => {
      const saved = await onUpdate(previous => renameDesign(previous, design.id, name));
      if (saved && design.name !== name.trim()) trackWebsite("website_design_renamed", {});
      announce(saved, "Design renamed."); focus();
    }} />)}</div>
    {confirmation && <DeleteConfirmation name={confirmation.name} disabled={disabled} onCancel={() => { setConfirmation(null); focus(); }} onConfirm={async () => {
      const saved = await onUpdate(previous => deleteTrashedDesigns(previous, confirmation.targets));
      if (saved) trackWebsite("website_design_deleted", {});
      announce(saved, "Permanently deleted from this browser."); setConfirmation(null); setUndo(null); focus();
    }} />}
  </div>;
}
