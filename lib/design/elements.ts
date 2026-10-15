import type { CanvasDesign, El } from "./types";
import { elementSVG, touch, uid } from "./ops";
import { selectionBounds } from "./selection";

type Part = Pick<El, "type" | "x" | "y" | "w" | "h"> & Partial<Pick<El, "fill" | "stroke" | "strokeWidth" | "radius" | "rotation">>;
export type ElementAsset = { id: string; name: string; category: "Shapes" | "Graphics"; collection: string; tags: string; colors: string[]; parts: Part[] };
const ink = "#0e1318", purple = "#7d2ae8", cyan = "#00c4cc", yellow = "#ffbd59", red = "#ff5757", green = "#7ed957";
const part = (type: Part["type"], x: number, y: number, w: number, h: number, extra: Partial<Part> = {}): Part => ({ type, x, y, w, h, fill: ink, ...extra });
const rect = (x: number, y: number, w: number, h: number, extra: Partial<Part> = {}) => part("rect", x, y, w, h, extra);
const circle = (x: number, y: number, size: number, fill = ink) => part("ellipse", x, y, size, size, { fill });
const line = (x: number, y: number, w: number, rotation = 0, stroke = ink, strokeWidth = 5) => part("line", x, y, w, 0, { fill: "none", rotation, stroke, strokeWidth });
const segment = (ax: number, ay: number, bx: number, by: number, color: string, weight = 5) => {
  const angle = Math.atan2(by - ay, bx - ax), width = Math.hypot(bx - ax, by - ay);
  // Lines rotate around their stroke-height box, so compensate to join exact endpoints.
  return line((ax + bx) / 2 - width / 2 - weight / 2 * Math.sin(angle), (ay + by) / 2 - weight / 2 + weight / 2 * Math.cos(angle), width, angle * 180 / Math.PI, color, weight);
};
const shape = (id: string, name: string, tags: string, parts: Part[]): ElementAsset => ({ id, name, category: "Shapes", collection: "Geometric essentials", tags, colors: ["Black"], parts });
const graphic = (id: string, name: string, tags: string, colors: string[], parts: Part[]): ElementAsset => ({ id, name, category: "Graphics", collection: "Colorful geometry", tags, colors, parts });

/** Original artwork built solely from the editor's editable vector primitives. */
export const ELEMENT_ASSETS: readonly ElementAsset[] = [
  shape("rectangle", "Rectangle", "square box block solid", [rect(0, 0, 100, 80)]),
  shape("circle", "Circle", "round dot disc solid", [circle(0, 0, 100)]),
  shape("triangle", "Triangle", "point polygon solid", [part("triangle", 0, 0, 100, 90)]),
  shape("star", "Star", "five point rating favorite solid", [part("star", 0, 0, 100, 100)]),
  shape("line", "Line", "straight horizontal divider stroke", [line(0, 0, 120)]),
  shape("square", "Square", "box block solid", [rect(0, 0, 100, 100)]),
  shape("rounded-rectangle", "Rounded rectangle", "box label corners solid", [rect(0, 0, 120, 70, { radius: 16 })]),
  shape("pill", "Pill", "capsule label badge rounded solid", [rect(0, 0, 120, 50, { radius: 25 })]),
  shape("oval", "Oval", "ellipse round solid", [part("ellipse", 0, 0, 120, 70)]),
  shape("diamond", "Diamond", "rhombus square rotated solid", [rect(15, 15, 70, 70, { rotation: 45 })]),
  shape("circle-outline", "Circle outline", "ring round border hollow", [part("ellipse", 0, 0, 100, 100, { fill: "none", stroke: ink, strokeWidth: 5 })]),
  shape("square-outline", "Square outline", "box border hollow", [rect(0, 0, 100, 100, { fill: "none", stroke: ink, strokeWidth: 5 })]),
  shape("plus", "Plus", "cross add positive symbol", [rect(40, 0, 20, 100), rect(0, 40, 100, 20)]),
  shape("arrow-right", "Right arrow", "direction forward pointer horizontal", [rect(0, 35, 75, 30), part("triangle", 50, 20, 80, 60, { rotation: 90 })]),
  shape("arrow-up", "Up arrow", "direction pointer vertical", [rect(35, 25, 30, 75), part("triangle", 10, 0, 80, 60)]),
  graphic("sun", "Sun", "sunshine sunny weather summer rays", ["Yellow"], [
    ...Array.from({ length: 8 }, (_, i) => { const angle = i * Math.PI / 4; return segment(50 + Math.cos(angle) * 35, 50 + Math.sin(angle) * 35, 50 + Math.cos(angle) * 50, 50 + Math.sin(angle) * 50, yellow); }), circle(22, 22, 56, yellow),
  ]),
  graphic("cloud", "Cloud", "weather sky cloudy soft", ["Blue"], [circle(12, 25, 48, cyan), circle(35, 5, 65, cyan), circle(70, 28, 45, cyan), rect(25, 45, 70, 30, { fill: cyan, radius: 10 })]),
  graphic("flower", "Flower", "bloom floral garden petals nature spring", ["Purple", "Yellow"], [
    ...Array.from({ length: 6 }, (_, i) => { const angle = i * Math.PI / 3; return circle(35 + Math.cos(angle) * 28, 35 + Math.sin(angle) * 28, 30, purple); }), circle(34, 34, 32, yellow),
  ]),
  graphic("tree", "Pine tree", "forest evergreen nature outdoor plant", ["Green", "Black"], [rect(42, 60, 16, 40), part("triangle", 0, 30, 100, 60, { fill: green }), part("triangle", 10, 10, 80, 60, { fill: green }), part("triangle", 22, 0, 56, 50, { fill: green })]),
  graphic("mountains", "Mountains", "landscape outdoor travel peak adventure", ["Purple", "Blue"], [part("triangle", 0, 0, 100, 90, { fill: purple }), part("triangle", 55, 25, 80, 65, { fill: cyan })]),
  graphic("house", "House", "home building property roof", ["Purple", "Yellow", "Black"], [rect(15, 40, 70, 60, { fill: purple }), part("triangle", 0, 0, 100, 60, { fill: yellow }), rect(42, 65, 20, 35)]),
  graphic("gift", "Gift", "present birthday celebration ribbon box", ["Purple", "Yellow"], [rect(5, 25, 90, 75, { fill: purple, radius: 4 }), circle(25, 0, 30, yellow), circle(45, 0, 30, yellow), rect(42, 25, 16, 75, { fill: yellow }), rect(5, 45, 90, 14, { fill: yellow })]),
  graphic("camera", "Camera", "photo photography picture lens", ["Black", "Blue", "White"], [rect(25, 0, 50, 20, { radius: 5 }), rect(0, 15, 100, 70, { radius: 10 }), circle(28, 27, 46, cyan), circle(40, 39, 22, "#ffffff"), circle(80, 25, 8, "#ffffff")]),
  graphic("speech", "Speech bubble", "chat comment message conversation rounded", ["Purple"], [part("triangle", 12, 45, 30, 35, { fill: purple, rotation: 180 }), rect(0, 0, 110, 65, { fill: purple, radius: 16 })]),
  graphic("check", "Check mark", "tick done complete success yes", ["Green"], [segment(10, 45, 37, 72, green, 10), segment(37, 72, 90, 12, green, 10)]),
  graphic("confetti", "Confetti", "party celebration colorful sprinkle", ["Purple", "Blue", "Yellow", "Red"], [rect(0, 0, 14, 28, { fill: purple, rotation: 25 }), circle(60, 0, 16, cyan), rect(85, 40, 12, 28, { fill: yellow, rotation: -30 }), part("triangle", 25, 45, 24, 24, { fill: red, rotation: 20 }), circle(5, 85, 14, yellow), rect(55, 85, 24, 10, { fill: purple, rotation: -15 })]),
  graphic("badge", "Award badge", "medal ribbon prize achievement", ["Purple", "Yellow"], [rect(23, 50, 22, 55, { fill: purple, rotation: 20 }), rect(55, 50, 22, 55, { fill: purple, rotation: -20 }), circle(10, 0, 80, yellow), part("star", 30, 20, 40, 40, { fill: purple })]),
  graphic("robot", "Robot", "technology bot face machine", ["Purple", "Blue", "White"], [segment(60, -4, 60, 20, purple), circle(51, -14, 18, cyan), rect(10, 15, 100, 75, { fill: purple, radius: 12 }), circle(25, 32, 22, "#ffffff"), circle(73, 32, 22, "#ffffff"), rect(35, 65, 50, 10, { fill: cyan, radius: 5 })]),
  graphic("book", "Open book", "reading education learn school pages", ["Purple", "Blue"], [rect(0, 0, 48, 75, { fill: purple, radius: 5 }), rect(52, 0, 48, 75, { fill: cyan, radius: 5 })]),
  graphic("abstract", "Abstract blocks", "geometric modern composition colorful", ["Purple", "Blue", "Yellow"], [rect(0, 0, 70, 70, { fill: purple, radius: 12 }), circle(55, 0, 50, cyan), part("triangle", 40, 45, 70, 65, { fill: yellow, rotation: 20 })]),
];
export const ELEMENT_COLORS = ["Black", "White", "Purple", "Blue", "Yellow", "Red", "Green"] as const;
export const ELEMENT_DRAG_TYPE = "application/x-canvaisdead-element";
export const assetById = (id: string) => ELEMENT_ASSETS.find(asset => asset.id === id);
const sourceElements = (asset: ElementAsset): El[] => asset.parts.map((p, index) => ({ id: `preview-${asset.id}-${index}`, rotation: 0, opacity: 1, fill: ink, stroke: ink, strokeWidth: 0, radius: 0, ...p }));
const normalize = (text: string) => text.normalize("NFKD").replace(/\p{M}/gu, "").toLocaleLowerCase().replace(/[^\p{L}\p{N}#]+/gu, " ").trim();
export type ElementFilters = { query: string; category: string; color: string; orientation: string; collection: string };
export function searchElements(filters: Partial<ElementFilters> = {}, candidates: readonly ElementAsset[] = ELEMENT_ASSETS): ElementAsset[] {
  const words = normalize(filters.query ?? "").split(/\s+/).filter(Boolean);
  return candidates.filter(asset => {
    if (filters.category && filters.category !== "All" && asset.category !== filters.category) return false;
    if (filters.collection && asset.collection !== filters.collection) return false;
    if (filters.color && !asset.colors.includes(filters.color)) return false;
    const text = normalize(`${asset.name} ${asset.category} ${asset.collection} ${asset.tags} ${asset.colors.join(" ")}`);
    if (!words.every(word => text.includes(word))) return false;
    const box = selectionBounds(sourceElements(asset))!;
    const orientation = box.w / box.h > 1.1 ? "Landscape" : box.h / box.w > 1.1 ? "Portrait" : "Square";
    return !filters.orientation || orientation === filters.orientation;
  });
}
/** Center native editable artwork on the page/drop point. No network or rasterization. */
export function insertElementAsset(design: CanvasDesign, id: string, point = { x: design.w / 2, y: design.h / 2 }) {
  const asset = assetById(id);
  if (!asset || ![point.x, point.y, design.w, design.h].every(Number.isFinite) || design.w <= 0 || design.h <= 0) return { design, ids: [] };
  const source = sourceElements(asset), box = selectionBounds(source)!;
  const scale = Math.min(design.w, design.h) * .3 / Math.max(box.w, box.h);
  const used = new Set(design.els.flatMap(e => [e.id, ...e.groupPath ?? []]));
  const nextId = (prefix: string) => { let value = uid(prefix); while (used.has(value)) value = uid(prefix); used.add(value); return value; };
  const group = source.length > 1 ? nextId("g") : null;
  const center = { x: Math.max(0, Math.min(design.w, point.x)), y: Math.max(0, Math.min(design.h, point.y)) };
  const scaled = source.map(e => ({ ...e, id: nextId("e"), x: e.x * scale, y: e.y * scale, w: e.w * scale, h: e.h * scale, radius: e.radius * scale, strokeWidth: e.strokeWidth * scale, ...(group ? { groupPath: [group] } : {}) }));
  // Re-measure after scaling: the editor retains a one-pixel selection height for thin lines.
  const placed = selectionBounds(scaled)!;
  const els = scaled.map(e => ({ ...e, x: e.x + center.x - placed.x - placed.w / 2, y: e.y + center.y - placed.y - placed.h / 2 }));
  return { design: touch({ ...design, els: [...design.els, ...els] }), ids: els.map(e => e.id) };
}
export function elementAssetPreview(asset: ElementAsset) {
  const elements = sourceElements(asset), box = selectionBounds(elements)!, pad = Math.max(4, ...elements.map(e => e.strokeWidth));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box.x - pad} ${box.y - pad} ${box.w + pad * 2} ${box.h + pad * 2}" aria-hidden="true">${elements.map(e => elementSVG(e)).join("")}</svg>`;
}

export type ElementLibrary = { version: 1; recent: string[]; starred: string[] };
export const EMPTY_ELEMENT_LIBRARY: ElementLibrary = { version: 1, recent: [], starred: [] };
export const MAX_RECENT_ELEMENTS = 24;
export function isElementLibrary(value: unknown): value is ElementLibrary {
  if (!value || typeof value !== "object" || !("version" in value) || value.version !== 1) return false;
  const list = (items: unknown): items is string[] => Array.isArray(items) && items.length <= 1000 && items.every(item => typeof item === "string" && item.length <= 128) && new Set(items).size === items.length;
  return "recent" in value && list(value.recent) && value.recent.length <= MAX_RECENT_ELEMENTS && "starred" in value && list(value.starred);
}
export function rememberElement(library: ElementLibrary, id: string): ElementLibrary {
  return assetById(id) ? { ...library, recent: [id, ...library.recent.filter(item => item !== id)].slice(0, MAX_RECENT_ELEMENTS) } : library;
}
export function starElement(library: ElementLibrary, id: string): ElementLibrary {
  return assetById(id) ? { ...library, starred: library.starred.includes(id) ? library.starred.filter(item => item !== id) : [...library.starred, id] } : library;
}
