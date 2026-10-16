import type { El, TextEffect } from "./types";
import type { Measure, TextLine } from "./ops";
import { svgNode, type SVGNode } from "./svg-tree";

export const TEXT_EFFECTS = ["drop", "glow", "echo", "outline", "background", "splice", "hollow", "glitch", "neon"] as const;
export const EFFECT_LABELS: Record<TextEffect["kind"], string> = { drop: "Drop", glow: "Glow", echo: "Echo", outline: "Outline", background: "Background", splice: "Splice", hollow: "Hollow", glitch: "Glitch", neon: "Neon" };
export const EFFECT_FIELDS = ["offset", "direction", "blur", "transparency", "thickness", "intensity", "spread", "roundness"] as const;
export function validTextEffect(value: unknown): value is TextEffect {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const e = value as Record<string, unknown>;
  return TEXT_EFFECTS.includes(e.kind as TextEffect["kind"]) && typeof e.color === "string" && /^#[a-f\d]{6}$/i.test(e.color) &&
    EFFECT_FIELDS.every(key => typeof e[key] === "number" && Number.isFinite(e[key]) && e[key] >= (key === "direction" ? -180 : 0) && e[key] <= (key === "direction" ? 180 : 100)) &&
    Object.keys(e).every(key => key === "kind" || key === "color" || EFFECT_FIELDS.includes(key as typeof EFFECT_FIELDS[number]));
}
export function defaultTextEffect(kind: TextEffect["kind"], fill = "#0e1318"): TextEffect {
  return { kind, color: kind === "background" ? "#ffe66d" : kind === "glitch" ? "#00d9e8" : /^#[a-f\d]{6}$/i.test(fill) ? fill : "#0e1318",
    offset: 50, direction: 45, blur: kind === "drop" ? 0 : 50, transparency: kind === "drop" ? 40 : 0, thickness: 50, intensity: 50, spread: 50, roundness: 50 };
}
export const sameTextEffect = (a: El["textEffect"], b: El["textEffect"]) => a === b || (!!a && !!b && a.kind === b.kind && a.color === b.color && EFFECT_FIELDS.every(key => a[key] === b[key]));
export type TextPaint = { fill: string; stroke?: string; width?: number; dx: number; dy: number; blur: number; opacity: number };
export function textEffectPaints(e: El): TextPaint[] {
  const front: TextPaint = { fill: e.fill, dx: 0, dy: 0, blur: 0, opacity: 1 }, f = e.textEffect;
  if (!f) return [front];
  const size = e.fontSize ?? 32, distance = size * f.offset / 200, angle = f.direction * Math.PI / 180;
  const dx = Math.cos(angle) * distance, dy = Math.sin(angle) * distance, width = size * f.thickness / 500, alpha = 1 - f.transparency / 100;
  const shifted = (factor: number, opacity = alpha): TextPaint => ({ ...front, fill: f.color, dx: dx * factor, dy: dy * factor, opacity });
  switch (f.kind) {
    case "drop": return [{ ...shifted(1), blur: size * f.blur / 300 }, front];
    case "glow": return [{ ...front, fill: f.color, stroke: f.color, width: size * f.intensity / 1000, blur: size * f.intensity / 250, opacity: alpha }, front];
    case "echo": return [shifted(3, alpha * .25), shifted(2, alpha * .5), shifted(1, alpha * .75), front];
    case "outline": return [{ ...front, stroke: f.color, width }];
    case "hollow": return [{ ...front, fill: "none", stroke: e.fill, width }];
    case "splice": return [shifted(1), { ...front, fill: "none", stroke: e.fill, width }];
    case "glitch": {
      const opposite = "#" + (0xffffff ^ parseInt(f.color.slice(1), 16)).toString(16).padStart(6, "0");
      return [shifted(1), { ...shifted(-1), fill: opposite }, front];
    }
    case "neon": return [{ ...front, fill: f.color, stroke: f.color, width: size * f.intensity / 500, blur: size * f.intensity / 250 },
      { ...front, fill: f.color }, { ...front, fill: "#ffffff", opacity: f.intensity / 100 }];
    default: return [front];
  }
}
export type TextBackground = { x: number; y: number; w: number; h: number; r: number };
export function textEffectBackground(e: El, lines: TextLine[], measure: Measure): TextBackground[] {
  const f = e.textEffect; if (f?.kind !== "background") return [];
  const size = e.fontSize ?? 32, padding = size * f.spread / 200, height = size * 1.2 + 2 * padding;
  return lines.filter(line => line.text || line.marker).map(line => {
    const width = measure(line.text, size, e.fontFamily ?? "", e.fontWeight ?? 400, e.italic, e.letterSpacingEm);
    let left = line.x - (e.align === "right" ? width : e.align === "center" ? width / 2 : 0), right = left + width;
    if (line.marker) { left = Math.min(left, e.x); right = Math.max(right, line.marker.x); }
    const w = right - left + 2 * padding;
    return { x: left - padding, y: line.y - size - padding, w, h: height, r: Math.min(w, height) * f.roundness / 200 };
  });
}
function backgroundPath(rects: TextBackground[]) {
  return rects.map(({ x, y, w, h, r }) => `M${x + r} ${y}h${w - 2 * r}q${r} 0 ${r} ${r}v${h - 2 * r}q0 ${r} ${-r} ${r}h${2 * r - w}q${-r} 0 ${-r} ${-r}v${2 * r - h}q0 ${-r} ${r} ${-r}z`).join(" ");
}
/** Effect copies have no document IDs, URL paint servers or user-generated CSS. */
export function textEffectSVG(e: El, text: SVGNode, lines: TextLine[], measure: Measure): SVGNode {
  if (!e.textEffect) return text;
  const { transform, opacity, ...attrs } = text.attrs, paints = textEffectPaints(e), backgrounds = textEffectBackground(e, lines, measure);
  const nodes: SVGNode[] = backgrounds.length ? [svgNode("path", { d: backgroundPath(backgrounds), fill: e.textEffect.color, opacity: 1 - e.textEffect.transparency / 100, "aria-hidden": "true" })] : [];
  paints.forEach((paint, index) => nodes.push({ ...text, attrs: { ...attrs, fill: paint.fill, ...(paint.stroke ? { stroke: paint.stroke, "stroke-width": paint.width ?? 0, "stroke-linejoin": "round", "paint-order": "stroke fill" } : {}),
    transform: `translate(${paint.dx} ${paint.dy})`, opacity: paint.opacity, ...(paint.blur ? { filter: `blur(${paint.blur}px)` } : {}), ...(index < paints.length - 1 ? { "aria-hidden": "true" } : {}) } }));
  return svgNode("g", { ...(transform !== undefined ? { transform } : {}), ...(opacity !== undefined ? { opacity } : {}), "data-text-effect": e.textEffect.kind }, nodes);
}
