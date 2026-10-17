"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import type { Design } from "@/lib/design/types";
import { isTrashed } from "@/lib/design/library";
import { pageCanvas } from "@/lib/design/pages";
import { DesignArtwork } from "./Artwork";
import { EditorContextMenu } from "./EditorContextMenu";
import { Ic } from "./Ic";

export type ProjectPanelView = { query: string; starred: boolean };
export function ProjectsPanel({ designs, currentId, disabled, view, onView, onStar }: {
  designs: Design[]; currentId: string; disabled: boolean; view: ProjectPanelView;
  onView: (view: ProjectPanelView) => void; onStar: (id: string, starred: boolean) => Promise<boolean>;
}) {
  const [message, setMessage] = useState("");
  const [menu, setMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const trigger = useRef<HTMLButtonElement | null>(null), panel = useRef<HTMLElement>(null);
  const query = view.query.trim().toLocaleLowerCase();
  const visible = designs.filter(design => !isTrashed(design) && (!view.starred || design.starred) && (!query || design.name.toLocaleLowerCase().includes(query))).sort((a, b) => b.updatedAt - a.updatedAt);
  const chosen = menu ? designs.find(design => design.id === menu.id && !isTrashed(design)) : null;
  const star = async (design: Design, button?: HTMLButtonElement) => {
    const saved = await onStar(design.id, !design.starred);
    setMessage(saved ? design.starred ? "Design removed from Starred." : "Design added to Starred." : "Change kept in this tab. Check the save notice before leaving.");
    requestAnimationFrame(() => (button?.isConnected ? button : panel.current)?.focus({ preventScroll: true }));
  };
  return <section ref={panel} className="cv-projects" aria-label="Projects panel" tabIndex={-1}>
    <h3>Projects</h3><label className="cv-psearch"><Ic n="search" s={18} /><input aria-label="Search your projects" placeholder="Search your projects" value={view.query} onChange={event => onView({ ...view, query: event.target.value })} />{view.query && <button type="button" aria-label="Clear project search" onClick={() => onView({ ...view, query: "" })}><Ic n="x" s={16} /></button>}</label>
    <div className="cv-project-views" role="group" aria-label="Project filters"><button type="button" aria-pressed={!view.starred} onClick={() => onView({ ...view, starred: false })}>Designs</button><button type="button" aria-pressed={view.starred} onClick={() => onView({ ...view, starred: true })}><Ic n="star" s={16} />Starred</button></div>
    <p role="status" className="cv-project-status">{message}</p>
    {!visible.length && <p className="ids-muted">{query ? "No designs match your search." : view.starred ? "No starred designs yet. Star a design to find it here." : "Your designs will appear here."}</p>}
    <div className="cv-project-grid">{visible.map(design => <article key={design.id} className="cv-project-card">
      <Link className="cv-project-thumb" href={`/app/design/${design.id}`} aria-label={`Open ${design.name}`} aria-current={design.id === currentId ? "page" : undefined}><DesignArtwork design={pageCanvas(design)} /></Link>
      <b title={design.name}>{design.name}</b>{design.id === currentId && <small>Current design</small>}
      <button type="button" className={"cv-project-star" + (design.starred ? " is-starred" : "")} title={design.starred ? "Unstar" : "Star for you"} aria-label={`${design.starred ? "Unstar" : "Star"} ${design.name}`} aria-pressed={!!design.starred} disabled={disabled} onClick={event => { void star(design, event.currentTarget); }}><Ic n="star" s={18} /></button>
      <button type="button" className="cv-project-more" aria-label={`More options for ${design.name}`} aria-haspopup="menu" aria-expanded={menu?.id === design.id} disabled={disabled} onClick={event => { trigger.current = event.currentTarget; const box = event.currentTarget.getBoundingClientRect(); setMenu({ id: design.id, x: box.left, y: box.bottom + 4 }); }}><Ic n="more" s={18} /></button>
    </article>)}</div>
    <Link className="cv-project-all" href="/app/projects">View all projects <Ic n="chevr" s={16} /></Link>
    {menu && chosen && <EditorContextMenu x={menu.x} y={menu.y} label={`Options for ${chosen.name}`} trigger={trigger} onClose={(restore = true) => { setMenu(null); if (restore) trigger.current?.focus(); }} actions={[{ label: chosen.starred ? "Unstar" : "Star for you", icon: <Ic n="star" s={18} />, disabled, run: () => { void star(chosen); } }]} />}
  </section>;
}
