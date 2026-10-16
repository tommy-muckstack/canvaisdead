import { approxMeasure, type Measure } from "./ops";
import { canvasMeasure } from "./render";

/** One canvas and one font subscription shared by all live artwork consumers. */
export function createFontMeasureStore(contextFor: () => CanvasRenderingContext2D | null, fontsFor: () => FontFaceSet | undefined) {
  let context: CanvasRenderingContext2D | null = null, current: Measure = approxMeasure, generation = 0;
  const listeners = new Set<() => void>();
  let detach = () => {};
  const refresh = () => {
    if (!listeners.size) return;
    context ??= contextFor();
    const next = context ? canvasMeasure(context) : approxMeasure;
    if (next === current) return;
    // Function identity invalidates memoized SVG, wrapping and selection geometry.
    current = next; listeners.forEach(listener => listener());
  };
  return {
    getSnapshot: () => current,
    getServerSnapshot: () => approxMeasure,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      if (listeners.size === 1) {
        const fonts = fontsFor(), session = ++generation;
        fonts?.addEventListener("loadingdone", refresh);
        fonts?.addEventListener("loadingerror", refresh);
        // Covers hydration and a load already in flight when the first view mounts.
        void fonts?.ready.then(() => { if (session === generation) refresh(); });
        detach = () => { fonts?.removeEventListener("loadingdone", refresh); fonts?.removeEventListener("loadingerror", refresh); };
        refresh();
      }
      return () => {
        listeners.delete(listener);
        if (!listeners.size) { generation++; detach(); }
      };
    },
  };
}
