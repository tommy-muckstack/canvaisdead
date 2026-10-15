import type { CanvasDesign, El } from "./types";

export type ImageFlipAxis = "horizontal" | "vertical";
type ImageFrame = Pick<El, "x" | "y" | "w" | "h" | "flipX" | "flipY">;
/** Reflect the visible frame in its local axes, before its outer rotation. */
export function imageFlipMatrix(e: ImageFrame): [number, number, number, number, number, number] | null {
  if (!e.flipX && !e.flipY) return null;
  return [e.flipX ? -1 : 1, 0, 0, e.flipY ? -1 : 1, e.flipX ? 2 * e.x + e.w : 0, e.flipY ? 2 * e.y + e.h : 0];
}
export function imageFlipSVG(e: ImageFrame): string | undefined {
  const matrix = imageFlipMatrix(e);
  return matrix ? `matrix(${matrix.join(" ")})` : undefined;
}
/** An individual image may be flipped without changing its source, crop or group. */
export function flipImage(design: CanvasDesign, id: string, axis: ImageFlipAxis): CanvasDesign {
  const original = design.els.find(e => e.id === id);
  if (!original || original.type !== "image" || original.locked || !original.src || (axis !== "horizontal" && axis !== "vertical")) return design;
  const key = axis === "horizontal" ? "flipX" : "flipY", next = { ...original };
  if (next[key]) delete next[key]; else next[key] = true;
  return { ...design, updatedAt: Date.now(), els: design.els.map(e => e === original ? next : e) };
}
