import { describe, expect, it } from "vitest";
import { blankDesign, commit, hist, makeEl, redo, undo } from "@/lib/design/ops";
import { designPages } from "@/lib/design/pages";
import { resizeArtwork, resizedCopyInputs, uniqueResizeTargets } from "@/lib/design/resize";
import { isDesignLibrary } from "@/lib/design/validate";
import type { PagedDesign } from "@/lib/design/types";

function fixture(): PagedDesign {
  const page = blankDesign({ w: 800, h: 600 });
  return { id: "source", name: "Artwork", w: 800, h: 600, updatedAt: 1, pages: [
    { id: "first", title: "Cover", notes: "Private notes", bg: "#fff", els: [
      makeEl("rect", page, { id: "shape", x: 80, y: 100, w: 200, h: 120, rotation: 20, locked: true, groupPath: ["pair"], strokeWidth: 4, radius: 12 }),
      makeEl("text", page, { id: "text", x: 320, y: 100, w: 300, fontSize: 40, letterSpacingEm: .1, lineHeight: 1.5, groupPath: ["pair"], text: "Keep the layout" }),
      makeEl("image", page, { id: "image", x: 100, y: 350, w: 160, h: 80, src: "data:image/png;base64,b3JpZ2luYWw=", flipX: true, imageCrop: { x: 2, y: 1, w: 8, h: 4, sourceW: 16, sourceH: 8 } }),
    ] },
    { id: "second", title: "Details", notes: "Second notes", bg: "#d9d9d9", els: [makeEl("line", page, { id: "line", x: 100, y: 150, w: 500, h: 0, strokeWidth: 6 })] },
  ] };
}
describe("free design resizing", () => {
  it("scales every page's artwork and paint sizes while preserving locks, notes and embedded originals", () => {
    const source = fixture(), before = structuredClone(source), resized = resizeArtwork(source, { w: 1600, h: 1200 });
    expect(isDesignLibrary([resized])).toBe(true); expect(source).toEqual(before);
    const pages = designPages(resized);
    expect(pages.map(p => [p.id, p.title, p.notes, p.bg])).toEqual(source.pages.map(p => [p.id, p.title, p.notes, p.bg]));
    expect(pages[0].els[0]).toMatchObject({ x: 160, y: 200, w: 400, h: 240, rotation: 20, locked: true, strokeWidth: 8, radius: 24, groupPath: ["pair"] });
    expect(pages[0].els[1]).toMatchObject({ x: 640, y: 200, w: 600, fontSize: 80, letterSpacingEm: .1, lineHeight: 1.5 });
    expect(pages[0].els[2]).toMatchObject({ x: 200, y: 700, w: 320, h: 160, src: source.pages[0].els[2].src, imageCrop: source.pages[0].els[2].imageCrop, flipX: true });
    expect(pages[1].els[0]).toMatchObject({ x: 200, y: 300, w: 1000, h: 0, strokeWidth: 12 });
  });
  it("centers the whole composition at a new aspect ratio without distorting group spacing", () => {
    const source = fixture(), pages = designPages(resizeArtwork(source, { w: 400, h: 600 }));
    expect(pages[0].els[0]).toMatchObject({ x: 40, y: 200, w: 100, h: 60, radius: 6, strokeWidth: 2 });
    expect(pages[0].els[1]).toMatchObject({ x: 160, y: 200, fontSize: 20 });
    expect(pages[0].els[1].x - pages[0].els[0].x).toBe(120);
    expect(pages[0].els[2].w / pages[0].els[2].h).toBe(2);
  });
  it("retains selected pages in document order and rejects an empty or stale selection", () => {
    const source = fixture();
    expect(designPages(resizeArtwork(source, { w: 500, h: 500 }, ["second"])).map(p => [p.id, p.title, p.notes])).toEqual([["second", "Details", "Second notes"]]);
    expect(designPages(resizeArtwork(source, { w: 500, h: 500 }, ["second", "first", "first"])).map(p => p.id)).toEqual(["first", "second"]);
    expect(() => resizeArtwork(source, { w: 500, h: 500 }, [])).toThrow("Choose existing pages");
    expect(() => resizeArtwork(source, { w: 500, h: 500 }, ["missing"])).toThrow("Choose existing pages");
  });
  it("preserves no-op identity and exact single-step history for a whole-design resize", () => {
    const source = fixture();
    expect(resizeArtwork(source, { w: 800, h: 600 })).toBe(source);
    const resized = resizeArtwork(source, { w: 1200, h: 1200 }), history = commit(hist(source), resized);
    expect(undo(history).present).toEqual(source); expect(redo(undo(history)).present).toEqual(resized);
  });
  it("migrates legacy page content without losing private notes or duplicating root-level artwork", () => {
    const legacy = { ...blankDesign({ w: 800, h: 600 }), notes: "Private legacy notes", els: fixture().pages[0].els };
    const resized = resizeArtwork(legacy, { w: 400, h: 300 });
    expect(isDesignLibrary([resized])).toBe(true); expect(resized).not.toHaveProperty("els"); expect(resized).not.toHaveProperty("bg");
    expect(designPages(resized)[0].notes).toBe("Private legacy notes");
  });
  it("deduplicates equal output sizes while rejecting every invalid or out-of-budget target", () => {
    expect(uniqueResizeTargets([{ w: 500, h: 500 }, { w: 800, h: 600 }, { w: 500, h: 500 }])).toEqual([{ w: 500, h: 500 }, { w: 800, h: 600 }]);
    for (const size of [{ w: 39, h: 40 }, { w: 8001, h: 40 }, { w: 8000, h: 8000 }, { w: Infinity, h: 100 }, { w: 100.5, h: 100 }]) expect(() => uniqueResizeTargets([{ w: 500, h: 500 }, size])).toThrow();
  });
  it("never replaces a document ID or name with preset metadata", () => {
    const source = fixture(), preset = { id: "logo", name: "Preset name", label: "Logo", w: 500, h: 500 };
    expect(uniqueResizeTargets([preset])).toEqual([{ w: 500, h: 500 }]);
    const resized = resizeArtwork(source, preset);
    expect(resized.id).toBe(source.id); expect(resized.name).toBe(source.name); expect(resized).not.toHaveProperty("label");
  });
  it("scales the rendered default font size in valid legacy text", () => {
    const source = fixture(), text = source.pages[0].els[1];
    delete text.fontSize;
    expect(isDesignLibrary([source])).toBe(true);
    const resized = resizeArtwork(source, { w: 1600, h: 1200 });
    expect(designPages(resized)[0].els[1]).toMatchObject({ x: 640, y: 200, w: 600, fontSize: 64 });
    expect(text).not.toHaveProperty("fontSize");
  });
  it("prepares one clearly named editable copy input per unique size without changing the source", () => {
    const source = fixture(), before = structuredClone(source), copies = resizedCopyInputs(source, [{ w: 500, h: 500 }, { w: 1080, h: 1920 }, { w: 500, h: 500 }], ["second"]);
    expect(copies.map(d => d.name)).toEqual(["Artwork (500 × 500 px)", "Artwork (1080 × 1920 px)"]);
    expect(copies.every(d => designPages(d).length === 1 && designPages(d)[0].notes === "Second notes")).toBe(true);
    expect(source).toEqual(before); expect(() => resizedCopyInputs(source, [], ["first"])).toThrow("Choose at least one size");
  });
});
