import { describe, it, expect } from "vitest";
import { blankDesign, makeEl, addEl, patchEl, removeEls, duplicateEl, reorder, alignEl, hitTest, snapMove, resizeBox, hist, commit, undo, redo, toSVG, wrapText, approxMeasure, resizeCanvas, SIZES } from "@/lib/design/ops";
import { TEMPLATES, fromTemplate } from "@/lib/design/templates";
const sq = SIZES[0];
describe("design ops", () => {
  it("adds, patches, removes, duplicates", () => {
    let d = blankDesign(sq); const e = makeEl("rect", d); d = addEl(d, e); expect(d.els).toHaveLength(1);
    d = patchEl(d, e.id, { fill: "#fff" }); expect(d.els[0].fill).toBe("#fff");
    const r = duplicateEl(d, e.id); expect(r.design.els).toHaveLength(2); expect(r.design.els[1].x).toBe(e.x + 24);
    expect(removeEls(r.design, [e.id]).els).toHaveLength(1);
  });
  it("centers new elements", () => { const d = blankDesign(sq); const e = makeEl("rect", d, { w: 100, h: 100 }); expect(e.x).toBe(490); expect(e.y).toBe(490); });
  it("reorders layers", () => {
    let d = blankDesign(sq); const a = makeEl("rect", d), b = makeEl("ellipse", d), c = makeEl("star", d); d = addEl(addEl(addEl(d, a), b), c);
    expect(reorder(d, a.id, "front").els.map(e => e.id)).toEqual([b.id, c.id, a.id]);
    expect(reorder(d, c.id, "back").els.map(e => e.id)).toEqual([c.id, a.id, b.id]);
    expect(reorder(d, b.id, "forward").els.map(e => e.id)).toEqual([a.id, c.id, b.id]);
    expect(reorder(d, b.id, "backward").els.map(e => e.id)).toEqual([b.id, a.id, c.id]);
  });
  it("aligns to the canvas", () => {
    let d = blankDesign(sq); const e = makeEl("rect", d, { w: 100, h: 50, x: 300, y: 300 }); d = addEl(d, e);
    expect(alignEl(d, e.id, "right").els[0].x).toBe(980); expect(alignEl(d, e.id, "bottom").els[0].y).toBe(1030); expect(alignEl(d, e.id, "left").els[0].x).toBe(0);
  });
  it("hit-tests top-most first and respects rotation", () => {
    let d = blankDesign(sq); const a = makeEl("rect", d, { x: 100, y: 100, w: 200, h: 200 }), b = makeEl("rect", d, { x: 150, y: 150, w: 200, h: 200 }); d = addEl(addEl(d, a), b);
    expect(hitTest(d, 200, 200)?.id).toBe(b.id); expect(hitTest(d, 120, 120)?.id).toBe(a.id); expect(hitTest(d, 900, 900)).toBeNull();
    const t = makeEl("rect", d, { x: 600, y: 600, w: 200, h: 20, rotation: 90 }); d = addEl(d, t); expect(hitTest(d, 700, 700 - 80)?.id).toBe(t.id);
  });
  it("snaps to canvas center and neighbours", () => {
    const d = blankDesign(sq); const s = snapMove(d, { x: 437, y: 100, w: 200, h: 200 }, "none"); expect(s.x).toBe(440); expect(s.guides.x).toContain(540);
    const e = makeEl("rect", d, { x: 100, y: 700, w: 100, h: 100 }); const d2 = addEl(d, e); const s2 = snapMove(d2, { x: 400, y: 703, w: 50, h: 50 }, "none"); expect(s2.y).toBe(700);
  });
  it("resizes from handles with a minimum and ratio lock", () => {
    const r = { x: 100, y: 100, w: 200, h: 100 };
    expect(resizeBox(r, "se", 50, 20)).toEqual({ x: 100, y: 100, w: 250, h: 120 }); expect(resizeBox(r, "nw", 30, 10)).toEqual({ x: 130, y: 110, w: 170, h: 90 });
    expect(resizeBox(r, "se", -500, -500).w).toBe(8); expect(resizeBox(r, "se", 100, 0, true)).toEqual({ x: 100, y: 100, w: 300, h: 150 });
  });
  it("undo/redo", () => {
    let d = blankDesign(sq); let h = hist(d); const e = makeEl("rect", d);
    h = commit(h, addEl(h.present, e)); h = commit(h, patchEl(h.present, e.id, { x: 5 })); expect(h.present.els[0].x).toBe(5);
    h = undo(h); expect(h.present.els[0].x).toBe(e.x); h = undo(h); expect(h.present.els).toHaveLength(0); h = redo(h); expect(h.present.els).toHaveLength(1);
    h = commit(h, addEl(h.present, makeEl("star", d))); expect(h.future).toHaveLength(0);
  });
  it("wraps text", () => { expect(wrapText("one two three four", 100, 20, "x", 400, approxMeasure).length).toBeGreaterThan(1); expect(wrapText("a\n\nb", 999, 20, "x", 400, approxMeasure)).toEqual(["a", "", "b"]); });
  it("resizes the canvas and scales content", () => {
    let d = blankDesign(sq); d = addEl(d, makeEl("rect", d, { x: 0, y: 0, w: 540, h: 540 })); const r = resizeCanvas(d, 1920, 1080); expect(r.w).toBe(1920); expect(r.els[0].w).toBe(Math.round(540 * 1080 / 1080)); expect(r.els[0].x).toBe(0);
  });
  it("exports every template to well-formed SVG", () => {
    for (const t of TEMPLATES) { const d = fromTemplate(t); const svg = toSVG(d); expect(svg.startsWith("<svg")).toBe(true); expect(svg.endsWith("</svg>")).toBe(true); expect(d.els.length).toBeGreaterThan(2); expect((svg.match(/</g) ?? []).length).toBe((svg.match(/>/g) ?? []).length); }
  });
  it("escapes text in SVG", () => { let d = blankDesign(sq); d = addEl(d, makeEl("text", d, { text: "a < b & \"c\"" })); const svg = toSVG(d); expect(svg).toContain("a &lt; b &amp; &quot;c&quot;"); });
});
