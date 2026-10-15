export type ElType = "rect" | "ellipse" | "triangle" | "star" | "line" | "text" | "image";
export type ImageCrop = { x: number; y: number; w: number; h: number; sourceW: number; sourceH: number };
export type El = {
  id: string; type: ElType; x: number; y: number; w: number; h: number; rotation: number; opacity: number;
  fill: string; stroke: string; strokeWidth: number; radius: number; locked?: boolean;
  // Page-local ancestry, outermost first. Group members remain contiguous in paint order.
  groupPath?: string[];
  // text
  text?: string; fontSize?: number; fontFamily?: string; fontWeight?: number; italic?: boolean; underline?: boolean; strikethrough?: boolean; align?: "left" | "center" | "right"; lineHeight?: number;
  letterSpacingEm?: number; textAnchor?: "start" | "middle" | "end";
  // image
  src?: string; imageCrop?: ImageCrop;
};
type DesignInfo = { id: string; name: string; w: number; h: number; updatedAt: number; trashedAt?: number };
export type Page = { id: string; title: string; notes?: string; bg: string; els: El[] };
/** Existing single-page files and the flat canvas passed to element operations. */
export type CanvasDesign = DesignInfo & { bg: string; els: El[]; notes?: string };
/** Page content has one source of truth; no mirrored root-level elements. */
export type PagedDesign = DesignInfo & { pages: Page[] };
export type Design = CanvasDesign | PagedDesign;
export type SizePreset = { id: string; label: string; w: number; h: number; hint: string };
