import { afterEach, describe, expect, it, vi } from "vitest";
import type { El } from "@/lib/design/types";
import { addEl, approxMeasure, blankDesign, commit, elHeight, graphemes, hist, makeEl, patchEl, redo, reflowTextElement, resizeElement, rotatePoint, toSVG, undo, wrapText, type Measure } from "@/lib/design/ops";
import { letterSpacingPixels, textAnchorFraction } from "@/lib/design/text-spacing";
import { canvasMeasure, renderToCanvas } from "@/lib/design/render";
import { selectionBounds, resizeSelection } from "@/lib/design/selection";
import { copyElements, groupElements } from "@/lib/design/groups";
import { designPages, duplicatePage, pageCanvas } from "@/lib/design/pages";
import { importDesignCopies, parseDesignBackup, serializeDesignBackup } from "@/lib/design/backup";
import { clipboardFormats, parseElementClipboard, pasteElements, richClipboard, selectionClipboard } from "@/lib/design/clipboard";
import { isDesignLibrary } from "@/lib/design/validate";
import { createLocalStore } from "@/lib/local-store";

const measure: Measure = (text, size, _family, weight, italic, spacing = 0) => graphemes(text).length * size * (.5 + (weight >= 700 ? .1 : 0) + (italic ? .1 : 0) + spacing);
const design = () => blankDesign({ w: 800, h: 600 });
const fixture = (over: Partial<El> = {}) => makeEl("text", design(), { id: "text", text: "abcdefgh", x: 100, y: 80, w: 80, fontSize: 20, fontWeight: 400, lineHeight: 1.2, ...over });
function at(e: El, x = .5, y = textAnchorFraction(e)) { const h = elHeight(e, measure); return rotatePoint(e.x + e.w * x, e.y + h * y, e.x + e.w / 2, e.y + h / 2, e.rotation); }
const near = (a: { x: number; y: number }, b: { x: number; y: number }) => { expect(a.x).toBeCloseTo(b.x, 7); expect(a.y).toBeCloseTo(b.y, 7); };
afterEach(() => vi.unstubAllGlobals());

describe("text tracking and line layout", () => {
  it("uses tracking in wrapping, line height and selection bounds, including negative spacing", () => {
    const e = fixture();
    expect(elHeight(e, measure)).toBe(24);
    const spaced = { ...e, letterSpacingEm: .25, lineHeight: 2 };
    expect(wrapText(e.text!, e.w, 20, "", 400, measure, false, .25)).toEqual(["abcde", "fgh"]);
    expect(elHeight(spaced, measure)).toBe(80); expect(selectionBounds([spaced], measure)?.h).toBe(80);
    expect(wrapText(e.text!, 50, 20, "", 400, measure, false, -.2)).toEqual([e.text]);
    expect(letterSpacingPixels(spaced)).toBe(5);
  });
  it("retains grapheme clusters, spaces and explicit blank lines when tracking changes", () => {
    for (const cluster of ["👩🏽‍💻", "e\u0301", "क्ष", "🇨🇦"]) {
      expect(wrapText(cluster.repeat(3), 15, 20, "", 400, measure, false, .25)).toEqual([cluster, cluster, cluster]);
      expect(approxMeasure(cluster, 20, "", 400, false, .25)).toBeCloseTo(15.8);
    }
    expect(wrapText("  A  B  \n\nC", 1000, 20, "", 400, measure, false, .8)).toEqual(["  A  B  ", "", "C"]);
  });
  it("uses native spacing metrics and clears tracking between elements", () => {
    const ctx = { font: "", letterSpacing: "0px", measureText: vi.fn(function (this: { letterSpacing: string }, text: string) { return { width: graphemes(text).length * (10 + parseFloat(this.letterSpacing)) }; }) };
    const m = canvasMeasure(ctx as unknown as CanvasRenderingContext2D);
    expect(m("AB", 20, "Georgia", 700, true, .25)).toBe(30); expect(ctx.letterSpacing).toBe("5px"); expect(ctx.font).toBe("italic 700 20px Georgia");
    expect(m("AB", 20, "Georgia", 400)).toBe(20); expect(ctx.letterSpacing).toBe("0px");
    const old = { font: "", measureText: () => ({ width: 10 }) };
    expect(canvasMeasure(old as unknown as CanvasRenderingContext2D)("👩🏽‍💻", 20, "", 400, false, .25)).toBe(15);
  });
});

describe("anchored text edits", () => {
  it("holds the selected anchor fixed when content or font metrics reflow at any angle", () => {
    const patches: Partial<El>[] = [{ text: "one two three four" }, { lineHeight: 2 }, { letterSpacingEm: .8 }, { w: 50 }, { fontSize: 40 }, { fontWeight: 700 }, { italic: true }];
    for (const rotation of [0, 37, 90, 180, -45]) for (const textAnchor of ["start", "middle", "end"] as const) for (const patch of patches) {
      const original = fixture({ rotation, textAnchor, groupPath: ["g"] }), before = structuredClone(original), next = reflowTextElement(original, patch, measure);
      near(at(next), at(original)); expect(original).toEqual(before); expect(next.groupPath).toEqual(["g"]);
    }
  });
  it("changes anchor without moving artwork and preserves legacy start anchoring", () => {
    const e = fixture({ rotation: 30 }), anchored = reflowTextElement(e, { textAnchor: "end" }, measure);
    expect(anchored.x).toBe(e.x); expect(anchored.y).toBe(e.y);
    near(at(reflowTextElement(e, { text: "a\nb\nc" }, measure)), at(e));
    const moved = reflowTextElement(anchored, { x: 30, y: 50, fontSize: 40 }, measure); expect(moved).toMatchObject({ x: 30, y: 50 });
  });
  it("preserves side-handle anchors and opposite corners while resizing tracked text", () => {
    for (const rotation of [0, 37, 90, -45]) for (const textAnchor of ["start", "middle", "end"] as const) {
      const e = fixture({ textAnchor, rotation, letterSpacingEm: .2, w: 180, text: "one two three four" });
      for (const handle of ["w", "e"] as const) {
        const delta = rotatePoint(handle === "w" ? 70 : -70, 0, 0, 0, rotation), next = { ...e, ...resizeElement(e, handle, delta.x, delta.y, false, measure) };
        near(at(next, handle === "w" ? 1 : 0), at(e, handle === "w" ? 1 : 0)); expect(elHeight(next, measure)).toBeGreaterThan(elHeight(e, measure));
      }
      const delta = rotatePoint(100, 100, 0, 0, rotation), next = { ...e, ...resizeElement(e, "se", delta.x, delta.y, false, measure) };
      near(at(next, 0, 0), at(e, 0, 0)); expect(letterSpacingPixels(next) / letterSpacingPixels(e)).toBeCloseTo(next.fontSize! / e.fontSize!);
    }
  });
  it("protects locks, invalid values and no-op history", () => {
    const e = fixture(), d = addEl(design(), e);
    for (const patch of [{ letterSpacingEm: NaN }, { letterSpacingEm: -.201 }, { letterSpacingEm: .801 }, { lineHeight: 0 }, { textAnchor: "bad" } as unknown as Partial<El>]) expect(patchEl(d, e.id, patch, measure)).toBe(d);
    expect(patchEl(d, e.id, { lineHeight: e.lineHeight }, measure)).toBe(d);
    const locked = { ...d, els: [{ ...e, locked: true }] }; expect(patchEl(locked, e.id, { letterSpacingEm: .2 }, measure)).toBe(locked);
    const shape = makeEl("rect", d); expect(reflowTextElement(shape, { textAnchor: "end" })).toBe(shape);
  });
});

describe("portable spacing and renderer consistency", () => {
  it("retains anchors and tracking in undo, local reload, backups and independent grouped copies", () => {
    let d = addEl(addEl(design(), fixture()), makeEl("rect", design(), { id: "shape" })); d = groupElements(d, ["text", "shape"], null, "group");
    const next = patchEl(d, "text", { letterSpacingEm: .25, lineHeight: 2, textAnchor: "end" }, measure), history = commit(hist(d), next);
    expect(history.past).toHaveLength(1); expect(undo(history).present).toBe(d); expect(redo(undo(history)).present).toBe(next);
    const memory = new Map<string, string>(), access = () => ({ getItem: (key: string) => memory.get(key) ?? null, setItem: (key: string, value: string) => { memory.set(key, value); } });
    const store = createLocalStore("spacing", [], access, isDesignLibrary); store.load(); expect(store.set([next])).toBe(true);
    const reopened = createLocalStore("spacing", [], access, isDesignLibrary); expect(reopened.load()).toBe(true); expect(reopened.getSnapshot().value).toEqual([next]);
    const raw = serializeDesignBackup([next]); expect(JSON.parse(raw).version).toBe(5); expect(parseDesignBackup(raw)).toEqual([next]);
    const packet = selectionClipboard(next, ["text", "shape"], designPages(next)[0].id); expect(packet.version).toBe(3);
    const pasted = pasteElements(design(), richClipboard({ html: clipboardFormats(packet).html })!).design;
    const copies = [pasted, pageCanvas(duplicatePage(next, designPages(next)[0].id, "copy"), "copy"), pageCanvas(importDesignCopies([], [next])[0])];
    for (const copy of copies) expect(copy.els[0]).toMatchObject({ letterSpacingEm: .25, lineHeight: 2, textAnchor: "end" });
    const independent = copyElements(next.els); independent[0].letterSpacingEm = -.1; expect(next.els[0].letterSpacingEm).toBe(.25);
    const scaled = resizeSelection(next, ["text", "shape"], "se", 100, 100, measure); expect(scaled.els[0].letterSpacingEm).toBe(.25); expect(scaled.els[0].fontSize).toBeGreaterThan(next.els[0].fontSize!);
  });
  it("rejects malformed/new metadata on old formats, while older unformatted data remains supported", () => {
    const d = addEl(design(), fixture({ letterSpacingEm: .2, textAnchor: "middle" }));
    for (const version of [1, 2, 3, 4]) expect(() => parseDesignBackup(JSON.stringify({ format: "canvaisdead", version, designs: [d] }))).toThrow("version 5");
    const packet = selectionClipboard(d, ["text"], "page");
    for (const version of [1, 2]) expect(() => parseElementClipboard(JSON.stringify({ ...packet, version }))).toThrow("unsupported");
    for (const patch of [{ letterSpacingEm: null }, { letterSpacingEm: "0.2" }, { letterSpacingEm: 1 }, { textAnchor: "bottom" }, { type: "rect" }]) expect(isDesignLibrary([{ ...d, els: [{ ...d.els[0], ...patch }] }])).toBe(false);
    const old = addEl(design(), fixture()); expect(JSON.parse(serializeDesignBackup([old])).version).toBe(2);
    for (const version of [1, 2, 3, 4, 5]) expect(parseDesignBackup(JSON.stringify({ format: "canvaisdead", version, designs: [old] }))).toEqual([old]);
  });
  it("renders the same tracked lines and baselines in SVG and Canvas, including decorations", async () => {
    const paints: { text: string; x: number; y: number; spacing: string }[] = [], strokes: number[][] = []; let start: number[] = [];
    const ctx = { font: "", letterSpacing: "0px", scale() {}, save() {}, restore() {}, fillRect() {}, beginPath() {},
      measureText(text: string) { return { width: graphemes(text).length * (10 + parseFloat(this.letterSpacing)) }; },
      fillText(text: string, x: number, y: number) { paints.push({ text, x, y, spacing: this.letterSpacing }); },
      moveTo(x: number, y: number) { start = [x, y]; }, lineTo(x: number, y: number) { strokes.push([...start, x, y]); }, stroke() {} };
    vi.stubGlobal("document", { createElement: () => ({ getContext: () => ctx }) });
    const e = fixture({ letterSpacingEm: .25, lineHeight: 2, align: "center", underline: true, strikethrough: true }), d = addEl(addEl(design(), e), fixture({ id: "plain", text: "plain" }));
    const svg = toSVG(d, measure); expect(svg).toContain('letter-spacing="5"'); expect(svg.match(/<tspan /g)).toHaveLength(3);
    await renderToCanvas(d); expect(paints.map(p => p.text)).toEqual(["abcde", "fgh", "plain"]);
    expect(paints.map(p => p.spacing)).toEqual(["5px", "5px", "0px"]); expect(paints[1].y - paints[0].y).toBe(40);
    for (const p of paints) expect(svg).toContain(`<tspan x="${p.x}" y="${p.y}">${p.text}</tspan>`);
    expect(strokes[0][2] - strokes[0][0]).toBe(75); expect(strokes[2][2] - strokes[2][0]).toBe(45);
  });
  it("does not silently export unspaced raster text on an older canvas implementation", async () => {
    const ctx = { font: "", scale() {}, save() {}, restore() {}, fillRect() {}, beginPath() {}, measureText() { return { width: 10 }; } }, canvas = { width: 0, height: 0, getContext: () => ctx };
    vi.stubGlobal("document", { createElement: () => canvas });
    await expect(renderToCanvas(addEl(design(), fixture({ letterSpacingEm: .2 })))).rejects.toThrow("Download SVG");
    expect(canvas.width).toBe(0); expect(canvas.height).toBe(0);
  });
});
