import type { CanvasDesign, El } from "./types";
import { anchoredBox, approxMeasure, elHeight, patchEl, type Measure } from "./ops";
import { editableSelectionIds, selectionUnits } from "./groups";
import { moveSelection, resizeSelection, rotateSelection, selectedElements, selectionBounds } from "./selection";
import { textAnchorFraction } from "./text-spacing";

export type PositionField = "x" | "y" | "w" | "h" | "rotation";
export const POSITION_LIMIT = 1_000_000;
export const validPositionValue = (field: PositionField, value: number) => Number.isFinite(value) && Math.abs(value) <= POSITION_LIMIT && ((field !== "w" && field !== "h") || value >= .01);
export const normalizeRotation = (value: number) => ((value % 360) + 360) % 360;
export function positionMetrics(elements: El[], measure: Measure = approxMeasure) {
  if (!elements.length) return null;
  if (elements.length === 1) { const e = elements[0]; return { x: e.x, y: e.y, w: e.w, h: elHeight(e, measure), rotation: normalizeRotation(e.rotation) }; }
  const box = selectionBounds(elements, measure)!;
  return { ...box, rotation: 0 }; // Multi-selection rotation is an explicit relative adjustment.
}
/** Numeric geometry edits are atomic: a protected member cannot be left behind. */
export function positionSelection(design: CanvasDesign, ids: readonly string[], field: PositionField, value: number, keepRatio: boolean, measure: Measure = approxMeasure): CanvasDesign {
  const elements = selectedElements(design, ids), metrics = positionMetrics(elements, measure);
  if (!metrics || !validPositionValue(field, value) || editableSelectionIds(design.els, ids).length !== elements.length) return design;
  if (field === "x" || field === "y") return elements.length === 1 ? patchEl(design, elements[0].id, { [field]: value }) : moveSelection(design, ids, field === "x" ? value - metrics.x : 0, field === "y" ? value - metrics.y : 0);
  if (field === "rotation") {
    if (elements.length === 1) return metrics.rotation === normalizeRotation(value) ? design : patchEl(design, elements[0].id, { rotation: normalizeRotation(value) });
    return rotateSelection(design, ids, value % 360, measure);
  }
  if (metrics[field] === value) return design;
  if (elements.length > 1) {
    const next = resizeSelection(design, ids, "se", field === "w" ? value - metrics.w : 0, field === "h" ? value - metrics.h : 0, measure);
    const box = positionMetrics(selectedElements(next, ids), measure)!;
    return validPositionValue("w", box.w) && validPositionValue("h", box.h) && [box.x, box.y].every(Number.isFinite) ? next : design;
  }
  const e = elements[0];
  if (e.type === "line" && field === "h") return design;
  if (e.type === "text" && field === "h" && !keepRatio) return design;
  const ratio = keepRatio && e.type !== "line", factor = value / metrics[field];
  if (!Number.isFinite(factor) || factor <= 0) return design;
  const w = field === "w" ? value : ratio ? e.w * factor : e.w;
  let h = field === "h" ? value : ratio ? metrics.h * factor : metrics.h;
  const fontSize = e.type === "text" && ratio ? (e.fontSize ?? 32) * factor : e.fontSize;
  if (!validPositionValue("w", w) || !validPositionValue("h", h) || (e.type === "text" && (fontSize ?? 32) < 8)) return design;
  if (e.type === "text") h = elHeight({ ...e, w, fontSize }, measure);
  if (!validPositionValue("h", h)) return design;
  const box = anchoredBox({ ...e, h: metrics.h }, w, h, { x: 0, y: e.type === "text" ? textAnchorFraction(e) : 0 });
  if (![box.x, box.y, box.w, box.h].every(Number.isFinite)) return design;
  return patchEl(design, e.id, { ...box, h: e.type === "text" || e.type === "line" ? e.h : h, ...(e.type === "text" ? { fontSize } : {}) }, measure);
}

/** Equal edge-to-edge gaps; complete groups remain units and endpoints stay fixed. */
export function distributeSelection(design: CanvasDesign, ids: readonly string[], axis: "horizontal" | "vertical", measure: Measure = approxMeasure): CanvasDesign {
  const units = selectionUnits(design.els, ids);
  if (units.length < 3 || units.some(unit => unit.els.some(e => e.locked))) return design;
  const position = axis === "horizontal" ? "x" : "y", size = axis === "horizontal" ? "w" : "h";
  const ordered = units.map(unit => ({ unit, box: selectionBounds(unit.els, measure)! })).sort((a, b) => a.box[position] - b.box[position]);
  const first = ordered[0].box, last = ordered.at(-1)!.box;
  const gap = (last[position] + last[size] - first[position] - ordered.reduce((sum, item) => sum + item.box[size], 0)) / (ordered.length - 1);
  let cursor = first[position], next = design;
  for (let i = 0; i < ordered.length; i++) {
    const { unit, box } = ordered[i], delta = cursor - box[position];
    if (i > 0 && i < ordered.length - 1 && Math.abs(delta) > 1e-8) next = moveSelection(next, unit.els.map(e => e.id), axis === "horizontal" ? delta : 0, axis === "vertical" ? delta : 0);
    cursor += box[size] + gap;
  }
  return next;
}
