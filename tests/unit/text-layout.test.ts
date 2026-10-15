import { afterEach, describe, expect, it, vi } from "vitest";
import { addEl, approxMeasure, blankDesign, makeEl, textHeight, toSVG, wrapText, type Measure } from "@/lib/design/ops";
import { canvasMeasure, renderToCanvas } from "@/lib/design/render";

const segments = new Intl.Segmenter(undefined, { granularity: "grapheme" });
const mono: Measure = text => Array.from(segments.segment(text)).length * 10;
const wrap = (text: string, width: number) => wrapText(text, width, 20, "sans-serif", 400, mono);
afterEach(() => vi.unstubAllGlobals());

describe("preserved text layout", () => {
  it("preserves leading, repeated, trailing and blank-line spaces without changing the source", () => {
    const text = "  A  B  \n   \n\nC  ";
    expect(wrap(text, 1000)).toEqual(["  A  B  ", "   ", "", "C  "]);
    expect(wrap("a\r\nb\rc\n", 1000)).toEqual(["a", "b", "c", ""]);
    expect(wrap("", 1000)).toEqual([""]);
    expect(wrap("\tA\tB", 1000)).toEqual(["\tA\tB"]);
  });

  it("keeps fitting words together and lets preserved spaces hang at soft breaks", () => {
    expect(wrap("one  two three", 80)).toEqual(["one  two ", "three"]);
    expect(wrap("one two", 35)).toEqual(["one ", "two"]);
    expect(wrap("a\u00a0b c", 40)).toEqual(["a\u00a0b ", "c"]);
  });

  it("wraps long unbroken words instead of overflowing every line", () => {
    const text = "abcdefghijk";
    expect(wrap(text, 40)).toEqual(["abcd", "efgh", "ijk"]);
    expect(wrap(text, 0)).toEqual(Array.from(text));
    expect(wrap(text, -10)).toEqual(Array.from(text));
    expect(wrap(text, Infinity)).toEqual([text]);
  });

  it.each(["👩🏽‍💻", "👨‍👩‍👧‍👦", "🇨🇦", "e\u0301", "क्ष"])("keeps the grapheme %s intact", cluster => {
    const text = cluster.repeat(3);
    expect(wrap(text, 10)).toEqual([cluster, cluster, cluster]);
    expect(wrap(cluster, 1)).toEqual([cluster]);
    expect(approxMeasure(cluster, 20, "sans-serif", 400)).toBeCloseTo(10.8);
  });

  it("bounds measurement work for a large pasted token", () => {
    const measure = vi.fn((text: string) => text.length);
    const lines = wrapText("x".repeat(10000), 500, 20, "sans-serif", 400, measure);
    expect(lines).toHaveLength(20);
    expect(lines.every(line => line.length === 500)).toBe(true);
    expect(measure.mock.calls.length).toBeLessThan(1000);
  });

  it("uses italic font metrics for both wrapping and selection height", () => {
    const measure: Measure = (text, _size, _family, _weight, italic) => text.length * (italic ? 20 : 10);
    const design = blankDesign({ w: 400, h: 300 });
    const element = makeEl("text", design, { text: "abcdef", w: 60, fontSize: 20, lineHeight: 1.5 });
    expect(textHeight(element, measure)).toBe(30);
    expect(textHeight({ ...element, italic: true }, measure)).toBe(60);
    const svg = toSVG(addEl(design, { ...element, italic: true }), measure);
    expect(svg.match(/<tspan /g)).toHaveLength(2);
    expect(svg).toContain(">abc</tspan>");
    expect(svg).toContain(">def</tspan>");
  });

  it("exports SVG with preserved spaces and uses the same lines in raster output", async () => {
    const paints: string[] = [];
    const ctx = {
      font: "", fillStyle: "", textAlign: "", textBaseline: "", globalAlpha: 1,
      scale() {}, save() {}, restore() {}, fillRect() {}, beginPath() {},
      measureText(text: string) { return { width: mono(text, 20, "sans-serif", 400) }; },
      fillText(text: string) { paints.push(text); },
    };
    vi.stubGlobal("document", { createElement: () => ({ getContext: () => ctx }), fonts: { ready: Promise.resolve() } });
    const design = blankDesign({ w: 400, h: 300 });
    const element = makeEl("text", design, { text: "  A  B  \nabcdefghijk\n\nC  ", w: 80, fontSize: 20 });
    const document = addEl(design, element);
    const svg = toSVG(document, mono);
    expect(svg).toContain('xml:space="preserve" style="white-space:pre"');
    expect(svg).toContain(">  A  B  </tspan>");
    await renderToCanvas(document);
    expect(paints).toEqual(["  A  B  ", "abcdefgh", "ijk", "", "C  "]);
    expect(svg.match(/<tspan /g)).toHaveLength(paints.length);
  });

  it("sets the full font when measuring italic text and clears it for normal text", () => {
    const ctx = { font: "", measureText: vi.fn(() => ({ width: 50 })) };
    const measure = canvasMeasure(ctx as unknown as CanvasRenderingContext2D);
    measure("abc", 20, "Georgia", 700, true);
    expect(ctx.font).toBe("italic 700 20px Georgia");
    measure("abc", 20, "Georgia", 700);
    expect(ctx.font).toBe("700 20px Georgia");
  });
});
