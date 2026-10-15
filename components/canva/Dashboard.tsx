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
export function Dashboard({ uid, demo, q: q0, view = "home" }: { uid: string; name: string; demo: boolean; q?: string; view?: "home" | "templates" | "projects" }) {
  const [designs, setDesigns, ready] = useLocal<Design[]>(uid, "designs", []);
  const [q, setQ] = useState(q0 ?? ""); const router = useRouter();
  useEffect(() => { if (ready && demo && designs.length === 0 && !localStorage.getItem(`canvaisdead:${uid}:seeded`)) { localStorage.setItem(`canvaisdead:${uid}:seeded`, "1"); setDesigns(["quote", "deck", "poster"].map(id => fromTemplate(TEMPLATES.find(t => t.id === id)!))); } }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps
  const create = (w: number, h: number, name?: string) => { const d = blankDesign({ w, h }, name); setDesigns(p => [d, ...p]); router.push(`/app/design/${d.id}`); };
  const fromTpl = (id: string) => { const d = fromTemplate(TEMPLATES.find(t => t.id === id)!); setDesigns(p => [d, ...p]); router.push(`/app/design/${d.id}`); };
  const s = q.trim().toLowerCase();
  const mine = useMemo(() => designs.filter(d => !s || d.name.toLowerCase().includes(s)).sort((a, b) => b.updatedAt - a.updatedAt), [designs, s]);
  const tpls = useMemo(() => TEMPLATES.filter(t => !s || (t.name + t.category).toLowerCase().includes(s)), [s]);
  const sizes = SIZES.filter(z => !s || z.label.toLowerCase().includes(s));
  const QC: [string, string, string, string?][] = [["Presentation", "present", "#ff6105", "presentation"], ["Social media", "star", "#ff3b4b", "ig-post"], ["Video", "present", "#e950f7", "yt-thumb"], ["Print", "print", "#9a30e6", "poster"], ["Doc", "edit", "#17a2b0", "doc"], ["Whiteboard", "full", "#0fa84a"], ["Sheet", "grid", "#138eff"], ["Code", "text", "#a31ba8"], ["Website", "globe", "#4a53fa", "ig-post"], ["Email", "comment", "#4a2ef0"], ["Photo editor", "shapes", "#6b5b4a"], ["Magic Layers", "tpl", "#6b3ad8"], ["Custom size", "plus", "#f2f3f5", "logo"], ["Upload", "up", "#f2f3f5"], ["More", "more", "#f2f3f5"]];
  const selectQuickCreate = (z: typeof QC[number]) => { const sz = SIZES.find(x => x.id === z[3]); if (sz) create(sz.w, sz.h, `Untitled design - ${sz.label.charAt(0).toUpperCase() + sz.label.slice(1)}`); else if (z[0] === "Templates") router.push("/app/templates"); };
  const CATS: [string, number, string][] = [["Presentation", 0, "presentation"], ["Document", 3, "doc"], ["Instagram Post", 1, "ig-post"], ["Poster", 3, "poster"], ["Resume", 3, "doc"], ["Your Story", 1, "story"], ["Invitation", 3, "a4"], ["Flyer", 3, "a4"], ["Logo", 4, "logo"], ["Photo Collage", 4, "portrait"], ["Mobile Video", 2, "story"], ["Landscape Video", 2, "yt-thumb"], ["Certificate", 3, "a4"], ["Brochure", 3, "a4"], ["Banner", 1, "yt-thumb"], ["Facebook Post", 3, "ig-post"]];
  const byId = (id: string) => TEMPLATES.find(t => t.id === id)!;
  const HOME_TPL = ["startup", "priceguide", "photoquote", "portfolio", "artfest", "resume", "halloween", "hiring"], DISCOVER = ["album", "hiring", "signup", "pitchdeck2"], TREND = ["sticker", "office", "allnighter", "halloweencal"];
  const Card = ({ id }: { id: string }) => { const t = byId(id), d = fromTemplate(t); return <button key={id} className="cx-tplc" style={{ aspectRatio: `${d.w}/${d.h}` }} onClick={() => fromTpl(id)} aria-label={`Use template ${t.name}`}><span dangerouslySetInnerHTML={{ __html: thumb(d) }} /></button>; };
  const Row = ({ ids }: { ids: string[] }) => <div className="cx-tplrow">{ids.map(id => <Card key={id} id={id} />)}<span className="cx-next" aria-hidden><Ic n="chevr" s={20} /></span></div>;
  const Cats = () => <div className="cx-catsw"><div className="cx-cats">{CATS.map(([c, k, sz]) => <button key={c} className={"c" + k} onClick={() => { const z = SIZES.find(x => x.id === sz) ?? SIZES[0]; create(z.w, z.h); }}><b>{c}</b><i><u /></i></button>)}</div><span className="cx-next" aria-hidden><Ic n="chevr" s={20} /></span></div>;
  if (view === "projects") return <main className="cx-proj"><aside className="cx-proj__nav"><b className="cx-proj__logo">CanvaIsDead</b>{["All projects", "Recents", "Your projects", "Shared with you", "Available offline", "Manage links"].map((l, i) => <a key={l} className={i === 0 ? "on" : ""}>{l}</a>)}<div className="cx-tip"><b>Star designs and folders</b><small>Quickly find your favorites here.</small></div><a className="cx-proj__trash">Trash</a></aside>
    <section className="cx-proj__main"><div className="cx-topr"><span className="cx-try">Everything included</span></div>
      <h1>All projects</h1><div className="cx-filt">{["Type", "Category", "Owner", "Date modified"].map(f => <span key={f}>{f} <Ic n="chev" s={14} /></span>)}</div>
      {mine.length === 0 ? <div className="cx-empty"><h3>All your content and your team's content will live here</h3><p>Get started by creating a design or a folder.</p><div><button className="cx-btn p" onClick={() => create(1920, 1080)}>Create design</button><button className="cx-btn">Create folder</button></div></div>
        : <div className="cd-grid" data-testid="designs">{mine.map(d => <div key={d.id} className="cd-card"><Link href={`/app/design/${d.id}`} className="cd-thumb" aria-label={`Open ${d.name}`} dangerouslySetInnerHTML={{ __html: thumb(d) }} /><div className="cd-meta"><b>{d.name}</b><span className="ids-muted">{d.w}×{d.h} · {dateLabel(d.updatedAt)}</span></div><button className="cd-del iconbtn" aria-label={`Delete ${d.name}`} onClick={() => { if (confirm(`Delete “${d.name}”?`)) setDesigns(p => p.filter(x => x.id !== d.id)); }}>Delete</button></div>)}</div>}
    </section></main>;
  const yourDesigns = mine.length > 0 && <section className="cx-sec cx-sec--designs"><h2>Your designs</h2><div className="cd-grid" data-testid="designs">{mine.map(d => <div key={d.id} className="cd-card"><Link href={`/app/design/${d.id}`} className="cd-thumb" aria-label={`Open ${d.name}`} dangerouslySetInnerHTML={{ __html: thumb(d) }} /><div className="cd-meta"><b>{d.name}</b><span className="ids-muted">{d.w}×{d.h} · {dateLabel(d.updatedAt)}</span></div><button className="cd-del iconbtn" aria-label={`Delete ${d.name}`} onClick={() => { if (confirm(`Delete “${d.name}”?`)) setDesigns(p => p.filter(x => x.id !== d.id)); }}>Delete</button></div>)}</div></section>;
  return <main className={"cx-home" + (view === "templates" ? " tv" : "")}><div className="cx-topr"><span className="cx-try">Everything included</span></div>
    <section className="cx-hero"><h1>What will you create with <i>CanvaIsDead</i>{" "}today?</h1>
      <div className="cx-tabs"><Link href="/app" className={view === "home" ? "on" : ""}><Ic n="home" s={14} /> Home</Link><Link href="/app/templates" className={view === "templates" ? "on" : ""}><Ic n="tpl" s={14} /> Templates</Link></div>
      <label className="cx-search"><Ic n="search" s={22} /><input aria-label="Search designs and templates" placeholder={view === "home" ? "Search anything" : "Search millions of templates"} value={q} onChange={e => setQ(e.target.value)} /></label>
      {view === "home" ? <div className="cx-qc"><button onClick={() => router.push("/app/templates")} className="first"><span style={{ background: "#f2f3f5", color: "#8b3dff" }}><Ic n="tpl" s={22} /></span>Templates</button><i className="div" />{QC.map(z => <button key={z[0]} onClick={() => selectQuickCreate(z)}><span style={{ background: z[2], color: z[2] === "#f2f3f5" ? "#0f1015" : "#fff" }}><Ic n={z[1]} s={22} /></span>{z[0]}</button>)}</div>
        : <div className="cx-chips">{[["Video", "#e950f7"], ["Business", "#17a2b0"], ["Social media", "#ff3b4b"], ["Education", "#f5a623"]].map(([c, col]) => <span key={c}><b style={{ background: col }} />{c}</span>)}</div>}</section>
    {view === "home" ? <>
      <section className="cx-sec"><div className="cx-sec__h"><h2>Templates for you</h2><a>See all</a></div><Row ids={tpls.length === TEMPLATES.length ? HOME_TPL : tpls.map(t => t.id)} />{!tpls.length && <p className="ids-muted">No templates match.</p>}</section>
      <section className="cx-sec"><h2>Browse template categories</h2><Cats /></section>
      <section className="cx-sec"><h2>Popular on CanvaIsDead</h2><div className="cx-pop">{sizes.slice(0, 6).map(z => <button key={z.id} onClick={() => create(z.w, z.h)}><span style={{ aspectRatio: `${z.w}/${z.h}` }} />{z.label}<small>{z.hint}</small></button>)}</div></section>
      {yourDesigns}</> : <>
      <section className="cx-sec"><h2>Explore templates</h2><Cats /></section>
      <section className="cx-sec"><h2>Discover CanvaIsDead</h2><Row ids={DISCOVER} /></section>
      <section className="cx-sec"><h2>Trending near you</h2><Row ids={TREND} /></section>
      {!tpls.length && <p className="ids-muted">No templates match.</p>}</>}
  </main>;
}
