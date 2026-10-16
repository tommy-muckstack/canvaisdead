import type { Rect } from "./ops";

/** Keep selection controls outside the rotated artwork when there is room. */
export function floatingToolbarPosition(selection: Rect, toolbar: { w: number; h: number }, viewport: Rect) {
  const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));
  const x = clamp(selection.x + selection.w / 2 - toolbar.w / 2, viewport.x, viewport.x + viewport.w - toolbar.w);
  const y = clamp(selection.y + selection.h / 2 - toolbar.h / 2, viewport.y, viewport.y + viewport.h - toolbar.h);
  const candidates = [
    { x, y: selection.y - toolbar.h - 14 },
    // Leave room for the rotate handle below the selection as well.
    { x, y: selection.y + selection.h + 56 },
    { x: selection.x - toolbar.w - 14, y },
    { x: selection.x + selection.w + 14, y },
  ];
  const fits = (p: { x: number; y: number }) => p.x >= viewport.x && p.y >= viewport.y && p.x + toolbar.w <= viewport.x + viewport.w && p.y + toolbar.h <= viewport.y + viewport.h;
  const position = candidates.find(fits);
  if (position) return position;
  // A selection larger than the available viewport cannot leave an outside slot.
  // Keep the actions reachable at the edge with the least artwork underneath.
  const overlap = (p: { x: number; y: number }) => Math.max(0, Math.min(p.x + toolbar.w, selection.x + selection.w) - Math.max(p.x, selection.x)) * Math.max(0, Math.min(p.y + toolbar.h, selection.y + selection.h) - Math.max(p.y, selection.y));
  return candidates.map(p => ({ x: clamp(p.x, viewport.x, viewport.x + viewport.w - toolbar.w), y: clamp(p.y, viewport.y, viewport.y + viewport.h - toolbar.h) })).sort((a, b) => overlap(a) - overlap(b))[0];
}
