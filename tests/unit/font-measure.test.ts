import { describe, expect, it, vi } from "vitest";
import { createFontMeasureStore } from "@/lib/design/font-measure";
import { approxMeasure } from "@/lib/design/ops";

function fixture() {
  let ready!: () => void, width = 12;
  const fonts = new EventTarget() as FontFaceSet;
  Object.defineProperty(fonts, "ready", { value: new Promise<void>(resolve => { ready = resolve; }), configurable: true });
  const context = { font: "", letterSpacing: "", measureText: () => ({ width }) } as unknown as CanvasRenderingContext2D;
  const factory = vi.fn(() => context), store = createFontMeasureStore(factory, () => fonts);
  return { fonts, ready, store, factory, width: (next: number) => { width = next; } };
}
describe("font-aware artwork measurement", () => {
  it("shares one canvas/listener pair and invalidates memoized layout on successive font cycles", async () => {
    const f = fixture(), a = vi.fn(), b = vi.fn(), add = vi.spyOn(f.fonts, "addEventListener"), remove = vi.spyOn(f.fonts, "removeEventListener");
    expect(f.store.getServerSnapshot()).toBe(approxMeasure);
    const first = f.store.subscribe(a), second = f.store.subscribe(b);
    expect(f.factory).toHaveBeenCalledTimes(1); expect(add).toHaveBeenCalledTimes(2);
    const initial = f.store.getSnapshot(); expect(initial("i", 20, "test", 400)).toBe(12);
    f.width(8); f.ready(); await Promise.resolve(); const loaded = f.store.getSnapshot();
    expect(loaded).not.toBe(initial); expect(loaded("i", 20, "test", 400)).toBe(8);
    f.width(10); f.fonts.dispatchEvent(new Event("loadingdone"));
    expect(f.store.getSnapshot()).not.toBe(loaded); expect(f.store.getSnapshot()("i", 20, "test", 400)).toBe(10);
    const beforeError = f.store.getSnapshot(); f.fonts.dispatchEvent(new Event("loadingerror")); expect(f.store.getSnapshot()).not.toBe(beforeError);
    first(); expect(remove).not.toHaveBeenCalled(); second(); expect(remove).toHaveBeenCalledTimes(2);
    const ended = f.store.getSnapshot(); f.fonts.dispatchEvent(new Event("loadingdone")); expect(f.store.getSnapshot()).toBe(ended);
  });
  it("ignores a previous subscription's pending ready promise after unmount/remount", async () => {
    const f = fixture(), first = vi.fn(), off = f.store.subscribe(first); off();
    let nextReady!: () => void;
    Object.defineProperty(f.fonts, "ready", { value: new Promise<void>(resolve => { nextReady = resolve; }) });
    const second = vi.fn(), stop = f.store.subscribe(second), mounted = f.store.getSnapshot();
    f.ready(); await Promise.resolve(); expect(f.store.getSnapshot()).toBe(mounted);
    nextReady(); await Promise.resolve(); expect(f.store.getSnapshot()).not.toBe(mounted);
    expect(first).toHaveBeenCalledTimes(1); stop(); expect(f.factory).toHaveBeenCalledTimes(1);
  });
  it("uses deterministic server/fallback measurement when canvas or FontFaceSet is absent", () => {
    const fallback = createFontMeasureStore(() => null, () => undefined), listener = vi.fn(), off = fallback.subscribe(listener);
    expect(fallback.getSnapshot()).toBe(approxMeasure); expect(listener).not.toHaveBeenCalled(); off();
    const f = fixture(), noFonts = createFontMeasureStore(f.factory, () => undefined), stop = noFonts.subscribe(listener);
    expect(noFonts.getSnapshot()("i", 20, "test", 400)).toBe(12); stop();
  });
});
