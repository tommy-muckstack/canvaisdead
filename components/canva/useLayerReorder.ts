"use client";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type RefObject } from "react";
import type { CanvasDesign } from "@/lib/design/types";
import type { LayerNode } from "@/lib/design/groups";
import { layerKey, layerMoveContext, reorderLayersAt, type LayerDrop } from "@/lib/design/layers";

type Gesture = {
  original: CanvasDesign; ids: string[]; context: NonNullable<ReturnType<typeof layerMoveContext>>; source: HTMLElement;
  pointer?: number; x: number; y: number; startX: number; startY: number; active: boolean; slot: number; moved: boolean; drop: LayerDrop | null;
};
export function useLayerReorder({ design, ids, root, onMove, onSelect }: {
  design: CanvasDesign; ids: string[]; root: RefObject<HTMLDivElement | null>;
  onMove: (ids: string[], drop: LayerDrop, original: CanvasDesign) => void;
  onSelect: (ids: string[], scope: string | null, additive: boolean, replace?: boolean) => void;
}) {
  const gesture = useRef<Gesture | null>(null), frame = useRef<number | null>(null), suppressClick = useRef(false);
  const [drag, setDrag] = useState<{ ids: string[]; drop: LayerDrop | null } | null>(null), [message, setMessage] = useState("");
  const release = useCallback(() => {
    const old = gesture.current; gesture.current = null;
    if (frame.current !== null) cancelAnimationFrame(frame.current); frame.current = null;
    if (old?.pointer !== undefined && old.source.hasPointerCapture(old.pointer)) old.source.releasePointerCapture(old.pointer);
    return old;
  }, []);
  const cancel = useCallback(() => { const old = release(); setDrag(null); if (old?.active) setMessage("Layer move cancelled."); }, [release]);
  useEffect(() => { if (gesture.current && gesture.current.original.els !== design.els) cancel(); }, [design.els, cancel]);
  useEffect(() => {
    const pointer = () => { if (gesture.current?.active && gesture.current.pointer === undefined) cancel(); };
    window.addEventListener("blur", cancel); window.addEventListener("pointerdown", pointer, true);
    return () => { window.removeEventListener("blur", cancel); window.removeEventListener("pointerdown", pointer, true); release(); };
  }, [cancel, release]);
  const paint = (g: Gesture) => setDrag({ ids: g.ids, drop: g.drop });
  const point = (g: Gesture) => {
    const row = document.elementFromPoint(g.x, g.y)?.closest<HTMLElement>("[data-layer-key]");
    const target = row && root.current?.contains(row) ? g.context.siblings.find(n => layerKey(n) === row.dataset.layerKey && !n.els.some(e => g.ids.includes(e.id))) : null;
    const next: LayerDrop | null = target && row ? { target: { id: target.id, kind: target.kind }, side: g.y < row.getBoundingClientRect().top + row.getBoundingClientRect().height / 2 ? "before" : "after" } : null;
    if (JSON.stringify(next) !== JSON.stringify(g.drop)) { g.drop = next; paint(g); }
  };
  const scroll = () => {
    const g = gesture.current; if (!g?.active || g.pointer === undefined) return;
    const panel = root.current?.closest<HTMLElement>(".cv-panel");
    if (panel) {
      const box = panel.getBoundingClientRect(), withinX = g.x >= box.left && g.x <= box.right;
      const dy = !withinX ? 0 : g.y < box.top + 40 ? -10 : g.y > box.bottom - 40 ? 10 : 0;
      if (dy) { panel.scrollTop += dy; point(g); }
    }
    frame.current = requestAnimationFrame(scroll);
  };
  const prepare = (node: LayerNode, source: HTMLElement) => {
    const rowIds = node.els.map(e => e.id), selected = rowIds.every(id => ids.includes(id)) ? ids : rowIds;
    const context = layerMoveContext(design.els, selected);
    if (!context) { setMessage("Unlock the layers and select siblings in one group to move them together."); return null; }
    if (context.units.length === context.siblings.length) { setMessage("There are no other layers in this group to move past."); return null; }
    const visual = [...context.siblings].reverse(), first = visual.findIndex(n => n.els.some(e => selected.includes(e.id)));
    return { original: design, ids: selected, context, source, x: 0, y: 0, startX: 0, startY: 0, active: false, slot: Math.max(0, first), moved: false, drop: null } satisfies Gesture;
  };
  const activate = (g: Gesture) => {
    g.active = true; g.source.focus({ preventScroll: true }); onSelect(g.ids, g.context.scope, false, true); paint(g);
    setMessage(`Moving ${g.context.units.length} ${g.context.units.length === 1 ? "layer" : "layers"}. Use arrow keys, then Enter to drop. Escape cancels.`);
  };
  const start = (event: PointerEvent<HTMLButtonElement>, node: LayerNode, grip = false) => {
    if (event.button !== 0) return;
    if (gesture.current?.pointer !== undefined && gesture.current.pointer !== event.pointerId) return;
    suppressClick.current = false;
    if (!grip && (event.pointerType !== "mouse" || event.shiftKey || event.ctrlKey || event.metaKey)) return;
    cancel();
    const g = prepare(node, event.currentTarget); if (!g) return;
    g.x = event.clientX; g.y = event.clientY; g.startX = g.x; g.startY = g.y;
    gesture.current = { ...g, pointer: event.pointerId }; event.currentTarget.setPointerCapture(event.pointerId);
    if (grip) event.preventDefault();
  };
  const move = (event: PointerEvent) => {
    const g = gesture.current; if (!g || g.pointer !== event.pointerId) return;
    g.x = event.clientX; g.y = event.clientY;
    if (!g.active && Math.hypot(g.x - g.startX, g.y - g.startY) >= 5) { suppressClick.current = true; activate(g); frame.current = requestAnimationFrame(scroll); }
    if (g.active) { event.preventDefault(); g.moved = true; point(g); }
  };
  const finish = () => {
    const g = release(); setDrag(null);
    if (!g?.active) return;
    if (g.moved && g.drop && reorderLayersAt(g.original, g.ids, g.drop) !== g.original) { onMove(g.ids, g.drop, g.original); setMessage("Layer order updated."); }
    else setMessage("Layer order unchanged.");
    g.source.focus({ preventScroll: true });
  };
  const up = (event: PointerEvent) => { if (gesture.current?.pointer === event.pointerId) { move(event); finish(); } };
  const pointerCancel = (event: PointerEvent) => { if (gesture.current?.pointer === event.pointerId) cancel(); };
  const keyStart = (event: KeyboardEvent<HTMLButtonElement>, node: LayerNode) => {
    if (gesture.current || ![" ", "Enter"].includes(event.key)) return;
    event.preventDefault(); event.stopPropagation(); const g = prepare(node, event.currentTarget); if (!g) return;
    gesture.current = g; activate(g);
  };
  const keys = (event: KeyboardEvent) => {
    suppressClick.current = false;
    const g = gesture.current; if (!g?.active) return;
    if (event.key === "Tab") { cancel(); return; }
    if (event.key === "Escape" || ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z")) { event.preventDefault(); event.stopPropagation(); cancel(); return; }
    if (event.ctrlKey || event.metaKey || ["Delete", "Backspace", "ContextMenu", "F10"].includes(event.key)) { event.preventDefault(); event.stopPropagation(); return; }
    if (g.pointer !== undefined) return;
    if (["Enter", " "].includes(event.key)) { event.preventDefault(); event.stopPropagation(); finish(); return; }
    if (!["ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
    event.preventDefault(); event.stopPropagation();
    const visible = new Set([...root.current!.querySelectorAll<HTMLElement>("[data-layer-key]")].filter(row => row.getClientRects().length > 0).map(row => row.dataset.layerKey));
    const visual = [...g.context.siblings].reverse().filter(node => visible.has(layerKey(node))), others = visual.filter(n => !n.els.some(e => g.ids.includes(e.id)));
    const previous = g.drop ? others.findIndex(n => layerKey(n) === layerKey(g.drop!.target)) : -1;
    const slot = previous >= 0 ? previous + (g.drop!.side === "after" ? 1 : 0) : Math.max(0, visual.findIndex(n => n.els.some(e => g.ids.includes(e.id))));
    const next = event.key === "Home" ? 0 : event.key === "End" ? others.length : Math.max(0, Math.min(others.length, slot + (event.key === "ArrowUp" ? -1 : 1)));
    if (!others.length || next === slot) return;
    g.slot = next; g.moved = true; const target = others[Math.min(next, others.length - 1)];
    g.drop = { target: { kind: target.kind, id: target.id }, side: next === others.length ? "after" : "before" }; paint(g);
    const row = [...root.current!.querySelectorAll<HTMLElement>("[data-layer-key]")].find(el => el.dataset.layerKey === layerKey(target)); row?.scrollIntoView({ block: "nearest" });
    setMessage(`Drop ${g.drop.side} ${target.kind === "group" ? "group" : target.els[0].type}.`);
  };
  const click = () => { if (!suppressClick.current) return false; suppressClick.current = false; return true; };
  return { drag, message, start, move, up, cancel, pointerCancel, keys, keyStart, click };
}
