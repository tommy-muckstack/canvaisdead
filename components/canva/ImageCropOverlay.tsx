"use client";
import { useEffect, useId, useRef } from "react";
import type { El } from "@/lib/design/types";
import type { Handle } from "@/lib/design/ops";
import { panImageCrop, resizeImageCrop } from "@/lib/design/image-crop";
import { imageFlipSVG } from "@/lib/design/image-flip";

const handles: [Handle, number, number, string][] = [["nw", 0, 0, "top left"], ["n", .5, 0, "top"], ["ne", 1, 0, "top right"], ["e", 1, .5, "right"], ["se", 1, 1, "bottom right"], ["s", .5, 1, "bottom"], ["sw", 0, 1, "bottom left"], ["w", 0, .5, "left"]];
type Gesture = { pointer: number; x: number; y: number; scale: number; ratio: number | null; original: El; handle: Handle | "pan"; target: Element };
export function ImageCropOverlay({ element, scale, ratio, onChange }: { element: El; scale: number; ratio: number | null; onChange: (next: El) => void }) {
  const mask = useId(), drag = useRef<Gesture | null>(null), change = useRef(onChange);
  useEffect(() => { change.current = onChange; });
  const clear = () => { const g = drag.current; drag.current = null; if (g?.target.hasPointerCapture(g.pointer)) g.target.releasePointerCapture(g.pointer); };
  const cancel = () => { const original = drag.current?.original; clear(); if (original) change.current(original); };
  useEffect(() => { const blur = () => { const g = drag.current; drag.current = null; if (g) { if (g.target.hasPointerCapture(g.pointer)) g.target.releasePointerCapture(g.pointer); change.current(g.original); } }; window.addEventListener("blur", blur); return () => window.removeEventListener("blur", blur); }, []);
  const move = (event: React.PointerEvent) => {
    const g = drag.current; if (!g || event.pointerId !== g.pointer) return;
    event.preventDefault(); event.stopPropagation();
    const dx = (event.clientX - g.x) / g.scale, dy = (event.clientY - g.y) / g.scale;
    onChange(g.handle === "pan" ? panImageCrop(g.original, dx, dy) : resizeImageCrop(g.original, g.handle, dx, dy, g.ratio));
  };
  const start = (event: React.PointerEvent<SVGElement>, handle: Gesture["handle"]) => {
    if (event.button !== 0 || !event.isPrimary || drag.current) return;
    event.preventDefault(); event.stopPropagation(); event.currentTarget.focus(); event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { pointer: event.pointerId, x: event.clientX, y: event.clientY, original: element, scale, ratio, handle, target: event.currentTarget };
  };
  const keys = (event: React.KeyboardEvent, handle: Gesture["handle"]) => {
    if (!event.key.startsWith("Arrow") || event.metaKey || event.ctrlKey) return;
    event.preventDefault(); event.stopPropagation(); const step = event.shiftKey ? 10 : 1, dx = event.key === "ArrowRight" ? step : event.key === "ArrowLeft" ? -step : 0, dy = event.key === "ArrowDown" ? step : event.key === "ArrowUp" ? -step : 0;
    onChange(handle === "pan" ? panImageCrop(element, dx, dy) : resizeImageCrop(element, handle, dx, dy, ratio));
  };
  const c = element.imageCrop!, k = element.w / c.w, full = { x: element.x - c.x * k, y: element.y - c.y * k, w: c.sourceW * k, h: c.sourceH * k };
  return <g className="cv-crop-overlay" data-testid="image-crop" transform={`rotate(${element.rotation} ${element.x + element.w / 2} ${element.y + element.h / 2})`} onPointerMove={move} onPointerUp={event => { if (drag.current?.pointer === event.pointerId) { move(event); clear(); } }} onPointerCancel={event => { if (drag.current?.pointer === event.pointerId) cancel(); }} onLostPointerCapture={event => { if (drag.current?.pointer === event.pointerId) cancel(); }}>
    <g transform={imageFlipSVG(element)} pointerEvents="none">
      <defs><mask id={mask} maskUnits="userSpaceOnUse" x={full.x} y={full.y} width={full.w} height={full.h}><rect x={full.x} y={full.y} width={full.w} height={full.h} fill="#fff" /><rect x={element.x} y={element.y} width={element.w} height={element.h} fill="#000" /></mask></defs>
      <image href={element.src} x={full.x} y={full.y} width={full.w} height={full.h} preserveAspectRatio="none" opacity={.3 * element.opacity} mask={`url(#${mask})`} />
    </g>
    <rect className="cv-crop-pan" x={element.x} y={element.y} width={element.w} height={element.h} fill="transparent" stroke="#fff" strokeWidth={2 / scale} role="button" tabIndex={0} aria-label="Reposition image crop" style={{ cursor: "grab" }} onPointerDown={event => start(event, "pan")} onKeyDown={event => keys(event, "pan")} />
    {[1 / 3, 2 / 3].map(value => <g key={value} pointerEvents="none" stroke="#fff" strokeWidth={1 / scale} opacity={.7}><line x1={element.x + element.w * value} x2={element.x + element.w * value} y1={element.y} y2={element.y + element.h} /><line x1={element.x} x2={element.x + element.w} y1={element.y + element.h * value} y2={element.y + element.h * value} /></g>)}
    {handles.map(([handle, x, y, label]) => <g key={handle} data-crop-handle={handle} role="button" tabIndex={0} aria-label={`Crop ${label}`} transform={`translate(${element.x + x * element.w} ${element.y + y * element.h}) scale(${1 / scale})`} style={{ cursor: `${handle}-resize` }} onPointerDown={event => start(event, handle)} onKeyDown={event => keys(event, handle)}>
      <rect x={-14} y={-14} width={28} height={28} fill="transparent" /><rect className="cv-crop-handle" x={handle.length === 1 && (handle === "n" || handle === "s") ? -10 : -3} y={handle.length === 1 && (handle === "e" || handle === "w") ? -10 : -3} width={handle.length === 1 && (handle === "n" || handle === "s") ? 20 : 6} height={handle.length === 1 && (handle === "e" || handle === "w") ? 20 : 6} rx={1} fill="#fff" stroke="#0e1318" strokeWidth={1} />
    </g>)}
  </g>;
}
