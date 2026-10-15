"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@isdead/design";
import { useLocal } from "@/lib/useLocal";
import type { Design } from "@/lib/design/types";
import { SIZES, blankDesign, dateLabel, toSVG } from "@/lib/design/ops";
import { TEMPLATES, fromTemplate } from "@/lib/design/templates";
export const thumb = (d: Design) => toSVG(d).replace(/width="\d+" height="\d+"/, 'width="100%" height="100%"');
export function Dashboard({ uid, name, demo, q: q0 }: { uid: string; name: string; demo: boolean; q?: string }) {
  const [designs, setDesigns, ready] = useLocal<Design[]>(uid, "designs", []);
  const [q, setQ] = useState(q0 ?? ""); const router = useRouter();
  useEffect(() => { if (ready && demo && designs.length === 0 && !localStorage.getItem(`canvaisdead:${uid}:seeded`)) { localStorage.setItem(`canvaisdead:${uid}:seeded`, "1"); setDesigns(["quote", "deck", "poster"].map(id => fromTemplate(TEMPLATES.find(t => t.id === id)!))); } }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps
  const create = (w: number, h: number, name?: string) => { const d = blankDesign({ w, h }, name); setDesigns(p => [d, ...p]); router.push(`/app/design/${d.id}`); };
  const fromTpl = (id: string) => { const d = fromTemplate(TEMPLATES.find(t => t.id === id)!); setDesigns(p => [d, ...p]); router.push(`/app/design/${d.id}`); };
  const s = q.trim().toLowerCase();
  const mine = useMemo(() => designs.filter(d => !s || d.name.toLowerCase().includes(s)).sort((a, b) => b.updatedAt - a.updatedAt), [designs, s]);
  const tpls = useMemo(() => TEMPLATES.filter(t => !s || (t.name + t.category).toLowerCase().includes(s)), [s]);
  const sizes = SIZES.filter(z => !s || z.label.toLowerCase().includes(s));
  return <main className="cd">
    <section className="cd-hero"><h1 className="ids-h1" style={{ fontSize: "var(--ids-type-3xl)" }}>What will you design today{name ? `, ${name.split(" ")[0]}` : ""}?</h1>
      <div className="cd-search"><Input aria-label="Search designs and templates" placeholder="Search your designs, templates and sizes" value={q} onChange={e => setQ(e.target.value)} /></div>
      <div className="cd-sizes">{sizes.map(z => <button key={z.id} className="cd-size" onClick={() => create(z.w, z.h)}><span className="cd-size__ico" style={{ aspectRatio: `${z.w}/${z.h}` }} />{z.label}<small>{z.hint}</small></button>)}</div></section>
    <section><h2 className="cd-h">Your designs</h2>
      {!mine.length && <p className="ids-muted">{designs.length ? "No designs match." : "Nothing here yet. Pick a size above or start from a template below."}</p>}
      <div className="cd-grid" data-testid="designs">{mine.map(d => <div key={d.id} className="cd-card"><Link href={`/app/design/${d.id}`} className="cd-thumb" aria-label={`Open ${d.name}`} dangerouslySetInnerHTML={{ __html: thumb(d) }} />
        <div className="cd-meta"><b>{d.name}</b><span className="ids-muted">{d.w}×{d.h} · {dateLabel(d.updatedAt)}</span></div>
        <button className="cd-del iconbtn" aria-label={`Delete ${d.name}`} onClick={() => { if (confirm(`Delete “${d.name}”?`)) setDesigns(p => p.filter(x => x.id !== d.id)); }}>Delete</button></div>)}</div></section>
    <section><h2 className="cd-h">Start from a template</h2>
      <div className="cd-grid">{tpls.map(t => <button key={t.id} className="cd-card cd-tpl" onClick={() => fromTpl(t.id)} aria-label={`Use template ${t.name}`}><span className="cd-thumb" dangerouslySetInnerHTML={{ __html: thumb(fromTemplate(t)) }} /><div className="cd-meta"><b>{t.name}</b><span className="ids-muted">{t.category}</span></div></button>)}</div></section>
  </main>;
}
