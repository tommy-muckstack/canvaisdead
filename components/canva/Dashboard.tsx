"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Ic } from "./Ic";
import { useLocal } from "@/lib/useLocal";
import type { Design } from "@/lib/design/types";
import { SIZES, blankDesign, dateLabel, toSVG } from "@/lib/design/ops";
import { TEMPLATES, fromTemplate } from "@/lib/design/templates";
export const thumb = (d: Design) => toSVG(d).replace(/width="\d+" height="\d+"/, 'width="100%" height="100%"');
export function Dashboard({ uid, name, demo, q: q0, view = "home" }: { uid: string; name: string; demo: boolean; q?: string; view?: "home" | "templates" | "projects" }) {
  const [designs, setDesigns, ready] = useLocal<Design[]>(uid, "designs", []);
  const [q, setQ] = useState(q0 ?? ""); const router = useRouter();
  useEffect(() => { if (ready && demo && designs.length === 0 && !localStorage.getItem(`canvaisdead:${uid}:seeded`)) { localStorage.setItem(`canvaisdead:${uid}:seeded`, "1"); setDesigns(["quote", "deck", "poster"].map(id => fromTemplate(TEMPLATES.find(t => t.id === id)!))); } }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps
  const create = (w: number, h: number, name?: string) => { const d = blankDesign({ w, h }, name); setDesigns(p => [d, ...p]); router.push(`/app/design/${d.id}`); };
  const fromTpl = (id: string) => { const d = fromTemplate(TEMPLATES.find(t => t.id === id)!); setDesigns(p => [d, ...p]); router.push(`/app/design/${d.id}`); };
  const s = q.trim().toLowerCase();
  const mine = useMemo(() => designs.filter(d => !s || d.name.toLowerCase().includes(s)).sort((a, b) => b.updatedAt - a.updatedAt), [designs, s]);
  const tpls = useMemo(() => TEMPLATES.filter(t => !s || (t.name + t.category).toLowerCase().includes(s)), [s]);
  const sizes = SIZES.filter(z => !s || z.label.toLowerCase().includes(s));
  const QC: [string, string, string, string?][] = [["Templates", "tpl", "#7D2AE8"], ["Presentation", "present", "#F05A28", "presentation"], ["Social media", "star", "#E8344E", "ig-post"], ["Video", "present", "#B642E8", "yt-thumb"], ["Print", "print", "#6D4AE8", "poster"], ["Doc", "edit", "#1E9BB0", "doc"], ["Whiteboard", "full", "#1AA85B"], ["Sheet", "grid", "#2587E8"], ["Code", "text", "#B642E8"], ["Website", "globe", "#4C6BEA", "ig-post"], ["Email", "comment", "#7D4AE8"], ["Photo editor", "shapes", "#444"], ["Custom size", "plus", "#666", "logo"], ["Upload", "up", "#666"], ["More", "more", "#666"]];
  const useQC = (z: typeof QC[number]) => { const sz = SIZES.find(x => x.id === z[3]); if (sz) create(sz.w, sz.h, `Untitled design - ${sz.label.charAt(0).toUpperCase() + sz.label.slice(1)}`); else if (z[0] === "Templates") router.push("/app/templates"); };
  const CATS = ["Presentation", "Instagram Post", "Resume", "Invitation", "Logo", "Mobile Video", "Certificate", "Document", "Poster", "Your Story", "Flyer", "Photo Collage", "Landscape Video", "Brochure"];
  const Tplrow = () => <div className="cx-tplrow">{tpls.map(t => <button key={t.id} className="cx-tplc" onClick={() => fromTpl(t.id)} aria-label={`Use template ${t.name}`}><span dangerouslySetInnerHTML={{ __html: thumb(fromTemplate(t)) }} /></button>)}</div>;
  if (view === "projects") return <main className="cx-proj"><aside className="cx-proj__nav"><b className="cx-proj__logo">Canva</b>{["All projects", "Recents", "Your projects", "Shared with you", "Available offline", "Manage links"].map((l, i) => <a key={l} className={i === 0 ? "on" : ""}>{l}</a>)}<div className="cx-tip"><b>Star designs and folders</b><small>Quickly find your favorites here.</small></div><a className="cx-proj__trash">Trash</a></aside>
    <section className="cx-proj__main"><div className="cx-topr"><span className="cx-try">★ Try it free for 30 days</span></div>
      <h1>All projects</h1><div className="cx-filt">{["Type", "Category", "Owner", "Date modified"].map(f => <span key={f}>{f} <Ic n="chev" s={14} /></span>)}</div>
      {mine.length === 0 ? <div className="cx-empty"><h3>All your content and your team's content will live here</h3><p>Get started by creating a design or a folder.</p><div><button className="cx-btn p" onClick={() => create(1920, 1080)}>Create design</button><button className="cx-btn">Create folder</button></div></div>
        : <div className="cd-grid" data-testid="designs">{mine.map(d => <div key={d.id} className="cd-card"><Link href={`/app/design/${d.id}`} className="cd-thumb" aria-label={`Open ${d.name}`} dangerouslySetInnerHTML={{ __html: thumb(d) }} /><div className="cd-meta"><b>{d.name}</b><span className="ids-muted">{d.w}×{d.h} · {dateLabel(d.updatedAt)}</span></div><button className="cd-del iconbtn" aria-label={`Delete ${d.name}`} onClick={() => { if (confirm(`Delete “${d.name}”?`)) setDesigns(p => p.filter(x => x.id !== d.id)); }}>Delete</button></div>)}</div>}
    </section></main>;
  return <main className="cx-home"><div className="cx-topr"><span className="cx-try">★ Try it free for 30 days</span></div>
    <section className="cx-hero"><h1>What will you <i>Canva</i>{" "}today?</h1>
      <div className="cx-tabs"><Link href="/app" className={view === "home" ? "on" : ""}><Ic n="home" s={14} /> Home</Link><Link href="/app/templates" className={view === "templates" ? "on" : ""}><Ic n="tpl" s={14} /> Templates</Link></div>
      <label className="cx-search"><Ic n="search" s={20} /><input aria-label="Search designs and templates" placeholder="Search anything" value={q} onChange={e => setQ(e.target.value)} /></label>
      {view === "home" ? <div className="cx-qc">{QC.map(z => <button key={z[0]} onClick={() => useQC(z)}><span style={{ background: z[2] }}><Ic n={z[1]} s={20} /></span>{z[0]}</button>)}</div>
        : <div className="cx-chips">{["Video", "Business", "Social media", "Education"].map(c => <span key={c}>{c}</span>)}</div>}</section>
    <section className="cx-sec"><div className="cx-sec__h"><h2>{view === "home" ? "Templates for you" : "Explore templates"}</h2>{view === "home" && <a>See all</a>}</div><Tplrow />{!tpls.length && <p className="ids-muted">No templates match.</p>}</section>
    <section className="cx-sec"><h2>{view === "home" ? "Browse template categories" : "Discover Canva"}</h2><div className="cx-cats">{CATS.map((c, i) => <button key={c} className={"c" + (i % 5)} onClick={() => { const z = SIZES[i % SIZES.length]; create(z.w, z.h); }}><b>{c}</b><i /></button>)}</div></section>
    {view === "home" && mine.length > 0 && <section className="cx-sec"><h2>Your designs</h2><div className="cd-grid" data-testid="designs">{mine.map(d => <div key={d.id} className="cd-card"><Link href={`/app/design/${d.id}`} className="cd-thumb" aria-label={`Open ${d.name}`} dangerouslySetInnerHTML={{ __html: thumb(d) }} /><div className="cd-meta"><b>{d.name}</b><span className="ids-muted">{d.w}×{d.h} · {dateLabel(d.updatedAt)}</span></div><button className="cd-del iconbtn" aria-label={`Delete ${d.name}`} onClick={() => { if (confirm(`Delete “${d.name}”?`)) setDesigns(p => p.filter(x => x.id !== d.id)); }}>Delete</button></div>)}</div></section>}
    <section className="cx-sec"><h2>Popular on Canva</h2><div className="cx-pop">{sizes.slice(0, 6).map(z => <button key={z.id} onClick={() => create(z.w, z.h)}><span style={{ aspectRatio: `${z.w}/${z.h}` }} />{z.label}<small>{z.hint}</small></button>)}</div></section>
  </main>;
}
