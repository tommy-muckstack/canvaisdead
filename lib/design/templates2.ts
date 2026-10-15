import type { Design, El } from "./types";
import { makeEl, FONTS } from "./ops";
import type { Template } from "./templates";
// More original starter templates: shapes + text only (no stock photos). Used by the home/templates dashboards.
const T = (d: Design, text: string, o: Partial<El>) => makeEl("text", d, { text, ...o });
const R = (d: Design, o: Partial<El>) => makeEl("rect", d, o);
const E = (d: Design, o: Partial<El>) => makeEl("ellipse", d, o);
const serif = FONTS[1].css, imp = FONTS[4].css, sans = FONTS[0].css;
const lines = (d: Design, x: number, y: number, w: number, n: number, gap: number, fill = "#8a8a8a", op = 0.45): El[] => Array.from({ length: n }, (_, i) => R(d, { x, y: y + i * gap, w: i % 3 === 2 ? w * 0.7 : w, h: Math.max(2, gap * 0.28), fill, opacity: op }));
export const MORE: Template[] = [
  { id: "startup", name: "Startup pitch deck", category: "Presentations", size: "presentation", bg: "#b9c9de", build: d => [
    E(d, { x: d.w * 0.5, y: -d.h * 0.35, w: d.h * 1.5, h: d.h * 1.5, fill: "#7fa3dc", opacity: 0.38 }), E(d, { x: -d.w * 0.08, y: d.h * 0.25, w: d.h * 1.2, h: d.h * 1.2, fill: "#e2e8f0", opacity: 0.5 }),
    E(d, { x: d.w * 0.62, y: d.h * 0.4, w: d.h * 0.9, h: d.h * 0.9, fill: "#a8bfe3", opacity: 0.45 }),
    T(d, "Brightside Co", { x: d.w * 0.075, y: d.h * 0.07, w: d.w * 0.4, fontSize: d.h * 0.045, fontWeight: 700, fill: "#33363d" }), T(d, "Presented by:\nAlex Rivera", { x: d.w * 0.78, y: d.h * 0.055, w: d.w * 0.15, fontSize: d.h * 0.028, fontWeight: 500, fill: "#33363d", align: "right" }),
    R(d, { x: d.w * 0.075, y: d.h * 0.155, w: d.w * 0.85, h: 2, fill: "#33363d", opacity: 0.6 }),
    T(d, "Startup.", { x: d.w * 0.07, y: d.h * 0.48, w: d.w * 0.7, fontSize: d.h * 0.29, fontFamily: sans, fontWeight: 800, fill: "#3a3b40" }),
    T(d, "Pitch Deck\nPresentation", { x: d.w * 0.72, y: d.h * 0.76, w: d.w * 0.22, fontSize: d.h * 0.045, fontWeight: 400, fill: "#33363d", lineHeight: 1.3 })] },
  { id: "priceguide", name: "Photographer price guide", category: "Documents", size: "a4", bg: "#f2f1ed", build: d => [
    T(d, "LARANA PHOTO", { x: d.w * 0.05, y: d.h * 0.04, w: d.w * 0.9, fontSize: d.w * 0.085, fontFamily: serif, fontWeight: 400, fill: "#2b2b2b", align: "center" }),
    R(d, { x: d.w * 0.05, y: d.h * 0.115, w: d.w * 0.9, h: 2, fill: "#2b2b2b", opacity: 0.5 }),
    ...lines(d, d.w * 0.05, d.h * 0.17, d.w * 0.42, 6, d.h * 0.017), R(d, { x: d.w * 0.62, y: d.h * 0.16, w: d.w * 0.31, h: d.h * 0.18, fill: "#c7c3ba" }),
    ...lines(d, d.w * 0.05, d.h * 0.42, d.w * 0.42, 6, d.h * 0.017), R(d, { x: d.w * 0.62, y: d.h * 0.41, w: d.w * 0.31, h: d.h * 0.18, fill: "#bdb8ad" }),
    ...lines(d, d.w * 0.05, d.h * 0.67, d.w * 0.42, 4, d.h * 0.017),
    T(d, "PRICE GUIDE", { x: d.w * 0.05, y: d.h * 0.88, w: d.w * 0.9, fontSize: d.w * 0.085, fontFamily: serif, fill: "#2b2b2b", align: "center" })] },
  { id: "photoquote", name: "Photo quote", category: "Social media", size: "portrait", bg: "#8c9a82", build: d => [
    R(d, { x: 0, y: d.h * 0.55, w: d.w, h: d.h * 0.45, fill: "#9a8248" }), E(d, { x: -d.w * 0.2, y: -d.h * 0.12, w: d.w * 0.9, h: d.h * 0.5, fill: "#566a4a", opacity: 0.9 }), E(d, { x: d.w * 0.5, y: d.h * 0.05, w: d.w * 0.7, h: d.h * 0.4, fill: "#b4c2a2", opacity: 0.6 }),
    E(d, { x: d.w * 0.28, y: d.h * 0.3, w: d.w * 0.34, h: d.w * 0.34, fill: "#d9b79b", opacity: 0.9 }), R(d, { x: d.w * 0.2, y: d.h * 0.62, w: d.w * 0.6, h: d.h * 0.38, fill: "#21201f", radius: 80 }),
    T(d, "kinda chic to\nhave a local", { x: d.w * 0.06, y: d.h * 0.45, w: d.w * 0.88, fontSize: d.w * 0.095, fontWeight: 600, fill: "#ffec8c", align: "center", lineHeight: 1.1 })] },
  { id: "portfolio", name: "Portfolio cover", category: "Documents", size: "a4", bg: "#f6f4f0", build: d => [
    T(d, "Photography", { x: d.w * 0.06, y: d.h * 0.035, w: d.w * 0.3, fontSize: d.w * 0.022, fill: "#333" }), T(d, "(2020-2023)", { x: d.w * 0.4, y: d.h * 0.035, w: d.w * 0.2, fontSize: d.w * 0.022, fill: "#333", align: "center" }), T(d, "Avery Davis", { x: d.w * 0.6, y: d.h * 0.035, w: d.w * 0.34, fontSize: d.w * 0.022, fill: "#333", align: "right" }),
    T(d, "PORTFOLIO", { x: d.w * 0.06, y: d.h * 0.34, w: d.w * 0.9, fontSize: d.w * 0.17, fontWeight: 400, fill: "#222" }),
    ...lines(d, d.w * 0.5, d.h * 0.58, d.w * 0.44, 9, d.h * 0.022, "#555", 0.55),
    T(d, "Photography", { x: d.w * 0.06, y: d.h * 0.945, w: d.w * 0.3, fontSize: d.w * 0.022, fill: "#333" }), T(d, "Avery Davis", { x: d.w * 0.6, y: d.h * 0.945, w: d.w * 0.34, fontSize: d.w * 0.022, fill: "#333", align: "right" })] },
  { id: "artfest", name: "Art festival poster", category: "Posters", size: "a4", bg: "#f5f3ee", build: d => [
    T(d, "art\nfestival", { x: d.w * 0.06, y: d.h * 0.03, w: d.w * 0.88, fontSize: d.w * 0.26, fontWeight: 800, fill: "#111", lineHeight: 0.95 }),
    R(d, { x: 0, y: d.h * 0.585, w: d.w, h: d.h * 0.285, fill: "#8d8d8b" }), R(d, { x: 0, y: d.h * 0.585, w: d.w, h: d.h * 0.12, fill: "#c9c9c6" }), R(d, { x: d.w * 0.12, y: d.h * 0.66, w: d.w * 0.2, h: d.h * 0.21, fill: "#2d2d2c" }), R(d, { x: d.w * 0.55, y: d.h * 0.64, w: d.w * 0.25, h: d.h * 0.23, fill: "#4a4a49" }),
    T(d, "OPENING HOURS:\n10AM - 10PM", { x: d.w * 0.06, y: d.h * 0.9, w: d.w * 0.5, fontSize: d.w * 0.04, fontWeight: 800, fill: "#111", lineHeight: 1.1 }), T(d, "reallygreatsite.com", { x: d.w * 0.6, y: d.h * 0.95, w: d.w * 0.34, fontSize: d.w * 0.025, fill: "#111", align: "right" })] },
  { id: "resume", name: "Designer resume", category: "Resumes", size: "a4", bg: "#fbfbfb", build: d => [
    T(d, "Morgan Maxwell", { x: d.w * 0.06, y: d.h * 0.045, w: d.w * 0.8, fontSize: d.w * 0.058, fontFamily: serif, fontWeight: 700, fill: "#2f7fc6" }), R(d, { x: d.w * 0.06, y: d.h * 0.13, w: d.w * 0.88, h: 2, fill: "#2f7fc6", opacity: 0.8 }),
    ...lines(d, d.w * 0.06, d.h * 0.16, d.w * 0.54, 5, d.h * 0.018), R(d, { x: d.w * 0.66, y: d.h * 0.16, w: d.w * 0.28, h: d.h * 0.22, fill: "#2a3a4b" }), E(d, { x: d.w * 0.73, y: d.h * 0.19, w: d.w * 0.14, h: d.w * 0.15, fill: "#d9a98c" }), E(d, { x: d.w * 0.69, y: d.h * 0.3, w: d.w * 0.22, h: d.w * 0.25, fill: "#16212c" }),
    T(d, "Work Experience", { x: d.w * 0.06, y: d.h * 0.27, w: d.w * 0.5, fontSize: d.w * 0.032, fontFamily: serif, fontWeight: 700, fill: "#2f7fc6" }), ...lines(d, d.w * 0.06, d.h * 0.31, d.w * 0.54, 9, d.h * 0.017),
    T(d, "Key Skills", { x: d.w * 0.06, y: d.h * 0.56, w: d.w * 0.5, fontSize: d.w * 0.032, fontFamily: serif, fontWeight: 700, fill: "#2f7fc6" }), ...lines(d, d.w * 0.06, d.h * 0.6, d.w * 0.4, 7, d.h * 0.017),
    T(d, "Education", { x: d.w * 0.52, y: d.h * 0.56, w: d.w * 0.4, fontSize: d.w * 0.032, fontFamily: serif, fontWeight: 700, fill: "#2f7fc6" }), ...lines(d, d.w * 0.52, d.h * 0.6, d.w * 0.42, 7, d.h * 0.017)] },
  { id: "halloween", name: "Halloween party invite", category: "Invitations", size: "a4", bg: "#fdf8f6", build: d => [
    E(d, { x: d.w * 0.06, y: d.h * 0.1, w: d.w * 0.22, h: d.w * 0.28, fill: "#ffffff", stroke: "#e5dedb", strokeWidth: 3 }), E(d, { x: d.w * 0.7, y: d.h * 0.04, w: d.w * 0.2, h: d.w * 0.25, fill: "#ffffff", stroke: "#e5dedb", strokeWidth: 3 }), E(d, { x: d.w * 0.76, y: d.h * 0.62, w: d.w * 0.2, h: d.w * 0.25, fill: "#ffffff", stroke: "#e5dedb", strokeWidth: 3 }),
    makeEl("triangle", d, { x: d.w * 0.76, y: d.h * 0.025, w: d.w * 0.08, h: d.w * 0.08, fill: "#9f6bd6" }), E(d, { x: d.w * 0.4, y: d.h * 0.7, w: d.w * 0.12, h: d.w * 0.12, fill: "#1f1f26" }), E(d, { x: d.w * 0.12, y: d.h * 0.86, w: d.w * 0.05, h: d.w * 0.05, fill: "#f0a24a" }),
    T(d, "PLEASE JOIN US FOR A", { x: d.w * 0.1, y: d.h * 0.27, w: d.w * 0.8, fontSize: d.w * 0.032, fill: "#222", align: "center" }),
    T(d, "HALLOWEEN\nPARTY", { x: d.w * 0.05, y: d.h * 0.31, w: d.w * 0.9, fontSize: d.w * 0.115, fontFamily: serif, fontWeight: 700, fill: "#1b1b1b", align: "center", lineHeight: 1.05 }),
    T(d, "OCTOBER 31\n10:00 PM", { x: d.w * 0.1, y: d.h * 0.52, w: d.w * 0.8, fontSize: d.w * 0.06, fontFamily: serif, fill: "#1b1b1b", align: "center", lineHeight: 1.25 }),
    T(d, "123 Anywhere St., Any\nCity, ST 12345", { x: d.w * 0.1, y: d.h * 0.8, w: d.w * 0.8, fontSize: d.w * 0.032, fill: "#222", align: "center" })] },
  { id: "album", name: "Photo grid", category: "Social media", size: "portrait", bg: "#8a8782", build: d => {
    const tones = ["#a39f98", "#2d2c2b", "#b9b5ad", "#6f6c67", "#c8c3ba", "#53504c", "#9a958c", "#38373a", "#b0aba2"]; const w = d.w / 3, h = d.h / 3;
    return [...tones.map((c, i) => R(d, { x: (i % 3) * w + 2, y: Math.floor(i / 3) * h + 2, w: w - 4, h: h - 4, fill: c })), ...tones.map((_, i) => E(d, { x: (i % 3) * w + w * 0.33, y: Math.floor(i / 3) * h + h * 0.12, w: w * 0.3, h: h * 0.7, fill: "#1b1a19", opacity: 0.55 })), R(d, { x: d.w * 0.22, y: d.h * 0.38, w: d.w * 0.56, h: d.h * 0.2, fill: "#ececec", radius: 18, opacity: 0.96 }), T(d, "New Album", { x: d.w * 0.22, y: d.h * 0.4, w: d.w * 0.56, fontSize: d.w * 0.035, fontWeight: 700, fill: "#111", align: "center" })];
  } },
  { id: "hiring", name: "Now hiring poster", category: "Posters", size: "doc", bg: "#0a8f99", build: d => [
    R(d, { x: d.w * 0.035, y: d.h * 0.025, w: d.w * 0.93, h: d.h * 0.95, fill: "#fff2e1", stroke: "#f2623a", strokeWidth: 4, radius: 22 }), makeEl("star", d, { x: d.w * 0.04, y: d.h * 0.1, w: d.w * 0.06, h: d.w * 0.06, fill: "#ffb347" }), makeEl("star", d, { x: d.w * 0.88, y: d.h * 0.26, w: d.w * 0.06, h: d.w * 0.06, fill: "#ffb347" }),
    R(d, { x: d.w * 0.28, y: d.h * 0.085, w: d.w * 0.44, h: d.h * 0.05, fill: "#f2623a", radius: 10 }), T(d, "BORCELLE STUDIO", { x: d.w * 0.28, y: d.h * 0.095, w: d.w * 0.44, fontSize: d.w * 0.036, fontWeight: 800, fill: "#fff2e1", align: "center" }),
    T(d, "NOW\nHIRING", { x: d.w * 0.06, y: d.h * 0.16, w: d.w * 0.88, fontSize: d.w * 0.2, fontFamily: imp, fill: "#f2623a", align: "center", lineHeight: 1.0 }), T(d, "We want your talent!", { x: d.w * 0.06, y: d.h * 0.52, w: d.w * 0.88, fontSize: d.w * 0.058, fontWeight: 500, fill: "#f2623a", align: "center" }),
    makeEl("triangle", d, { x: d.w * 0.52, y: d.h * 0.62, w: d.w * 0.34, h: d.w * 0.3, fill: "#0a8f99", rotation: 90 }), E(d, { x: d.w * 0.76, y: d.h * 0.68, w: d.w * 0.12, h: d.w * 0.2, fill: "#f2623a" }),
    T(d, "SEND YOUR CV TO:", { x: d.w * 0.07, y: d.h * 0.84, w: d.w * 0.6, fontSize: d.w * 0.036, fontWeight: 800, fill: "#f2623a" }), T(d, "hello@reallygreatsite.com", { x: d.w * 0.07, y: d.h * 0.88, w: d.w * 0.6, fontSize: d.w * 0.032, fill: "#f2623a" })] },
  { id: "signup", name: "Sign-up sheet", category: "Documents", size: "a4", bg: "#f3f3f3", build: d => [
    T(d, "SIGN UP\nSHEET", { x: d.w * 0.07, y: d.h * 0.045, w: d.w * 0.5, fontSize: d.w * 0.09, fontWeight: 800, fill: "#2c5c9d", lineHeight: 1.0 }), ...lines(d, d.w * 0.6, d.h * 0.05, d.w * 0.33, 3, d.h * 0.02, "#555", 0.6),
    R(d, { x: d.w * 0.07, y: d.h * 0.19, w: d.w * 0.86, h: d.h * 0.76, fill: "#ffffff", stroke: "#8a8a8a", strokeWidth: 2 }), ...Array.from({ length: 19 }, (_, i) => R(d, { x: d.w * 0.07, y: d.h * (0.225 + i * 0.0375), w: d.w * 0.86, h: 1.5, fill: "#8a8a8a", opacity: 0.8 })), R(d, { x: d.w * 0.2, y: d.h * 0.19, w: 1.5, h: d.h * 0.76, fill: "#8a8a8a" }), R(d, { x: d.w * 0.6, y: d.h * 0.19, w: 1.5, h: d.h * 0.76, fill: "#8a8a8a" })] },
  { id: "pitchdeck2", name: "Bold pitch deck", category: "Presentations", size: "presentation", bg: "#6b0715", build: d => [
    R(d, { x: d.w * 0.82, y: d.h * 0.2, w: d.w * 0.18, h: d.h * 0.6, fill: "#560410" }), T(d, "PITCH\nDECK", { x: d.w * 0.04, y: d.h * 0.08, w: d.w * 0.7, fontSize: d.h * 0.4, fontFamily: imp, fill: "#ffdbe2", lineHeight: 0.88 }),
    T(d, "2025", { x: d.w * 0.04, y: d.h * 0.86, w: d.w * 0.2, fontSize: d.h * 0.045, fill: "#ffdbe2" }), T(d, "Presented by:\nAdvisors & Partners", { x: d.w * 0.68, y: d.h * 0.72, w: d.w * 0.2, fontSize: d.h * 0.028, fill: "#ffdbe2", lineHeight: 1.3 })] },
  { id: "sticker", name: "Store sticker", category: "Social media", size: "story", bg: "#9b789e", build: d => [
    R(d, { x: d.w * 0.06, y: d.h * 0.06, w: d.w * 0.88, h: d.h * 0.88, fill: "#a98aac", stroke: "#e6d4e8", strokeWidth: 6 }), E(d, { x: d.w * 0.12, y: d.h * 0.28, w: d.w * 0.76, h: d.w * 0.76, fill: "#ffffff" }), E(d, { x: d.w * 0.28, y: d.h * 0.36, w: d.w * 0.44, h: d.w * 0.44, fill: "#e8c7cf" }),
    T(d, "Coming to our stores soon!", { x: d.w * 0.2, y: d.h * 0.3, w: d.w * 0.6, fontSize: d.w * 0.05, fontWeight: 700, fill: "#6a4a70", align: "center" })] },
  { id: "office", name: "Office wordmark", category: "Social media", size: "ig-post", bg: "#cf5524", build: d => [
    R(d, { x: d.w * 0.12, y: d.h * 0.72, w: d.w * 0.76, h: 6, fill: "#ffe8c4", opacity: 0.6 }), makeEl("star", d, { x: d.w * 0.82, y: d.h * 0.12, w: d.w * 0.08, h: d.w * 0.08, fill: "#ffe8c4" }),
    T(d, "office", { x: d.w * 0.05, y: d.h * 0.3, w: d.w * 0.9, fontSize: d.w * 0.34, fontFamily: sans, fontWeight: 800, fill: "#ffe8c4", align: "center" })] },
  { id: "allnighter", name: "All-nighter invite", category: "Invitations", size: "ig-post", bg: "#27586b", build: d => [
    makeEl("star", d, { x: d.w * 0.06, y: d.h * 0.1, w: d.w * 0.07, h: d.w * 0.07, fill: "#fbe9c6" }), makeEl("star", d, { x: d.w * 0.86, y: d.h * 0.06, w: d.w * 0.08, h: d.w * 0.08, fill: "#fbe9c6" }), makeEl("star", d, { x: d.w * 0.84, y: d.h * 0.86, w: d.w * 0.07, h: d.w * 0.07, fill: "#fbe9c6" }),
    T(d, "COME SNOOZE AND BOOZE AT PIA'S", { x: d.w * 0.1, y: d.h * 0.3, w: d.w * 0.8, fontSize: d.w * 0.035, fontWeight: 700, fill: "#fbe9c6", align: "center" }), T(d, "All-Nighter", { x: d.w * 0.04, y: d.h * 0.4, w: d.w * 0.92, fontSize: d.w * 0.2, fontFamily: serif, italic: true, fill: "#fbe9c6", align: "center" })] },
  { id: "halloweencal", name: "Halloween calendar", category: "Presentations", size: "presentation", bg: "#f2872a", build: d => [
    R(d, { x: d.w * 0.2, y: d.h * 0.04, w: d.w * 0.6, h: d.h * 0.2, fill: "#2a2430", radius: 20 }), T(d, "HAPPY\nHALLOWEEN", { x: d.w * 0.2, y: d.h * 0.05, w: d.w * 0.6, fontSize: d.h * 0.085, fontFamily: imp, fill: "#ffd24a", align: "center", lineHeight: 1.0 }),
    ...["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY"].map((s, i) => R(d, { x: d.w * (0.04 + i * 0.235), y: d.h * 0.3, w: d.w * 0.22, h: d.h * 0.07, fill: "#fdf0d8", stroke: "#2a2430", strokeWidth: 3, radius: 14 })), ...["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY"].map((s, i) => T(d, s, { x: d.w * (0.04 + i * 0.235), y: d.h * 0.315, w: d.w * 0.22, fontSize: d.h * 0.033, fontWeight: 700, fill: "#2a2430", align: "center" })),
    E(d, { x: d.w * 0.06, y: d.h * 0.45, w: d.w * 0.15, h: d.h * 0.3, fill: "#8bc34a" }), E(d, { x: d.w * 0.28, y: d.h * 0.42, w: d.w * 0.17, h: d.h * 0.36, fill: "#6d4bc2" }), E(d, { x: d.w * 0.52, y: d.h * 0.46, w: d.w * 0.16, h: d.h * 0.3, fill: "#b9a7e8" })] },
];
