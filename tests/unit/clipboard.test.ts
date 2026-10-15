import { describe, expect, it, vi } from "vitest";
import { canCutSelection, clipboardFormats, ELEMENT_CLIPBOARD_MIME, MAX_CLIPBOARD_BYTES, MAX_PASTED_TEXT, parseElementClipboard, pasteElements, pasteImages, pasteText, richClipboard, selectionClipboard } from "@/lib/design/clipboard";
import { copySelectionToSystem, readClipboardEvent, readSystemClipboard, writeClipboardEvent, writeSystemClipboard } from "@/lib/design/clipboard-browser";
import { addEl, blankDesign, commit, hist, makeEl, toSVG, undo } from "@/lib/design/ops";
import { groupElements, validGroups } from "@/lib/design/groups";
import { isDesignLibrary } from "@/lib/design/validate";
import { lockSelection, selectionBounds } from "@/lib/design/selection";
import { addPage, designPages, editPage, pageCanvas } from "@/lib/design/pages";
import { parseDesignBackup, serializeDesignBackup } from "@/lib/design/backup";

const pixel = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jN2QAAAAASUVORK5CYII=";
function fixture() {
  let d = blankDesign({ w: 800, h: 600 }, "Do not copy this document name");
  d = addEl(d, makeEl("rect", d, { id: "a", x: 50, y: 80, w: 100, h: 60, rotation: 20 }));
  d = addEl(d, makeEl("text", d, { id: "b", text: 'Café 👩🏽‍💻 <script>alert("x")</script>\nSecond line', fontSize: 30, italic: true, underline: true, x: 200, y: 200 }));
  d = addEl(d, makeEl("image", d, { id: "c", x: 400, y: 100, w: 100, h: 100, src: pixel }));
  return groupElements(groupElements(d, ["a", "b"], null, "inner"), ["a", "b", "c"], null, "outer");
}
const packet = () => selectionClipboard(fixture(), ["a", "b", "c"], "source-page");
const near = (a: number, b: number) => expect(a).toBeCloseTo(b, 8);

describe("portable selected artwork", () => {
  it("copies only selected fields, retaining formatting, Unicode, media, locks and nested groups", () => {
    const d = lockSelection(fixture(), ["c"], true), before = structuredClone(d);
    Object.assign(d.els[0], { unrelatedField: "do-not-transfer" });
    const copy = selectionClipboard(d, ["c", "a", "b", "a", "stale"], "page");
    expect(copy.els.map(e => e.id)).toEqual(["a", "b", "c"]);
    expect(copy.els[1].text).toBe(before.els[1].text); expect(copy.els[2].src).toBe(pixel); expect(copy.els[2].locked).toBe(true);
    expect(copy.els.map(e => e.groupPath)).toEqual(before.els.map(e => e.groupPath));
    expect(JSON.stringify(copy)).not.toContain("Do not copy"); expect(JSON.stringify(copy)).not.toContain("unrelatedField");
    copy.els[0].groupPath![0] = "changed"; expect(d.els[0].groupPath![0]).toBe("outer");
  });
  it("detaches partial groups while preserving complete nested groups", () => {
    const d = fixture();
    expect(selectionClipboard(d, ["a"], "page").els[0].groupPath).toBeUndefined();
    const nested = selectionClipboard(d, ["a", "b"], "page");
    expect(nested.els.map(e => e.groupPath)).toEqual([["inner"], ["inner"]]); expect(validGroups(nested.els)).toBe(true);
    expect(() => selectionClipboard(d, [], "page")).toThrow("Select an element");
  });
  it("round-trips standard HTML/custom formats without executing markup or losing Unicode", () => {
    const p = packet(), formats = clipboardFormats(p);
    expect(formats.text).toBe(p.els[1].text);
    expect(formats.html).not.toContain("<script>"); expect(formats.html).toContain("&lt;script&gt;");
    expect(richClipboard({ json: formats.json })).toEqual(p);
    expect(richClipboard({ html: formats.html + '<img src="https://example.invalid/private.png">' })).toEqual(p);
    expect(richClipboard({ html: "<b>Ordinary external text</b>" })).toBeNull();
    expect(richClipboard({})).toBeNull();
    const shapes = selectionClipboard(fixture(), ["a"], "page");
    expect(clipboardFormats(shapes).text).toBe("1 CanvaIsDead element");
  });
  it("rejects malformed versions, geometry, ancestry, remote media and paint URLs", () => {
    const p = packet();
    const invalid = [null, [], {}, { ...p, version: 3 }, { ...p, w: -1 }, { ...p, source: null }, { ...p, els: [] },
      { ...p, els: p.els.map((e, i) => i === 0 ? { ...e, x: null } : e) },
      { ...p, els: p.els.map((e, i) => i === 0 ? { ...e, groupPath: ["outer", "outer"] } : e) },
      { ...p, els: p.els.map((e, i) => i === 2 ? { ...e, src: "https://example.invalid/image.png" } : e) },
      { ...p, els: p.els.map(e => ({ ...e, fill: "url(https://example.invalid/paint.svg)" })) },
    ];
    for (const value of invalid) expect(() => parseElementClipboard(JSON.stringify(value))).toThrow("invalid or unsupported");
    expect(() => richClipboard({ json: "{", html: clipboardFormats(p).html })).toThrow();
    for (const html of ['<div data-canvaisdead-clipboard="%%%">', '<div data-canvaisdead-clipboard="e30=">']) expect(() => richClipboard({ html })).toThrow();
    expect(() => parseElementClipboard("x".repeat(MAX_CLIPBOARD_BYTES + 1))).toThrow("50 MB");
  });
});

describe("paste placement and history", () => {
  it("pastes same-sized pages at source coordinates and repeated pastes at explicit offsets", () => {
    const p = packet(), d = blankDesign({ w: p.w, h: p.h }), before = structuredClone(p);
    const first = pasteElements(d, p), second = pasteElements(first.design, p, { step: 1 });
    expect(first.design.els.map(e => [e.x, e.y])).toEqual(p.els.map(e => [e.x, e.y]));
    expect(second.design.els.slice(3).map(e => [e.x, e.y])).toEqual(p.els.map(e => [e.x + 24, e.y + 24]));
    expect(new Set(second.design.els.map(e => e.id)).size).toBe(6);
    expect(first.design.els[0].groupPath).not.toEqual(second.design.els[3].groupPath);
    expect(second.design.els[3].groupPath?.length).toBe(2); expect(validGroups(second.design.els)).toBe(true);
    expect(p).toEqual(before); expect(d.els).toEqual([]);
  });
  it("centers artwork on different-sized canvases or at a requested point without scaling", () => {
    const p = packet(), d = blankDesign({ w: 1200, h: 1800 });
    for (const at of [undefined, { x: 99, y: 211 }]) {
      const next = pasteElements(d, p, { at }), bounds = selectionBounds(next.design.els)!;
      near(bounds.x + bounds.w / 2, at?.x ?? d.w / 2); near(bounds.y + bounds.h / 2, at?.y ?? d.h / 2);
      expect(next.design.els.map(e => [e.w, e.h, e.rotation])).toEqual(p.els.map(e => [e.w, e.h, e.rotation]));
    }
  });
  it("offsets repeated centered pastes while keeping explicit pointer placement exact", () => {
    const p = packet(), d = blankDesign({ w: 1200, h: 1800 });
    const first = pasteElements(d, p), second = pasteElements(first.design, p, { step: 1 });
    const copies = second.design.els.slice(first.design.els.length);
    copies.forEach((element, i) => { near(element.x, first.design.els[i].x + 24); near(element.y, first.design.els[i].y + 24); });
    const explicit = pasteElements(d, p, { step: 5, at: { x: 99, y: 211 } }), bounds = selectionBounds(explicit.design.els)!;
    near(bounds.x + bounds.w / 2, 99); near(bounds.y + bounds.h / 2, 211);
  });
  it("commits a multi-element paste as one undo step on the target page and survives backup", () => {
    const source = fixture(), sourcePage = designPages(source)[0].id, document = addPage(source, sourcePage, "target");
    const pasted = pasteElements(pageCanvas(document, "target"), selectionClipboard(source, ["a", "b", "c"], sourcePage));
    const next = editPage(document, "target", () => pasted.design), history = commit(hist(document), next);
    expect(history.past).toHaveLength(1); expect(undo(history).present).toBe(document);
    expect(pageCanvas(next, sourcePage).els).toEqual(source.els); expect(isDesignLibrary([next])).toBe(true);
    expect(parseDesignBackup(serializeDesignBackup([next]))).toEqual([next]);
  });
  it("pastes plain text literally with a centered layout, preserving multiline content", () => {
    const d = blankDesign({ w: 800, h: 600 }), text = '<img src="https://example.invalid/">\r\nhello 👋';
    const result = pasteText(d, text), element = result.design.els[0], bounds = selectionBounds([element])!;
    expect(element.text).toBe(text.replace("\r\n", "\n")); near(bounds.x + bounds.w / 2, 400); near(bounds.y + bounds.h / 2, 300);
    expect(toSVG(result.design)).toContain("&lt;img"); expect(toSVG(result.design)).not.toContain("<img");
    expect(() => pasteText(d, " ")).toThrow("no text"); expect(() => pasteText(d, "x".repeat(MAX_PASTED_TEXT + 1))).toThrow("100,000");
  });
  it("fits local raster images and offsets multiple images in one paste", () => {
    const d = blankDesign({ w: 800, h: 600 }), result = pasteImages(d, [{ src: pixel, w: 1000, h: 1000 }, { src: pixel, w: 1000, h: 1000 }]);
    expect(result.design.els[0]).toMatchObject({ type: "image", w: 360, h: 360, x: 220, y: 120 });
    expect(result.design.els[1]).toMatchObject({ x: 244, y: 144 });
    expect(isDesignLibrary([result.design])).toBe(true);
    expect(() => pasteImages(d, [{ src: "https://example.invalid/image.png", w: 100, h: 100 }])).toThrow();
    expect(() => pasteImages(d, [{ src: pixel, w: 0, h: 100 }])).toThrow();
  });
});

class FakeItem {
  readonly types: string[];
  constructor(readonly data: Record<string, Blob>) { this.types = Object.keys(data); }
  async getType(type: string) { return this.data[type]; }
}
describe("browser clipboard boundary and cut transaction", () => {
  it("writes readable standard formats and a native custom type, with an HTML fallback", () => {
    const p = packet(), formats = clipboardFormats(p), values = new Map<string, string>();
    const transfer = { files: [], getData: (type: string) => values.get(type) ?? "", setData: (type: string, value: string) => { values.set(type, value); } } as unknown as DataTransfer;
    writeClipboardEvent(transfer, formats); expect(richClipboard(readClipboardEvent(transfer))).toEqual(p);
    transfer.setData = (type, value) => { if (type === ELEMENT_CLIPBOARD_MIME) throw Error("Unsupported type"); values.set(type, value); };
    values.clear(); writeClipboardEvent(transfer, formats); expect(richClipboard(readClipboardEvent(transfer))).toEqual(p);
    expect(values.get("text/plain")).toBe(formats.text);
  });
  it("round-trips system HTML without duplicating alternate image representations", async () => {
    const p = packet(), formats = clipboardFormats(p), write = vi.fn(async (items: ClipboardItems) => { expect(items).toHaveLength(1); });
    await writeSystemClipboard(formats, { write }, FakeItem as unknown as typeof ClipboardItem);
    const items = write.mock.calls[0][0];
    expect(richClipboard(await readSystemClipboard({ read: async () => items }))).toEqual(p);
    const images = new FakeItem({ "image/png": new Blob(["png"], { type: "image/png" }), "image/jpeg": new Blob(["jpg"], { type: "image/jpeg" }), "text/html": new Blob(['<img src="https://example.invalid/">'], { type: "text/html" }) });
    const data = await readSystemClipboard({ read: async () => [images as unknown as ClipboardItem] });
    expect(data.images).toHaveLength(1); expect(data.images[0].type).toBe("image/png");
  });
  it("reports permission/unsupported failures and rejects oversized items before decoding", async () => {
    await expect(writeSystemClipboard(clipboardFormats(packet()), { write: async () => { throw Error("Denied"); } }, FakeItem as unknown as typeof ClipboardItem)).rejects.toThrow("Ctrl/Cmd");
    await expect(readSystemClipboard({ read: async () => { throw Error("Denied"); } })).rejects.toThrow("Ctrl/Cmd");
    const text = vi.fn(), huge = { types: ["text/html"], getType: async () => ({ size: MAX_CLIPBOARD_BYTES * 2 + 1, text }) };
    await expect(readSystemClipboard({ read: async () => [huge as unknown as ClipboardItem] })).rejects.toThrow("50 MB"); expect(text).not.toHaveBeenCalled();
  });
  it("does not cut until the entire write succeeds, then removes the selection in one undo step", async () => {
    const d = fixture(), before = structuredClone(d), onCut = vi.fn(); let resolve!: () => void;
    const pending = copySelectionToSystem({ design: d, ids: ["a", "b", "c"], pageId: "p", cut: true, isCurrent: () => true, onCut, write: () => new Promise<void>(done => { resolve = done; }) });
    expect(onCut).not.toHaveBeenCalled(); expect(d).toEqual(before);
    resolve(); expect(await pending).toBe("cut"); expect(onCut).toHaveBeenCalledTimes(1);
    const next = onCut.mock.calls[0][0]; expect(next.els).toEqual([]); expect(undo(commit(hist(d), next)).present).toBe(d);
  });
  it("keeps originals on failed writes, late completions and locked selections", async () => {
    const d = fixture(), onCut = vi.fn(), options = { design: d, ids: ["a", "b"], pageId: "p", cut: true, isCurrent: () => true, onCut };
    await expect(copySelectionToSystem({ ...options, write: async () => { throw Error("Clipboard denied"); } })).rejects.toThrow("denied");
    expect(onCut).not.toHaveBeenCalled();
    expect(await copySelectionToSystem({ ...options, isCurrent: () => false, write: async () => {} })).toBe("copied-only"); expect(onCut).not.toHaveBeenCalled();
    const locked = lockSelection(d, ["a"], true), write = vi.fn(async () => {});
    expect(canCutSelection(locked, ["a", "b"])).toBe(false);
    await expect(copySelectionToSystem({ ...options, design: locked, write })).rejects.toThrow("Unlock"); expect(write).not.toHaveBeenCalled();
    expect(await copySelectionToSystem({ ...options, design: locked, cut: false, write })).toBe("copied"); expect(onCut).not.toHaveBeenCalled();
  });
});
