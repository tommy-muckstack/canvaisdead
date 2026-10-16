import { afterEach, describe, expect, it, vi } from "vitest";
import { addEl, blankDesign, commit, elHeight, hist, makeEl, patchEl, redo, textLayout, toSVG, undo, type Measure } from "@/lib/design/ops";
import { defaultTextEffect, sameTextEffect, textEffectBackground, textEffectPaints, TEXT_EFFECTS, validTextEffect } from "@/lib/design/text-effects";
import type { El } from "@/lib/design/types";
import { renderToCanvas } from "@/lib/design/render";
import { isDesignLibrary } from "@/lib/design/validate";
import { designBackupBlob, readDesignBackup } from "@/lib/design/backup-file";
import { serializeDesignBackup, parseDesignBackup, importDesignCopies } from "@/lib/design/backup";
import { readDesignRecords } from "@/lib/design/record-file";
import { clipboardFormats, parseElementClipboard, pasteElements, richClipboard, selectionClipboard } from "@/lib/design/clipboard";
import { copyElements, duplicateGroupedElements } from "@/lib/design/groups";

const measure: Measure = (text, size) => Array.from(text).length * size / 2;
const page = () => blankDesign({ w: 800, h: 600 });
const element = (extra: Partial<El> = {}) => makeEl("text", page(), { id: "text", text: "Hello\nEffects", x: 80, y: 90, w: 240, fontSize: 40, fontWeight: 700, fill: "#123456", ...extra });
afterEach(() => vi.unstubAllGlobals());

describe("editable text effects", () => {
  it.each(TEXT_EFFECTS)("keeps %s text, bounds, anchors, history and lock protections", kind => {
    const e = element({ rotation: 37, textAnchor: "end" }), d = addEl(page(), e), f = defaultTextEffect(kind, e.fill);
    expect(validTextEffect(f)).toBe(true); const next = patchEl(d, e.id, { textEffect: f }, measure), h = commit(hist(d), next);
    expect(next.els[0]).toEqual({ ...e, textEffect: f }); expect(elHeight(next.els[0], measure)).toBe(elHeight(e, measure));
    expect(h.past).toHaveLength(1); expect(undo(h).present).toEqual(d); expect(redo(undo(h)).present).toEqual(next);
    expect(patchEl(next, e.id, { textEffect: { ...f } }, measure)).toBe(next);
    const locked = { ...d, els: [{ ...e, locked: true }] }; expect(patchEl(locked, e.id, { textEffect: f }, measure)).toBe(locked);
    expect(patchEl(next, e.id, { textEffect: undefined }, measure).els[0].textEffect).toBeUndefined();
    const shape = makeEl("rect", d), shapes = addEl(page(), shape); expect(patchEl(shapes, shape.id, { textEffect: f }, measure)).toBe(shapes);
    expect(toSVG(next, measure)).toContain(`data-text-effect="${kind}"`); expect(toSVG(next, measure)).toContain("Hello"); expect(toSVG(d, measure)).not.toContain("data-text-effect");
  });
  it("scales effect geometry with font size and uses directional offsets with a foreground layer", () => {
    const e = element({ textEffect: { ...defaultTextEffect("drop"), offset: 100, direction: 90, blur: 75, transparency: 25 } });
    const [shadow, text] = textEffectPaints(e); expect(shadow.dx).toBeCloseTo(0); expect(shadow.dy).toBe(20); expect(shadow.blur).toBe(10); expect(shadow.opacity).toBe(.75); expect(text.fill).toBe(e.fill);
    const scaled = textEffectPaints({ ...e, fontSize: 80 }); expect(scaled[0].dy).toBe(40); expect(scaled[0].blur).toBe(20);
    const hollow = textEffectPaints({ ...e, textEffect: defaultTextEffect("hollow") }); expect(hollow).toHaveLength(1); expect(hollow[0]).toMatchObject({ fill: "none", stroke: e.fill, width: 4 });
    const echo = textEffectPaints({ ...e, textEffect: { ...defaultTextEffect("echo"), direction: 0, offset: 100 } }); expect(echo.map(p => p.dx)).toEqual([60, 40, 20, 0]);
  });
  it("aligns rounded backgrounds to wrapped text and list gutters without mutating layout", () => {
    const e = element({ text: "One\n\nTwo", align: "right", listStyle: "number", textEffect: defaultTextEffect("background") }), layout = textLayout(e, measure), source = structuredClone(layout);
    const rects = textEffectBackground(e, layout.lines, measure); expect(rects).toHaveLength(3);
    expect(rects.every(r => r.x === e.x - 10 && r.r >= 0 && r.r <= r.h / 2)).toBe(true); expect(layout).toEqual(source);
    const svg = toSVG(addEl(page(), e), measure); expect(svg).toContain("<path d="); expect(svg).not.toContain("url("); expect(svg).toContain("1.</tspan>");
  });
  it("rejects invalid parameters, unknown fields and remote paint without corrupting local history", () => {
    const f = defaultTextEffect("drop"), e = element(), d = addEl(page(), e);
    for (const invalid of [null, {}, [], { ...f, kind: "unknown" }, { ...f, color: "url(https://invalid.test/x)" }, { ...f, offset: NaN }, { ...f, blur: -1 }, { ...f, transparency: 101 }, { ...f, direction: 181 }, { ...f, extra: "bad" }]) {
      expect(validTextEffect(invalid)).toBe(false); expect(isDesignLibrary([{ ...d, els: [{ ...e, textEffect: invalid }] }])).toBe(false);
      expect(patchEl(d, e.id, { textEffect: invalid } as Partial<El>)).toBe(d);
    }
    expect(sameTextEffect(f, { ...f })).toBe(true); expect(sameTextEffect(f, { ...f, blur: 1 })).toBe(false);
  });
});

describe("portable text effects", () => {
  it("requires version 9 for both backup encodings and retains independent effect copies", async () => {
    const e = element({ textEffect: defaultTextEffect("glow"), listStyle: "bullet" }), d = addEl(page(), e), json = serializeDesignBackup([d]);
    expect(JSON.parse(json).version).toBe(9); expect(parseDesignBackup(json)).toEqual([d]);
    const blob = designBackupBlob([d]), records = await blob.text(); expect(JSON.parse(records.split("\n")[0]).version).toBe(9); expect(await readDesignBackup(blob)).toEqual([d]);
    for (const version of [7, 8]) await expect(readDesignRecords(new Blob([records.replace('"version":9', `"version":${version}`)]))).rejects.toThrow("require backup version");
    for (const version of [1, 2, 3, 4, 5, 6, 8]) expect(() => parseDesignBackup(JSON.stringify({ format: "canvaisdead", version, designs: [d] }))).toThrow("version 9");
    const imported = importDesignCopies([], [d])[0]; expect("els" in imported && imported.els[0].textEffect).toEqual(e.textEffect); expect("els" in imported && imported.els[0].textEffect).not.toBe(e.textEffect);
    const copied = copyElements([e])[0]; expect(copied.textEffect).toEqual(e.textEffect); expect(copied.textEffect).not.toBe(e.textEffect);
    const duplicated = duplicateGroupedElements(d, [e.id], () => "copy").design.els.at(-1)!; expect(duplicated.textEffect).not.toBe(e.textEffect);
  });
  it("keeps readable plain text and versioned rich clipboard without transferring unrelated fields", () => {
    const e = element({ textEffect: defaultTextEffect("outline") }), d = addEl(page(), e), packet = selectionClipboard(d, [e.id], "page"), formats = clipboardFormats(packet);
    expect(packet.version).toBe(6); expect(formats.text).toBe(e.text); const copied = pasteElements(page(), richClipboard({ html: formats.html })!).design.els[0];
    expect(copied.textEffect).toEqual(e.textEffect); expect(copied.textEffect).not.toBe(e.textEffect); expect(copied.id).not.toBe(e.id);
    for (const version of [1, 2, 3, 4, 5]) expect(() => parseElementClipboard(JSON.stringify({ ...packet, version }))).toThrow("unsupported");
  });
  it("composites raster blur and opacity once per layer and once per object", async () => {
    const calls: { op: string; text: string; filter: string; width: number; alpha: number }[] = [];
    const canvases: { width: number; height: number }[] = [];
    vi.stubGlobal("document", { createElement: () => {
      const ctx = { font: "", globalAlpha: 1, filter: "none", letterSpacing: "0px", lineWidth: 0, stack: [] as { filter: string; globalAlpha: number }[],
        save() { this.stack.push({ filter: this.filter, globalAlpha: this.globalAlpha }); }, restore() { Object.assign(this, this.stack.pop()); },
        scale() {}, translate() {}, setTransform() {}, clearRect() {}, beginPath() {}, fillRect() {}, measureText(t: string) { return { width: t.length * 20 }; },
        fillText(text: string) { calls.push({ op: "fill", text, filter: this.filter, width: this.lineWidth, alpha: this.globalAlpha }); },
        strokeText(text: string) { calls.push({ op: "stroke", text, filter: this.filter, width: this.lineWidth, alpha: this.globalAlpha }); },
        drawImage() { calls.push({ op: "composite", text: "", filter: this.filter, width: 0, alpha: this.globalAlpha }); } };
      const canvas = { width: 0, height: 0, getContext: () => ctx }; canvases.push(canvas); return canvas;
    } });
    await renderToCanvas(addEl(page(), element({ text: "Ink", opacity: .5, textEffect: defaultTextEffect("hollow") })));
    expect(calls.filter(c => c.op === "stroke")).toEqual([{ op: "stroke", text: "Ink", filter: "none", width: 4, alpha: 1 }]);
    expect(calls.at(-1)).toMatchObject({ op: "composite", alpha: .5 }); expect(canvases.slice(1).every(c => c.width === 0 && c.height === 0)).toBe(true);
    calls.length = 0; await renderToCanvas(addEl(page(), element({ text: "Ink", opacity: .3, textEffect: { ...defaultTextEffect("drop"), blur: 75 } })), 2);
    expect(calls.filter(c => c.op === "composite").map(c => [c.filter, c.alpha])).toEqual([["blur(20px)", .6], ["none", 1], ["none", .3]]);
  });
});
