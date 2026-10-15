import { afterEach, describe, expect, it, vi } from "vitest";
import type { El } from "@/lib/design/types";
import { applyImageCrop, beginImageCrop, coverImageCrop, imageCropZoom, panImageCrop, ratioImageCrop, resetImageCrop, resizeImageCrop, validImageCrop, visibleImageCrop, zoomImageCrop } from "@/lib/design/image-crop";
import { addEl, blankDesign, commit, hist, makeEl, patchEl, toSVG, undo, type Handle } from "@/lib/design/ops";
import { copyElements, groupElements } from "@/lib/design/groups";
import { duplicateSelection } from "@/lib/design/selection";
import { designPages, duplicatePage, pageCanvas } from "@/lib/design/pages";
import { importDesignCopies, parseDesignBackup, serializeDesignBackup } from "@/lib/design/backup";
import { clipboardFormats, parseElementClipboard, pasteElements, richClipboard, selectionClipboard } from "@/lib/design/clipboard";
import { isDesignLibrary } from "@/lib/design/validate";
import { renderToCanvas } from "@/lib/design/render";
import { createLocalStore } from "@/lib/local-store";

const pixel = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jN2QAAAAASUVORK5CYII=";
const fixture = (rotation = 0) => makeEl("image", blankDesign({ w: 800, h: 600 }), { id: "photo", x: 100, y: 80, w: 200, h: 100, src: pixel, rotation });
const ready = (rotation = 0) => beginImageCrop(fixture(rotation), 400, 200);
function point(e: El, x: number, y: number) {
  const c = e.imageCrop!, k = e.w / c.w, dx = (x - c.x - c.w / 2) * k, dy = (y - c.y - c.h / 2) * k, angle = e.rotation * Math.PI / 180;
  return { x: e.x + e.w / 2 + dx * Math.cos(angle) - dy * Math.sin(angle), y: e.y + e.h / 2 + dx * Math.sin(angle) + dy * Math.cos(angle) };
}
const near = (a: number, b: number) => expect(a).toBeCloseTo(b, 7);
afterEach(() => vi.unstubAllGlobals());

describe("nondestructive crop geometry", () => {
  it("starts from the existing cover window without altering source bytes or geometry", () => {
    const original = { ...fixture(), w: 100 }, before = structuredClone(original), e = beginImageCrop(original, 400, 200);
    expect(e.imageCrop).toEqual({ x: 100, y: 0, w: 200, h: 200, sourceW: 400, sourceH: 200 });
    expect({ ...e, imageCrop: undefined }).toEqual({ ...original, imageCrop: undefined }); expect(original).toEqual(before);
    expect(() => beginImageCrop({ ...original, locked: true }, 400, 200)).toThrow("unlocked");
  });
  it("preserves pixel positions when trimming any handle, including rotated images", () => {
    for (const rotation of [0, 37, 90, 180, -48]) for (const handle of ["nw", "n", "ne", "e", "se", "s", "sw", "w"] as Handle[]) {
      const e = ready(rotation), before = structuredClone(e), next = resizeImageCrop(e, handle, 23, 19);
      expect(validImageCrop(next.imageCrop)).toBe(true); expect(e).toEqual(before); expect(next.src).toBe(e.src);
      for (const [x, y] of [[0, 0], [400, 200], [100, 150]]) { const a = point(e, x, y), b = point(next, x, y); near(a.x, b.x); near(a.y, b.y); }
    }
  });
  it("clamps extreme freeform and ratio drags within the source while keeping a positive frame", () => {
    for (const handle of ["nw", "n", "ne", "e", "se", "s", "sw", "w"] as Handle[]) for (const dx of [-10000, 10000]) for (const dy of [-10000, 10000]) for (const ratio of [null, 1, 16 / 9]) {
      const e = ratio === null ? ready() : ratioImageCrop(ready(), ratio), next = resizeImageCrop(e, handle, dx, dy, ratio);
      expect(validImageCrop(next.imageCrop)).toBe(true); expect(next.w).toBeGreaterThan(0); expect(next.h).toBeGreaterThan(0);
      if (ratio) near(next.w / next.h, ratio);
    }
  });
  it("pans in screen directions on rotated images and never reveals beyond the source", () => {
    const e = zoomImageCrop(ready(90), 2), next = panImageCrop(e, 20, 0);
    expect(next).toMatchObject({ x: e.x, y: e.y, w: e.w, h: e.h });
    near(next.imageCrop!.x, e.imageCrop!.x); near(next.imageCrop!.y, e.imageCrop!.y + 20);
    for (const n of [-1e6, 1e6]) expect(validImageCrop(panImageCrop(e, n, n).imageCrop)).toBe(true);
  });
  it("zooms around the visible center, caps zoom, and restores the full source without rasterizing", () => {
    const e = ready(), zoomed = zoomImageCrop(e, 2);
    expect(zoomed.imageCrop).toMatchObject({ x: 100, y: 50, w: 200, h: 100 }); near(imageCropZoom(zoomed), 2);
    expect(zoomImageCrop(e, 100).imageCrop!.w).toBe(40); expect(zoomImageCrop(e, -1).imageCrop!.w).toBe(400);
    const reset = resetImageCrop(panImageCrop(ratioImageCrop(zoomed, 1), 100, 0));
    expect(reset.imageCrop).toEqual({ x: 0, y: 0, w: 400, h: 200, sourceW: 400, sourceH: 200 }); expect(reset.src).toBe(pixel); near(reset.w / reset.h, 2);
  });
  it("keeps rotation, style and group metadata while applying ratios and normalizing a resized viewport", () => {
    const e = { ...ready(37), opacity: .6, groupPath: ["group"] }, next = ratioImageCrop(e, 1);
    expect(next).toMatchObject({ rotation: 37, opacity: .6, groupPath: ["group"], src: pixel }); near(next.w, next.h);
    const p = point(e, 200, 100), q = point(next, 200, 100); near(p.x, q.x); near(p.y, q.y);
    const stretched = { ...next, w: next.w * 2 }, visible = visibleImageCrop(stretched, 400, 200);
    near(visible.w / visible.h, 2); expect(visible.h).toBeLessThan(next.imageCrop!.h);
  });
  it("does not alter locked images or accept nonfinite control values", () => {
    const e = { ...ready(), locked: true };
    for (const next of [panImageCrop(e, 1, 1), resizeImageCrop(e, "e", 1, 1), ratioImageCrop(e, 1), zoomImageCrop(e, 2), resetImageCrop(e)]) expect(next).toBe(e);
    const normal = ready(); expect(panImageCrop(normal, NaN, 0)).toBe(normal); expect(resizeImageCrop(normal, "e", Infinity, 0)).toBe(normal); expect(ratioImageCrop(normal, -1)).toBe(normal);
  });
});

describe("crop persistence, transfer and rendering", () => {
  it("commits once, survives local reload, and leaves newer or locked source elements intact", () => {
    const original = fixture(), d = addEl(blankDesign({ w: 800, h: 600 }), original), preview = ratioImageCrop(beginImageCrop(original, 400, 200), 1);
    const next = applyImageCrop(d, original, preview), h = commit(hist(d), next);
    expect(h.past).toHaveLength(1); expect(undo(h).present).toBe(d); expect(isDesignLibrary([next])).toBe(true);
    const memory = new Map<string, string>(), access = () => ({ getItem: (key: string) => memory.get(key) ?? null, setItem: (key: string, value: string) => { memory.set(key, value); } });
    const store = createLocalStore("crop", [], access, isDesignLibrary); store.load(); expect(store.set([next])).toBe(true);
    const reopened = createLocalStore("crop", [], access, isDesignLibrary); expect(reopened.load()).toBe(true); expect(reopened.getSnapshot().value).toEqual([next]);
    const changed = patchEl(d, original.id, { opacity: .5 }); expect(applyImageCrop(changed, original, preview)).toBe(changed);
    const locked = { ...original, locked: true }, lockedDoc = { ...d, els: [locked] }; expect(applyImageCrop(lockedDoc, locked, preview)).toBe(lockedDoc);
  });
  it("rejects corrupt crop metadata and protects older backup formats from silently losing the crop", () => {
    const e = ratioImageCrop(ready(), 1), d = addEl(blankDesign({ w: 800, h: 600 }), e), raw = serializeDesignBackup([d]);
    expect(JSON.parse(raw).version).toBe(4); expect(parseDesignBackup(raw)).toEqual([d]);
    for (const version of [1, 2, 3]) expect(() => parseDesignBackup(JSON.stringify({ format: "canvaisdead", version, designs: [d] }))).toThrow("version 4");
    for (const crop of [null, [], {}, { ...e.imageCrop!, x: -1 }, { ...e.imageCrop!, w: 0 }, { ...e.imageCrop!, x: 400 }, { ...e.imageCrop!, sourceH: NaN }]) {
      expect(validImageCrop(crop)).toBe(false); expect(isDesignLibrary([{ ...d, els: [{ ...e, imageCrop: crop }] }])).toBe(false);
    }
    expect(isDesignLibrary([{ ...d, els: [{ ...e, type: "rect" }] }])).toBe(false);
    for (const version of [1, 2, 3]) expect(parseDesignBackup(JSON.stringify({ format: "canvaisdead", version, designs: [blankDesign({ w: 80, h: 80 })] }))).toHaveLength(1);
  });
  it("makes independent crop data for group, page, library and clipboard copies", () => {
    const e = ratioImageCrop(ready(), 1); let d = addEl(addEl(blankDesign({ w: 800, h: 600 }), e), makeEl("rect", blankDesign({ w: 800, h: 600 }), { id: "shape" }));
    d = groupElements(d, d.els.map(el => el.id), null, "g");
    const first = designPages(d)[0].id, pageCopy = pageCanvas(duplicatePage(d, first, "copy"), "copy"), libraryCopy = pageCanvas(importDesignCopies([], [d])[0]), duplicated = duplicateSelection(d, d.els.map(el => el.id)).design.els[2];
    const packet = selectionClipboard(d, [e.id], first); expect(packet.version).toBe(2);
    expect(() => parseElementClipboard(JSON.stringify({ ...packet, version: 1 }))).toThrow("unsupported");
    const transferred = richClipboard({ html: clipboardFormats(packet).html })!, pasted = pasteElements(d, transferred).design.els.at(-1)!;
    for (const copy of [copyElements([e])[0], pageCopy.els[0], libraryCopy.els[0], duplicated, pasted]) { expect(copy.imageCrop).toEqual(e.imageCrop); expect(copy.imageCrop).not.toBe(e.imageCrop); copy.imageCrop!.x = 0; }
    expect(e.imageCrop!.x).toBe(100);
  });
  it("emits an independent nested SVG viewport with source bytes, rotation and opacity", () => {
    const e = { ...ratioImageCrop(ready(30), 1), opacity: .7 }, svg = toSVG(addEl(blankDesign({ w: 800, h: 600 }), e));
    expect(svg).toContain('viewBox="100 0 200 200" preserveAspectRatio="xMidYMid slice" overflow="hidden"');
    expect(svg).toContain(`href="${pixel}" width="400" height="200" preserveAspectRatio="none"`);
    expect(svg).toContain('transform="rotate(30 '); expect(svg).toContain('opacity="0.7"');
  });
  it("passes the same visible source rectangle to raster exports, including viewport cover and rotation", async () => {
    const e = { ...ratioImageCrop(ready(30), 1), w: 200 }, drawImage = vi.fn(), rotate = vi.fn();
    const ctx = { save() {}, restore() {}, scale() {}, fillRect() {}, beginPath() {}, rect() {}, clip() {}, translate() {}, rotate, drawImage };
    class FakeImage { width = 800; height = 400; onload?: () => void; set src(_value: string) { queueMicrotask(() => this.onload?.()); } }
    vi.stubGlobal("Image", FakeImage); vi.stubGlobal("document", { createElement: () => ({ getContext: () => ctx }) });
    await renderToCanvas(addEl(blankDesign({ w: 800, h: 600 }), e));
    expect(drawImage).toHaveBeenCalledExactlyOnceWith(expect.any(FakeImage), 200, 100, 400, 200, e.x, e.y, 200, 100);
    near(rotate.mock.calls[0][0], Math.PI / 6);
  });
  it("maintains finite cover windows for different source and frame proportions", () => {
    for (const sourceW of [1, 13, 1400, 4096]) for (const sourceH of [1, 29, 1400]) for (const w of [1, 97, 1234]) for (const h of [1, 73, 2345]) expect(validImageCrop(coverImageCrop(w, h, sourceW, sourceH))).toBe(true);
  });
});
