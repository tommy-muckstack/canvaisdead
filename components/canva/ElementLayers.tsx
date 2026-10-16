"use client";
import { memo, useEffect, useId, useMemo, useRef, useState } from "react";
import type { CanvasDesign, El } from "@/lib/design/types";
import { layerTree, type LayerNode } from "@/lib/design/groups";
import { touch, type Measure } from "@/lib/design/ops";
import { layerKey, layerMoveContext, layerScope, layerThumbnailNode, overlappingLayerIds, reorderLayersAt } from "@/lib/design/layers";
import { useLayerReorder } from "./useLayerReorder";
import { Ic } from "./Ic";
import { SVGArtwork } from "./Artwork";

export type LayerSelect = (ids: string[], scope: string | null, additive: boolean, replace?: boolean) => void;
export type LayerMenu = (ids: string[], scope: string | null, trigger: HTMLButtonElement, point?: { x: number; y: number }) => void;
const Preview = memo(function Preview({ elements, measure }: { elements: El[]; measure: Measure }) {
  const node = useRef<HTMLSpanElement>(null), [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!node.current) return;
    if (typeof IntersectionObserver === "undefined") { setVisible(true); return; }
    const observer = new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) { setVisible(true); observer.disconnect(); } }, { root: node.current.closest(".cv-panel"), rootMargin: "120px" });
    observer.observe(node.current); return () => observer.disconnect();
  }, []);
  const artwork = useMemo(() => visible ? layerThumbnailNode(elements, measure) : null, [visible, elements, measure]);
  return <span ref={node} className="cv-layer-preview" aria-hidden="true"><SVGArtwork node={artwork} /></span>;
});
const names = { rect: "Rectangle", ellipse: "Ellipse", triangle: "Triangle", star: "Star", line: "Line", image: "Image", text: "Text" };
export function ElementLayers({ design, selectedIds, measure, onSelect, onChange, onMenu }: {
  design: CanvasDesign; selectedIds: string[]; measure: Measure; onSelect: LayerSelect; onMenu: LayerMenu;
  onChange: (update: (design: CanvasDesign) => CanvasDesign) => void;
}) {
  const root = useRef<HTMLDivElement>(null), help = useId(), [filter, setFilter] = useState<"all" | "overlapping">("all");
  const tree = useMemo(() => layerTree(design.els), [design.els]);
  const selectedMove = useMemo(() => layerMoveContext(design.els, selectedIds), [design.els, selectedIds]);
  const overlaps = useMemo(() => filter === "overlapping" ? overlappingLayerIds(design, selectedIds, measure) : null, [filter, design, selectedIds, measure]);
  const reorder = useLayerReorder({ design, ids: selectedIds, root, onSelect, onMove: (ids, drop, original) => onChange(latest => latest.els === original.els ? reorderLayersAt(latest, ids, drop) : latest) });
  const navigate = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (reorder.drag || !["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    event.preventDefault(); event.stopPropagation();
    const buttons = [...root.current!.querySelectorAll<HTMLButtonElement>(".cv-layer-select")].filter(button => button.getClientRects().length > 0);
    const index = buttons.indexOf(event.currentTarget), next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : Math.max(0, Math.min(buttons.length - 1, index + (event.key === "ArrowUp" ? -1 : 1)));
    buttons[next]?.focus();
  };
  const rows = (nodes: LayerNode[]): React.ReactNode => [...nodes].reverse().filter(node => !overlaps || node.els.some(e => overlaps.has(e.id))).map(node => {
    const ids = node.els.map(e => e.id), selected = ids.every(id => selectedIds.includes(id)), locked = node.els.some(e => e.locked), key = layerKey(node), scope = layerScope(node);
    const label = node.kind === "group" ? `Group · ${ids.length} elements` : node.els[0].type === "text" ? (node.els[0].text ?? "").slice(0, 22) || "Text" : names[node.els[0].type];
    const movable = selected ? !!selectedMove && selectedMove.units.length < selectedMove.siblings.length : !locked && (scope !== null || tree.length > 1);
    const drop = reorder.drag?.drop, side = drop && layerKey(drop.target) === key ? drop.side : undefined;
    return <li key={key}>
      <div className={"cv-layer-row" + (selected ? " on" : "") + (reorder.drag && ids.every(id => reorder.drag!.ids.includes(id)) ? " dragging" : "")} data-layer-key={key} data-drop={side}>
        <button type="button" className="cv-layer-grip" aria-label={`Move ${label}`} aria-describedby={help} disabled={!movable} onPointerDown={event => reorder.start(event, node, true)} onKeyDown={event => reorder.keyStart(event, node)}><svg width="12" height="20" viewBox="0 0 12 20" fill="currentColor" aria-hidden="true">{[5, 10, 15].flatMap(y => [3, 9].map(x => <circle key={`${x}:${y}`} cx={x} cy={y} r="1.2" />))}</svg></button>
        <button type="button" className="cv-layer-select" aria-label={label + (locked ? " · locked" : "")} aria-pressed={selected} onClick={event => { if (!reorder.click()) onSelect(ids, scope, event.shiftKey); }} onPointerDown={event => reorder.start(event, node)} onKeyDown={event => { if (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")) { event.preventDefault(); event.stopPropagation(); onMenu(selected ? selectedIds : ids, scope, event.currentTarget); } else navigate(event); }} onContextMenu={event => { event.preventDefault(); onMenu(selected ? selectedIds : ids, scope, event.currentTarget, { x: event.clientX, y: event.clientY }); }}>
          <Preview elements={node.els} measure={measure} /><span className="cv-layer-label">{label}</span>{node.kind === "group" && <Ic n="copy" s={16} />}{locked && <Ic n="lock" s={14} />}
        </button>
        <button type="button" className="cv-layer-more" aria-label={`Layer actions for ${label}`} aria-haspopup="menu" onClick={event => onMenu(selected ? selectedIds : ids, scope, event.currentTarget)}><Ic n="more" s={18} /></button>
      </div>
      {node.kind === "group" && <details><summary>Group contents</summary><ol>{rows(node.children)}</ol></details>}
    </li>;
  });
  return <div ref={root} className="cv-layer-manager" onPointerMove={reorder.move} onPointerUp={reorder.up} onPointerCancel={reorder.pointerCancel} onLostPointerCapture={reorder.pointerCancel} onKeyDown={reorder.keys}>
    <div className="cv-layer-filter" role="group" aria-label="Show layers">{(["all", "overlapping"] as const).map(value => <button type="button" key={value} aria-pressed={filter === value} onClick={() => { reorder.cancel(); setFilter(value); }}>{value === "all" ? "All" : "Overlapping"}</button>)}</div>
    <ol className="cv-layers" aria-label="Design layers">{rows(tree)}
      {filter === "all" && <li><div className="cv-layer-row cv-layer-background"><button type="button" className="cv-layer-select" aria-pressed={!selectedIds.length} onClick={() => onSelect([], null, false, true)} onKeyDown={navigate}><span className="cv-layer-preview" aria-hidden="true" style={{ background: design.bg }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="4" y="4" width="16" height="16" rx="1" /><path d="M4 14 14 4M4 20 20 4M10 20 20 10" /></svg></span><span className="cv-layer-label">Background</span></button><input type="color" aria-label="Page background color" value={design.bg} onChange={event => { const bg = event.currentTarget.value; onSelect([], null, false, true); onChange(latest => latest.bg === bg ? latest : touch({ ...latest, bg })); }} /></div></li>}
    </ol>
    {filter === "overlapping" && !selectedIds.length && <p className="cv-position-hint">Select an element to see its overlapping layers.</p>}
    {!design.els.length && <p className="cv-position-hint">No elements on this page yet.</p>}
    <p className="cv-layer-help" id={help}>Drag layers to rearrange. On a move handle, press Space, use arrow keys, then Enter. Escape cancels.</p>
    <span className="cv-layer-announcement" role="status" aria-live="polite">{reorder.message}</span>
  </div>;
}
