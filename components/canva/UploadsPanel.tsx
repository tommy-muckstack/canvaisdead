"use client";
import { useEffect, useId, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { findUploads, UPLOAD_ACCEPT, UPLOAD_DRAG_TYPE, uploadFilename, type Upload } from "@/lib/uploads/model";
import type { UploadStore } from "@/lib/uploads/store";
import type { useUploads } from "./useUploads";
import { EditorContextMenu } from "./EditorContextMenu";
import { Ic } from "./Ic";
import { downloadLocalFile } from "@/lib/uploads/download";
import { UploadBackups } from "./UploadBackups";

export type UploadView = { query: string; tab: "Images" | "Videos" | "Audio" | "Trash" };
function Thumbnail({ blob }: { blob: Blob }) {
  const [url, setURL] = useState("");
  useEffect(() => { const next = URL.createObjectURL(blob); setURL(next); return () => URL.revokeObjectURL(next); }, [blob]);
  return url ? <img src={url} alt="" loading="lazy" draggable={false} /> : <span aria-hidden="true" />;
}
function download(item: Upload) {
  downloadLocalFile(item.original, uploadFilename(item));
}
function UploadDialog({ kind, items, store, onClose }: { kind: "rename" | "delete"; items: Upload[]; store: UploadStore; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null), heading = useId();
  const [name, setName] = useState(items[0].name), [busy, setBusy] = useState(false), [error, setError] = useState("");
  useEffect(() => { const node = dialog.current!; node.showModal(); return () => node.close(); }, []);
  return <dialog ref={dialog} className="cv-upload-dialog" aria-labelledby={heading} onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}><form onSubmit={async event => {
    event.preventDefault(); if (busy) return; if (kind === "rename" && !name.trim()) { setError("Enter a file name."); return; }
    setBusy(true); const targets = items.map(item => ({ id: item.id, action: kind === "rename" ? { kind: "rename" as const, name } : { kind: "delete" as const, trashedAt: item.trashedAt! } }));
    const ok = await store.change(targets); setBusy(false); if (ok) onClose(); else setError(store.getSnapshot().operationError ?? "Could not update this upload. Try again.");
  }}><h2 id={heading}>{kind === "rename" ? "Rename upload" : "Delete uploads permanently?"}</h2>{kind === "rename" ? <label>File name<input aria-label="File name" value={name} maxLength={200} autoFocus disabled={busy} onChange={event => { setName(event.currentTarget.value); setError(""); }} /></label> : <p>{items.length === 1 ? `“${items[0].name}”` : `${items.length} files`} will be removed from this browser's upload library. This cannot be undone. Copies already placed in designs will remain.</p>}{error && <p role="alert">{error}</p>}<div><button type="button" disabled={busy} onClick={onClose}>Cancel</button><button type="submit" disabled={busy} className={kind === "delete" ? "danger" : "cv-purple"}>{busy ? "Saving…" : kind === "rename" ? "Save" : "Delete permanently"}</button></div></form></dialog>;
}
export function UploadsPanel({ uploads, view, setView, onChoose, inserting, insertError }: { uploads: ReturnType<typeof useUploads>; view: UploadView; setView: Dispatch<SetStateAction<UploadView>>; onChoose: (items: Upload[]) => void; inserting: boolean; insertError: string }) {
  const input = useRef<HTMLInputElement>(null), search = useRef<HTMLInputElement>(null), trigger = useRef<HTMLButtonElement>(null), root = useRef<HTMLElement>(null), tabId = useId();
  const [menu, setMenu] = useState<{ item: Upload; x: number; y: number } | null>(null), [modal, setModal] = useState<{ kind: "rename" | "delete"; items: Upload[] } | null>(null);
  const [selecting, setSelecting] = useState(false), [selected, setSelected] = useState<string[]>([]), [dropping, setDropping] = useState(false);
  const trash = view.tab === "Trash", items = findUploads(uploads.assets, view.query, trash), chosen = items.filter(item => selected.includes(item.id));
  const patch = (value: Partial<UploadView>) => setView(previous => ({ ...previous, ...value }));
  const clearSelection = () => { setSelected([]); setSelecting(false); };
  const close = (focus = true) => { setMenu(null); if (focus) { const button = trigger.current; button?.focus({ preventScroll: true }); requestAnimationFrame(() => { if (button && !button.isConnected && document.activeElement === document.body) search.current?.focus(); }); } };
  const showMenu = (item: Upload, button: HTMLButtonElement, point?: { x: number; y: number }) => { trigger.current = button; const box = button.getBoundingClientRect(); setMenu({ item, ...point ?? { x: box.left, y: box.bottom } }); };
  const toggle = (id: string) => setSelected(previous => previous.includes(id) ? previous.filter(value => value !== id) : [...previous, id]);
  const change = async (targets: Upload[], kind: "trash" | "restore") => { if (await uploads.store.change(targets.map(item => ({ id: item.id, action: kind === "trash" ? { kind } : { kind, trashedAt: item.trashedAt! } })))) { clearSelection(); requestAnimationFrame(() => search.current?.focus({ preventScroll: true })); } };
  const importFiles = (files: FileList | null) => { if (files?.length) { patch({ tab: "Images" }); void uploads.store.enqueue(Array.from(files)); } };
  return <section ref={root} className={"cv-uploads-panel" + (dropping ? " dropping" : "")} aria-label="Uploads library" onDragOver={event => { if (event.dataTransfer.types.includes("Files")) { event.preventDefault(); event.dataTransfer.dropEffect = "copy"; setDropping(true); } }} onDragLeave={event => { if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) setDropping(false); }} onDrop={event => { if (event.dataTransfer.files.length) { event.preventDefault(); event.stopPropagation(); setDropping(false); importFiles(event.dataTransfer.files); } }} onKeyDown={event => { if (event.key.startsWith("Arrow") && !event.ctrlKey && !event.metaKey) event.stopPropagation(); }}>
    <div className="cv-psearch"><Ic n="search" s={18} /><input ref={search} type="search" aria-label="Search uploads" placeholder="Search uploads" value={view.query} onChange={event => { patch({ query: event.currentTarget.value }); setSelected([]); }} />{view.query && <button type="button" className="cv-clear-search" aria-label="Clear upload search" onClick={() => { patch({ query: "" }); search.current?.focus(); }}><Ic n="x" s={16} /></button>}</div>
    <input ref={input} data-testid="upload" type="file" accept={UPLOAD_ACCEPT} multiple hidden aria-label="Upload files" onChange={event => { importFiles(event.currentTarget.files); event.currentTarget.value = ""; }} /><button type="button" className="cv-purple cv-upload-file" onClick={() => input.current?.click()}><Ic n="up" s={18} />Upload files</button>
    <p className="cv-upload-local">Files stay in this browser. Drop images here to add them to your library.</p>
    <UploadBackups uploads={uploads} onImported={() => { patch({ tab: "Images", query: "" }); clearSelection(); }} />
    {inserting && <p role="status">Adding image to your design…</p>}{insertError && <p className="cv-upload-error" role="alert">{insertError}</p>}
    <div className="cv-upload-tabs" role="tablist" aria-label="Upload type">{(["Images", "Videos", "Audio", "Trash"] as const).map(tab => <button type="button" role="tab" id={`${tabId}-${tab}`} aria-controls={`${tabId}-panel`} aria-selected={view.tab === tab} tabIndex={view.tab === tab ? 0 : -1} key={tab} onClick={() => { patch({ tab }); clearSelection(); }} onKeyDown={event => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return; event.preventDefault(); const values = ["Images", "Videos", "Audio", "Trash"] as const, index = values.indexOf(tab), next = event.key === "Home" ? 0 : event.key === "End" ? 3 : (index + (event.key === "ArrowLeft" ? -1 : 1) + 4) % 4; patch({ tab: values[next] }); clearSelection(); document.getElementById(`${tabId}-${values[next]}`)?.focus();
    }}>{tab}</button>)}</div>
    {uploads.jobs.length > 0 && <ul className="cv-upload-jobs" aria-label="File imports">{uploads.jobs.map(job => <li key={job.id}><span>{job.name}</span><small role="status">{job.status === "queued" ? "Waiting…" : job.status === "reading" ? "Reading image…" : job.status === "saving" ? "Saving on this device…" : job.error}</small><div>{job.status === "failed" && <button type="button" onClick={() => { void uploads.store.retry(job.id); }}>Retry {job.name}</button>}<button type="button" disabled={job.status === "saving"} onClick={() => uploads.store.dismiss(job.id)}>{job.status === "failed" ? "Dismiss" : "Cancel"} {job.name}</button></div></li>)}</ul>}
    {uploads.status === "loading" && <p role="status">Loading uploads…</p>}{uploads.error && <div className="cv-upload-error" role="alert"><p>{uploads.error}</p><button type="button" onClick={() => { void uploads.store.refresh(); }}>Retry uploads</button></div>}{uploads.operationError && <div className="cv-upload-error" role="alert"><p>{uploads.operationError}</p><button type="button" onClick={uploads.store.clearOperationError}>Dismiss error</button></div>}
    <div id={`${tabId}-panel`} role="tabpanel" aria-labelledby={`${tabId}-${view.tab}`}>
      {view.tab === "Videos" || view.tab === "Audio" ? <p className="cv-upload-local">{view.tab === "Videos" ? "Video" : "Audio"} import and editing are not available yet.</p> : <>
        {trash && <p className="cv-upload-local">Uploads stay in Trash for 30 days. Removing an upload does not remove copies already placed in designs.</p>}
        {items.length > 0 && <div className="cv-upload-selection"><button type="button" aria-pressed={selecting} onClick={() => { if (selecting) clearSelection(); else setSelecting(true); }}>{selecting ? "Done selecting" : "Select items"}</button>{selecting && <><span role="status">{chosen.length} selected</span><button type="button" onClick={() => setSelected(items.map(item => item.id))}>Select all</button></>}</div>}
        {uploads.status === "ready" && items.length === 0 && <div className="cv-upload-empty"><Ic n={trash ? "trash" : "up"} s={32} /><h3>{view.query ? "No uploads found" : trash ? "Trash is empty" : "Upload your first image"}</h3><p>{view.query ? "Try a different file name or file type." : trash ? "Files you move to Trash will appear here." : "Choose files from your device, then select an image to add it to your design."}</p></div>}
        <div className="cv-upload-grid">{items.map(item => <div className={"cv-upload-card" + (selected.includes(item.id) ? " selected" : "")} key={item.id}>
          <button type="button" className="cv-upload-thumb" disabled={inserting && !selecting && !trash} aria-label={`${selecting || trash ? "Select" : "Add"} ${item.name}`} draggable={!trash && !selecting && !inserting} onDragStart={event => { event.dataTransfer.setData(UPLOAD_DRAG_TYPE, item.id); event.dataTransfer.effectAllowed = "copy"; }} onClick={() => { if (selecting || trash) { setSelecting(true); toggle(item.id); } else onChoose([item]); }} onContextMenu={event => { event.preventDefault(); showMenu(item, event.currentTarget, { x: event.clientX, y: event.clientY }); }} onKeyDown={event => { if (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")) { event.preventDefault(); event.stopPropagation(); showMenu(item, event.currentTarget); } }}><Thumbnail blob={item.thumbnail} /></button>
          <span className="cv-upload-name" title={item.name}>{item.name}</span><small>{item.mime.replace("image/", "").toUpperCase()} · {Math.max(1, Math.round(item.original.size / 1024))} KB</small>
          {selecting && <input className="cv-upload-check" type="checkbox" aria-label={`Select ${item.name}`} checked={selected.includes(item.id)} onChange={() => toggle(item.id)} />}
          <button type="button" className="cv-upload-more" aria-label={`Upload actions for ${item.name}`} aria-haspopup="menu" onClick={event => showMenu(item, event.currentTarget)}><Ic n="more" s={18} /></button>
        </div>)}</div>
        {selecting && chosen.length > 0 && <div className="cv-upload-bulk">{trash ? <><button type="button" onClick={() => { void change(chosen, "restore"); }}>Restore</button><button type="button" onClick={() => setModal({ kind: "delete", items: chosen })}>Delete permanently</button></> : <><button type="button" disabled={inserting} onClick={() => onChoose(chosen)}>Add to design</button><button type="button" onClick={() => { void change(chosen, "trash"); }}>Move to trash</button></>}</div>}
      </>}
    </div>
    {menu && <EditorContextMenu {...menu} label={`Upload actions for ${menu.item.name}`} trigger={trigger} onClose={close} actions={[
      { label: "Download original", run: () => download(menu.item) },
      ...(menu.item.trashedAt === undefined ? [
        { label: "Rename", run: () => setModal({ kind: "rename", items: [menu.item] }) },
        { label: "Select items", run: () => { setSelecting(true); setSelected([menu.item.id]); } },
        { label: "Move to trash", run: () => { void change([menu.item], "trash"); } },
      ] : [
        { label: "Restore", run: () => { void change([menu.item], "restore"); } },
        { label: "Delete permanently", run: () => setModal({ kind: "delete", items: [menu.item] }) },
      ]),
    ]} />}
    {modal && <UploadDialog kind={modal.kind} items={modal.items} store={uploads.store} onClose={() => { setModal(null); clearSelection(); requestAnimationFrame(() => { (trigger.current?.isConnected ? trigger.current : search.current)?.focus({ preventScroll: true }); }); }} />}
  </section>;
}
