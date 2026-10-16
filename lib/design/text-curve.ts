import type { El } from "./types";
import type { Measure, TextLine } from "./ops";
import { svgNode, type SVGNode } from "./svg-tree";
import { textEffectSVG } from "./text-effects";

export const validTextCurve = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value >= -100 && value <= 100;
export const isCurvedText = (e: Pick<El, "textCurve">) => Math.abs(e.textCurve ?? 0) >= .001;
const n = (value: number) => Number(value.toFixed(6));
type CurveLine = { text: string; path: string; id: string; offset: number; background: { path: string; corner: number } };
/** A native text path retains browser shaping, ligatures and grapheme clusters. */
export function curvedTextGeometry(e: El, lines: TextLine[], measure: Measure) {
  const size = e.fontSize ?? 32, amount = e.textCurve ?? 0, direction = Math.sign(amount), angle = Math.abs(amount) * Math.PI / 50;
  const result: CurveLine[] = []; let top = e.y;
  if (!isCurvedText(e)) return { lines: result, height: lines.length * size * (e.lineHeight ?? 1.2) };
  for (const line of lines) {
    const text = (line.marker ? line.marker.text + " " : "") + line.text;
    const length = Math.max(size * .2, measure(text, size, e.fontFamily ?? "", e.fontWeight ?? 400, e.italic, e.letterSpacingEm));
    const padding = size * .1, radius = (length + 2 * padding) / angle;
    const point = (t: number, normal = 0) => ({ x: (radius - direction * normal) * Math.sin(t), y: direction * radius * (1 - Math.cos(t)) + normal * Math.cos(t) });
    // Include extrema of both the ascender and descender envelopes, not only the baseline.
    const angles = [-angle / 2, 0, angle / 2, ...[-Math.PI, -Math.PI / 2, Math.PI / 2, Math.PI].filter(t => Math.abs(t) <= angle / 2)];
    const envelope = angles.flatMap(t => [point(t, -size * .82), point(t, size * .38)]);
    const left = Math.min(...envelope.map(p => p.x)), right = Math.max(...envelope.map(p => p.x)), above = Math.min(...envelope.map(p => p.y)), below = Math.max(...envelope.map(p => p.y));
    const width = right - left, x = e.x - left + (e.align === "center" ? (e.w - width) / 2 : e.align === "right" ? e.w - width : 0), y = top - above;
    const pathAt = (normal: number, start = -angle / 2, end = angle / 2, command = "M") => {
      const a = point(start, normal), mid = point((start + end) / 2, normal), b = point(end, normal), r = Math.abs(radius - direction * normal), sweep = direction * (end - start) > 0 ? 1 : 0;
      return `${command}${n(x + a.x)} ${n(y + a.y)}A${n(r)} ${n(r)} 0 0 ${sweep} ${n(x + mid.x)} ${n(y + mid.y)}A${n(r)} ${n(r)} 0 0 ${sweep} ${n(x + b.x)} ${n(y + b.y)}`;
    };
    const path = pathAt(0);
    // Encode the complete geometry, so simultaneous canvas/thumbnail/gallery paths
    // never point at a different shape. Identical definitions are interchangeable.
    const id = "curve-" + (e.id + ":" + path).replace(/[^a-z\d-]/gi, c => "_" + c.charCodeAt(0).toString(16) + "_");
    const f = e.textEffect, spread = size * (f?.spread ?? 0) / 200, thickness = size * 1.2 + spread * 2;
    const corner = Math.min(thickness, length + padding * 2) * (f?.roundness ?? 0) / 200, cut = Math.min(angle * .49, corner / Math.max(radius, 1));
    const background = { path: pathAt(-size * .82 - spread + corner, -angle / 2 + cut, angle / 2 - cut) + pathAt(size * .38 + spread - corner, angle / 2 - cut, -angle / 2 + cut, "L") + "z", corner };
    result.push({ text, path, id, offset: padding, background });
    top += Math.max(size * 1.2, below - above) + size * ((e.lineHeight ?? 1.2) - 1.2);
  }
  return { lines: result, height: Math.max(size * (e.lineHeight ?? 1.2), top - e.y) };
}

export function curvedTextSVG(e: El, straight: SVGNode, lines: TextLine[], measure: Measure): SVGNode {
  const geometry = curvedTextGeometry(e, lines, measure), attrs = { ...straight.attrs };
  delete attrs["text-anchor"]; delete attrs["text-decoration"];
  const children = [svgNode("defs", {}, geometry.lines.map(line => svgNode("path", { id: line.id, d: line.path }))),
    ...geometry.lines.map(line => svgNode("text", { "text-anchor": "start", ...(straight.attrs["text-decoration"] ? { "text-decoration": straight.attrs["text-decoration"] } : {}),
      ...(e.listStyle && (e.underline || e.strikethrough) ? { "text-decoration": [e.underline ? "underline" : "", e.strikethrough ? "line-through" : ""].filter(Boolean).join(" ") } : {}) },
    [svgNode("textPath", { href: `#${line.id}`, startOffset: line.offset, method: "align", spacing: "exact" }, undefined, line.text || "\u00a0")]))];
  const text = svgNode("g", attrs, children), effect = e.textEffect;
  if (effect?.kind !== "background") return svgNode("g", { "data-text-curve": e.textCurve! }, [textEffectSVG(e, text, lines, measure)]);
  const { transform, opacity, ...paint } = attrs;
  return svgNode("g", { "data-text-curve": e.textCurve!, "data-text-effect": "background", ...(transform === undefined ? {} : { transform }), opacity: opacity ?? 1 }, [
    svgNode("g", { opacity: 1 - effect.transparency / 100, "aria-hidden": "true", fill: effect.color, stroke: effect.color, "stroke-linejoin": "round" }, geometry.lines.filter(line => line.text).map(line => svgNode("path", { d: line.background.path, "stroke-width": line.background.corner * 2 }))),
    svgNode("g", paint, children),
  ]);
}
