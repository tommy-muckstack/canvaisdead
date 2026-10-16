import { afterEach, describe, expect, it, vi } from "vitest";
import type { El } from "@/lib/design/types";
import { addEl, blankDesign, commit, elHeight, graphemes, hist, makeEl, patchEl, redo, reflowTextElement, resizeElement, rotatePoint, textLayout, toSVG, undo, type Measure } from "@/lib/design/ops";
import { renderToCanvas } from "@/lib/design/render";
import { selectionBounds } from "@/lib/design/selection";
import { serializeDesignBackup, parseDesignBackup, importDesignCopies } from "@/lib/design/backup";
import { designBackupBlob, readDesignBackup } from "@/lib/design/backup-file";
import { readDesignRecords } from "@/lib/design/record-file";
import { clipboardFormats, parseElementClipboard, selectionClipboard, richClipboard, pasteElements } from "@/lib/design/clipboard";
import { isDesignLibrary } from "@/lib/design/validate";

const measure: Measure = (text, size, _family, _weight, _italic, spacing = 0) => graphemes(text).length * size * (.5 + spacing);
const design = () => blankDesign({ w: 800, h: 600 });
const fixture = (over: Partial<El> = {}) => makeEl("text", design(), { id: "list", text: "one two three\nfour\n\nfive", x: 100, y: 80, w: 100, fontSize: 20, fontWeight: 400, lineHeight: 1.5, ...over });
afterEach(() => vi.unstubAllGlobals());

describe("list text layout", () => {
  it("uses hanging indents and one marker per paragraph, including blank items", () => {
    const e = fixture({ listStyle: "bullet" }), source = structuredClone(e), layout = textLayout(e, measure);
    expect(layout.indent).toBe(24); expect(layout.lines.map(line => line.text)).toEqual(["one two ", "three", "four", "", "five"]);
    expect(layout.lines.map(line => line.marker?.text)).toEqual(["•", undefined, "•", "•", "•"]);
    expect(layout.lines.every(line => line.x === 124)).toBe(true); expect(layout.lines[0].marker?.x).toBe(116);
    expect(elHeight(e, measure)).toBe(150); expect(selectionBounds([e], measure)?.h).toBe(150); expect(e).toEqual(source);
  });
  it("reserves a shared gutter for multi-digit counters and numbers paragraphs rather than wrapped lines", () => {
    const e = fixture({ listStyle: "number", text: Array.from({ length: 12 }, () => "abcdefghi").join("\r\n"), w: 80 }), layout = textLayout(e, measure);
    expect(layout.indent).toBe(38); expect(layout.lines.filter(line => line.marker).map(line => line.marker!.text)).toEqual(Array.from({ length: 12 }, (_, i) => `${i + 1}.`));
    expect(layout.lines.every(line => line.x === 138)).toBe(true); expect(layout.lines).toHaveLength(36);
  });
  it("preserves graphemes and source whitespace at narrow widths, with tracked/italic metrics", () => {
    const seen = vi.fn(measure), e = fixture({ listStyle: "bullet", w: 1, text: "👩🏽‍💻e\u0301\n", italic: true, letterSpacingEm: .2 });
    const layout = textLayout(e, seen); expect(layout.lines.map(line => line.text)).toEqual(["👩🏽‍💻", "e\u0301", ""]);
    expect(layout.lines.filter(line => line.marker)).toHaveLength(2);
    expect(seen.mock.calls.some(call => call[4] === true && call[5] === .2)).toBe(true);
    expect(seen.mock.calls.some(call => call[0] === "•" && call[5] === 0)).toBe(true);
  });
  it("keeps rotated text anchors and opposite side-handle anchors through list reflow", () => {
    const anchor = (e: El, x = .5, y = 1) => rotatePoint(e.x + e.w * x, e.y + elHeight(e, measure) * y, e.x + e.w / 2, e.y + elHeight(e, measure) / 2, e.rotation);
    for (const rotation of [0, 37, 90, -45]) {
      const e = fixture({ rotation, textAnchor: "end" }), listed = reflowTextElement(e, { listStyle: "number" }, measure);
      expect(anchor(listed).x).toBeCloseTo(anchor(e).x); expect(anchor(listed).y).toBeCloseTo(anchor(e).y);
      const delta = rotatePoint(-30, 0, 0, 0, rotation), resized = { ...listed, ...resizeElement(listed, "e", delta.x, delta.y, false, measure) };
      expect(anchor(resized, 0).x).toBeCloseTo(anchor(listed, 0).x); expect(anchor(resized, 0).y).toBeCloseTo(anchor(listed, 0).y);
    }
  });
  it("retains text, protects locks and avoids history for repeated or invalid list formatting", () => {
    const e = fixture(), d = addEl(design(), e), listed = patchEl(d, e.id, { listStyle: "number" }, measure), h = commit(hist(d), listed);
    expect(h.past).toHaveLength(1); expect(redo(undo(h)).present).toBe(listed); expect(undo(h).present).toBe(d);
    expect(listed.els[0].text).toBe(e.text); expect(patchEl(listed, e.id, { listStyle: "number" }, measure)).toBe(listed);
    expect(patchEl(d, e.id, { listStyle: "invalid" } as unknown as Partial<El>, measure)).toBe(d);
    const locked = { ...d, els: [{ ...e, locked: true }] }; expect(patchEl(locked, e.id, { listStyle: "bullet" }, measure)).toBe(locked);
    const shape = makeEl("rect", d); expect(reflowTextElement(shape, { listStyle: "bullet" }, measure)).toBe(shape);
    expect(patchEl(listed, e.id, { listStyle: undefined }, measure).els[0].text).toBe(e.text);
  });
  it("paints identical marker/body text and coordinates in SVG and raster, without decorating markers", async () => {
    const paints: { text: string; x: number; y: number; align: string; spacing: string }[] = [], strokes: number[] = [];
    const ctx = { font: "", textAlign: "", letterSpacing: "0px", scale() {}, save() {}, restore() {}, fillRect() {}, beginPath() {},
      measureText(text: string) { return { width: graphemes(text).length * (10 + parseFloat(this.letterSpacing)) }; },
      fillText(text: string, x: number, y: number) { paints.push({ text, x, y, align: this.textAlign, spacing: this.letterSpacing }); },
      moveTo() {}, lineTo() {}, stroke() { strokes.push(1); } };
    vi.stubGlobal("document", { createElement: () => ({ getContext: () => ctx }) });
    const e = fixture({ listStyle: "number", text: "Alpha Beta\nGamma", underline: true, letterSpacingEm: .1, align: "center" }), d = addEl(design(), e);
    const svg = toSVG(d, measure); await renderToCanvas(d);
    for (const p of paints) expect(svg).toContain(`x="${p.x}" y="${p.y}"`);
    const markers = paints.filter(p => /\d\./.test(p.text)); expect(markers.map(p => p.text)).toEqual(["1.", "2."]); expect(markers.every(p => p.align === "right" && p.spacing === "0px")).toBe(true);
    expect(strokes).toHaveLength(paints.length - markers.length); expect(svg).toContain('text-anchor="end" letter-spacing="0">1.</tspan>'); expect(svg).toContain('text-decoration="underline">Alpha </tspan>');
  });
});

describe("portable list formatting", () => {
  it("round-trips local records, both backup encodings and independent copies", async () => {
    const d = addEl(design(), fixture({ listStyle: "number" })), raw = serializeDesignBackup([d]);
    expect(JSON.parse(raw).version).toBe(8); expect(parseDesignBackup(raw)).toEqual([d]);
    const blob = designBackupBlob([d]), records = await blob.text(); expect(JSON.parse(records.split("\n")[0]).version).toBe(8);
    expect(await readDesignRecords(blob)).toEqual([d]); expect(await readDesignBackup(blob)).toEqual([d]);
    const copy = importDesignCopies([], [d])[0]; expect("els" in copy && copy.els[0].listStyle).toBe("number"); expect(copy.id).not.toBe(d.id);
    await expect(readDesignRecords(new Blob([records.replace('"version":8', '"version":7')]))).rejects.toThrow("version 8");
    expect(JSON.parse((await designBackupBlob([design()]).text()).split("\n")[0]).version).toBe(7);
  });
  it("keeps list structure in rich clipboard and usable markers in plain text without altering source text", () => {
    const e = fixture({ listStyle: "number", text: "Alpha\nBeta" }), d = addEl(design(), e), packet = selectionClipboard(d, [e.id], "page"), formats = clipboardFormats(packet);
    expect(packet.version).toBe(5); expect(formats.text).toBe("1. Alpha\n2. Beta");
    const pasted = pasteElements(design(), richClipboard({ html: formats.html })!).design.els[0]; expect(pasted.listStyle).toBe("number"); expect(pasted.text).toBe(e.text); expect(pasted.id).not.toBe(e.id);
    expect(clipboardFormats(selectionClipboard({ ...d, els: [{ ...e, listStyle: "bullet" }] }, [e.id], "page")).text).toBe("• Alpha\n• Beta");
    for (const version of [1, 2, 3, 4]) expect(() => parseElementClipboard(JSON.stringify({ ...packet, version }))).toThrow("unsupported");
  });
  it("rejects malformed styles, wrong element kinds and metadata in old backup formats", () => {
    const d = addEl(design(), fixture({ listStyle: "bullet" }));
    for (const version of [1, 2, 3, 4, 5, 6]) expect(() => parseDesignBackup(JSON.stringify({ format: "canvaisdead", version, designs: [d] }))).toThrow("version 8");
    for (const listStyle of [null, "decimal", 1, {}, []]) expect(isDesignLibrary([{ ...d, els: [{ ...d.els[0], listStyle }] }])).toBe(false);
    expect(isDesignLibrary([{ ...d, els: [{ ...d.els[0], type: "rect" }] }])).toBe(false);
  });
});
