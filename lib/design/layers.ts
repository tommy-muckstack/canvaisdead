import type { CanvasDesign, El } from "./types";
import { layerTree, selectionUnits, type LayerNode } from "./groups";
import { approxMeasure, elHeight, elementSVG, rotatePoint, touch, type Measure } from "./ops";
import { selectedElements, selectionBounds } from "./selection";

export type LayerRef = Pick<LayerNode, "kind" | "id">;
export type LayerDrop = { target: LayerRef; side: "before" | "after" };
export const layerKey = (node: LayerRef) => `${node.kind}:${node.id}`;
export const layerScope = (node: LayerNode) => node.kind === "group" ? node.els[0].groupPath?.slice(0, node.els[0].groupPath.indexOf(node.id)).at(-1) ?? null : node.els[0].groupPath?.at(-1) ?? null;
export function findLayer(nodes: LayerNode[], ref: LayerRef): LayerNode | undefined {
  for (const node of nodes) {
    if (layerKey(node) === layerKey(ref)) return node;
    if (node.kind === "group") { const found = findLayer(node.children, ref); if (found) return found; }
  }
}
export function layerMoveContext(elements: El[], ids: readonly string[]) {
  const units = selectionUnits(elements, ids);
  if (!units.length || units.some(unit => unit.els.some(e => e.locked))) return null;
  const scope = layerScope(units[0]);
  if (units.some(unit => layerScope(unit) !== scope)) return null;
  const tree = layerTree(elements), parent = scope ? findLayer(tree, { kind: "group", id: scope }) : null;
  const siblings = parent?.kind === "group" ? parent.children : tree;
  return { units, scope, siblings };
}
/** Before/after are in the front-to-back order displayed by the Layers panel. */
export function reorderLayersAt(design: CanvasDesign, ids: readonly string[], drop: LayerDrop): CanvasDesign {
  const context = layerMoveContext(design.els, ids);
  if (!context) return design;
  const moving = new Set(context.units.map(layerKey)), target = context.siblings.find(node => layerKey(node) === layerKey(drop.target));
  if (!target || moving.has(layerKey(target))) return design;
  const remaining = context.siblings.filter(node => !moving.has(layerKey(node)));
  const index = remaining.indexOf(target) + (drop.side === "before" ? 1 : 0);
  const ordered = [...remaining.slice(0, index), ...context.siblings.filter(node => moving.has(layerKey(node))), ...remaining.slice(index)];
  const flatten = (nodes: LayerNode[]): El[] => nodes.flatMap(node => node.kind === "group" ? node.id === context.scope ? ordered.flatMap(item => item.els) : flatten(node.children) : node.els);
  const els = context.scope === null ? ordered.flatMap(node => node.els) : flatten(layerTree(design.els));
  return els.every((e, i) => e === design.els[i]) ? design : touch({ ...design, els });
}

function corners(e: El, measure: Measure) {
  const h = Math.max(1, elHeight(e, measure)), cx = e.x + e.w / 2, cy = e.y + h / 2;
  return [[e.x, e.y], [e.x + e.w, e.y], [e.x + e.w, e.y + h], [e.x, e.y + h]].map(([x, y]) => rotatePoint(x, y, cx, cy, e.rotation));
}
/** Rotated frame intersection, not alpha-pixel intersection of artwork. */
export function layersOverlap(a: El, b: El, measure: Measure = approxMeasure) {
  const one = corners(a, measure), two = corners(b, measure);
  const axes = [one, two].flatMap(points => points.slice(0, 2).map((p, i) => ({ x: -(points[i + 1].y - p.y), y: points[i + 1].x - p.x })));
  return axes.every(axis => {
    const project = (points: typeof one) => points.map(p => p.x * axis.x + p.y * axis.y);
    const x = project(one), y = project(two);
    return Math.max(...x) > Math.min(...y) + 1e-8 && Math.max(...y) > Math.min(...x) + 1e-8;
  });
}
export function overlappingLayerIds(design: CanvasDesign, ids: readonly string[], measure: Measure = approxMeasure) {
  const selected = selectedElements(design, ids), visible = new Set(selected.map(e => e.id));
  for (const e of design.els) if (!visible.has(e.id) && selected.some(other => layersOverlap(e, other, measure))) visible.add(e.id);
  return visible;
}
export function layerThumbnail(elements: El[], measure: Measure = approxMeasure) {
  const box = selectionBounds(elements, measure);
  if (!box) return "";
  const pad = Math.max(2, ...elements.map(e => e.strokeWidth / 2));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="40" viewBox="${box.x - pad} ${box.y - pad} ${Math.max(1, box.w) + pad * 2} ${Math.max(1, box.h) + pad * 2}" aria-hidden="true">${elements.map(e => elementSVG(e, measure)).join("")}</svg>`;
}
