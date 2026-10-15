export type ElType = "rect" | "ellipse" | "triangle" | "star" | "line" | "text" | "image";
export type El = {
  id: string; type: ElType; x: number; y: number; w: number; h: number; rotation: number; opacity: number;
  fill: string; stroke: string; strokeWidth: number; radius: number; locked?: boolean;
  // text
  text?: string; fontSize?: number; fontFamily?: string; fontWeight?: number; italic?: boolean; align?: "left" | "center" | "right"; lineHeight?: number;
  // image
  src?: string;
};
export type Design = { id: string; name: string; w: number; h: number; bg: string; els: El[]; updatedAt: number };
export type SizePreset = { id: string; label: string; w: number; h: number; hint: string };
