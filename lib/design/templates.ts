import type { CanvasDesign as Design, El } from "./types";
import { blankDesign, makeEl, SIZES, FONTS } from "./ops";
// Original starter templates (shapes + text only, no stock art). Each returns a fresh Design.
type B = (d: Design) => El[];
const T = (d: Design, text: string, o: Partial<El>) => makeEl("text", d, { text, ...o });
const R = (d: Design, o: Partial<El>) => makeEl("rect", d, o);
const E = (d: Design, o: Partial<El>) => makeEl("ellipse", d, o);
const serif = FONTS[1].css, imp = FONTS[4].css;
export type Template = { id: string; name: string; category: string; size: string; bg: string; build: B };
const BASE: Template[] = [
  { id: "quote", name: "Sunset quote", category: "Social media", size: "ig-post", bg: "#FFE7D6", build: d => [
    E(d, { x: d.w * 0.62, y: -d.h * 0.12, w: d.w * 0.6, h: d.w * 0.6, fill: "#FF8A5B" }), E(d, { x: -d.w * 0.15, y: d.h * 0.7, w: d.w * 0.5, h: d.w * 0.5, fill: "#7D2AE8", opacity: 0.85 }),
    T(d, "“Make something people want to share.”", { x: d.w * 0.1, y: d.h * 0.28, w: d.w * 0.8, fontSize: d.w * 0.085, fontFamily: serif, fontWeight: 700, fill: "#2B1B3D" }),
    T(d, "— the CanvaIsDead team", { x: d.w * 0.1, y: d.h * 0.76, w: d.w * 0.6, fontSize: d.w * 0.035, fontWeight: 500, fill: "#2B1B3D" })] },
  { id: "sale", name: "Big sale", category: "Social media", size: "ig-post", bg: "#FFF45C", build: d => [
    R(d, { x: d.w * 0.08, y: d.h * 0.08, w: d.w * 0.84, h: d.h * 0.84, fill: "#0E1318", radius: 36 }),
    T(d, "SALE", { x: d.w * 0.12, y: d.h * 0.17, w: d.w * 0.76, fontSize: d.w * 0.26, fontFamily: imp, fontWeight: 400, fill: "#FFF45C", align: "center" }),
    T(d, "Up to 50% off everything this weekend only", { x: d.w * 0.16, y: d.h * 0.58, w: d.w * 0.68, fontSize: d.w * 0.055, fill: "#FFFFFF", align: "center" }),
    R(d, { x: d.w * 0.33, y: d.h * 0.78, w: d.w * 0.34, h: d.h * 0.09, fill: "#FF5757", radius: 60 }), T(d, "Shop now", { x: d.w * 0.33, y: d.h * 0.795, w: d.w * 0.34, fontSize: d.w * 0.04, fill: "#FFFFFF", align: "center" })] },
  { id: "deck", name: "Pitch title slide", category: "Presentations", size: "presentation", bg: "#0E1318", build: d => [
    R(d, { x: 0, y: 0, w: d.w * 0.04, h: d.h, fill: "#00C4CC" }), E(d, { x: d.w * 0.66, y: d.h * 0.15, w: d.h * 0.7, h: d.h * 0.7, fill: "#7D2AE8" }), E(d, { x: d.w * 0.74, y: d.h * 0.25, w: d.h * 0.5, h: d.h * 0.5, fill: "#00C4CC", opacity: 0.7 }),
    T(d, "Your big idea,\nin one slide", { x: d.w * 0.09, y: d.h * 0.28, w: d.w * 0.6, fontSize: d.h * 0.12, fill: "#FFFFFF" }), T(d, "Presented by your name · October", { x: d.w * 0.09, y: d.h * 0.72, w: d.w * 0.5, fontSize: d.h * 0.04, fontWeight: 400, fill: "#9AA5B1" })] },
  { id: "thumb", name: "Video thumbnail", category: "Video", size: "yt-thumb", bg: "#7D2AE8", build: d => [
    R(d, { x: d.w * 0.04, y: d.h * 0.06, w: d.w * 0.92, h: d.h * 0.88, fill: "#00000000", stroke: "#FFFFFF", strokeWidth: 10, radius: 28 }),
    T(d, "I TRIED IT\nFOR 30 DAYS", { x: d.w * 0.08, y: d.h * 0.2, w: d.w * 0.8, fontSize: d.h * 0.2, fontFamily: imp, fontWeight: 400, fill: "#FFE14D", lineHeight: 1.05 }), makeEl("star", d, { x: d.w * 0.78, y: d.h * 0.58, w: d.h * 0.32, h: d.h * 0.32, fill: "#FF5757" })] },
  { id: "poster", name: "Event poster", category: "Posters", size: "poster", bg: "#C9E4DE", build: d => [
    E(d, { x: d.w * 0.12, y: d.h * 0.08, w: d.w * 0.76, h: d.w * 0.76, fill: "#FF8A5B" }), makeEl("triangle", d, { x: d.w * 0.3, y: d.h * 0.2, w: d.w * 0.4, h: d.w * 0.4, fill: "#FFF7E8" }),
    T(d, "Open Studio\nNight", { x: d.w * 0.1, y: d.h * 0.58, w: d.w * 0.8, fontSize: d.w * 0.13, fontFamily: serif, fill: "#16302B", lineHeight: 1.05 }),
    T(d, "Friday 7 PM · 42 Maple Street · free entry", { x: d.w * 0.1, y: d.h * 0.86, w: d.w * 0.8, fontSize: d.w * 0.04, fontWeight: 500, fill: "#16302B" })] },
  { id: "card", name: "Business card", category: "Print", size: "card", bg: "#FFFFFF", build: d => [
    R(d, { x: 0, y: 0, w: d.w * 0.3, h: d.h, fill: "#7D2AE8" }), E(d, { x: d.w * 0.06, y: d.h * 0.3, w: d.h * 0.4, h: d.h * 0.4, fill: "#FFFFFF" }),
    T(d, "Alex Rivera", { x: d.w * 0.36, y: d.h * 0.24, w: d.w * 0.58, fontSize: d.h * 0.13, fill: "#0E1318" }), T(d, "Founder & designer", { x: d.w * 0.36, y: d.h * 0.43, w: d.w * 0.58, fontSize: d.h * 0.07, fontWeight: 500, fill: "#7D2AE8" }),
    T(d, "alex@example.com\n+1 555 010 0199", { x: d.w * 0.36, y: d.h * 0.62, w: d.w * 0.58, fontSize: d.h * 0.065, fontWeight: 400, fill: "#4B5563", lineHeight: 1.4 })] },
  { id: "story", name: "Announcement story", category: "Social media", size: "story", bg: "#38B6FF", build: d => [
    E(d, { x: -d.w * 0.2, y: d.h * 0.05, w: d.w * 0.9, h: d.w * 0.9, fill: "#5CE1E6" }), E(d, { x: d.w * 0.5, y: d.h * 0.6, w: d.w * 0.8, h: d.w * 0.8, fill: "#8C52FF" }),
    T(d, "Big news\nis coming", { x: d.w * 0.1, y: d.h * 0.36, w: d.w * 0.8, fontSize: d.w * 0.15, fill: "#FFFFFF", lineHeight: 1.05 }), T(d, "Swipe up to find out", { x: d.w * 0.1, y: d.h * 0.78, w: d.w * 0.8, fontSize: d.w * 0.05, fontWeight: 500, fill: "#FFFFFF" })] },
  { id: "logo", name: "Monogram logo", category: "Logos", size: "logo", bg: "#FFFFFF", build: d => [
    E(d, { x: d.w * 0.2, y: d.h * 0.12, w: d.w * 0.6, h: d.w * 0.6, fill: "#0E1318" }), T(d, "A", { x: d.w * 0.2, y: d.h * 0.2, w: d.w * 0.6, fontSize: d.w * 0.4, fontFamily: serif, fill: "#FFFFFF", align: "center" }),
    T(d, "ATELIER", { x: d.w * 0.1, y: d.h * 0.8, w: d.w * 0.8, fontSize: d.w * 0.09, fill: "#0E1318", align: "center" })] },
];
import { MORE } from "./templates2";
export const TEMPLATES: Template[] = [...BASE, ...MORE];
export function fromTemplate(t: Template): Design {
  const size = SIZES.find(s => s.id === t.size)!; const d = { ...blankDesign(size, t.name), bg: t.bg };
  return { ...d, els: t.build(d).map(e => ({ ...e, x: Math.round(e.x), y: Math.round(e.y), w: Math.round(e.w), h: Math.round(e.h), fontSize: e.fontSize ? Math.round(e.fontSize) : e.fontSize })) };
}
