"use client";
import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocal } from "@/lib/useLocal";
import { SIZES, blankDesign } from "@/lib/design/ops";
import type { Design } from "@/lib/design/types";
import { isDesignLibrary } from "@/lib/design/validate";
import { downloadDesignBackup } from "@/lib/design/backup";
import { changeDimensionUnit, customSize, DESIGN_UNITS, dimensionNumber, editDimension, recentDesignSizes, searchSizePresets, swapDimensions, toggleDimensionRatio, type DesignUnit, type DimensionDraft } from "@/lib/design/create";
import { trackWebsite } from "@/lib/analytics/client";
import { Ic } from "./Ic";
import { SaveNotice } from "./SaveNotice";

const SECTIONS = [
  { id: "all", label: "For you", icon: "star" },
  { id: "presentations", label: "Presentations", icon: "present", presets: ["presentation"] },
  { id: "social", label: "Social media", icon: "star", presets: ["ig-post", "portrait", "story", "yt-thumb", "logo"] },
  { id: "photo", label: "Photo editor", icon: "shapes", unavailable: "A dedicated photo editor is not available yet. You can upload images into a blank design using the editor’s Uploads panel." },
  { id: "videos", label: "Videos", icon: "present", unavailable: "Video editing and playback are not available yet. You can create static artwork using the sizes in For you." },
  { id: "print", label: "Print", icon: "print", presets: ["poster", "doc", "card", "a4"] },
  { id: "docs", label: "Docs", icon: "edit", unavailable: "The document editor is not available yet. US Letter and A4 in Print create fixed-size pages for artwork." },
  { id: "whiteboards", label: "Whiteboards", icon: "full", unavailable: "An infinite whiteboard is not available yet. Custom size creates a fixed-size canvas." },
  { id: "sheets", label: "Sheets", icon: "grid", unavailable: "Spreadsheets and formulas are not available yet." },
  { id: "code", label: "Code", icon: "text", unavailable: "Interactive code designs are not available yet." },
  { id: "websites", label: "Websites", icon: "globe", unavailable: "Website design and publishing are not available yet." },
  { id: "emails", label: "Emails", icon: "comment", unavailable: "Email design and HTML export are not available yet." },
  { id: "custom", label: "Custom size", icon: "plus" },
  { id: "upload", label: "Upload", icon: "up", unavailable: "Starting a design from a file is not available yet. Create a blank design, then use Uploads in the editor to add images from your device." },
  { id: "layers", label: "Magic Layers", icon: "tpl", unavailable: "Turning images into editable layers is not available yet." },
] as const;
export type CreateSection = typeof SECTIONS[number]["id"];
const CreateContext = createContext<(section?: CreateSection) => void>(() => {});
export const useDesignCreation = () => useContext(CreateContext);

export function DesignCreationProvider({ uid, children }: { uid: string; children: React.ReactNode }) {
  const [section, setSection] = useState<CreateSection | null>(null);
  const open = useCallback((next: CreateSection = "all") => setSection(next), []);
  const close = useCallback(() => setSection(null), []);
  return <CreateContext.Provider value={open}>{children}{section !== null && <CreateDesignDialog uid={uid} initialSection={section} onClose={close} />}</CreateContext.Provider>;
}

export function CreateDesignTrigger() {
  const open = useDesignCreation();
  return <button type="button" className="cx-rail__i create" aria-label="Create a design" aria-haspopup="dialog" onClick={() => open()}><span><Ic n="plus" s={22} /></span>Create</button>;
}

function CreateDesignDialog({ uid, initialSection, onClose }: { uid: string; initialSection: CreateSection; onClose: () => void }) {
  const [designs, setDesigns, ready, save] = useLocal<Design[]>(uid, "designs", [], isDesignLibrary);
  const [section, setSection] = useState(initialSection), [query, setQuery] = useState("");
  const [draft, setDraft] = useState<DimensionDraft>({ width: "", height: "", unit: "px", ratio: null });
  const [touched, setTouched] = useState(false), [opening, setOpening] = useState(false);
  const pending = useRef<string | null>(null), busy = useRef(false), dialog = useRef<HTMLDialogElement>(null);
  const search = useRef<HTMLInputElement>(null), width = useRef<HTMLInputElement>(null);
  const id = useId(), router = useRouter();
  useEffect(() => {
    const node = dialog.current;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    node?.showModal();
    (initialSection === "custom" ? width : search).current?.focus();
    return () => { node?.close(); if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true }); };
  }, [initialSection]);
  useEffect(() => { if (section === "custom") width.current?.focus(); }, [section]);
  const current = SECTIONS.find(item => item.id === section)!;
  const presets = "presets" in current ? SIZES.filter(size => (current.presets as readonly string[]).includes(size.id)) : SIZES;
  const matches = searchSizePresets(query.trim() ? SIZES : presets, query);
  const result = customSize(draft.width, draft.height, draft.unit);
  const recent = useMemo(() => recentDesignSizes(designs), [designs]);
  const disabled = !ready || save.status !== "saved" || opening;
  function openDesign(designId: string) {
    setOpening(true);
    trackWebsite("website_design_created", { source: "blank" });
    router.push(`/app/design/${designId}`);
  }
  function create(w: number, h: number, label?: string) {
    if (disabled || busy.current || !customSize(String(w), String(h), "px").size) return;
    busy.current = true;
    const design = blankDesign({ w, h }, label ? `Untitled design - ${label}` : "Untitled design");
    pending.current = design.id;
    if (setDesigns(previous => [design, ...previous])) openDesign(design.id);
    else busy.current = false;
  }
  function retry() {
    const saved = save.retry();
    if (saved && pending.current && !busy.current) { busy.current = true; openDesign(pending.current); }
    return saved;
  }
  function choose(next: CreateSection) { setSection(next); setQuery(""); }
  const sizeButtons = (items: { w: number; h: number }[]) => <div className="cx-create-recent">{items.map(size => <button type="button" key={`${size.w}:${size.h}`} disabled={disabled} onClick={() => create(size.w, size.h)}>{size.w} × {size.h} px</button>)}</div>;
  return <dialog className="cx-create" ref={dialog} aria-labelledby={`${id}-title`} onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => {
    if (event.target !== event.currentTarget) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
  }}>
    <header><h2 id={`${id}-title`}>Create a design</h2><button type="button" className="cx-create-close" aria-label="Close Create a design" onClick={onClose}><Ic n="x" /></button></header>
    <div className="cx-create-layout">
      <nav className="cx-create-nav" aria-label="Design categories">{SECTIONS.map(item => <button type="button" key={item.id} aria-current={section === item.id ? "true" : undefined} onClick={() => choose(item.id)}><Ic n={item.icon} s={20} />{item.label}</button>)}</nav>
      <section className="cx-create-content" aria-busy={!ready || opening}>
        <SaveNotice save={{ ...save, retry }} onBackup={ready && save.status !== "load-error" ? () => downloadDesignBackup(designs) : undefined} />
        {!ready && <p role="status">Loading designs…</p>}
        {opening && <p role="status">Opening your design…</p>}
        {section === "custom" ? <>
          <h3>Custom size</h3>
          <form noValidate onSubmit={event => { event.preventDefault(); setTouched(true); if (result.size) create(result.size.w, result.size.h); }}>
            <div className="cx-create-dimensions">
              <label>Width<input ref={width} type="text" inputMode="decimal" value={draft.width} aria-invalid={touched && !!result.error} aria-describedby={`${id}-help${touched && result.error ? ` ${id}-error` : ""}`} onBlur={() => setTouched(true)} onChange={event => setDraft(previous => editDimension(previous, "width", event.target.value))} /></label>
              <label>Height<input type="text" inputMode="decimal" value={draft.height} aria-invalid={touched && !!result.error} aria-describedby={`${id}-help${touched && result.error ? ` ${id}-error` : ""}`} onBlur={() => setTouched(true)} onChange={event => setDraft(previous => editDimension(previous, "height", event.target.value))} /></label>
              <label>Units<select value={draft.unit} onChange={event => setDraft(previous => changeDimensionUnit(previous, event.target.value as DesignUnit))}>{DESIGN_UNITS.map(unit => <option key={unit} value={unit}>{unit}</option>)}</select></label>
            </div>
            <div className="cx-create-dimension-actions">
              <button type="button" aria-pressed={draft.ratio !== null} disabled={draft.ratio === null && (dimensionNumber(draft.width) === null || dimensionNumber(draft.height) === null)} onClick={() => setDraft(toggleDimensionRatio)}><Ic n="lock" s={16} />Lock aspect ratio</button>
              <button type="button" onClick={() => setDraft(swapDimensions)}>Swap width and height</button>
            </div>
            <p id={`${id}-help`} className="cx-create-help">40–8,000 px per side, up to 25 million pixels. Measurements use 96 pixels per inch and round to the nearest pixel.</p>
            {touched && result.error && <p id={`${id}-error`} className="cx-create-error" role="alert">{result.error}</p>}
            {result.size && <p className="cx-create-help" aria-live="polite">Canvas: {result.size.w} × {result.size.h} px</p>}
            <button className="cx-btn p cx-create-submit" type="submit" disabled={disabled}>Create new design</button>
          </form>
          {recent.length > 0 && <><h3>Recent sizes</h3>{sizeButtons(recent)}</>}
        </> : <>
          <label className="cx-create-search"><Ic n="search" /><input ref={search} type="search" aria-label="Search design types and sizes" placeholder="Search design types and sizes" value={query} onChange={event => setQuery(event.target.value)} /></label>
          <h3>{query.trim() ? "Search results" : current.label}</h3>
          {!query.trim() && "unavailable" in current ? <div className="cx-create-unavailable"><p>{current.unavailable}</p><button type="button" className="cx-btn" onClick={() => choose("all")}>Browse blank designs</button></div> : <>
            <div className="cx-create-presets">{matches.map(size => <button type="button" key={size.id} disabled={disabled} onClick={() => create(size.w, size.h, size.id === "doc" ? "US Letter" : size.label)}>
              <span className="cx-create-preview" aria-hidden="true"><span style={{ aspectRatio: `${size.w}/${size.h}`, width: size.w >= size.h ? "72%" : undefined, height: size.w < size.h ? "72%" : undefined }} /></span>
              <b>{size.id === "doc" ? "US Letter" : size.label}</b><small>{size.w} × {size.h} px</small>
            </button>)}</div>
            {matches.length === 0 && <div className="cx-create-unavailable"><p role="status">No design types match “{query}”.</p><button type="button" className="cx-btn" onClick={() => choose("custom")}>Use custom size</button></div>}
          </>}
        </>}
      </section>
    </div>
  </dialog>;
}
