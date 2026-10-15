import type { CanvasDesign, El } from "./types";
import { approxMeasure, elHeight, resizeBox, rotatePoint, snapMove, touch, uid, type AlignTo, type Handle, type Measure, type Rect, type Z } from "./ops";

export const selectedElements = (design: CanvasDesign, ids: readonly string[]) => {
  const selected = new Set(ids);
  return design.els.filter(element => selected.has(element.id));
};
export const toggleSelection = (ids: readonly string[], id: string) => ids.includes(id) ? ids.filter(value => value !== id) : [...ids, id];
export const selectionRect = (a: { x: number; y: number }, b: { x: number; y: number }): Rect => ({ x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y) });

function corners(element: El, measure: Measure) {
  const height = Math.max(elHeight(element, measure), 1);
  return [[0, 0], [element.w, 0], [element.w, height], [0, height]].map(([x, y]) => rotatePoint(element.x + x, element.y + y, element.x + element.w / 2, element.y + height / 2, element.rotation));
}
export function selectionBounds(elements: readonly El[], measure: Measure = approxMeasure): Rect | null {
  if (!elements.length) return null;
  let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
  for (const element of elements) for (const point of corners(element, measure)) {
    left = Math.min(left, point.x); top = Math.min(top, point.y); right = Math.max(right, point.x); bottom = Math.max(bottom, point.y);
  }
  return { x: left, y: top, w: right - left, h: bottom - top };
}

/** Intersect rotated element boxes with a marquee using separating axes. */
export function elementsInMarquee(design: CanvasDesign, box: Rect, measure: Measure = approxMeasure): string[] {
  if (box.w <= 0 || box.h <= 0) return [];
  const area = [{ x: box.x, y: box.y }, { x: box.x + box.w, y: box.y }, { x: box.x + box.w, y: box.y + box.h }, { x: box.x, y: box.y + box.h }];
  return design.els.filter(element => {
    if (element.locked) return false;
    const shape = corners(element, measure);
    const axes = [{ x: 1, y: 0 }, { x: 0, y: 1 }, ...shape.slice(0, 2).map((point, i) => ({ x: -(shape[i + 1].y - point.y), y: shape[i + 1].x - point.x }))];
    return axes.every(axis => {
      const a = area.map(point => point.x * axis.x + point.y * axis.y), b = shape.map(point => point.x * axis.x + point.y * axis.y);
      return Math.max(...a) >= Math.min(...b) && Math.max(...b) >= Math.min(...a);
    });
  }).map(element => element.id);
}

function mapSelected(design: CanvasDesign, ids: readonly string[], update: (element: El) => El, includeLocked = false): CanvasDesign {
  const selected = new Set(ids);
  let changed = false;
  const els = design.els.map(element => {
    if (!selected.has(element.id) || (element.locked && !includeLocked)) return element;
    const next = update(element);
    if (Object.keys(next).every(key => next[key as keyof El] === element[key as keyof El])) return element;
    changed = true; return next;
  });
  return changed ? touch({ ...design, els }) : design;
}
export function moveSelection(design: CanvasDesign, ids: readonly string[], dx: number, dy: number): CanvasDesign {
  if (!Number.isFinite(dx) || !Number.isFinite(dy) || (!dx && !dy)) return design;
  return mapSelected(design, ids, element => ({ ...element, x: element.x + dx, y: element.y + dy }));
}
export function snapSelection(design: CanvasDesign, ids: readonly string[], dx: number, dy: number, threshold = 6, measure: Measure = approxMeasure) {
  const moving = selectedElements(design, ids).filter(element => !element.locked), box = selectionBounds(moving, measure);
  if (!box) return { dx: 0, dy: 0, guides: { x: [] as number[], y: [] as number[] } };
  const movingIds = new Set(moving.map(element => element.id));
  const snapped = snapMove({ ...design, els: design.els.filter(element => !movingIds.has(element.id)) }, { ...box, x: box.x + dx, y: box.y + dy }, "", threshold, measure);
  return { dx: snapped.x - box.x, dy: snapped.y - box.y, guides: snapped.guides };
}
export function duplicateSelection(design: CanvasDesign, ids: readonly string[], newId: () => string = () => uid()) {
  const copies = selectedElements(design, ids).map(element => ({ ...element, id: newId(), x: element.x + 24, y: element.y + 24 }));
  return { design: copies.length ? touch({ ...design, els: [...design.els, ...copies] }) : design, ids: copies.map(element => element.id) };
}
export function lockSelection(design: CanvasDesign, ids: readonly string[], locked: boolean) {
  return mapSelected(design, ids, element => !!element.locked === locked ? element : { ...element, locked }, true);
}
export function selectionOpacity(design: CanvasDesign, ids: readonly string[], opacity: number) {
  if (!Number.isFinite(opacity) || opacity < 0 || opacity > 1) return design;
  return mapSelected(design, ids, element => ({ ...element, opacity }));
}
export function alignSelection(design: CanvasDesign, ids: readonly string[], align: AlignTo, measure: Measure = approxMeasure) {
  const box = selectionBounds(selectedElements(design, ids), measure);
  if (!box) return design;
  return mapSelected(design, ids, element => {
    const bounds = selectionBounds([element], measure)!;
    const dx = align === "left" ? box.x - bounds.x : align === "center" ? box.x + box.w / 2 - bounds.x - bounds.w / 2 : align === "right" ? box.x + box.w - bounds.x - bounds.w : 0;
    const dy = align === "top" ? box.y - bounds.y : align === "middle" ? box.y + box.h / 2 - bounds.y - bounds.h / 2 : align === "bottom" ? box.y + box.h - bounds.y - bounds.h : 0;
    return { ...element, x: element.x + dx, y: element.y + dy };
  });
}
export function reorderSelection(design: CanvasDesign, ids: readonly string[], direction: Z) {
  const selected = new Set(selectedElements(design, ids).filter(element => !element.locked).map(element => element.id));
  let els = [...design.els];
  if (direction === "front") els = [...els.filter(e => !selected.has(e.id)), ...els.filter(e => selected.has(e.id))];
  else if (direction === "back") els = [...els.filter(e => selected.has(e.id)), ...els.filter(e => !selected.has(e.id))];
  else if (direction === "forward") { for (let i = els.length - 2; i >= 0; i--) if (selected.has(els[i].id) && !selected.has(els[i + 1].id)) [els[i], els[i + 1]] = [els[i + 1], els[i]]; }
  else { for (let i = 1; i < els.length; i++) if (selected.has(els[i].id) && !selected.has(els[i - 1].id)) [els[i], els[i - 1]] = [els[i - 1], els[i]]; }
  return els.every((element, i) => element === design.els[i]) ? design : touch({ ...design, els });
}

/** Uniform corner scaling retains rotation, relative layout and text proportions. */
export function resizeSelection(design: CanvasDesign, ids: readonly string[], handle: Handle, dx: number, dy: number, measure: Measure = approxMeasure) {
  const elements = selectedElements(design, ids), box = selectionBounds(elements, measure);
  if (!box || elements.some(element => element.locked) || handle.length !== 2 || !Number.isFinite(dx) || !Number.isFinite(dy) || (!dx && !dy) || box.w <= 0 || box.h <= 0) return design;
  const minimum = Math.max(...elements.map(element => element.type === "text" ? 8 / (element.fontSize ?? 32) : Math.max(1 / Math.max(element.w, 1), element.type === "line" ? 0 : 1 / Math.max(element.h, 1))));
  const next = resizeBox(box, handle, dx, dy, true, box.w * minimum, box.h * minimum), factor = next.w / box.w;
  return mapSelected(design, ids, element => ({ ...element, x: next.x + (element.x - box.x) * factor, y: next.y + (element.y - box.y) * factor,
    w: element.w * factor, h: element.h * factor, radius: element.radius * factor, strokeWidth: element.strokeWidth * factor,
    ...(element.type === "text" ? { fontSize: (element.fontSize ?? 32) * factor } : {}) }));
}
export function rotateSelection(design: CanvasDesign, ids: readonly string[], degrees: number, measure: Measure = approxMeasure) {
  const elements = selectedElements(design, ids), box = selectionBounds(elements, measure);
  if (!box || elements.some(element => element.locked) || !Number.isFinite(degrees) || degrees === 0) return design;
  return mapSelected(design, ids, element => {
    const height = elHeight(element, measure), cx = element.x + element.w / 2, cy = element.y + height / 2;
    const center = rotatePoint(cx, cy, box.x + box.w / 2, box.y + box.h / 2, degrees);
    return { ...element, x: center.x - element.w / 2, y: center.y - height / 2, rotation: element.rotation + degrees };
  });
}
