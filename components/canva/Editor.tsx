"use client";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Design, El, ElType } from "@/lib/design/types";
import { FONTS, PALETTE, SIZES, addEl, alignEl, commit, duplicateEl, elHeight, elementSVG, hist, hitTest, makeEl, patchEl, redo, removeEls, reorder, resizeBox, resizeCanvas, snapMove, toSVG, touch, undo, uid, type AlignTo, type Handle, type History, type Measure } from "@/lib/design/ops";
import { TEMPLATES, fromTemplate } from "@/lib/design/templates";
import { canvasMeasure, exportBlob } from "@/lib/design/render";

// Memoised so pointer events keep a stable DOM target while selection state changes.
const Layer = memo(function Layer({ html }: { html: string }) { return <g dangerouslySetInnerHTML={{ __html: html }} />; });
let _m: Measure | null = null;
const measure: Measure = (t, s, f, w) => { if (typeof document === "undefined") return t.length * s * 0.55; if (!_m) _m = canvasMeasure(document.createElement("canvas").getContext("2d")!); return _m(t, s, f, w); };
const HANDLES: [Handle, number, number][] = [["nw", 0, 0], ["n", 0.5, 0], ["ne", 1, 0], ["e", 1, 0.5], ["se", 1, 1], ["s", 0.5, 1], ["sw", 0, 1], ["w", 0, 0.5]];
type Drag = { kind: "move" | "resize" | "rotate"; id: string; sx: number; sy: number; orig: El; handle?: Handle } | null;
const download = (blob: Blob, name: string) => { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); };
const fileToDataUrl = (f: File, max = 1400) => new Promise<{ src: string; w: number; h: number }>((res, rej) => { const r = new FileReader(); r.onerror = rej; r.onload = () => { const i = new Image(); i.onerror = rej; i.onload = () => { const k = Math.min(1, max / Math.max(i.width, i.height)), c = document.createElement("canvas"); c.width = Math.round(i.width * k); c.height = Math.round(i.height * k); c.getContext("2d")!.drawImage(i, 0, 0, c.width, c.height); res({ src: c.toDataURL(f.type === "image/png" ? "image/png" : "image/jpeg", 0.88), w: c.width, h: c.height }); }; i.src = String(r.result); }; r.readAsDataURL(f); });

export function Editor({ initial, onSave }: { initial: Design; onSave: (d: Design) => void }) {
  const [h, setH] = useState<History>(() => hist(initial));
  const [draft, setDraft] = useState<Design | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [tab, setTab] = useState<"templates" | "elements" | "text" | "uploads" | "background">("elements");
  const [zoom, setZoom] = useState(1); const [fit, setFit] = useState(0.5);
  const [guides, setGuides] = useState<{ x: number[]; y: number[] }>({ x: [], y: [] });
  const [msg, setMsg] = useState(""); const [showSize, setShowSize] = useState(false); const [showExport, setShowExport] = useState(false);
  const wrap = useRef<HTMLDivElement>(null); const svgRef = useRef<SVGSVGElement>(null); const drag = useRef<Drag>(null); const fileRef = useRef<HTMLInputElement>(null);
  const d = draft ?? h.present; const scale = fit * zoom; const selEl = d.els.find(e => e.id === sel) ?? null;
  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(""), 1800); };

  const apply = useCallback((next: Design) => setH(p => commit(p, next)), []);
  useEffect(() => { onSave(h.present); }, [h.present]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const el = wrap.current; if (!el) return; const ro = new ResizeObserver(() => setFit(Math.max(0.1, Math.min((el.clientWidth - 80) / h.present.w, (el.clientHeight - 80) / h.present.h)))); ro.observe(el); return () => ro.disconnect(); }, [h.present.w, h.present.h]);

  const add = (type: ElType, over: Partial<El> = {}) => { const e = makeEl(type, h.present, over); apply(addEl(h.present, e)); setSel(e.id); setTab("elements"); };
  const edit = (p: Partial<El>) => { if (sel) apply(patchEl(h.present, sel, p)); };
  const del = () => { if (sel) { apply(removeEls(h.present, [sel])); setSel(null); } };
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
    if (editing) return; const p = toDesign(ev); const hit = hitTest(h.present, p.x, p.y, measure);
    if (!hit) { setSel(null); return; }
    setSel(hit.id); (ev.currentTarget as Element).setPointerCapture?.(ev.pointerId); drag.current = { kind: "move", id: hit.id, sx: p.x, sy: p.y, orig: hit };
  };
  const startHandle = (ev: React.PointerEvent, kind: "resize" | "rotate", handle?: Handle) => { ev.stopPropagation(); if (!selEl) return; const p = toDesign(ev); (ev.currentTarget as Element).setPointerCapture?.(ev.pointerId); drag.current = { kind, id: selEl.id, sx: p.x, sy: p.y, orig: { ...selEl, h: elHeight(selEl, measure) }, handle }; };
  const move = (ev: React.PointerEvent) => {
    const g = drag.current; if (!g) return; const p = toDesign(ev), dx = p.x - g.sx, dy = p.y - g.sy, o = g.orig;
    if (g.kind === "move") { const s = ev.altKey ? { x: o.x + dx, y: o.y + dy, guides: { x: [], y: [] } } : snapMove(h.present, { x: o.x + dx, y: o.y + dy, w: o.w, h: elHeight(o, measure) }, o.id, 6 / Math.max(scale, 0.2), measure); setGuides(s.guides); setDraft(patchEl(h.present, g.id, { x: s.x, y: s.y })); }
    else if (g.kind === "resize") {
      const hh = elHeight(o, measure); const r = resizeBox({ x: o.x, y: o.y, w: o.w, h: hh }, g.handle!, dx, dy, ev.shiftKey || o.type === "image");
      if (o.type === "text") { const f = o.fontSize ?? 32; setDraft(patchEl(h.present, g.id, { x: r.x, y: r.y, w: Math.max(40, r.w), fontSize: g.handle!.length === 2 ? Math.max(8, Math.round((f * r.w) / o.w)) : f })); }
      else setDraft(patchEl(h.present, g.id, { x: r.x, y: r.y, w: r.w, h: o.type === "line" ? 0 : r.h }));
    } else { const hh = elHeight(o, measure), cx = o.x + o.w / 2, cy = o.y + hh / 2; let a = (Math.atan2(p.y - cy, p.x - cx) * 180) / Math.PI + 90; if (!ev.altKey) a = Math.round(a / 15) * 15; setDraft(patchEl(h.present, g.id, { rotation: Math.round(a) })); }
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
      <Link className="iconbtn" href="/app">← Home</Link>
      <input aria-label="Design name" className="cv-name" value={h.present.name} onChange={e => setH(p => ({ ...p, present: touch({ ...p.present, name: e.target.value }) }))} />
      <div className="tb" style={{ marginLeft: "auto" }}>
        <button className="iconbtn" onClick={() => setH(p => undo(p))} disabled={!h.past.length} aria-label="Undo">↶ Undo</button>
        <button className="iconbtn" onClick={() => setH(p => redo(p))} disabled={!h.future.length} aria-label="Redo">↷ Redo</button>
        <div style={{ position: "relative" }}><button className="iconbtn" onClick={() => setShowSize(s => !s)}>Resize · {h.present.w}×{h.present.h}</button>
          {showSize && <div className="cv-pop">{SIZES.map(s => <button key={s.id} className="cv-pop__i" onClick={() => { apply(resizeCanvas(h.present, s.w, s.h)); setShowSize(false); }}>{s.label}<small>{s.hint}</small></button>)}</div>}</div>
        <div style={{ position: "relative" }}><button className="ids-btn ids-btn--primary ids-btn--sm" onClick={() => setShowExport(s => !s)}>Download</button>
          {showExport && <div className="cv-pop" style={{ right: 0, left: "auto" }}>{(["png", "jpg", "svg"] as const).map(f => <button key={f} className="cv-pop__i" onClick={() => doExport(f)}>{f.toUpperCase()}<small>{f === "svg" ? "Vector" : f === "png" ? "Lossless" : "Smaller"}</small></button>)}</div>}</div>
      </div>
    </div>
    <div className="cv-ctx" aria-label="Element toolbar">
      {!selEl && <span className="ids-muted" style={{ fontSize: 13 }}>Click an element to edit it. Double-click text to type. Shift-drag a corner keeps proportions. Hold Alt to skip snapping.</span>}
      {selEl && <>
        {selEl.type !== "image" && selEl.type !== "line" && <div className="tb" title="Fill">{PALETTE.slice(0, 8).map(c => swatch(c, selEl.fill, c2 => edit({ fill: c2 })))}<input aria-label="Custom color" type="color" className="cv-color" value={/^#[0-9a-f]{6}$/i.test(selEl.fill) ? selEl.fill : "#000000"} onChange={e => edit({ fill: e.target.value })} /></div>}
        {selEl.type === "line" && <div className="tb">{PALETTE.slice(0, 6).map(c => swatch(c, selEl.stroke, c2 => edit({ stroke: c2 })))}<label className="cv-lbl">Weight<input type="range" min={1} max={40} value={selEl.strokeWidth} onChange={e => edit({ strokeWidth: +e.target.value })} /></label></div>}
        {selEl.type === "text" && <div className="tb">
          <select aria-label="Font" className="cv-sel" value={selEl.fontFamily} onChange={e => edit({ fontFamily: e.target.value })}>{FONTS.map(f => <option key={f.label} value={f.css}>{f.label}</option>)}</select>
          <input aria-label="Font size" className="cv-num" type="number" min={8} max={600} value={Math.round(selEl.fontSize ?? 32)} onChange={e => edit({ fontSize: +e.target.value || 8 })} />
          <button className={"iconbtn" + ((selEl.fontWeight ?? 400) >= 700 ? " on" : "")} aria-label="Bold" onClick={() => edit({ fontWeight: (selEl.fontWeight ?? 400) >= 700 ? 400 : 700 })}><b>B</b></button>
          <button className={"iconbtn" + (selEl.italic ? " on" : "")} aria-label="Italic" onClick={() => edit({ italic: !selEl.italic })}><i>I</i></button>
          {(["left", "center", "right"] as const).map(a => <button key={a} className={"iconbtn" + (selEl.align === a ? " on" : "")} aria-label={`Align text ${a}`} onClick={() => edit({ align: a })}>{a === "left" ? "⇤" : a === "center" ? "↔" : "⇥"}</button>)}</div>}
        {(selEl.type === "rect") && <label className="cv-lbl">Corners<input type="range" min={0} max={200} value={selEl.radius} onChange={e => edit({ radius: +e.target.value })} /></label>}
        {selEl.type !== "text" && selEl.type !== "line" && selEl.type !== "image" && <label className="cv-lbl">Border<input type="range" min={0} max={30} value={selEl.strokeWidth} onChange={e => edit({ strokeWidth: +e.target.value, stroke: selEl.stroke === "#000000" && !selEl.strokeWidth ? "#0E1318" : selEl.stroke })} /></label>}
        <label className="cv-lbl">Opacity<input aria-label="Opacity" type="range" min={5} max={100} value={Math.round(selEl.opacity * 100)} onChange={e => edit({ opacity: +e.target.value / 100 })} /></label>
        <div className="tb"><button className="iconbtn" onClick={() => apply(reorder(h.present, selEl.id, "forward"))} aria-label="Bring forward">Forward</button><button className="iconbtn" onClick={() => apply(reorder(h.present, selEl.id, "backward"))} aria-label="Send backward">Back</button>
          {(["left", "center", "right", "top", "middle", "bottom"] as AlignTo[]).map(a => <button key={a} className="iconbtn" aria-label={`Align ${a} on page`} onClick={() => apply(alignEl(h.present, selEl.id, a, measure))}>{({ left: "⇤", center: "⇔", right: "⇥", top: "⤒", middle: "⇕", bottom: "⤓" } as const)[a]}</button>)}
          <button className="iconbtn" onClick={dup} aria-label="Duplicate">Duplicate</button><button className="iconbtn" onClick={del} aria-label="Delete">Delete</button></div></>}
    </div>
    <div className="cv-body">
      <nav className="cv-rail" aria-label="Tools">{(["templates", "elements", "text", "uploads", "background"] as const).map(t => <button key={t} className={tab === t ? "on" : ""} onClick={() => setTab(t)}>{t[0].toUpperCase() + t.slice(1)}</button>)}</nav>
      <aside className="cv-panel">
        {tab === "templates" && <><h3>Templates</h3><div className="cv-tpls">{TEMPLATES.map(t => { const td = fromTemplate(t); return <button key={t.id} className="cv-tpl" aria-label={`Template ${t.name}`} onClick={() => { apply({ ...td, id: h.present.id, name: h.present.name === "Untitled design" ? t.name : h.present.name }); setSel(null); flash("Template applied"); }}>
          <span dangerouslySetInnerHTML={{ __html: toSVG(td).replace(/width="\d+" height="\d+"/, 'width="100%"') }} /><small>{t.name}</small></button>; })}</div></>}
        {tab === "elements" && <><h3>Shapes</h3><div className="cv-grid">
          <button onClick={() => add("rect")} aria-label="Add rectangle"><svg viewBox="0 0 40 40"><rect x="6" y="8" width="28" height="24" rx="3" fill="var(--ids-color-primary)" /></svg>Rectangle</button>
          <button onClick={() => add("ellipse")} aria-label="Add circle"><svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="14" fill="var(--ids-color-primary)" /></svg>Circle</button>
          <button onClick={() => add("triangle")} aria-label="Add triangle"><svg viewBox="0 0 40 40"><polygon points="20,6 35,33 5,33" fill="var(--ids-color-primary)" /></svg>Triangle</button>
          <button onClick={() => add("star")} aria-label="Add star"><svg viewBox="0 0 40 40"><polygon points="20,4 24.5,15 36,15.5 27,23 30,35 20,28.5 10,35 13,23 4,15.5 15.5,15" fill="var(--ids-color-primary)" /></svg>Star</button>
          <button onClick={() => add("line")} aria-label="Add line"><svg viewBox="0 0 40 40"><line x1="6" y1="20" x2="34" y2="20" stroke="var(--ids-color-primary)" strokeWidth="4" strokeLinecap="round" /></svg>Line</button></div>
          <h3>Layers</h3><ol className="cv-layers">{[...d.els].reverse().map(e => <li key={e.id}><button className={e.id === sel ? "on" : ""} onClick={() => setSel(e.id)}>{e.type === "text" ? (e.text ?? "").slice(0, 22) || "Text" : e.type}</button></li>)}{!d.els.length && <li className="ids-muted" style={{ fontSize: 13 }}>Nothing yet. Add a shape or pick a template.</li>}</ol></>}
        {tab === "text" && <><h3>Text</h3><div className="cv-stack">
          <button style={{ fontSize: 26, fontWeight: 800 }} onClick={() => add("text", { text: "Add a heading", fontSize: Math.round(h.present.w * 0.08), fontWeight: 800 })}>Add a heading</button>
          <button style={{ fontSize: 18, fontWeight: 600 }} onClick={() => add("text", { text: "Add a subheading", fontSize: Math.round(h.present.w * 0.05), fontWeight: 600 })}>Add a subheading</button>
          <button style={{ fontSize: 14 }} onClick={() => add("text", { text: "Add a little bit of body text", fontSize: Math.round(h.present.w * 0.03), fontWeight: 400 })}>Add a little bit of body text</button></div></>}
        {tab === "uploads" && <><h3>Uploads</h3><input ref={fileRef} data-testid="upload" type="file" accept="image/*" hidden onChange={e => { onUpload(e.target.files); e.target.value = ""; }} /><button className="ids-btn ids-btn--primary ids-btn--block" onClick={() => fileRef.current?.click()}>Upload an image</button><p className="ids-muted" style={{ fontSize: 13 }}>Images are resized and kept in your browser. Nothing leaves your device.</p></>}
        {tab === "background" && <><h3>Page color</h3><div className="tb">{PALETTE.map(c => swatch(c, h.present.bg, c2 => apply(touch({ ...h.present, bg: c2 }))))}<input aria-label="Page color" type="color" className="cv-color" value={h.present.bg} onChange={e => apply(touch({ ...h.present, bg: e.target.value }))} /></div></>}
      </aside>
      <main className="cv-stage" ref={wrap} onPointerDown={e => { if (e.target === e.currentTarget) setSel(null); }}>
        <div className="cv-page" style={{ width: d.w * scale, height: d.h * scale }}>
          <svg ref={svgRef} data-testid="page" width={d.w * scale} height={d.h * scale} viewBox={`0 0 ${d.w} ${d.h}`} onPointerDown={down} onPointerMove={move} onPointerUp={up} onDoubleClick={ev => { const p = { x: (ev.clientX - svgRef.current!.getBoundingClientRect().left) / scale, y: (ev.clientY - svgRef.current!.getBoundingClientRect().top) / scale }; const hit = hitTest(h.present, p.x, p.y, measure); if (hit?.type === "text") { setSel(hit.id); setEditing(hit.id); } }} style={{ display: "block", touchAction: "none", cursor: drag.current ? "grabbing" : "default" }}>
            <rect width={d.w} height={d.h} fill={d.bg} />
            <Layer html={svgInner} />
            {guides.x.map(x => <line key={"x" + x} x1={x} x2={x} y1={0} y2={d.h} stroke="#FF3D9A" strokeWidth={1 / scale} />)}{guides.y.map(y => <line key={"y" + y} y1={y} y2={y} x1={0} x2={d.w} stroke="#FF3D9A" strokeWidth={1 / scale} />)}
            {selEl && !editing && <g transform={`rotate(${selEl.rotation} ${selEl.x + selEl.w / 2} ${selEl.y + selH / 2})`} data-testid="selection">
              <rect x={selEl.x} y={selEl.y} width={selEl.w} height={Math.max(selH, 1)} fill="none" stroke="var(--ids-color-primary)" strokeWidth={2 / scale} pointerEvents="none" />
              {HANDLES.filter(([hd]) => selEl.type === "text" ? ["nw", "ne", "se", "sw", "e", "w"].includes(hd) : selEl.type === "line" ? ["e", "w"].includes(hd) : true).map(([hd, fx, fy]) => <rect key={hd} data-handle={hd} x={selEl.x + selEl.w * fx - 6 / scale} y={selEl.y + selH * fy - 6 / scale} width={12 / scale} height={12 / scale} rx={3 / scale} fill="#fff" stroke="var(--ids-color-primary)" strokeWidth={2 / scale} style={{ cursor: hd + "-resize" }} onPointerDown={e => startHandle(e, "resize", hd)} onPointerMove={move} onPointerUp={up} />)}
              <circle data-handle="rotate" cx={selEl.x + selEl.w / 2} cy={selEl.y - 28 / scale} r={7 / scale} fill="#fff" stroke="var(--ids-color-primary)" strokeWidth={2 / scale} style={{ cursor: "grab" }} onPointerDown={e => startHandle(e, "rotate")} onPointerMove={move} onPointerUp={up} /></g>}
          </svg>
          {textEl && <textarea autoFocus aria-label="Edit text" className="cv-text" defaultValue={textEl.text} onBlur={e => { apply(patchEl(h.present, textEl.id, { text: e.target.value || " " })); setEditing(null); }} onKeyDown={e => { if (e.key === "Escape") (e.target as HTMLTextAreaElement).blur(); }}
            style={{ left: textEl.x * scale, top: textEl.y * scale, width: textEl.w * scale, height: Math.max(40, elHeight(textEl, measure) * scale + 8), fontSize: (textEl.fontSize ?? 32) * scale, fontFamily: textEl.fontFamily, fontWeight: textEl.fontWeight, fontStyle: textEl.italic ? "italic" : "normal", textAlign: textEl.align, color: textEl.fill, lineHeight: textEl.lineHeight ?? 1.2 }} />}
        </div>
        <div className="cv-zoom"><button className="iconbtn" aria-label="Zoom out" onClick={() => setZoom(z => Math.max(0.25, +(z - 0.25).toFixed(2)))}>−</button><span>{Math.round(scale * 100)}%</span><button className="iconbtn" aria-label="Zoom in" onClick={() => setZoom(z => Math.min(3, +(z + 0.25).toFixed(2)))}>+</button><button className="iconbtn" onClick={() => setZoom(1)}>Fit</button></div>
        {msg && <div className="cv-toast" role="status">{msg}</div>}
      </main>
    </div>
  </div>;
}
