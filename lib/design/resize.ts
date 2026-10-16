import { customSize } from "./create";
import { designPages } from "./pages";
import { touch } from "./ops";
import type { Design } from "./types";

export type ResizeTarget = { w: number; h: number };

/** Validate and deduplicate requested outputs without silently dropping invalid sizes. */
export function uniqueResizeTargets(targets: readonly ResizeTarget[]): ResizeTarget[] {
  const seen = new Set<string>();
  return targets.flatMap(target => {
    const checked = customSize(String(target.w), String(target.h), "px");
    if (!checked.size || checked.size.w !== target.w || checked.size.h !== target.h) throw new Error(checked.error ?? "Choose whole-pixel dimensions.");
    const key = `${target.w}:${target.h}`;
    if (seen.has(key)) return [];
    seen.add(key); return [{ w: target.w, h: target.h }];
  });
}

/** Fit the entire composition uniformly, keeping groups and image source coordinates intact. */
export function resizeArtwork(design: Design, target: ResizeTarget, pageIds = designPages(design).map(page => page.id)): Design {
  uniqueResizeTargets([target]);
  const pages = designPages(design), selected = new Set(pageIds);
  if (!selected.size || pageIds.some(id => !pages.some(page => page.id === id))) throw new Error("Choose existing pages to resize.");
  if (target.w === design.w && target.h === design.h && selected.size === pages.length) return design;
  const scale = Math.min(target.w / design.w, target.h / design.h);
  const dx = (target.w - design.w * scale) / 2, dy = (target.h - design.h * scale) / 2;
  return touch({
    id: design.id, name: design.name, w: target.w, h: target.h, updatedAt: design.updatedAt,
    ...(design.trashedAt !== undefined ? { trashedAt: design.trashedAt } : {}),
    pages: pages.filter(page => selected.has(page.id)).map(page => ({
      ...page, els: page.els.map(element => ({
        ...element, x: element.x * scale + dx, y: element.y * scale + dy,
        w: element.w * scale, h: element.h * scale,
        ...(element.type === "text" || element.fontSize !== undefined ? { fontSize: (element.fontSize ?? 32) * scale } : {}),
        strokeWidth: element.strokeWidth * scale, radius: element.radius * scale,
      })),
    })),
  });
}

/** These are copy inputs; the library assigns independent IDs in a single local transaction. */
export function resizedCopyInputs(design: Design, targets: readonly ResizeTarget[], pageIds: string[]): Design[] {
  const sizes = uniqueResizeTargets(targets);
  if (!sizes.length) throw new Error("Choose at least one size.");
  return sizes.map(size => ({ ...resizeArtwork(design, size, pageIds), name: `${design.name} (${size.w} × ${size.h} px)` }));
}
