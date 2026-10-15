"use client";
import type { El } from "@/lib/design/types";
import { layerTree, type LayerNode } from "@/lib/design/groups";

export function ElementLayers({ elements, selectedIds, onSelect }: { elements: El[]; selectedIds: string[]; onSelect: (ids: string[], scope: string | null, additive: boolean) => void }) {
  const rows = (nodes: LayerNode[], scope: string | null): React.ReactNode => [...nodes].reverse().map(node => {
    const ids = node.els.map(e => e.id), selected = ids.every(id => selectedIds.includes(id));
    const label = node.kind === "group" ? `Group · ${ids.length} elements` : node.els[0].type === "text" ? (node.els[0].text ?? "").slice(0, 22) || "Text" : node.els[0].type;
    const button = <button type="button" className={selected ? "on" : ""} aria-pressed={selected} onClick={event => onSelect(ids, scope, event.shiftKey)}>{label}{node.els.some(e => e.locked) && " · locked"}</button>;
    return <li key={`${node.kind}:${node.id}`}>{node.kind === "group" ? <><div className="cv-layer-group">{button}</div><details><summary>Group contents</summary><ol>{rows(node.children, node.id)}</ol></details></> : button}</li>;
  });
  return <ol className="cv-layers">{rows(layerTree(elements), null)}{!elements.length && <li className="ids-muted">Nothing yet. Add a shape or pick a template.</li>}</ol>;
}
