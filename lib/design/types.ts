export type ElType = "rect" | "ellipse" | "triangle" | "star" | "line" | "text" | "image";
export type ElementLink = { kind: "url"; url: string } | { kind: "page"; pageId: string };
export type ImageCrop = { x: number; y: number; w: number; h: number; sourceW: number; sourceH: number };
export type TextEffect = {
  kind: "drop" | "glow" | "echo" | "outline" | "background" | "splice" | "hollow" | "glitch" | "neon";
  color: string; offset: number; direction: number; blur: number; transparency: number; thickness: number; intensity: number; spread: number; roundness: number;
};
export type El = {
  id: string; type: ElType; x: number; y: number; w: number; h: number; rotation: number; opacity: number;
  fill: string; stroke: string; strokeWidth: number; radius: number; locked?: boolean;
  // Page-local ancestry, outermost first. Group members remain contiguous in paint order.
  groupPath?: string[];
  link?: ElementLink;
  // text
  text?: string; fontSize?: number; fontFamily?: string; fontWeight?: number; italic?: boolean; underline?: boolean; strikethrough?: boolean; align?: "left" | "center" | "right"; lineHeight?: number;
  letterSpacingEm?: number; textAnchor?: "start" | "middle" | "end";
  listStyle?: "bullet" | "number";
  textEffect?: TextEffect;
  textCurve?: number;
  // image
  src?: string; imageCrop?: ImageCrop; flipX?: boolean; flipY?: boolean;
};
type DesignInfo = { id: string; name: string; w: number; h: number; updatedAt: number; trashedAt?: number; starred?: boolean };
export type Page = { id: string; title: string; notes?: string; bg: string; els: El[] };
/** Existing single-page files and the flat canvas passed to element operations. */
export type CanvasDesign = DesignInfo & { bg: string; els: El[]; notes?: string };
/** Page content has one source of truth; no mirrored root-level elements. */
export type PagedDesign = DesignInfo & { pages: Page[] };
export type Design = CanvasDesign | PagedDesign;
export type SizePreset = { id: string; label: string; w: number; h: number; hint: string };
