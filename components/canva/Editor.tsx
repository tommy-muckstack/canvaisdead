"use client";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Ic } from "./Ic";
import type { Design, El, ElType } from "@/lib/design/types";
import { FONTS, PALETTE, SIZES, addEl, alignEl, commit, duplicateEl, elHeight, elementSVG, hist, hitTest, makeEl, patchEl, redo, removeEls, reorder, resizeBox, resizeCanvas, setElementLocked, snapMove, textDecoration, toSVG, touch, undo, type AlignTo, type Handle, type History, type Measure } from "@/lib/design/ops";
import { TEMPLATES, fromTemplate } from "@/lib/design/templates";
import { canvasMeasure, exportBlob } from "@/lib/design/render";
import type { SaveState } from "@/lib/local-store";
import { SaveNotice } from "./SaveNotice";

// Memoised so pointer events keep a stable DOM target while selection state changes.
const Layer = memo(function Layer({ html }: { html: string }) { return <g dangerouslySetInnerHTML={{ __html: html }} />; });
let _m: Measure | null = null;
const measure: Measure = (t, s, f, w) => { if (typeof document === "undefined") return t.length * s * 0.55; if (!_m) _m = canvasMeasure(document.createElement("canvas").getContext("2d")!); return _m(t, s, f, w); };
const HANDLES: [Handle, number, number][] = [["nw", 0, 0], ["n", 0.5, 0], ["ne", 1, 0], ["e", 1, 0.5], ["se", 1, 1], ["s", 0.5, 1], ["sw", 0, 1], ["w", 0, 0.5]];
type Drag = { kind: "move" | "resize" | "rotate"; id: string; sx: number; sy: number; orig: El; handle?: Handle } | null;
const download = (blob: Blob, name: string) => { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); };
const fileToDataUrl = (f: File, max = 1400) => new Promise<{ src: string; w: number; h: number }>((res, rej) => { const r = new FileReader(); r.onerror = rej; r.onload = () => { const i = new Image(); i.onerror = rej; i.onload = () => { const k = Math.min(1, max / Math.max(i.width, i.height)), c = document.createElement("canvas"); c.width = Math.round(i.width * k); c.height = Math.round(i.height * k); c.getContext("2d")!.drawImage(i, 0, 0, c.width, c.height); res({ src: c.toDataURL(f.type === "image/png" ? "image/png" : "image/jpeg", 0.88), w: c.width, h: c.height }); }; i.src = String(r.result); }; r.readAsDataURL(f); });

export function Editor({ initial, onSave, save, onBackup }: { initial: Design; onSave: (d: Design) => void; save: SaveState; onBackup: () => void }) {
  const [h, setH] = useState<History>(() => hist(initial));
  const [draft, setDraft] = useState<Design | null>(null);
  const [sel, setSel] = useState<string | null>(null); const [pop, setPop] = useState<null | "color" | "trans" | "pos">(null); const [showMore, setShowMore] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [tab, setTab] = useState<"templates" | "elements" | "text" | "uploads" | "background">("templates");
  const [zoom, setZoom] = useState(1); const [fit, setFit] = useState(0.5);
  const [guides, setGuides] = useState<{ x: number[]; y: number[] }>({ x: [], y: [] });
  const [msg, setMsg] = useState(""); const [showSize, setShowSize] = useState(false); const [showExport, setShowExport] = useState(false); const [showShare, setShowShare] = useState(false); const [fmt, setFmt] = useState<"png" | "jpg" | "svg">("png");
  const wrap = useRef<HTMLDivElement>(null); const svgRef = useRef<SVGSVGElement>(null); const drag = useRef<Drag>(null); const fileRef = useRef<HTMLInputElement>(null);
  const d = draft ?? h.present; const scale = fit * zoom; const selEl = d.els.find(e => e.id === sel) ?? null;
  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(""), 1800); };

  useEffect(() => { setPop(null); setShowMore(false); }, [sel]);
  const apply = useCallback((next: Design) => setH(p => commit(p, next)), []);
  useEffect(() => { onSave(h.present); }, [h.present, onSave]);
  useEffect(() => { const el = wrap.current; if (!el) return; const ro = new ResizeObserver(() => setFit(Math.max(0.1, Math.min((el.clientWidth - 80) / h.present.w, (el.clientHeight - 186) / h.present.h)))); ro.observe(el); return () => ro.disconnect(); }, [h.present.w, h.present.h]);

  const add = (type: ElType, over: Partial<El> = {}) => { const e = makeEl(type, h.present, over); apply(addEl(h.present, e)); setSel(e.id); };
  const edit = (p: Partial<El>) => { if (sel) apply(patchEl(h.present, sel, p)); };
  const del = () => { if (sel && !selEl?.locked) { apply(removeEls(h.present, [sel])); setSel(null); } };
  const dup = () => { if (sel) { const r = duplicateEl(h.present, sel); apply(r.design); setSel(r.id); } };

  // keyboard
  useEffect(() => {
    const k = (ev: KeyboardEvent) => {
      const t = ev.target as HTMLElement; if (t && /INPUT|TEXTAREA|SELECT/.test(t.tagName)) return; const mod = ev.metaKey || ev.ctrlKey;
      if (mod && ev.key.toLowerCase() === "z") { ev.preventDefault(); setH(p => (ev.shiftKey ? redo(p) : undo(p))); }
      else if (mod && ev.key.toLowerCase() === "y") { ev.preventDefault(); setH(p => redo(p)); }
      else if (mod && ev.key.toLowerCase() === "d") { ev.preventDefault(); dup(); }
      else if ((ev.key === "Delete" || ev.key === "Backspace") && sel) { ev.preventDefault(); del(); }
      else if (ev.key === "Escape") { setSel(null); setEditing(null); }
      else if (sel && ev.key.startsWith("Arrow")) { ev.preventDefault(); const st = ev.shiftKey ? 10 : 1, e = h.present.els.find(x => x.id === sel); if (e) apply(patchEl(h.present, sel, { x: e.x + (ev.key === "ArrowRight" ? st : ev.key === "ArrowLeft" ? -st : 0), y: e.y + (ev.key === "ArrowDown" ? st : ev.key === "ArrowUp" ? -st : 0) })); }
    };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  }); // re-bind each render so closures are fresh

  const toDesign = (ev: React.PointerEvent) => { const r = svgRef.current!.getBoundingClientRect(); return { x: (ev.clientX - r.left) / scale, y: (ev.clientY - r.top) / scale }; };
  const down = (ev: React.PointerEvent) => {
    if (editing) return; const p = toDesign(ev); const hit = hitTest(h.present, p.x, p.y, measure, true);
    if (!hit) { setSel(null); return; }
    setSel(hit.id); setShowMore(false); if (hit.locked) return; (ev.currentTarget as Element).setPointerCapture?.(ev.pointerId); drag.current = { kind: "move", id: hit.id, sx: p.x, sy: p.y, orig: hit };
  };
  const startHandle = (ev: React.PointerEvent, kind: "resize" | "rotate", handle?: Handle) => { ev.stopPropagation(); if (!selEl || selEl.locked) return; const p = toDesign(ev); (ev.currentTarget as Element).setPointerCapture?.(ev.pointerId); drag.current = { kind, id: selEl.id, sx: p.x, sy: p.y, orig: { ...selEl, h: elHeight(selEl, measure) }, handle }; };
  const move = (ev: React.PointerEvent) => {
    const g = drag.current; if (!g) return; const p = toDesign(ev), dx = p.x - g.sx, dy = p.y - g.sy, o = g.orig;
    if (g.kind === "move") { const s = ev.altKey ? { x: o.x + dx, y: o.y + dy, guides: { x: [], y: [] } } : snapMove(h.present, { x: o.x + dx, y: o.y + dy, w: o.w, h: elHeight(o, measure) }, o.id, 6 / Math.max(scale, 0.2), measure); setGuides(s.guides); setDraft(patchEl(h.present, g.id, { x: s.x, y: s.y })); }
    else if (g.kind === "resize") {
      const hh = elHeight(o, measure); const r = resizeBox({ x: o.x, y: o.y, w: o.w, h: hh }, g.handle!, dx, dy, ev.shiftKey || o.type === "image");
      if (o.type === "text") { const f = o.fontSize ?? 32; setDraft(patchEl(h.present, g.id, { x: r.x, y: r.y, w: Math.max(40, r.w), fontSize: g.handle!.length === 2 ? Math.max(8, Math.round((f * r.w) / o.w)) : f })); }
      else setDraft(patchEl(h.present, g.id, { x: r.x, y: r.y, w: r.w, h: o.type === "line" ? 0 : r.h }));
    } else { const hh = elHeight(o, measure), cx = o.x + o.w / 2, cy = o.y + hh / 2; let a = (Math.atan2(p.y - cy, p.x - cx) * 180) / Math.PI - 90; if (!ev.altKey) a = Math.round(a / 15) * 15; setDraft(patchEl(h.present, g.id, { rotation: Math.round(a) })); }
  };
  const up = () => { if (drag.current && draft) apply(draft); drag.current = null; setDraft(null); setGuides({ x: [], y: [] }); };

  const onUpload = async (files: FileList | null) => {
    if (!files?.length) return; try { const { src, w, h: hh } = await fileToDataUrl(files[0]); const k = Math.min(1, (h.present.w * 0.6) / w, (h.present.h * 0.6) / hh); add("image", { src, w: Math.round(w * k), h: Math.round(hh * k) }); flash("Image added"); } catch { flash("Couldn't read that image"); }
  };
  const doExport = async (fmt: "png" | "jpg" | "svg") => {
    setShowExport(false);
    try {
      const name = (h.present.name || "design").replace(/[^\w-]+/g, "-");
      if (fmt === "svg") download(new Blob([toSVG(h.present, measure)], { type: "image/svg+xml" }), `${name}.svg`);
      else download(await exportBlob(h.present, fmt, 1), `${name}.${fmt}`);
      flash(`Downloaded ${fmt.toUpperCase()}`);
    } catch { flash("Export failed"); }
  };
  const textEl = editing ? d.els.find(e => e.id === editing) : null;
  const svgInner = useMemo(() => d.els.map(e => elementSVG(e, measure)).join(""), [d]);
  const selH = selEl ? elHeight(selEl, measure) : 0;
  const swatch = (c: string, cur: string | undefined, on: (c: string) => void) => <button key={c} aria-label={`Color ${c}`} className="cv-sw" style={{ background: c, outline: cur?.toLowerCase() === c.toLowerCase() ? "2px solid var(--ids-color-primary)" : undefined }} onClick={() => on(c)} />;

  return <div className="cv">
    <div className="cv-top">
      <Link className="cv-tb" href="/app" aria-label="Home"><Ic n="home" s={20} /></Link>
      <button className="cv-tb t">File</button>
      <div style={{ position: "relative" }}><button className="cv-tb t" onClick={() => setShowSize(s => !s)}>Resize</button>
        {showSize && <div className="cv-pop">{SIZES.map(s => <button key={s.id} className="cv-pop__i" onClick={() => { apply(resizeCanvas(h.present, s.w, s.h)); setShowSize(false); }}>{s.label}<small>{s.hint}</small></button>)}</div>}</div>
      <button className="cv-tb t"><Ic n="edit" s={16} /> Editing <Ic n="chev" s={14} /></button>
      <button className="cv-tb" onClick={() => setH(p => undo(p))} disabled={!h.past.length} aria-label="Undo"><Ic n="undo" s={18} /></button>
      <button className="cv-tb" onClick={() => setH(p => redo(p))} disabled={!h.future.length} aria-label="Redo"><Ic n="redo" s={18} /></button>
      <span className="cv-tb" role="status" title={save.status === "saved" ? "Saved in this browser only" : "Changes have not been saved"}>{save.status === "saved" ? "Saved locally" : "Not saved"}</span>
      <input aria-label="Design name" className="cv-name" value={h.present.name} onChange={e => setH(p => ({ ...p, present: touch({ ...p.present, name: e.target.value }) }))} />
      <span className="cv-try">Free forever</span><span className="cv-tkav">TK</span>
      <button className="cv-tb" aria-label="Insights"><Ic n="chart" s={20} /></button><button className="cv-tb" aria-label="Comments"><Ic n="comment" s={20} /></button>
      <span className="cv-split"><button className="cv-pres" onClick={() => { const w = window.open("", "_blank"); if (w) { w.document.write(toSVG(h.present)); w.document.title = h.present.name; } }}>Present</button><button className="cv-pres sm" aria-label="More present options"><Ic n="chev" s={14} /></button></span>
      <div style={{ position: "relative" }}><button className="cv-share" aria-expanded={showShare} onClick={() => { setShowShare(s => !s); setShowExport(false); }}>Share</button>
        {showShare && <div className="cv-sharepop" role="dialog" aria-label="Share design">
          {!showExport ? <><div className="hd"><b>Share design</b><span><Ic n="chart" s={14} /> 0 visitors</span><Ic n="gear" s={16} /></div>
            <small className="lb">People with access</small><div className="add"><span>Add people</span><i>TK</i><i className="p">+</i></div>
            <div className="acc"><Ic n="lock" s={16} /> Only you can access <Ic n="chev" s={14} /></div>
            <div className="cp"><button className="cv-purple" onClick={() => { navigator.clipboard?.writeText(location.href); flash("Link copied"); }}>Copy link</button><button className="pl"><Ic n="crown" s={14} /> Personalize your link</button></div>
            <div className="ig">{([["dl", "Download", () => setShowExport(true)], ["present", "Present"], ["link", "Public view link"], ["present", "Present and record"], ["globe", "Website"], ["apps", "Microsoft PowerPoint"], ["folder", "Google Drive"], ["more", "See all"]] as [string, string, (() => void)?][]).map(([i, l, f]) => <button key={l} onClick={f}><span><Ic n={i} s={20} /></span>{l}</button>)}</div></>
          : <><div className="hd"><button className="bk" onClick={() => setShowExport(false)}><Ic n="chevr" s={14} /></button><b>Download</b></div>
            <small className="lb">File type</small><div className="ft">{(["png", "jpg", "svg"] as const).map(f => <button key={f} className={fmt === f ? "on" : ""} onClick={() => setFmt(f)}><b>{f.toUpperCase()}</b>{f === "png" ? <em>Suggested</em> : null}</button>)}</div>
            <div className="seg"><b className="on">Digital</b><b>Print</b></div>
            <div className="ad">Advanced Settings<small>Password protect and more</small></div>
            <button className="cv-purple full" onClick={() => { doExport(fmt); setShowShare(false); setShowExport(false); }}>Download</button></>}
        </div>}</div>
    </div>
    <SaveNotice save={save} onBackup={onBackup} />
    <div className={"cv-ctx" + (selEl && !selEl.locked ? "" : " empty")} aria-label="Element toolbar">
      {selEl && !selEl.locked && <>
        {selEl.type === "text" && <>
          <select aria-label="Font" className="cv-sel" value={selEl.fontFamily} onChange={e => edit({ fontFamily: e.target.value })}>{FONTS.map(f => <option key={f.label} value={f.css}>{f.label}</option>)}</select>
          <span className="cv-step"><button aria-label="Decrease font size" onClick={() => edit({ fontSize: Math.max(8, Math.round(selEl.fontSize ?? 32) - 2) })}>−</button><input aria-label="Font size" className="cv-num" type="number" min={8} max={600} value={Math.round(selEl.fontSize ?? 32)} onChange={e => edit({ fontSize: +e.target.value || 8 })} /><button aria-label="Increase font size" onClick={() => edit({ fontSize: Math.round(selEl.fontSize ?? 32) + 2 })}>+</button></span></>}
        <span className="rel"><button className="cx" aria-label={selEl.type === "text" ? "Text color" : selEl.type === "line" ? "Line color" : "Fill color"} aria-expanded={pop === "color"} onClick={() => setPop(p => p === "color" ? null : "color")}>{selEl.type === "text" ? <span className="A">A<i style={{ background: /^#/.test(selEl.fill) ? selEl.fill : "linear-gradient(90deg,#f00,#fc0,#0c0,#09f,#90f)" }} /></span> : <span className="sq" style={{ background: selEl.type === "line" ? selEl.stroke : selEl.type === "image" ? "#ccc" : selEl.fill }} />}</button>
          {pop === "color" && <div className="cv-pop cp"><div className="tb">{PALETTE.slice(0, 16).map(c => swatch(c, selEl.type === "line" ? selEl.stroke : selEl.fill, c2 => edit(selEl.type === "line" ? { stroke: c2 } : { fill: c2 })))}<input aria-label="Custom color" type="color" className="cv-color" value={/^#[0-9a-f]{6}$/i.test(selEl.type === "line" ? selEl.stroke : selEl.fill) ? (selEl.type === "line" ? selEl.stroke : selEl.fill) : "#000000"} onChange={e => edit(selEl.type === "line" ? { stroke: e.target.value } : { fill: e.target.value })} /></div></div>}</span>
        {selEl.type === "text" && <>
          <button className={"cx" + ((selEl.fontWeight ?? 400) >= 700 ? " on" : "")} aria-label="Bold" onClick={() => edit({ fontWeight: (selEl.fontWeight ?? 400) >= 700 ? 400 : 700 })}><b>B</b></button>
          <button className={"cx" + (selEl.italic ? " on" : "")} aria-label="Italic" onClick={() => edit({ italic: !selEl.italic })}><i>I</i></button>
          <button className={"cx" + (selEl.underline ? " on" : "")} aria-label="Underline" aria-pressed={!!selEl.underline} onClick={() => edit({ underline: !selEl.underline })}><u>U</u></button>
          <button className={"cx" + (selEl.strikethrough ? " on" : "")} aria-label="Strikethrough" aria-pressed={!!selEl.strikethrough} onClick={() => edit({ strikethrough: !selEl.strikethrough })}><s>S</s></button>
          <button className="cx" aria-label="Change case" onClick={() => { const t = selEl.text ?? ""; edit({ text: t === t.toUpperCase() ? t.toLowerCase() : t.toUpperCase() }); }}>aA</button>
          <button className="cx" aria-label={`Align text ${selEl.align ?? "left"}`} onClick={() => edit({ align: selEl.align === "left" || !selEl.align ? "center" : selEl.align === "center" ? "right" : "left" })}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d={selEl.align === "right" ? "M4 6h16M10 12h10M6 18h14" : selEl.align === "left" || !selEl.align ? "M4 6h16M4 12h10M4 18h14" : "M4 6h16M7 12h10M5 18h14"} /></svg></button>
          <button className="cx" aria-label="List" onClick={() => flash("Lists aren't supported yet")}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" /></svg></button>
          <button className="cx" aria-label="Spacing" onClick={() => flash("Spacing isn't supported yet")}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5h6M12 5v10M6 19h12M15 17l3 2-3 2M9 17l-3 2 3 2" /></svg></button></>}
        <span className="rel"><button className="cx" aria-label="Transparency" aria-expanded={pop === "trans"} onClick={() => setPop(p => p === "trans" ? null : "trans")}><span className="chk" /></button>
          {pop === "trans" && <div className="cv-pop tp"><label className="cv-lbl">Opacity<input aria-label="Opacity" type="range" min={5} max={100} value={Math.round(selEl.opacity * 100)} onChange={e => edit({ opacity: +e.target.value / 100 })} /></label>
            {selEl.type === "rect" && <label className="cv-lbl">Corners<input type="range" min={0} max={200} value={selEl.radius} onChange={e => edit({ radius: +e.target.value })} /></label>}
            {selEl.type !== "text" && selEl.type !== "line" && selEl.type !== "image" && <label className="cv-lbl">Border<input type="range" min={0} max={30} value={selEl.strokeWidth} onChange={e => edit({ strokeWidth: +e.target.value, stroke: selEl.stroke === "#000000" && !selEl.strokeWidth ? "#0E1318" : selEl.stroke })} /></label>}
            {selEl.type === "line" && <label className="cv-lbl">Weight<input type="range" min={1} max={40} value={selEl.strokeWidth} onChange={e => edit({ strokeWidth: +e.target.value })} /></label>}</div>}</span>
        <button className="cx tx" onClick={() => flash("Effects aren't supported yet")}>Effects</button>
        <button className="cx tx" onClick={() => flash("Animations aren't supported yet")}>Animate</button>
        <span className="rel"><button className="cx tx" aria-expanded={pop === "pos"} onClick={() => setPop(p => p === "pos" ? null : "pos")}>Position</button>
          {pop === "pos" && <div className="cv-pop pp"><div className="tb"><button className="iconbtn" onClick={() => apply(reorder(h.present, selEl.id, "forward"))} aria-label="Bring forward">Forward</button><button className="iconbtn" onClick={() => apply(reorder(h.present, selEl.id, "backward"))} aria-label="Send backward">Back</button>
            {(["left", "center", "right", "top", "middle", "bottom"] as AlignTo[]).map(a => <button key={a} className="iconbtn" aria-label={`Align ${a} on page`} onClick={() => apply(alignEl(h.present, selEl.id, a, measure))}>{({ left: "⇤", center: "⇔", right: "⇥", top: "⤒", middle: "⇕", bottom: "⤓" } as const)[a]}</button>)}
            <button className="iconbtn" onClick={dup} aria-label="Duplicate">Duplicate</button><button className="iconbtn" onClick={del} aria-label="Delete">Delete</button></div></div>}</span></>}
    </div>
    <div className="cv-body">
      <nav className="cv-rail" aria-label="Tools">{([["ai", "Canva AI", ""], ["tpl", "Templates", "templates"], ["shapes", "Elements", "elements"], ["text", "Text", "text"], ["crown", "Brand", "background"], ["up", "Uploads", "uploads"], ["tools", "Tools", ""], ["folder", "Projects", ""], ["apps", "Apps", ""]] as [string, string, string][]).map(([i, l, t]) => <button key={l} className={tab === t && t ? "on" : ""} onClick={() => t && setTab(t as typeof tab)}><span><Ic n={i} s={20} /></span>{l}</button>)}</nav>
      <aside className="cv-panel">
        {tab === "templates" && <><label className="cv-psearch"><Ic n="plus" s={16} /><input placeholder="Search templates" aria-label="Search templates" /><Ic n="mic" s={16} /></label><div className="cv-tpls">{TEMPLATES.map(t => { const td = fromTemplate(t); return <button key={t.id} className="cv-tpl" aria-label={`Template ${t.name}`} onClick={() => { apply({ ...td, id: h.present.id, name: h.present.name === "Untitled design" ? t.name : h.present.name }); setSel(null); flash("Template applied"); }}>
          <span dangerouslySetInnerHTML={{ __html: toSVG(td).replace(/width="\d+" height="\d+"/, 'width="100%"') }} /><small>{t.name}</small></button>; })}</div></>}
        {tab === "elements" && <><label className="cv-psearch"><Ic n="search" s={16} /><input placeholder="Search elements" aria-label="Search elements" /><Ic n="mic" s={16} /></label><h3>Browse categories</h3><div className="cv-cats">{["Shapes", "Graphics", "Photos", "Videos", "3D", "Forms", "Animations", "Audio", "Sheets", "Tables", "Charts", "Frames", "Grids", "Mockups"].map(c => <button key={c}><span /><small>{c}</small></button>)}</div><h3>Shapes</h3><div className="cv-grid">
          <button onClick={() => add("rect")} aria-label="Add rectangle"><svg viewBox="0 0 40 40"><rect x="6" y="8" width="28" height="24" rx="3" fill="var(--ids-color-primary)" /></svg>Rectangle</button>
          <button onClick={() => add("ellipse")} aria-label="Add circle"><svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="14" fill="var(--ids-color-primary)" /></svg>Circle</button>
          <button onClick={() => add("triangle")} aria-label="Add triangle"><svg viewBox="0 0 40 40"><polygon points="20,6 35,33 5,33" fill="var(--ids-color-primary)" /></svg>Triangle</button>
          <button onClick={() => add("star")} aria-label="Add star"><svg viewBox="0 0 40 40"><polygon points="20,4 24.5,15 36,15.5 27,23 30,35 20,28.5 10,35 13,23 4,15.5 15.5,15" fill="var(--ids-color-primary)" /></svg>Star</button>
          <button onClick={() => add("line")} aria-label="Add line"><svg viewBox="0 0 40 40"><line x1="6" y1="20" x2="34" y2="20" stroke="var(--ids-color-primary)" strokeWidth="4" strokeLinecap="round" /></svg>Line</button></div>
          <h3>Layers</h3><ol className="cv-layers">{[...d.els].reverse().map(e => <li key={e.id}><button className={e.id === sel ? "on" : ""} onClick={() => setSel(e.id)}>{e.type === "text" ? (e.text ?? "").slice(0, 22) || "Text" : e.type}</button></li>)}{!d.els.length && <li className="ids-muted" style={{ fontSize: 13 }}>Nothing yet. Add a shape or pick a template.</li>}</ol></>}
        {tab === "text" && <><label className="cv-psearch"><Ic n="search" s={16} /><input placeholder="Search fonts and combinations" aria-label="Search fonts" /></label>
          <button className="cv-purple full" onClick={() => add("text", { text: "Add a text box", fontSize: Math.round(h.present.w * 0.04), fontWeight: 400 })}><Ic n="text" s={16} /> Add a text box</button><button className="cv-outl"><Ic n="ai" s={16} /> Magic Write</button>
          <div className="cv-bk"><b>Brand Kit</b><span>Edit <Ic n="crown" s={12} /></span></div><button className="cv-outl sm">Add your brand fonts</button>
          <h4>Default text styles</h4><div className="cv-stack">
          <button style={{ fontSize: 24, fontWeight: 800 }} onClick={() => add("text", { text: "Add a heading", fontSize: Math.round(h.present.w * 0.048), fontWeight: 800 })}>Add a heading</button>
          <button style={{ fontSize: 17, fontWeight: 700 }} onClick={() => add("text", { text: "Add a subheading", fontSize: Math.round(h.present.w * 0.03), fontWeight: 600 })}>Add a subheading</button>
          <button style={{ fontSize: 12 }} onClick={() => add("text", { text: "Add a little bit of body text", fontSize: Math.round(h.present.w * 0.02), fontWeight: 400 })}>Add a little bit of body text</button></div>
          <h4>Dynamic text</h4><button className="cv-dyn" onClick={() => add("text", { text: "1", fontSize: Math.round(h.present.w * 0.04), fontWeight: 600 })}><span>1</span>Page numbers</button>
          <h4>Font combinations</h4><div className="cv-fc"><button style={{ color: "#12b5c9", fontWeight: 900, fontSize: 34 }} onClick={() => add("text", { text: "ROCK", fontSize: Math.round(h.present.w * 0.1), fontWeight: 900, fill: "#12B5C9" })}>ROCK</button><button style={{ color: "#f26a1b", fontWeight: 800, fontSize: 20 }} onClick={() => add("text", { text: "CUSTOM PAINT", fontSize: Math.round(h.present.w * 0.06), fontWeight: 800, fill: "#F26A1B" })}>CUSTOM PAINT</button></div></>}
        {tab === "uploads" && <><h3>Uploads</h3><input ref={fileRef} data-testid="upload" type="file" accept="image/*" hidden onChange={e => { onUpload(e.target.files); e.target.value = ""; }} /><button className="ids-btn ids-btn--primary ids-btn--block" onClick={() => fileRef.current?.click()}>Upload an image</button><p className="ids-muted" style={{ fontSize: 13 }}>Images are resized and kept in your browser. Nothing leaves your device.</p></>}
        {tab === "background" && <><h3>Page color</h3><div className="tb">{PALETTE.map(c => swatch(c, h.present.bg, c2 => apply(touch({ ...h.present, bg: c2 }))))}<input aria-label="Page color" type="color" className="cv-color" value={h.present.bg} onChange={e => apply(touch({ ...h.present, bg: e.target.value }))} /></div></>}
      </aside>
      <main className="cv-stage" ref={wrap} onPointerDown={e => { if (e.target === e.currentTarget) setSel(null); }}>
        <div className="cv-page" style={{ width: d.w * scale, height: d.h * scale }}>
          <svg ref={svgRef} data-testid="page" width={d.w * scale} height={d.h * scale} viewBox={`0 0 ${d.w} ${d.h}`} onPointerDown={down} onPointerMove={move} onPointerUp={up} onDoubleClick={ev => { const p = { x: (ev.clientX - svgRef.current!.getBoundingClientRect().left) / scale, y: (ev.clientY - svgRef.current!.getBoundingClientRect().top) / scale }; const hit = hitTest(h.present, p.x, p.y, measure, true); if (hit?.type === "text" && !hit.locked) { setSel(hit.id); setEditing(hit.id); } }} style={{ display: "block", touchAction: "none", cursor: drag.current ? "grabbing" : "default" }}>
            <rect width={d.w} height={d.h} fill={d.bg} />
            <Layer html={svgInner} />
            {guides.x.map(x => <line key={"x" + x} x1={x} x2={x} y1={0} y2={d.h} stroke="#FF3D9A" strokeWidth={1 / scale} />)}{guides.y.map(y => <line key={"y" + y} y1={y} y2={y} x1={0} x2={d.w} stroke="#FF3D9A" strokeWidth={1 / scale} />)}
            {selEl && !editing && <g transform={`rotate(${selEl.rotation} ${selEl.x + selEl.w / 2} ${selEl.y + selH / 2})`} data-testid="selection">
              <rect x={selEl.x} y={selEl.y} width={selEl.w} height={Math.max(selH, 1)} fill="none" stroke="var(--ids-color-primary)" strokeWidth={2 / scale} pointerEvents="none" />
              {!selEl.locked && HANDLES.filter(([hd]) => selEl.type === "text" ? ["nw", "ne", "se", "sw", "e", "w"].includes(hd) : selEl.type === "line" ? ["e", "w"].includes(hd) : true).map(([hd, fx, fy]) => { const bar = hd === "e" || hd === "w" || hd === "n" || hd === "s", vert = hd === "e" || hd === "w", cx = selEl.x + selEl.w * fx, cy = selEl.y + selH * fy;
                return bar ? <rect key={hd} data-handle={hd} x={cx - (vert ? 4 : 11) / scale} y={cy - (vert ? 11 : 4) / scale} width={(vert ? 8 : 22) / scale} height={(vert ? 22 : 8) / scale} rx={4 / scale} fill="#fff" stroke="#8b8d98" strokeWidth={1.2 / scale} style={{ cursor: hd + "-resize" }} onPointerDown={e => startHandle(e, "resize", hd)} onPointerMove={move} onPointerUp={up} />
                  : <circle key={hd} data-handle={hd} cx={cx} cy={cy} r={7.5 / scale} fill="#fff" stroke="#8b8d98" strokeWidth={1.2 / scale} style={{ cursor: hd + "-resize" }} onPointerDown={e => startHandle(e, "resize", hd)} onPointerMove={move} onPointerUp={up} />; })}
              {!selEl.locked && <g data-handle="rotate" transform={`translate(${selEl.x + selEl.w / 2} ${selEl.y + selH + 36 / scale}) scale(${1 / scale})`} style={{ cursor: "grab" }} onPointerDown={e => startHandle(e, "rotate")} onPointerMove={move} onPointerUp={up}>
                <circle r={13} fill="#fff" stroke="#8b8d98" strokeWidth={1.2} /><g transform="translate(-8 -8) scale(.667)" fill="none" stroke="#0e1318" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M4 11a8 8 0 0113-5l3 2M20 13a8 8 0 01-13 5l-3-2M20 4v4h-4M4 20v-4h4" /></g></g>}</g>}
          </svg>
          {selEl && !editing && !drag.current && <div className="cv-float" data-testid="float-toolbar" style={{ left: (selEl.x + selEl.w / 2) * scale, top: Math.max(-22, selEl.y * scale - 50) }} onPointerDown={e => e.stopPropagation()}>
            <button className="ask" onClick={() => flash("Ask Canva isn't available in this clone")}><svg width="18" height="18" viewBox="0 0 24 24" aria-hidden><defs><linearGradient id="cvg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#00c4cc" /><stop offset="1" stopColor="#7d2ae8" /></linearGradient></defs><path d="M17 7.5a7 7 0 100 9" fill="none" stroke="url(#cvg)" strokeWidth="3.2" strokeLinecap="round" /></svg>Ask Canva</button>
            <button aria-label="Link" onClick={() => flash("Links aren't supported yet")}><Ic n="link" s={20} /></button>
            <button aria-label="Add comment" onClick={() => flash("Comments aren't supported yet")}><Ic n="comment" s={20} /></button>
            <button aria-label={selEl.locked ? "Unlock" : "Lock"} className={selEl.locked ? "on" : ""} aria-pressed={!!selEl.locked} onClick={() => apply(setElementLocked(h.present, selEl.id, !selEl.locked))}><Ic n="lock" s={20} /></button>
            <span className="rel"><button aria-label="More" aria-expanded={showMore} onClick={() => setShowMore(m => !m)}><Ic n="more" s={22} w={2.6} /></button>
              {showMore && <div className="cv-pop mo"><button className="cv-pop__i" onClick={() => { dup(); setShowMore(false); }}>Duplicate</button><button className="cv-pop__i" disabled={!!selEl.locked} onClick={() => { apply(reorder(h.present, selEl.id, "forward")); setShowMore(false); }}>Bring forward</button><button className="cv-pop__i" disabled={!!selEl.locked} onClick={() => { apply(reorder(h.present, selEl.id, "backward")); setShowMore(false); }}>Send backward</button><button className="cv-pop__i" disabled={!!selEl.locked} onClick={() => { del(); setShowMore(false); }}>Delete</button></div>}</span></div>}
          {textEl && <textarea autoFocus aria-label="Edit text" className="cv-text" defaultValue={textEl.text} onBlur={e => { apply(patchEl(h.present, textEl.id, { text: e.target.value || " " })); setEditing(null); }} onKeyDown={e => { if (e.key === "Escape") (e.target as HTMLTextAreaElement).blur(); }}
            style={{ left: textEl.x * scale, top: textEl.y * scale, width: textEl.w * scale, height: Math.max(40, elHeight(textEl, measure) * scale + 8), fontSize: (textEl.fontSize ?? 32) * scale, fontFamily: textEl.fontFamily, fontWeight: textEl.fontWeight, fontStyle: textEl.italic ? "italic" : "normal", textDecoration: textDecoration(textEl), textAlign: textEl.align, color: textEl.fill, lineHeight: textEl.lineHeight ?? 1.2 }} />}
        </div>
        <div className="cv-pages"><div className="pg">1</div><button className="pa" aria-label="Add page" onClick={() => flash("Single-page designs for now")}><Ic n="plus" s={18} /><Ic n="chev" s={14} /></button></div>
        <div className="cv-zoom"><span className="nt"><Ic n="edit" s={14} /> Notes</span><span className="nt"><Ic n="cloud" s={14} /> Timer</span><i className="gap" />
          <button aria-label="Zoom out" onClick={() => setZoom(z => Math.max(0.25, +(z - 0.25).toFixed(2)))}>−</button><input type="range" aria-label="Zoom" min={0.25} max={3} step={0.05} value={zoom} onChange={e => setZoom(+e.target.value)} /><button aria-label="Zoom in" onClick={() => setZoom(z => Math.min(3, +(z + 0.25).toFixed(2)))}>+</button><span className="pc">{Math.round(scale * 100)}%</span><button className="pgs" onClick={() => setZoom(1)}><Ic n="grid" s={14} /> Pages</button><span className="pc">1 / 1</span><Ic n="grid" s={16} /><Ic n="full" s={16} /><Ic n="help" s={16} /></div>
        {msg && <div className="cv-toast" role="status">{msg}</div>}
      </main>
    </div>
  </div>;
}
