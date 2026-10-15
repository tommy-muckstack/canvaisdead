"use client";
import { useEffect, useId, useRef, useState } from "react";
import { flushSync } from "react-dom";
import type { CanvasDesign } from "@/lib/design/types";
import type { AlignTo, Measure, Z } from "@/lib/design/ops";
import { editableSelectionIds, selectionUnits } from "@/lib/design/groups";
import { alignSelection, reorderSelection, selectedElements } from "@/lib/design/selection";
import { distributeSelection, POSITION_LIMIT, positionMetrics, positionSelection, validPositionValue, type PositionField } from "@/lib/design/position";
import { ElementLayers } from "./ElementLayers";
import { Ic } from "./Ic";

type Change = (update: (design: CanvasDesign) => CanvasDesign) => void;
const format = (value: number) => String(Math.round(value * 1000) / 1000);
function AlignmentIcon({ align }: { align: AlignTo }) {
  const vertical = ["top", "middle", "bottom"].includes(align), center = align === "center" || align === "middle", end = align === "right" || align === "bottom";
  const edge = center ? 12 : end ? 20 : 4;
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><g transform={vertical ? "rotate(90 12 12)" : undefined}><path d={`M${edge} 3v18`} /><rect x="7" y="6" width="10" height="4" rx=".5" /><rect x={center ? 9 : end ? 11 : 7} y="14" width="6" height="4" rx=".5" /></g></svg>;
}
function PositionNumber({ label, field, value, disabled, onCommit }: { label: string; field: PositionField; value: number; disabled?: boolean; onCommit: (value: number) => number }) {
  const [raw, setRaw] = useState(format(value)), dirty = useRef(false);
  useEffect(() => { if (!dirty.current) setRaw(format(value)); }, [value]);
  const number = raw.trim() ? Number(raw) : NaN, valid = validPositionValue(field, number);
  const cancel = () => { dirty.current = false; setRaw(format(value)); };
  const finish = () => { if (!dirty.current) return; dirty.current = false; const next = valid && number !== Number(format(value)) ? onCommit(number) : value; setRaw(format(next)); };
  return <label className="cv-position-number"><span>{label}</span><span><input type="number" aria-label={label} min={field === "w" || field === "h" ? .01 : -POSITION_LIMIT} max={POSITION_LIMIT} step="any" value={raw} disabled={disabled} aria-invalid={!valid}
    onChange={event => { dirty.current = true; setRaw(event.currentTarget.value); }} onBlur={finish} onKeyDown={event => {
      if (event.key === "Enter") { event.preventDefault(); finish(); }
      if (event.key === "Escape" && dirty.current) { event.preventDefault(); event.stopPropagation(); cancel(); }
      if (event.key === "ArrowUp" || event.key === "ArrowDown") { event.preventDefault(); dirty.current = true; setRaw(String((Number.isFinite(number) ? number : value) + (event.key === "ArrowUp" ? 1 : -1) * (event.shiftKey ? 10 : 1))); }
    }} /><small aria-hidden="true">{field === "rotation" ? "°" : "px"}</small></span></label>;
}
function PositionNumbers({ design, ids, measure, onChange }: { design: CanvasDesign; ids: string[]; measure: Measure; onChange: Change }) {
  const elements = selectedElements(design, ids), element = elements.length === 1 ? elements[0] : null, metrics = positionMetrics(elements, measure)!;
  const [ratio, setRatio] = useState(element?.type === "image" || elements.length > 1);
  const protectedSelection = editableSelectionIds(design.els, ids).length !== elements.length, multi = elements.length > 1, line = element?.type === "line";
  const keepRatio = multi || (!line && ratio);
  const change = (field: PositionField, value: number) => {
    const next = positionSelection(design, ids, field, value, keepRatio, measure);
    onChange(latest => positionSelection(latest, ids, field, value, keepRatio, measure));
    return positionMetrics(selectedElements(next, ids), measure)![field];
  };
  return <>
    <div className="cv-position-size">
      <PositionNumber label="Width" field="w" value={metrics.w} disabled={protectedSelection} onCommit={value => change("w", value)} />
      <PositionNumber label="Height" field="h" value={metrics.h} disabled={protectedSelection || line || (element?.type === "text" && !keepRatio)} onCommit={value => change("h", value)} />
      <button type="button" className="cv-position-ratio" aria-label="Lock aspect ratio" aria-pressed={keepRatio} disabled={protectedSelection || multi || line} title={multi ? "Multiple elements resize proportionally" : "Keep width and height in proportion"} onClick={() => setRatio(value => !value)}><Ic n="lock" s={20} /><span>Ratio</span></button>
    </div>
    <div className="cv-position-coordinates"><PositionNumber label="X" field="x" value={metrics.x} disabled={protectedSelection} onCommit={value => change("x", value)} /><PositionNumber label="Y" field="y" value={metrics.y} disabled={protectedSelection} onCommit={value => change("y", value)} /></div>
    <PositionNumber label={multi ? "Rotate by" : "Rotate"} field="rotation" value={metrics.rotation} disabled={protectedSelection} onCommit={value => change("rotation", value)} />
    {element?.type === "text" && !keepRatio && <p className="cv-position-hint">Text height follows its content. Lock the ratio to scale the text.</p>}
    {multi && <p className="cv-position-hint">Size changes scale the selection proportionally. Rotate by adds an angle to the current selection.</p>}
    {protectedSelection && <p className="cv-position-hint">Unlock the selection to change its size or position.</p>}
  </>;
}

export function PositionPanel({ design, ids, measure, onChange, onSelect, onClose }: {
  design: CanvasDesign; ids: string[]; measure: Measure; onChange: Change;
  onSelect: (ids: string[], scope: string | null, additive: boolean) => void; onClose: () => void;
}) {
  const [tab, setTab] = useState<"arrange" | "layers">("arrange"), panel = useRef<HTMLElement>(null), heading = useRef<HTMLHeadingElement>(null), id = useId();
  const elements = selectedElements(design, ids), editable = editableSelectionIds(design.els, ids), units = selectionUnits(design.els, ids);
  const canDistribute = units.length >= 3 && editable.length === elements.length;
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    const outside = (event: PointerEvent) => {
      const active = document.activeElement;
      if (event.target instanceof Node && !panel.current?.contains(event.target) && active instanceof HTMLInputElement && panel.current?.contains(active)) {
        // A canvas drag must snapshot the committed field value, not the previous document.
        flushSync(() => active.blur());
      }
    };
    window.addEventListener("pointerdown", outside, true); return () => window.removeEventListener("pointerdown", outside, true);
  }, []);
  return <section ref={panel} className="cv-position-panel" aria-label="Position" onKeyDown={event => {
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onClose(); }
  }}>
    <header><h3 ref={heading} tabIndex={-1}>Position</h3><button type="button" aria-label="Close position" onClick={onClose}><Ic n="x" s={20} /></button></header>
    <div className="cv-position-tabs" role="tablist" aria-label="Position views">{(["arrange", "layers"] as const).map(view => <button key={view} type="button" role="tab" id={`${id}-${view}`} aria-controls={`${id}-${view}-panel`} aria-selected={tab === view} tabIndex={tab === view ? 0 : -1} onClick={() => setTab(view)} onKeyDown={event => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault(); const next = event.key === "Home" ? "arrange" : event.key === "End" ? "layers" : view === "arrange" ? "layers" : "arrange";
      setTab(next); document.getElementById(`${id}-${next}`)?.focus();
    }}>{view === "arrange" ? "Arrange" : "Layers"}</button>)}</div>
    <div role="tabpanel" id={`${id}-layers-panel`} aria-labelledby={`${id}-layers`} hidden={tab !== "layers"}><ElementLayers elements={design.els} selectedIds={ids} onSelect={onSelect} /></div>
    <div role="tabpanel" id={`${id}-arrange-panel`} aria-labelledby={`${id}-arrange`} hidden={tab !== "arrange"}>
      {!elements.length ? <p className="cv-position-hint">Select an element to arrange it.</p> : <>
        <div className="cv-position-order" role="group" aria-label="Layer order">{([["Forward", "forward"], ["Backward", "backward"], ["To front", "front"], ["To back", "back"]] as [string, Z][]).map(([label, direction]) => <button type="button" key={direction} disabled={reorderSelection(design, ids, direction) === design} onClick={() => onChange(latest => reorderSelection(latest, ids, direction))}>{label}</button>)}</div>
        <h4>{units.length === 1 ? "Align to page" : "Align elements"}</h4>
        <div className="cv-position-align">{(["top", "middle", "bottom", "left", "center", "right"] as AlignTo[]).map(align => <button type="button" key={align} disabled={!editable.length} onClick={() => onChange(latest => alignSelection(latest, ids, align, measure))}><AlignmentIcon align={align} />{align[0].toUpperCase() + align.slice(1)}</button>)}</div>
        {units.length > 1 && <><h4>Space evenly</h4><div className="cv-position-order">{(["horizontal", "vertical"] as const).map(axis => <button type="button" key={axis} disabled={!canDistribute} onClick={() => onChange(latest => distributeSelection(latest, ids, axis, measure))}>{axis === "horizontal" ? "Horizontally" : "Vertically"}</button>)}</div></>}
        <h4>Advanced</h4><PositionNumbers key={JSON.stringify(ids)} design={design} ids={ids} measure={measure} onChange={onChange} />
      </>}
    </div>
  </section>;
}
