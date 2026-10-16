import { afterEach, describe, expect, it, vi } from "vitest";
import { addEl, blankDesign, commit, elHeight, hist, makeEl, patchEl, redo, rotatePoint, textLayout, toSVG, undo, type Measure } from "@/lib/design/ops";
import { curvedTextGeometry, validTextCurve } from "@/lib/design/text-curve";
import { defaultTextEffect, TEXT_EFFECTS } from "@/lib/design/text-effects";
import { drawCurvedText } from "@/lib/design/text-curve-raster";
import { isDesignLibrary } from "@/lib/design/validate";
import { designBackupBlob, readDesignBackup } from "@/lib/design/backup-file";
import { readDesignRecords } from "@/lib/design/record-file";
import { parseDesignBackup, serializeDesignBackup } from "@/lib/design/backup";
import { parseElementClipboard, pasteElements, selectionClipboard } from "@/lib/design/clipboard";
import type { El } from "@/lib/design/types";

const measure: Measure = (text, size, _f, _w, _i, spacing = 0) => Array.from(text).length * size * (.5 + spacing);
const page = () => blankDesign({ w: 800, h: 600 });
const element = (extra: Partial<El> = {}) => makeEl("text", page(), { id: "curve", text: "Curious fi é 👨‍👩‍👧", x: 100, y: 100, w: 500, fontSize: 40, ...extra });
afterEach(() => vi.unstubAllGlobals());

describe("curved text geometry and editing", () => {
  it.each([-100, -50, -1, 1, 50, 100])("keeps %s text shaped as complete runs with finite paths and scalable geometry", textCurve => {
    const e = element({ textCurve }), layout = textLayout(e, measure), geometry = curvedTextGeometry(e, layout.lines, measure);
    expect(geometry.lines.map(l => l.text).join("\n")).toBe(e.text); expect(geometry.height).toBeGreaterThan(0);
    expect(geometry.lines.every(l => !/NaN|Infinity/.test(l.path))).toBe(true);
    const doubled = { ...e, x: e.x * 2, y: e.y * 2, w: e.w * 2, fontSize: 80 };
    expect(elHeight(doubled, measure)).toBeCloseTo(elHeight(e, measure) * 2);
    const svg = toSVG(addEl(page(), e), measure); expect(svg).toContain("<textPath"); expect(svg).toContain(e.text); expect(svg).not.toContain("url(");
  });
  it("preserves the rotated text anchor and undo history, including returning to straight text", () => {
    const e = element({ rotation: 37, textAnchor: "end" }), d = addEl(page(), e);
    const anchor = (value: El) => { const h = elHeight(value, measure); return rotatePoint(value.x + value.w / 2, value.y + h, value.x + value.w / 2, value.y + h / 2, value.rotation); };
    const next = patchEl(d, e.id, { textCurve: 50 }, measure); expect(anchor(next.els[0]).x).toBeCloseTo(anchor(e).x); expect(anchor(next.els[0]).y).toBeCloseTo(anchor(e).y);
    expect(next.els[0].text).toBe(e.text); expect(next.els[0].w).toBe(e.w); expect(patchEl(next, e.id, { textCurve: 50 }, measure)).toBe(next);
    const h = commit(hist(d), next); expect(undo(h).present).toEqual(d); expect(redo(undo(h)).present).toEqual(next);
    for (const textCurve of [0, Number.MIN_VALUE, -Number.MIN_VALUE]) expect(toSVG(addEl(page(), { ...e, textCurve }), measure)).toBe(toSVG(d, measure));
    expect(patchEl(next, e.id, { textCurve: undefined }, measure).els[0].textCurve).toBeUndefined();
  });
  it("supports existing styles, independent definition references and multiline/list text", () => {
    for (const kind of TEXT_EFFECTS) {
      const e = element({ text: "One\nTwo", listStyle: "number", textCurve: -50, textEffect: defaultTextEffect(kind) }), svg = toSVG(addEl(page(), e), measure);
      expect(svg).toContain(`data-text-effect="${kind}"`); expect(svg).toContain("1. One"); expect(svg).toContain("2. Two");
      const ids = Array.from(svg.matchAll(/ id="([^"]+)"/g), m => m[1]); expect(new Set(ids).size).toBe(ids.length);
      for (const href of svg.matchAll(/href="#([^"]+)"/g)) expect(ids).toContain(href[1]);
    }
  });
  it("rejects invalid and nontext curve metadata and respects locks", () => {
    const e = element(), d = addEl(page(), e);
    for (const value of [-101, 101, NaN, Infinity, "50", {}, null]) {
      expect(validTextCurve(value)).toBe(false); expect(isDesignLibrary([{ ...d, els: [{ ...e, textCurve: value }] }])).toBe(false);
      expect(patchEl(d, e.id, { textCurve: value } as Partial<El>, measure)).toBe(d);
    }
    const locked = { ...d, els: [{ ...e, locked: true }] }; expect(patchEl(locked, e.id, { textCurve: 50 }, measure)).toBe(locked);
    const shape = makeEl("rect", d), shapes = addEl(page(), shape); expect(patchEl(shapes, shape.id, { textCurve: 50 }, measure)).toBe(shapes);
  });
});

it("requires backup 10 and clipboard 7, retaining curves and styles in independent copies", async () => {
  const e = element({ textCurve: 0, textEffect: defaultTextEffect("outline") }), d = addEl(page(), e), json = serializeDesignBackup([d]);
  expect(JSON.parse(json).version).toBe(10); expect(parseDesignBackup(json)).toEqual([d]);
  const blob = designBackupBlob([d]), raw = await blob.text(); expect(await readDesignBackup(blob)).toEqual([d]);
  for (const version of [7, 8, 9]) await expect(readDesignRecords(new Blob([raw.replace('"version":10', `"version":${version}`)]))).rejects.toThrow("version");
  for (const version of [1, 2, 3, 4, 5, 6, 8, 9]) expect(() => parseDesignBackup(JSON.stringify({ format: "canvaisdead", version, designs: [d] }))).toThrow("version 10");
  const packet = selectionClipboard(d, [e.id], "page"); expect(packet.version).toBe(7);
  for (const version of [1, 2, 3, 4, 5, 6]) expect(() => parseElementClipboard(JSON.stringify({ ...packet, version }))).toThrow("unsupported");
  const copied = pasteElements(page(), packet).design.els[0]; expect(copied.textCurve).toBe(0); expect(copied.textEffect).toEqual(e.textEffect); expect(copied.textEffect).not.toBe(e.textEffect); expect(copied.id).not.toBe(e.id);
});

it("retries a failed bundled-font load and releases raster URLs on success and failure", async () => {
  const fetch = vi.fn().mockResolvedValueOnce({ ok: false }).mockResolvedValue({ ok: true, arrayBuffer: async () => new Uint8Array([119, 79, 70, 50]).buffer });
  vi.stubGlobal("fetch", fetch); const revoked: string[] = [], blobs: Blob[] = []; let fail = false;
  vi.stubGlobal("URL", { createObjectURL: (blob: Blob) => { blobs.push(blob); return "blob:curve"; }, revokeObjectURL: (url: string) => revoked.push(url) });
  vi.stubGlobal("Image", class { onload?: () => void; onerror?: () => void; set src(_value: string) { queueMicrotask(() => fail ? this.onerror?.() : this.onload?.()); } });
  const ctx = { save: vi.fn(), restore: vi.fn(), setTransform: vi.fn(), drawImage: vi.fn() } as unknown as CanvasRenderingContext2D, e = element({ textCurve: 50 });
  await expect(drawCurvedText(ctx, e, 1, 800, 600, measure)).rejects.toThrow("bundled font"); expect(blobs).toHaveLength(0);
  await drawCurvedText(ctx, e, 1, 800, 600, measure); expect(ctx.drawImage).toHaveBeenCalledOnce(); expect(revoked).toEqual(["blob:curve"]);
  expect(await blobs[0].text()).toContain("data:font/woff2;base64,"); expect(await blobs[0].text()).toContain("<textPath");
  fail = true; await expect(drawCurvedText(ctx, e, 1, 800, 600, measure)).rejects.toThrow("could not render"); expect(revoked).toHaveLength(2); expect(fetch).toHaveBeenCalledTimes(2);
});
