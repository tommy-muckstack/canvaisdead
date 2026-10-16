import type { CanvasDesign, El } from "./types";

export const MAX_GROUP_DEPTH = 32;
export type LayerNode = { kind: "element"; id: string; els: El[] } | { kind: "group"; id: string; els: El[]; children: LayerNode[] };
const freshGroupId = () => `g_${crypto.randomUUID()}`;
const sameIds = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((id, i) => id === b[i]);
const withPath = (element: El, path: string[]): El => {
  if (sameIds(element.groupPath ?? [], path)) return element;
  const next = { ...element };
  if (path.length) next.groupPath = path; else delete next.groupPath;
  return next;
};
const changed = (design: CanvasDesign, els: El[]): CanvasDesign => els.length === design.els.length && els.every((e, i) => e === design.els[i]) ? design : { ...design, els, updatedAt: Date.now() };

/** Build page-local units in paint order. No geometry or artwork is duplicated. */
export function layerTree(elements: readonly El[]): LayerNode[] {
  const roots: LayerNode[] = [], groups = new Map<string, Extract<LayerNode, { kind: "group" }>>();
  for (const element of elements) {
    let children = roots;
    for (const id of element.groupPath ?? []) {
      let group = groups.get(id);
      if (!group) { group = { kind: "group", id, els: [], children: [] }; groups.set(id, group); children.push(group); }
      group.els.push(element); children = group.children;
    }
    children.push({ kind: "element", id: element.id, els: [element] });
  }
  return roots;
}
function findGroup(nodes: LayerNode[], id: string): Extract<LayerNode, { kind: "group" }> | undefined {
  for (const node of nodes) if (node.kind === "group") {
    if (node.id === id) return node;
    const found = findGroup(node.children, id); if (found) return found;
  }
}
export function groupMembers(elements: readonly El[], id: string): string[] { return elements.filter(e => e.groupPath?.includes(id)).map(e => e.id); }
export function groupParent(elements: readonly El[], id: string): string | null {
  const path = elements.find(e => e.groupPath?.includes(id))?.groupPath ?? [];
  return path[path.indexOf(id) - 1] ?? null;
}
export function selectionUnits(elements: readonly El[], ids: readonly string[]): LayerNode[] {
  const selected = new Set(ids), result: LayerNode[] = [];
  const visit = (nodes: LayerNode[]) => { for (const node of nodes) {
    if (node.els.every(e => selected.has(e.id))) result.push(node);
    else if (node.kind === "group") visit(node.children);
  } };
  visit(layerTree(elements)); return result;
}
export function selectedGroup(elements: readonly El[], ids: readonly string[]): string | null {
  const units = selectionUnits(elements, ids);
  return units.length === 1 && units[0].kind === "group" ? units[0].id : null;
}
/** Whole groups act as one locked unit; explicitly selected members can still be edited. */
export function editableSelectionIds(elements: readonly El[], ids: readonly string[]): string[] {
  return selectionUnits(elements, ids).filter(unit => !unit.els.some(e => e.locked)).flatMap(unit => unit.els.map(e => e.id));
}
export function expandGroupSelection(elements: readonly El[], ids: readonly string[], scope: string | null = null, skipLocked = false): string[] {
  const tree = layerTree(elements), nodes = scope ? findGroup(tree, scope)?.children ?? [] : tree, selected = new Set(ids);
  return nodes.filter(node => node.els.some(e => selected.has(e.id)) && (!skipLocked || !node.els.some(e => e.locked))).flatMap(node => node.els.map(e => e.id));
}
export function toggleGroupSelection(elements: readonly El[], ids: readonly string[], hit: string, scope: string | null = null): string[] {
  const unit = expandGroupSelection(elements, [hit], scope), remove = unit.every(id => ids.includes(id)), selected = new Set(ids);
  for (const id of unit) { if (remove) selected.delete(id); else selected.add(id); }
  return elements.filter(e => selected.has(e.id)).map(e => e.id);
}

/** Reject ambiguous ancestry, cycles, interleaving and degenerate one-child groups. */
export function validGroups(elements: readonly El[]): boolean {
  const groups = new Map<string, { prefix: string[]; first: number; last: number; count: number; children: Set<string> }>();
  for (let i = 0; i < elements.length; i++) {
    const element = elements[i], path = element.groupPath;
    if (path === undefined) continue;
    if (!Array.isArray(path) || !path.length || path.length > MAX_GROUP_DEPTH || path.some(id => typeof id !== "string" || !id || id.length > 128) || new Set(path).size !== path.length) return false;
    for (let depth = 0; depth < path.length; depth++) {
      const id = path[depth], prefix = path.slice(0, depth), child = depth + 1 < path.length ? `g:${path[depth + 1]}` : `e:${element.id}`;
      const group = groups.get(id);
      if (group) { if (!sameIds(group.prefix, prefix)) return false; group.last = i; group.count++; group.children.add(child); }
      else groups.set(id, { prefix, first: i, last: i, count: 1, children: new Set([child]) });
    }
  }
  return [...groups.values()].every(g => g.last - g.first + 1 === g.count && g.children.size >= 2);
}
/** Removing a member must not leave meaningless one-child ancestors behind. */
export function normalizeGroups(elements: El[]): El[] {
  let next = elements;
  for (;;) {
    const remove = new Set<string>();
    const visit = (nodes: LayerNode[]) => { for (const node of nodes) if (node.kind === "group") { if (node.children.length < 2) remove.add(node.id); visit(node.children); } };
    visit(layerTree(next)); if (!remove.size) return next;
    next = next.map(e => withPath(e, (e.groupPath ?? []).filter(id => !remove.has(id))));
  }
}
function groupingUnits(elements: readonly El[], ids: readonly string[], scope: string | null) {
  const tree = layerTree(elements), nodes = scope ? findGroup(tree, scope)?.children ?? [] : tree, selected = new Set(ids);
  const units = nodes.filter(node => node.els.every(e => selected.has(e.id)));
  return units.flatMap(n => n.els).length === selected.size ? units : [];
}
export function canGroup(elements: readonly El[], ids: readonly string[], scope: string | null = null) {
  const units = groupingUnits(elements, ids, scope);
  // Selecting all siblings already selects their parent group. Wrapping them
  // again would leave that parent with one child and invalidate saved artwork.
  if (scope && units.flatMap(node => node.els).length === groupMembers(elements, scope).length) return false;
  return units.length >= 2 && units.every(node => node.els.every(e => !e.locked && (e.groupPath?.length ?? 0) < MAX_GROUP_DEPTH));
}
export function groupElements(design: CanvasDesign, ids: readonly string[], scope: string | null = null, id = freshGroupId()): CanvasDesign {
  if (!canGroup(design.els, ids, scope) || !id || id.length > 128 || design.els.some(e => e.groupPath?.includes(id))) return design;
  const selected = new Set(ids), last = design.els.findLastIndex(e => selected.has(e.id));
  const members = design.els.filter(e => selected.has(e.id)).map(e => {
    const path = e.groupPath ?? [], depth = scope ? path.indexOf(scope) + 1 : 0;
    return withPath(e, [...path.slice(0, depth), id, ...path.slice(depth)]);
  });
  // Grouping non-adjacent layers makes one block at the frontmost selected layer.
  return changed(design, design.els.flatMap((e, i) => i === last ? members : selected.has(e.id) ? [] : [e]));
}
export function canUngroup(elements: readonly El[], ids: readonly string[], scope: string | null = null) {
  const units = selectionUnits(elements, ids);
  return units.some(n => n.kind === "group" && !n.els.some(e => e.locked)) || !!(scope && units.length && groupingUnits(elements, ids, scope).length && units.every(n => n.els.every(e => !e.locked)));
}
export function ungroupElements(design: CanvasDesign, ids: readonly string[], scope: string | null = null): CanvasDesign {
  if (!canUngroup(design.els, ids, scope)) return design;
  const units = selectionUnits(design.els, ids), groups = new Set(units.filter(n => n.kind === "group" && !n.els.some(e => e.locked)).map(n => n.id));
  if (groups.size) return changed(design, normalizeGroups(design.els.map(e => withPath(e, (e.groupPath ?? []).filter(id => !groups.has(id))))));
  if (!scope) return design;
  const selected = new Set(ids), kept = design.els.filter(e => !selected.has(e.id));
  const detached = design.els.filter(e => selected.has(e.id)).map(e => withPath(e, (e.groupPath ?? []).filter(id => id !== scope)));
  const end = kept.findLastIndex(e => e.groupPath?.includes(scope));
  kept.splice(end + 1, 0, ...detached);
  return changed(design, normalizeGroups(kept));
}

/** Clone group paths as independent data, optionally assigning new page-local IDs. */
export function copyElements(elements: readonly El[], newElementId?: () => string, newGroupId?: () => string): El[] {
  const groups = new Map<string, string>();
  return elements.map(e => ({ ...e, ...(e.textEffect ? { textEffect: { ...e.textEffect } } : {}), ...(e.imageCrop ? { imageCrop: { ...e.imageCrop } } : {}), ...(newElementId ? { id: newElementId() } : {}), ...(e.groupPath ? { groupPath: e.groupPath.map(id => {
    if (!newGroupId) return id;
    if (!groups.has(id)) groups.set(id, newGroupId()); return groups.get(id)!;
  }) } : {}) }));
}
export function duplicateGroupedElements(design: CanvasDesign, ids: readonly string[], newId: () => string, newGroupId = freshGroupId) {
  const selected = new Set(ids), members = design.els.filter(e => selected.has(e.id)), complete = new Set<string>();
  for (const e of members) for (const id of e.groupPath ?? []) if (groupMembers(design.els, id).every(member => selected.has(member))) complete.add(id);
  const remap = new Map([...complete].map(id => [id, newGroupId()]));
  const copies = members.map(e => ({ ...e, id: newId(), x: e.x + 24, y: e.y + 24, ...(e.textEffect ? { textEffect: { ...e.textEffect } } : {}), ...(e.imageCrop ? { imageCrop: { ...e.imageCrop } } : {}), ...(e.groupPath ? { groupPath: e.groupPath.map(id => remap.get(id) ?? id) } : {}) }));
  const insertions = new Map<number, El[]>();
  for (let i = 0; i < copies.length; i++) {
    const parent = members[i].groupPath?.filter(id => !complete.has(id)).at(-1);
    const index = parent ? design.els.findLastIndex(e => e.groupPath?.includes(parent)) : design.els.length - 1;
    const list = insertions.get(index) ?? []; list.push(copies[i]); insertions.set(index, list);
  }
  return { design: changed(design, design.els.flatMap((e, i) => [e, ...insertions.get(i) ?? []])), ids: copies.map(e => e.id) };
}
export function reorderGroupedElements(elements: readonly El[], ids: readonly string[], direction: "front" | "back" | "forward" | "backward"): El[] {
  const selected = new Set(ids), movable = (n: LayerNode) => n.els.every(e => selected.has(e.id) && !e.locked);
  const visit = (nodes: LayerNode[]): El[] => {
    let next = [...nodes];
    if (direction === "front") next = [...next.filter(n => !movable(n)), ...next.filter(movable)];
    else if (direction === "back") next = [...next.filter(movable), ...next.filter(n => !movable(n))];
    else if (direction === "forward") { for (let i = next.length - 2; i >= 0; i--) if (movable(next[i]) && !movable(next[i + 1])) [next[i], next[i + 1]] = [next[i + 1], next[i]]; }
    else { for (let i = 1; i < next.length; i++) if (movable(next[i]) && !movable(next[i - 1])) [next[i], next[i - 1]] = [next[i - 1], next[i]]; }
    return next.flatMap(n => n.kind === "group" && !n.els.every(e => selected.has(e.id)) ? visit(n.children) : n.els);
  };
  return visit(layerTree(elements));
}
