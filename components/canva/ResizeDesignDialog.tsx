"use client";
import { useEffect, useId, useRef, useState, type RefObject } from "react";
import { changeDimensionUnit, customSize, DESIGN_UNITS, editDimension, searchSizePresets, swapDimensions, toggleDimensionRatio, type DesignUnit, type DimensionDraft } from "@/lib/design/create";
import { SIZES } from "@/lib/design/ops";
import { designPages } from "@/lib/design/pages";
import { selectedPageIds, type PageSelection } from "@/lib/design/download";
import { uniqueResizeTargets, type ResizeTarget } from "@/lib/design/resize";
import type { Design } from "@/lib/design/types";
import { Ic } from "./Ic";

export function ResizeDesignDialog({ design, currentPageId, trigger, disabled, onClose, onResize, onCopy }: {
  design: Design; currentPageId: string; trigger: RefObject<HTMLButtonElement | null>; disabled: boolean;
  onClose: () => void; onResize: (target: ResizeTarget) => void; onCopy: (targets: ResizeTarget[], pageIds: string[]) => void;
}) {
  const id = useId(), dialog = useRef<HTMLDialogElement>(null), search = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState(""), [chosen, setChosen] = useState<string[]>([]);
  const [custom, setCustom] = useState(false), [touched, setTouched] = useState(false);
  const [draft, setDraft] = useState<DimensionDraft>({ width: String(design.w), height: String(design.h), unit: "px", ratio: null });
  const [selection, setSelection] = useState<PageSelection>("all"), [pageNumbers, setPageNumbers] = useState("");
  const pages = designPages(design), current = pages.findIndex(page => page.id === currentPageId);
  const result = customSize(draft.width, draft.height, draft.unit);
  const targets = uniqueResizeTargets([...SIZES.filter(size => chosen.includes(size.id)), ...(custom && result.size ? [result.size] : [])]);
  const selected = (() => {
    try { return { ids: selectedPageIds(pages, currentPageId, selection, pageNumbers), error: "" }; }
    catch (reason) { return { ids: [], error: reason instanceof Error ? reason.message : "Choose pages to resize." }; }
  })();
  const sizeError = custom && !result.size ? result.error : "";
  const canCopy = !disabled && targets.length > 0 && !sizeError && !selected.error;
  const allPages = selected.ids.length === pages.length;
  const canResize = canCopy && targets.length === 1 && allPages && (targets[0].w !== design.w || targets[0].h !== design.h);
  const matches = searchSizePresets(SIZES, query);
  useEffect(() => {
    const node = dialog.current, button = trigger.current; if (!node) return;
    node.showModal();
    const position = () => {
      const anchor = button?.getBoundingClientRect(), bounds = node.getBoundingClientRect();
      node.style.left = `${Math.max(8, Math.min(anchor?.left ?? 8, innerWidth - bounds.width - 8))}px`;
      node.style.top = `${Math.max(8, Math.min((anchor?.bottom ?? 8) + 6, innerHeight - bounds.height - 8))}px`;
    };
    position(); search.current?.focus(); window.addEventListener("resize", position);
    return () => { window.removeEventListener("resize", position); node.close(); if (button?.isConnected) button.focus({ preventScroll: true }); };
  }, [trigger]);
  const edit = (field: "width" | "height", value: string) => { setCustom(true); setDraft(previous => editDimension(previous, field, value)); };
  return <dialog ref={dialog} className="cv-resize" aria-labelledby={`${id}-title`} onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => {
    if (event.target !== event.currentTarget) return;
    const box = event.currentTarget.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) onClose();
  }} onKeyDown={event => {
    if (event.key !== "Tab" || event.nativeEvent.isComposing) return;
    const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("button,input,select,[tabindex]")).filter(node => node.tabIndex >= 0 && !node.matches(":disabled") && node.getClientRects().length);
    const first = controls[0], last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first && last) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last && first) { event.preventDefault(); first.focus(); }
  }}>
    <header><h2 id={`${id}-title`}>Resize</h2><button type="button" aria-label="Close Resize" onClick={onClose}><Ic n="x" s={20} /></button></header>
    <div className="cv-resize-body">
      <p className="cv-resize-current">{design.w} × {design.h} px · {pages.length} {pages.length === 1 ? "page" : "pages"}</p>
      <label className="cv-resize-search"><Ic n="search" s={18} /><input ref={search} aria-label="Search resize options" placeholder="Search resize options" value={query} onChange={event => setQuery(event.target.value)} /></label>
      <fieldset className="cv-resize-presets"><legend>Suggested sizes</legend>
        {matches.map(size => <label key={size.id}><input type="checkbox" aria-label={`${size.label} ${size.w} × ${size.h} px`} checked={chosen.includes(size.id)} onChange={event => setChosen(previous => event.target.checked ? [...previous, size.id] : previous.filter(id => id !== size.id))} /><span>{size.label}<small>{size.w} × {size.h} px</small></span></label>)}
        {!matches.length && <p role="status">No sizes found. Try another search or enter a custom size.</p>}
      </fieldset>
      <fieldset className="cv-resize-custom"><legend><label><input type="checkbox" checked={custom} onChange={event => setCustom(event.target.checked)} />Custom size</label></legend>
        <div className="cv-resize-dimensions">
          {(["width", "height"] as const).map(field => <label key={field}>{field === "width" ? "Width" : "Height"}<input type="text" inputMode="decimal" value={draft[field]} aria-invalid={touched && !!sizeError} aria-describedby={`${id}-limits${sizeError && touched ? ` ${id}-size-error` : ""}`} onChange={event => edit(field, event.target.value)} onBlur={() => setTouched(true)} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); setTouched(true); } }} /></label>)}
          <label>Units<select value={draft.unit} onChange={event => setDraft(previous => changeDimensionUnit(previous, event.target.value as DesignUnit))}>{DESIGN_UNITS.map(unit => <option key={unit}>{unit}</option>)}</select></label>
        </div>
        <div className="cv-resize-ratio"><button type="button" aria-pressed={draft.ratio !== null} onClick={() => setDraft(toggleDimensionRatio)}><Ic n="lock" s={16} />Lock aspect ratio</button><button type="button" onClick={() => { setCustom(true); setDraft(swapDimensions); }}>Swap dimensions</button></div>
        <p id={`${id}-limits`} className="cv-resize-help">40–8,000 px per side, up to 25 million pixels. Measurements use 96 pixels per inch.</p>
        {sizeError && touched && <p id={`${id}-size-error`} className="cv-resize-error" role="alert">{sizeError}</p>}
      </fieldset>
      <label className="cv-resize-pages">Pages to resize<select value={selection} aria-describedby={`${id}-pages-help`} onChange={event => setSelection(event.target.value as PageSelection)}><option value="all">All pages ({pages.length})</option><option value="current">This page ({current + 1})</option><option value="custom">Custom pages</option></select></label>
      {selection === "custom" && <label className="cv-resize-pages">Page numbers<input value={pageNumbers} placeholder="e.g. 1, 3-5" aria-invalid={!!selected.error} aria-describedby={`${id}-pages-help`} onChange={event => setPageNumbers(event.target.value)} /></label>}
      <p id={`${id}-pages-help`} className={selected.error ? "cv-resize-error" : "cv-resize-help"} aria-live="polite">{selected.error || `${selected.ids.length} ${selected.ids.length === 1 ? "page" : "pages"} selected`}</p>
      <p className="cv-resize-help">Artwork scales proportionally to fit. Review the layout after resizing.</p>
    </div>
    <footer>
      <p role="status">{targets.length} {targets.length === 1 ? "size" : "sizes"} selected</p>
      {!allPages && <p className="cv-resize-help">Resizing selected pages in this design is not available yet. Copy &amp; resize creates a design with just those pages.</p>}
      {targets.length > 1 && <p className="cv-resize-help">Each size creates a separate design in Projects.</p>}
      <button type="button" className="cv-purple full" disabled={!canCopy} onClick={() => onCopy(targets, selected.ids)}>Copy &amp; resize</button>
      <button type="button" className="cv-resize-apply" disabled={!canResize} onClick={() => onResize(targets[0])}>Resize this design</button>
    </footer>
  </dialog>;
}
