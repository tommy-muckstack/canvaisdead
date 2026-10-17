"use client";
import Link from "next/link";
import { useRef, useState, type DragEvent } from "react";
import type { Design } from "@/lib/design/types";
import { isTrashed } from "@/lib/design/library";
import { designPages, pageCanvas } from "@/lib/design/pages";
import { PROJECT_PAGE_DRAG_TYPE } from "@/lib/design/project-pages";
import { DesignArtwork } from "./Artwork";
import { EditorContextMenu } from "./EditorContextMenu";
import { Ic } from "./Ic";

export type ProjectPanelView = { query: string; starred: boolean; designId?: string };
export function ProjectsPanel({ designs, currentId, disabled, view, onView, onStar, onChoose, error }: {
  designs: Design[]; currentId: string; disabled: boolean; view: ProjectPanelView;
  onView: (view: ProjectPanelView) => void; onStar: (id: string, starred: boolean) => Promise<boolean>;
  onChoose: (designId: string, pageIds: string[], trigger: HTMLElement) => void; error: string;
}) {
  const [message, setMessage] = useState("");
  const [menu, setMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const trigger = useRef<HTMLButtonElement | null>(null), panel = useRef<HTMLElement>(null), heading = useRef<HTMLHeadingElement>(null);
  const query = view.query.trim().toLocaleLowerCase();
  const visible = designs.filter(design => !isTrashed(design) && (!view.starred || design.starred) && (!query || design.name.toLocaleLowerCase().includes(query))).sort((a, b) => b.updatedAt - a.updatedAt);
  const source = view.designId ? designs.find(design => design.id === view.designId && !isTrashed(design)) : null;
  const sourcePages = source ? designPages(source) : [];
  const chosen = menu ? designs.find(design => design.id === menu.id && !isTrashed(design)) : null;
  const star = async (design: Design, button?: HTMLButtonElement) => {
    const saved = await onStar(design.id, !design.starred);
    setMessage(saved ? design.starred ? "Design removed from Starred." : "Design added to Starred." : "Change kept in this tab. Check the save notice before leaving.");
    requestAnimationFrame(() => (button?.isConnected ? button : panel.current)?.focus({ preventScroll: true }));
  };
  const drag = (event: DragEvent<HTMLButtonElement>, design: Design, pageIds: string[]) => {
    if (disabled) { event.preventDefault(); return; }
    event.dataTransfer.effectAllowed = "copy"; event.dataTransfer.setData(PROJECT_PAGE_DRAG_TYPE, JSON.stringify({ designId: design.id, pageIds }));
  };
  const back = () => {
    onView({ ...view, designId: undefined }); setMessage("");
    requestAnimationFrame(() => (Array.from(panel.current?.querySelectorAll<HTMLButtonElement>("[data-project-id]") ?? []).find(button => button.dataset.projectId === view.designId) ?? panel.current)?.focus({ preventScroll: true }));
  };
  return <section ref={panel} className="cv-projects" aria-label="Projects panel" tabIndex={-1}>
    {view.designId && <button type="button" className="cv-project-back" onClick={back}><Ic n="chevl" s={18} />Back to designs</button>}
    <h3 ref={heading} tabIndex={-1}>{view.designId ? source?.name ?? "Design unavailable" : "Projects"}</h3>
    {view.designId ? source ? <>
      <div className="cv-project-source"><span>{sourcePages.length} {sourcePages.length === 1 ? "page" : "pages"}</span><Link href={`/app/design/${source.id}`} aria-label={`Open ${source.name}`}>Open design</Link></div>
      <button type="button" className="cv-project-apply" disabled={disabled} onClick={event => onChoose(source.id, sourcePages.map(page => page.id), event.currentTarget)}>Apply all {sourcePages.length} pages</button>
      <div className="cv-project-grid cv-project-pages">{sourcePages.map((page, index) => <article key={page.id} className="cv-project-page">
        <button type="button" className="cv-project-thumb" aria-label={`Use page ${index + 1}${page.title ? `: ${page.title}` : ""}`} disabled={disabled} draggable={!disabled} onDragStart={event => drag(event, source, [page.id])} onClick={event => onChoose(source.id, [page.id], event.currentTarget)}><DesignArtwork design={pageCanvas(source, page.id)} /></button>
        <b>{index + 1}{page.title ? ` · ${page.title}` : ""}</b>
      </article>)}</div>
    </> : <p role="status">This design is no longer available. Go back to choose another design.</p> : <>
      <label className="cv-psearch"><Ic n="search" s={18} /><input aria-label="Search your projects" placeholder="Search your projects" value={view.query} onChange={event => onView({ ...view, query: event.target.value })} />{view.query && <button type="button" aria-label="Clear project search" onClick={() => onView({ ...view, query: "" })}><Ic n="x" s={16} /></button>}</label>
      <div className="cv-project-views" role="group" aria-label="Project filters"><button type="button" aria-pressed={!view.starred} onClick={() => onView({ ...view, starred: false })}>Designs</button><button type="button" aria-pressed={view.starred} onClick={() => onView({ ...view, starred: true })}><Ic n="star" s={16} />Starred</button></div>
      {!visible.length && <p className="ids-muted">{query ? "No designs match your search." : view.starred ? "No starred designs yet. Star a design to find it here." : "Your designs will appear here."}</p>}
      <div className="cv-project-grid">{visible.map(design => <article key={design.id} className="cv-project-card">
        <button type="button" className="cv-project-thumb" data-project-id={design.id} aria-label={designPages(design).length > 1 ? `View pages of ${design.name}` : `Use ${design.name}`} disabled={disabled} draggable={!disabled} onDragStart={event => drag(event, design, designPages(design).map(page => page.id))} onClick={event => {
          const pages = designPages(design); if (pages.length === 1) onChoose(design.id, [pages[0].id], event.currentTarget);
          else { onView({ ...view, designId: design.id }); setMessage(""); requestAnimationFrame(() => heading.current?.focus({ preventScroll: true })); }
        }}><DesignArtwork design={pageCanvas(design)} /></button>
        <Link className="cv-project-name" href={`/app/design/${design.id}`} aria-label={`Open ${design.name}`} title={design.name}>{design.name}</Link>{design.id === currentId && <small>Current design</small>}
        <button type="button" className={"cv-project-star" + (design.starred ? " is-starred" : "")} title={design.starred ? "Unstar" : "Star for you"} aria-label={`${design.starred ? "Unstar" : "Star"} ${design.name}`} aria-pressed={!!design.starred} disabled={disabled} onClick={event => { void star(design, event.currentTarget); }}><Ic n="star" s={18} /></button>
        <button type="button" className="cv-project-more" aria-label={`More options for ${design.name}`} aria-haspopup="menu" aria-expanded={menu?.id === design.id} disabled={disabled} onClick={event => { trigger.current = event.currentTarget; const box = event.currentTarget.getBoundingClientRect(); setMenu({ id: design.id, x: box.left, y: box.bottom + 4 }); }}><Ic n="more" s={18} /></button>
      </article>)}</div>
    </>}
    <p role="status" className="cv-project-status">{message}</p>{error && <p role="alert" className="cv-project-error">{error}</p>}
    <Link className="cv-project-all" href="/app/projects">View all projects <Ic n="chevr" s={16} /></Link>
    {menu && chosen && <EditorContextMenu x={menu.x} y={menu.y} label={`Options for ${chosen.name}`} trigger={trigger} onClose={(restore = true) => { setMenu(null); if (restore) trigger.current?.focus(); }} actions={[{ label: chosen.starred ? "Unstar" : "Star for you", icon: <Ic n="star" s={18} />, disabled, run: () => { void star(chosen); } }]} />}
  </section>;
}
