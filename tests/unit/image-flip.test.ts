import { afterEach, describe, expect, it, vi } from "vitest";
import type { El } from "@/lib/design/types";
import { addEl, blankDesign, commit, elementSVG, hist, makeEl, redo, rotatePoint, undo, type Handle } from "@/lib/design/ops";
import { flipImage, imageFlipMatrix, imageFlipSVG } from "@/lib/design/image-flip";
import { applyImageCrop, beginImageCrop, panImageCrop, ratioImageCrop, resetImageCrop, resizeImageCrop, validImageCrop, visibleImageCrop, zoomImageCrop } from "@/lib/design/image-crop";
import { renderToCanvas } from "@/lib/design/render";
import { copyElements, groupElements } from "@/lib/design/groups";
import { duplicateSelection, resizeSelection } from "@/lib/design/selection";
import { designPages, duplicatePage, pageCanvas } from "@/lib/design/pages";
import { importDesignCopies, parseDesignBackup, serializeDesignBackup } from "@/lib/design/backup";
import { clipboardFormats, parseElementClipboard, pasteElements, richClipboard, selectionClipboard } from "@/lib/design/clipboard";
import { isDesignLibrary } from "@/lib/design/validate";
import { createLocalStore } from "@/lib/local-store";

const source = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jN2QAAAAASUVORK5CYII=";
const design = () => blankDesign({ w: 800, h: 600 });
const fixture = (over: Partial<El> = {}) => makeEl("image", design(), { id: "photo", src: source, x: 100, y: 80, w: 200, h: 100, ...over });
const combinations = [{}, { flipX: true }, { flipY: true }, { flipX: true, flipY: true }];
const handles: Handle[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
function sourcePoint(e: El, x: number, y: number) {
  const c = e.imageCrop!, k = e.w / c.w, center = { x: e.x + e.w / 2, y: e.y + e.h / 2 };
  const localX = (x - c.x - c.w / 2) * k * (e.flipX ? -1 : 1), localY = (y - c.y - c.h / 2) * k * (e.flipY ? -1 : 1);
  return rotatePoint(center.x + localX, center.y + localY, center.x, center.y, e.rotation);
}
const near = (a: { x: number; y: number }, b: { x: number; y: number }) => { expect(a.x).toBeCloseTo(b.x, 7); expect(a.y).toBeCloseTo(b.y, 7); };
afterEach(() => vi.unstubAllGlobals());

describe("reversible image reflection", () => {
  it("reflects each local axis around the unchanged frame center", () => {
    for (const flags of combinations) {
      const e = fixture(flags), m = imageFlipMatrix(e);
      if (!e.flipX && !e.flipY) { expect(m).toBeNull(); expect(imageFlipSVG(e)).toBeUndefined(); continue; }
      const [a, b, c, d, tx, ty] = m!;
      const transform = (x: number, y: number) => ({ x: a * x + c * y + tx, y: b * x + d * y + ty });
      near(transform(200, 130), { x: 200, y: 130 });
      near(transform(100, 80), { x: e.flipX ? 300 : 100, y: e.flipY ? 180 : 80 });
    }
  });
  it("toggles independently, restores the original artwork after two flips and never rewrites pixels", () => {
    const e = { ...beginImageCrop(fixture({ rotation: 37, opacity: .6 }), 400, 200), groupPath: ["group"] }, d = addEl(design(), e), before = structuredClone(d);
    const horizontal = flipImage(d, e.id, "horizontal"); expect(horizontal.els[0]).toMatchObject({ ...e, flipX: true });
    expect(horizontal.els[0].src).toBe(e.src); expect(horizontal.els[0].imageCrop).toBe(e.imageCrop);
    expect(flipImage(horizontal, e.id, "horizontal").els).toEqual(d.els);
    expect(flipImage(horizontal, e.id, "vertical").els).toEqual(flipImage(flipImage(d, e.id, "vertical"), e.id, "horizontal").els);
    expect(d).toEqual(before);
  });
  it("rejects locks and unsupported targets, while an individual group member keeps its siblings intact", () => {
    const image = fixture(), shape = makeEl("rect", design(), { id: "shape", locked: true }), d = groupElements(addEl(addEl(design(), image), { ...shape, locked: false }), [image.id, shape.id], null, "group");
    const grouped = { ...d, els: d.els.map(e => e.id === shape.id ? { ...e, locked: true } : e) };
    for (const id of ["missing", "group", shape.id]) expect(flipImage(grouped, id, "horizontal")).toBe(grouped);
    const locked = { ...grouped, els: grouped.els.map(e => ({ ...e, locked: true })) }; expect(flipImage(locked, image.id, "vertical")).toBe(locked);
    const empty = addEl(design(), { ...image, src: undefined }); expect(flipImage(empty, image.id, "horizontal")).toBe(empty);
    const next = flipImage(grouped, image.id, "horizontal"); expect(next.els[0].groupPath).toEqual(["group"]); expect(next.els[1]).toBe(grouped.els[1]);
  });
  it("commits one undo step and persists locally without changing frame geometry", () => {
    const d = addEl(design(), fixture()), next = flipImage(d, "photo", "vertical"), h = commit(hist(d), next);
    expect(h.past).toHaveLength(1); expect(undo(h).present).toBe(d); expect(redo(undo(h)).present).toBe(next);
    const memory = new Map<string, string>(), access = () => ({ getItem: (key: string) => memory.get(key) ?? null, setItem: (key: string, value: string) => { memory.set(key, value); } });
    const store = createLocalStore("flip", [], access, isDesignLibrary); store.load(); expect(store.set([next])).toBe(true);
    const reopened = createLocalStore("flip", [], access, isDesignLibrary); expect(reopened.load()).toBe(true); expect(reopened.getSnapshot().value).toEqual([next]);
  });
});

describe("crop interactions after flipping", () => {
  it("keeps source pixels stationary when trimming every handle, including rotated and constrained crops", () => {
    for (const flags of combinations) for (const rotation of [0, 37, 90, 180, -48]) for (const handle of handles) for (const ratio of [null, 1, 16 / 9]) {
      let e = zoomImageCrop(beginImageCrop(fixture({ ...flags, rotation }), 400, 200), 2);
      if (ratio) e = ratioImageCrop(e, ratio);
      const next = resizeImageCrop(e, handle, 13, 9, ratio);
      expect(validImageCrop(next.imageCrop)).toBe(true); expect(next.src).toBe(e.src);
      for (const [x, y] of [[0, 0], [400, 200], [100, 150]]) near(sourcePoint(next, x, y), sourcePoint(e, x, y));
      if (ratio) expect(next.w / next.h).toBeCloseTo(ratio, 7);
    }
  });
  it("moves the named frame edge in the pointer direction even when its source side is reflected", () => {
    for (const flags of combinations) for (const rotation of [0, 37, 90]) {
      const e = zoomImageCrop(beginImageCrop(fixture({ ...flags, rotation }), 400, 200), 2), delta = rotatePoint(10, 0, 0, 0, rotation);
      const next = resizeImageCrop(e, "w", delta.x, delta.y);
      const topLeft = (el: El) => rotatePoint(el.x, el.y, el.x + el.w / 2, el.y + el.h / 2, el.rotation);
      const before = topLeft(e); near(topLeft(next), { x: before.x + delta.x, y: before.y + delta.y }); expect(next.w).toBeCloseTo(e.w - 10);
    }
  });
  it("pans source pixels in screen directions and clamps extreme drags for all flip combinations", () => {
    for (const flags of combinations) for (const rotation of [0, 37, 90, 180]) {
      const e = zoomImageCrop(beginImageCrop(fixture({ ...flags, rotation }), 400, 200), 3), before = sourcePoint(e, 200, 100), next = panImageCrop(e, 9, -7);
      near(sourcePoint(next, 200, 100), { x: before.x + 9, y: before.y - 7 });
      expect(next).toMatchObject({ x: e.x, y: e.y, w: e.w, h: e.h });
      for (const amount of [-10000, 10000]) for (const handle of handles) for (const ratio of [null, 1]) {
        expect(validImageCrop(panImageCrop(e, amount, -amount).imageCrop)).toBe(true);
        expect(validImageCrop(resizeImageCrop(ratio ? ratioImageCrop(e, ratio) : e, handle, amount, -amount, ratio).imageCrop)).toBe(true);
      }
    }
  });
  it("keeps flip metadata through ratios, zoom, reset and reopened crops, and rejects a stale crop commit after a flip", () => {
    const e = fixture({ flipX: true, flipY: true, rotation: 37 }), started = beginImageCrop(e, 400, 200), ratio = ratioImageCrop(started, 1), zoomed = zoomImageCrop(ratio, 3);
    for (const next of [ratio, zoomed, resetImageCrop(zoomed), beginImageCrop(zoomed, 400, 200)]) expect(next).toMatchObject({ flipX: true, flipY: true, rotation: 37, src: source });
    const d = addEl(design(), e); expect(applyImageCrop(d, e, zoomed).els[0]).toMatchObject({ flipX: true, flipY: true });
    const changed = flipImage(d, e.id, "vertical"); expect(applyImageCrop(changed, e, zoomed)).toBe(changed);
  });
});

describe("portable image flips", () => {
  it("preserves flipped/cropped artwork and text spacing through versioned backups, clipboard and independent copies", () => {
    const e = zoomImageCrop(beginImageCrop(fixture({ flipX: true, flipY: true }), 400, 200), 2), text = makeEl("text", design(), { id: "caption", letterSpacingEm: .2, textAnchor: "end" });
    const d = groupElements(addEl(addEl(design(), e), text), [e.id, text.id], null, "group"), raw = serializeDesignBackup([d]);
    expect(JSON.parse(raw).version).toBe(6); expect(parseDesignBackup(raw)).toEqual([d]);
    const pageId = designPages(d)[0].id, packet = selectionClipboard(d, d.els.map(el => el.id), pageId); expect(packet.version).toBe(4);
    const restored = richClipboard({ html: clipboardFormats(packet).html })!; expect(restored).toEqual(packet);
    const copies = [copyElements(d.els)[0], pageCanvas(duplicatePage(d, pageId, "copy"), "copy").els[0], pageCanvas(importDesignCopies([], [d])[0]).els[0], duplicateSelection(d, d.els.map(el => el.id)).design.els[2], pasteElements(design(), restored).design.els[0]];
    for (const copy of copies) { expect(copy).toMatchObject({ flipX: true, flipY: true, src: source, imageCrop: e.imageCrop }); copy.flipX = false; copy.imageCrop!.x = 0; }
    expect(e.flipX).toBe(true); expect(e.imageCrop!.x).toBe(100);
    expect(resizeSelection(d, d.els.map(el => el.id), "se", 40, 40).els[0]).toMatchObject({ flipX: true, flipY: true, imageCrop: e.imageCrop });
  });
  it("rejects invalid flags and older envelopes containing flip metadata without rejecting older artwork", () => {
    const e = fixture({ flipX: true }), d = addEl(design(), e), packet = selectionClipboard(d, [e.id], "page");
    for (const version of [1, 2, 3, 4, 5]) expect(() => parseDesignBackup(JSON.stringify({ format: "canvaisdead", version, designs: [d] }))).toThrow("version 6");
    for (const version of [1, 2, 3]) expect(() => parseElementClipboard(JSON.stringify({ ...packet, version }))).toThrow("unsupported");
    for (const patch of [{ flipX: null }, { flipY: 1 }, { flipX: "true" }, { type: "rect" }]) expect(isDesignLibrary([{ ...d, els: [{ ...e, ...patch }] }])).toBe(false);
    const original = addEl(design(), fixture()); expect(JSON.parse(serializeDesignBackup([original])).version).toBe(2); expect(selectionClipboard(original, [e.id], "page").version).toBe(1);
    for (const version of [1, 2, 3, 4, 5, 6]) expect(parseDesignBackup(JSON.stringify({ format: "canvaisdead", version, designs: [original] }))).toEqual([original]);
  });
});

describe("SVG and Canvas image flips", () => {
  it("reflects the cropped viewport before rotation with opacity applied once", () => {
    for (const flags of combinations.slice(1)) {
      const e = zoomImageCrop(beginImageCrop(fixture({ ...flags, rotation: 37, opacity: .6 }), 400, 200), 2), svg = elementSVG(e);
      expect(svg).toContain(`<g transform="rotate(37 200 130)" opacity="0.6"><g transform="${imageFlipSVG(e)}"><svg`);
      expect(svg).toContain('viewBox="100 50 200 100"'); expect(svg.match(/opacity=/g)).toHaveLength(1); expect(svg.match(/rotate\(/g)).toHaveLength(1);
      expect(svg).toContain(`href="${source}"`);
    }
    const plain = fixture(); expect(elementSVG(plain)).toBe(elementSVG({ ...plain, flipX: false, flipY: false }));
  });
  it("uses the same local reflection and source rectangle for raster/PDF exports, without affecting the next image", async () => {
    for (const flags of combinations.slice(1)) {
      const e = { ...zoomImageCrop(beginImageCrop(fixture({ ...flags, rotation: 37, opacity: .6 }), 400, 200), 2), w: 150 };
      const events: string[] = [], transform = vi.fn(() => events.push("flip")), drawImage = vi.fn(() => events.push("draw"));
      const ctx = { save: () => events.push("save"), restore: () => events.push("restore"), scale() {}, fillRect() {}, beginPath() {}, rect: vi.fn(), clip: () => events.push("clip"), translate() {}, rotate: () => events.push("rotate"), transform, drawImage };
      class FakeImage { width = 800; height = 400; onload?: () => void; set src(_value: string) { queueMicrotask(() => this.onload?.()); } }
      vi.stubGlobal("Image", FakeImage); vi.stubGlobal("document", { createElement: () => ({ getContext: () => ctx }) });
      await renderToCanvas(addEl(addEl(design(), e), fixture({ id: "plain" })));
      expect(transform).toHaveBeenCalledExactlyOnceWith(...imageFlipMatrix(e)!);
      expect(events).toEqual(["save", "rotate", "flip", "clip", "draw", "restore", "save", "clip", "draw", "restore"]);
      const c = visibleImageCrop(e, 800, 400);
      expect(drawImage.mock.calls[0]).toEqual([expect.any(FakeImage), c.x * 2, c.y * 2, c.w * 2, c.h * 2, e.x, e.y, e.w, e.h]);
    }
  });
});
