"use client";
import { memo } from "react";
import type { CanvasDesign, Page } from "@/lib/design/types";
import { elementSVGNode, elHeight } from "@/lib/design/ops";
import { linkLabel, validElementLink } from "@/lib/design/links";
import { SVGArtwork } from "./Artwork";
import { useTextMeasure } from "./useTextMeasure";

/** Only presentation artwork activates links; editor and thumbnails remain selectable. */
export const PresentationArtwork = memo(function PresentationArtwork({ design, pages, label, onPage }: { design: CanvasDesign; pages: Page[]; label: string; onPage: (id: string) => void }) {
  const measure = useTextMeasure();
  return <div className="cv-slide-preview" role="group" aria-label={label}><svg width="100%" height="100%" viewBox={`0 0 ${design.w} ${design.h}`} role="group" aria-label="Slide artwork">
    <rect width={design.w} height={design.h} fill={design.bg} />
    {design.els.map(element => {
      const art = <SVGArtwork node={elementSVGNode(element, measure)} />, link = element.link;
      if (!validElementLink(link) || (link.kind === "page" && !pages.some(page => page.id === link.pageId))) return <g key={element.id}>{art}</g>;
      const height = elHeight(element, measure);
      return <a key={element.id} href={link.kind === "url" ? link.url : `#page-${encodeURIComponent(link.pageId)}`} target={link.kind === "url" ? "_blank" : undefined} rel={link.kind === "url" ? "noopener noreferrer" : undefined}
        aria-label={`${element.type === "text" && element.text ? element.text : "Open link"}: ${linkLabel(link, pages)}`} className="cv-artwork-link"
        onPointerDown={event => event.stopPropagation()} onPointerUp={event => event.stopPropagation()} onClick={event => { event.stopPropagation(); if (link.kind === "page") { event.preventDefault(); onPage(link.pageId); } }}>
        {art}<rect x={element.x} y={element.y} width={element.w} height={height} fill="transparent" transform={`rotate(${element.rotation} ${element.x + element.w / 2} ${element.y + height / 2})`} />
      </a>;
    })}
  </svg></div>;
});
