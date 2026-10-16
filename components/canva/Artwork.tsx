"use client";
import * as React from "react";
import { memo, useMemo, type ReactElement } from "react";
import { designSVGNode, elementSVGNode, type Measure } from "@/lib/design/ops";
import type { CanvasDesign, El } from "@/lib/design/types";
import type { SVGNode } from "@/lib/design/svg-tree";

const attributes: Record<string, string> = { "stroke-width": "strokeWidth", "stroke-linecap": "strokeLinecap", "font-family": "fontFamily", "font-size": "fontSize", "font-weight": "fontWeight", "font-style": "fontStyle", "letter-spacing": "letterSpacing", "text-decoration": "textDecoration", "text-anchor": "textAnchor", "xml:space": "xmlSpace" };
function renderNode(node: SVGNode, key?: number): ReactElement {
  const props: Record<string, unknown> = { key };
  for (const [name, value] of Object.entries(node.attrs)) {
    // The geometry builder emits one fixed text style; source strings are DOM attributes, never HTML.
    props[attributes[name] ?? name] = name === "style" ? { whiteSpace: "pre" } : value;
  }
  return React.createElement(node.tag, props, node.text ?? node.children?.map((child, index) => renderNode(child, index)));
}
export const SVGArtwork = memo(function SVGArtwork({ node }: { node: SVGNode | null }) { return node ? renderNode(node) : null; });
const ElementArtwork = memo(function ElementArtwork({ element, measure }: { element: El; measure?: Measure }) {
  const node = useMemo(() => elementSVGNode(element, measure), [element, measure]);
  return <SVGArtwork node={node} />;
});
// Keep pointer targets stable when only the selection changes.
export const ArtworkElements = memo(function ArtworkElements({ elements, measure, hiddenId }: { elements: El[]; measure?: Measure; hiddenId?: string | null }) {
  return <g>{elements.map(element => element.id === hiddenId ? null : <ElementArtwork key={element.id} element={element} measure={measure} />)}</g>;
});
export const DesignArtwork = memo(function DesignArtwork({ design, measure }: { design: Pick<CanvasDesign, "w" | "h" | "bg" | "els">; measure?: Measure }) {
  const node = useMemo(() => {
    const root = designSVGNode(design, measure);
    return { ...root, attrs: { ...root.attrs, width: "100%", height: "100%" } };
  }, [design, measure]);
  return <SVGArtwork node={node} />;
});
