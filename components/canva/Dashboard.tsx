"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Ic } from "./Ic";
import { DesignArtwork } from "./Artwork";
import { BrandMark } from "../BrandMark";
import { useDesignLibrary } from "@/lib/useDesignLibrary";
import type { Design } from "@/lib/design/types";
import { SIZES, blankDesign } from "@/lib/design/ops";
import { TEMPLATES, fromTemplate } from "@/lib/design/templates";
import { downloadDesignBackup } from "@/lib/design/backup";
import { SaveNotice } from "./SaveNotice";
import { DesignFiles } from "./DesignFiles";
import { DesignGrid } from "./DesignGrid";
import { isTrashed, pruneExpiredTrash, trashExpired } from "@/lib/design/library";
import { trackWebsite } from "@/lib/analytics/client";
import { useDesignCreation, type CreateSection } from "./DesignCreation";
export function Dashboard({ uid, demo, q: q0, view = "home" }: { uid: string; name: string; demo: boolean; q?: string; view?: "home" | "templates" | "projects" | "trash" }) {
  const [designs, setDesigns, ready, save] = useDesignLibrary(uid);
  const [q, setQ] = useState(q0 ?? ""); const router = useRouter();
  const openCreate = useDesignCreation();
  const seeding = useRef(false), creating = useRef(false), alive = useRef(false);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => {
    if (!ready || seeding.current || !demo || designs.length || save.status !== "saved") return;
    try {
      const key = `canvaisdead:${uid}:seeded`;
      if (!localStorage.getItem(key)) {
        seeding.current = true;
        void setDesigns(["quote", "deck", "poster"].map(id => fromTemplate(TEMPLATES.find(t => t.id === id)!))).then(saved => { if (saved) { try { localStorage.setItem(key, "1"); } catch { /* Optional demo marker. */ } } }).finally(() => { seeding.current = false; });
      }
    } catch { /* Demo seeding is optional when storage is unavailable. */ }
  }, [ready, demo, designs.length, save.status, uid, setDesigns]);
  const createAndOpen = async (d: Design, source: "blank" | "template") => {
    if (creating.current || save.status !== "saved") return;
    creating.current = true;
    try { if (await setDesigns(p => [d, ...p])) { trackWebsite("website_design_created", { source }); if (alive.current) router.push(`/app/design/${d.id}`); } }
    finally { creating.current = false; }
  };
  const create = (w: number, h: number, name?: string) => createAndOpen(blankDesign({ w, h }, name), "blank");
  const fromTpl = (id: string) => createAndOpen(fromTemplate(TEMPLATES.find(t => t.id === id)!), "template");
  useEffect(() => {
    if (!ready || save.status !== "saved") return;
    const clean = () => { if (designs.some(design => trashExpired(design))) setDesigns(previous => pruneExpiredTrash(previous)); };
    clean();
    const timer = setInterval(clean, 60_000);
    return () => clearInterval(timer);
  }, [ready, designs, save.status, setDesigns]);
  const s = q.trim().toLowerCase(), trash = view === "trash";
  const trashedDesigns = useMemo(() => designs.filter(isTrashed), [designs]);
  const mine = useMemo(() => designs.filter(d => isTrashed(d) === trash && (!s || d.name.toLowerCase().includes(s))).sort((a, b) => trash ? b.trashedAt! - a.trashedAt! : b.updatedAt - a.updatedAt), [designs, s, trash]);
  const tpls = useMemo(() => TEMPLATES.filter(t => !s || (t.name + t.category).toLowerCase().includes(s)), [s]);
  const sizes = SIZES.filter(z => !s || z.label.toLowerCase().includes(s));
  const QC: [string, string, string, CreateSection][] = [["Presentation", "present", "#ff6105", "presentations"], ["Social media", "star", "#ff3b4b", "social"], ["Video", "present", "#e950f7", "videos"], ["Print", "print", "#9a30e6", "print"], ["Doc", "edit", "#17a2b0", "docs"], ["Whiteboard", "full", "#0fa84a", "whiteboards"], ["Sheet", "grid", "#138eff", "sheets"], ["Code", "text", "#a31ba8", "code"], ["Website", "globe", "#4a53fa", "websites"], ["Email", "comment", "#4a2ef0", "emails"], ["Photo editor", "shapes", "#6b5b4a", "photo"], ["Magic Layers", "tpl", "#6b3ad8", "layers"], ["Custom size", "plus", "#f2f3f5", "custom"], ["Upload", "up", "#f2f3f5", "upload"], ["More", "more", "#f2f3f5", "all"]];
  const selectQuickCreate = (z: typeof QC[number]) => {
    if (z[3] === "presentations") create(1920, 1080, "Untitled design - Presentation");
    else openCreate(z[3]);
  };
  const CATS: [string, number, string][] = [["Presentation", 0, "presentation"], ["Document", 3, "doc"], ["Instagram Post", 1, "ig-post"], ["Poster", 3, "poster"], ["Resume", 3, "doc"], ["Your Story", 1, "story"], ["Invitation", 3, "a4"], ["Flyer", 3, "a4"], ["Logo", 4, "logo"], ["Photo Collage", 4, "portrait"], ["Mobile Video", 2, "story"], ["Landscape Video", 2, "yt-thumb"], ["Certificate", 3, "a4"], ["Brochure", 3, "a4"], ["Banner", 1, "yt-thumb"], ["Facebook Post", 3, "ig-post"]];
  const byId = (id: string) => TEMPLATES.find(t => t.id === id)!;
  const HOME_TPL = ["startup", "priceguide", "photoquote", "portfolio", "artfest", "resume", "halloween", "hiring"], DISCOVER = ["album", "hiring", "signup", "pitchdeck2"], TREND = ["sticker", "office", "allnighter", "halloweencal"];
  const Card = ({ id }: { id: string }) => { const t = byId(id), d = fromTemplate(t); return <button key={id} disabled={save.status !== "saved"} className="cx-tplc" style={{ aspectRatio: `${d.w}/${d.h}` }} onClick={() => fromTpl(id)} aria-label={`Use template ${t.name}`}><span><DesignArtwork design={d} /></span></button>; };
  const Row = ({ ids }: { ids: string[] }) => <div className="cx-tplrow">{ids.map(id => <Card key={id} id={id} />)}<span className="cx-next" aria-hidden><Ic n="chevr" s={20} /></span></div>;
  const Cats = () => <div className="cx-catsw"><div className="cx-cats">{CATS.map(([c, k, sz]) => <button key={c} disabled={save.status !== "saved"} className={"c" + k} onClick={() => { const z = SIZES.find(x => x.id === sz) ?? SIZES[0]; create(z.w, z.h); }}><b>{c}</b><i><u /></i></button>)}</div><span className="cx-next" aria-hidden><Ic n="chevr" s={20} /></span></div>;
  if (!ready) return <main className="cd" aria-busy>Loading designs…</main>;
  if (save.status === "load-error") return <main className="cd"><SaveNotice save={save} /></main>;
  const notice = <SaveNotice save={save} onBackup={() => downloadDesignBackup(designs)} />;
  const library = <DesignGrid key={`${uid}:${view}`} designs={mine} trashedDesigns={trashedDesigns} onUpdate={setDesigns} disabled={save.status !== "saved"} trash={trash} />;
  if (view === "projects" || trash) return <main className="cx-proj"><aside className="cx-proj__nav"><b className="cx-proj__logo"><BrandMark size={24} />CanvaIsDead</b>
    <Link href="/app/projects" className={!trash ? "on" : ""} aria-current={!trash ? "page" : undefined}>All projects</Link>
    {["Recents", "Your projects", "Shared with you", "Available offline", "Manage links"].map(label => <a key={label}>{label}</a>)}<div className="cx-tip"><b>Star designs and folders</b><small>Quickly find your favorites here.</small></div><Link href="/app/projects?view=trash" className={"cx-proj__trash" + (trash ? " on" : "")} aria-current={trash ? "page" : undefined}>Trash</Link></aside>
    <section className="cx-proj__main"><div className="cx-topr"><span className="cx-try">Everything included</span></div>
      {notice}<nav className="cd-project-tabs" aria-label="Project views"><Link href="/app/projects" aria-current={!trash ? "page" : undefined}>All projects</Link><Link href="/app/projects?view=trash" aria-current={trash ? "page" : undefined}>Trash</Link></nav>
      <h1>{trash ? "Trash" : "All projects"}</h1><DesignFiles key={uid} designs={designs} onImport={setDesigns} />
      <label className="cd-project-search"><Ic n="search" /><input aria-label={trash ? "Search Trash" : "Search projects"} placeholder={trash ? "Search Trash" : "Search projects"} value={q} onChange={event => setQ(event.target.value)} /></label>
      {!trash && <div className="cx-filt">{["Type", "Category", "Owner", "Date modified"].map(f => <span key={f}>{f} <Ic n="chev" s={14} /></span>)}</div>}
      {mine.length === 0 && <div className="cx-empty"><h3>{s ? "No designs match your search." : trash ? "Your Trash is empty" : "All your content and your team's content will live here"}</h3><p>{s ? "Try another name." : trash ? "Designs you move to Trash will appear here." : "Get started by creating a design."}</p>{!s && !trash && <button className="cx-btn p" aria-haspopup="dialog" onClick={() => openCreate()}>Create design</button>}</div>}
      {library}
    </section></main>;
  const yourDesigns = <section className="cx-sec cx-sec--designs"><div className="cx-sec__h"><h2>Your designs</h2><Link href="/app/projects">All projects</Link></div><DesignFiles key={uid} designs={designs} onImport={setDesigns} />{mine.length === 0 && <p className="ids-muted">{s ? "No designs match your search." : "Your designs will appear here."}</p>}{library}</section>;
  return <main className={"cx-home" + (view === "templates" ? " tv" : "")}><div className="cx-topr"><span className="cx-try">Everything included</span></div>
    {notice}<section className="cx-hero"><h1>What will you create with <i>CanvaIsDead</i>{" "}today?</h1>
      <div className="cx-tabs"><Link href="/app" className={view === "home" ? "on" : ""}><Ic n="home" s={14} /> Home</Link><Link href="/app/templates" className={view === "templates" ? "on" : ""}><Ic n="tpl" s={14} /> Templates</Link></div>
      <label className="cx-search"><Ic n="search" s={22} /><input aria-label="Search designs and templates" placeholder={view === "home" ? "Search anything" : "Search millions of templates"} value={q} onChange={e => setQ(e.target.value)} /></label>
      {view === "home" ? <div className="cx-qc"><button onClick={() => router.push("/app/templates")} className="first"><span style={{ background: "#f2f3f5", color: "#8b3dff" }}><Ic n="tpl" s={22} /></span>Templates</button><i className="div" />{QC.map(z => <button key={z[0]} disabled={z[3] === "presentations" && save.status !== "saved"} aria-haspopup={z[3] === "presentations" ? undefined : "dialog"} onClick={() => selectQuickCreate(z)}><span style={{ background: z[2], color: z[2] === "#f2f3f5" ? "#0f1015" : "#fff" }}><Ic n={z[1]} s={22} /></span>{z[0]}</button>)}</div>
        : <div className="cx-chips">{[["Video", "#e950f7"], ["Business", "#17a2b0"], ["Social media", "#ff3b4b"], ["Education", "#f5a623"]].map(([c, col]) => <span key={c}><b style={{ background: col }} />{c}</span>)}</div>}</section>
    {view === "home" ? <>
      <section className="cx-sec"><div className="cx-sec__h"><h2>Templates for you</h2><a>See all</a></div><Row ids={tpls.length === TEMPLATES.length ? HOME_TPL : tpls.map(t => t.id)} />{!tpls.length && <p className="ids-muted">No templates match.</p>}</section>
      <section className="cx-sec"><h2>Browse template categories</h2><Cats /></section>
      <section className="cx-sec"><h2>Popular on CanvaIsDead</h2><div className="cx-pop">{sizes.slice(0, 6).map(z => <button key={z.id} disabled={save.status !== "saved"} onClick={() => create(z.w, z.h)}><span style={{ aspectRatio: `${z.w}/${z.h}` }} />{z.label}<small>{z.hint}</small></button>)}</div></section>
      {yourDesigns}</> : <>
      <section className="cx-sec"><h2>Explore templates</h2><Cats /></section>
      <section className="cx-sec"><h2>Discover CanvaIsDead</h2><Row ids={DISCOVER} /></section>
      <section className="cx-sec"><h2>Trending near you</h2><Row ids={TREND} /></section>
      {!tpls.length && <p className="ids-muted">No templates match.</p>}</>}
  </main>;
}
