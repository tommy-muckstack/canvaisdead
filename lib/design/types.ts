export type ElType = "rect" | "ellipse" | "triangle" | "star" | "line" | "text" | "image";
export type El = {
  id: string; type: ElType; x: number; y: number; w: number; h: number; rotation: number; opacity: number;
  fill: string; stroke: string; strokeWidth: number; radius: number; locked?: boolean;
  // text
  text?: string; fontSize?: number; fontFamily?: string; fontWeight?: number; italic?: boolean; underline?: boolean; strikethrough?: boolean; align?: "left" | "center" | "right"; lineHeight?: number;
  // image
  src?: string;
};
type DesignInfo = { id: string; name: string; w: number; h: number; updatedAt: number };
export type Page = { id: string; title: string; notes?: string; bg: string; els: El[] };
/** Existing single-page files and the flat canvas passed to element operations. */
export type CanvasDesign = DesignInfo & { bg: string; els: El[]; notes?: string };
/** Page content has one source of truth; no mirrored root-level elements. */
export type PagedDesign = DesignInfo & { pages: Page[] };
export type Design = CanvasDesign | PagedDesign;
export type SizePreset = { id: string; label: string; w: number; h: number; hint: string };
