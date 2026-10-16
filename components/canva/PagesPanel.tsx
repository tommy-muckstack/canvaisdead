"use client";
import { Ic } from "./Ic";
import { DesignArtwork } from "./Artwork";
import { memo, useEffect, useMemo, useRef } from "react";
import type { Design, Page } from "@/lib/design/types";
import { designPages } from "@/lib/design/pages";
import { type Measure } from "@/lib/design/ops";

const Preview = memo(function Preview({ page, w, h, measure }: { page: Page; w: number; h: number; measure: Measure }) {
  return <span className="cv-page-thumb" aria-hidden><DesignArtwork design={{ w, h, bg: page.bg, els: page.els }} measure={measure} /></span>;
});

export function PagesPanel({ design, selectedId, grid, measure, onSelect, onReorder, onOpen, onAdd, canAdd }: {
  design: Design; selectedId: string; grid: boolean; measure: Measure;
  onSelect: (id: string) => void; onReorder: (id: string, index: number) => void; onOpen: () => void; onAdd: () => void; canAdd: boolean;
}) {
  const pages = useMemo(() => designPages(design), [design]);
  const selectedIndex = pages.findIndex(page => page.id === selectedId);
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  useEffect(() => { buttons.current.get(selectedId)?.scrollIntoView({ block: "nearest", inline: "nearest" }); }, [selectedId, selectedIndex, grid]);
  return <div className={grid ? "cv-page-dock grid" : "cv-page-dock"}>
    <div className={grid ? "cv-page-list grid" : "cv-page-list"} role="tablist" aria-label={grid ? "Page grid" : "Design pages"}>
    {pages.map((page, index) => <button key={page.id} type="button" role="tab" data-page-id={page.id}
      ref={button => { if (button) buttons.current.set(page.id, button); else buttons.current.delete(page.id); }}
      aria-label={`Page ${index + 1}${page.title ? `: ${page.title}` : ""}`} aria-selected={page.id === selectedId} tabIndex={page.id === selectedId ? 0 : -1}
      onClick={() => onSelect(page.id)} onDoubleClick={onOpen}
      onKeyDown={event => {
        const next = event.key === "Home" ? 0 : event.key === "End" ? pages.length - 1 :
          event.key === "ArrowLeft" || event.key === "ArrowUp" ? Math.max(0, index - 1) :
          event.key === "ArrowRight" || event.key === "ArrowDown" ? Math.min(pages.length - 1, index + 1) : null;
        if (next !== null) { event.preventDefault(); event.stopPropagation(); onSelect(pages[next].id); buttons.current.get(pages[next].id)?.focus(); }
        else if (grid && event.key === "Enter" && !event.ctrlKey && !event.metaKey) { event.preventDefault(); onOpen(); }
      }}
      draggable onDragStart={event => { onSelect(page.id); event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("application/x-canvaisdead-page", page.id); }}
      onDragOver={event => { if (event.dataTransfer.types.includes("application/x-canvaisdead-page")) { event.preventDefault(); event.dataTransfer.dropEffect = "move"; } }}
      onDrop={event => { const id = event.dataTransfer.getData("application/x-canvaisdead-page"); if (pages.some(item => item.id === id)) { event.preventDefault(); onReorder(id, index); } }}>
      <Preview page={page} w={design.w} h={design.h} measure={measure} />
      <span className="cv-page-caption">{index + 1}{page.title ? ` · ${page.title}` : ""}</span>
    </button>)}
    </div>
    {!grid && <button type="button" className="cv-page-add" aria-label="Add a new page" disabled={!canAdd} onClick={onAdd}><Ic n="plus" s={20} /></button>}
  </div>;
}
