import { afterEach, describe, expect, it, vi } from "vitest";
import { PDFDocument } from "pdf-lib";
import { addEl, blankDesign, makeEl, toSVG } from "@/lib/design/ops";
import { addPage, designPages, editPage, setPageNotes } from "@/lib/design/pages";
import { DEFAULT_DOWNLOAD, downloadSettingsKey, exportDesign, readDownloadSettings, selectedPageIds, validDownloadSettings } from "@/lib/design/download";
import { exportBlob, prepareExportFonts, rasterDimensions, renderToCanvas } from "@/lib/design/render";
import { crc32, MAX_DOWNLOAD_BYTES, zipFiles } from "@/lib/design/zip";
import { safeProps } from "@/lib/analytics/taxonomy";

const png = new Blob([Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aV1sAAAAASUVORK5CYII=", "base64")], { type: "image/png" });
function documentFixture() {
  const first = blankDesign({ w: 640, h: 360 }), id = designPages(first)[0].id;
  const design = addPage(addPage(first, id, "second"), "second", "third");
  return setPageNotes(editPage(design, "second", page => addEl(page, makeEl("text", page, { text: "Second page" }))), "second", "Private speaker note");
}
afterEach(() => vi.unstubAllGlobals());

// Read central-directory records and follow offsets, independent of the export page logic.
async function unzipStored(blob: Blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer()), view = new DataView(bytes.buffer), end = bytes.length - 22;
  expect(view.getUint32(end, true)).toBe(0x06054b50);
  const count = view.getUint16(end + 10, true), files = new Map<string, Uint8Array>();
  let offset = view.getUint32(end + 16, true);
  for (let index = 0; index < count; index++) {
    expect(view.getUint32(offset, true)).toBe(0x02014b50);
    expect(view.getUint16(offset + 8, true)).toBe(0x800);
    expect(view.getUint16(offset + 10, true)).toBe(0);
    const local = view.getUint32(offset + 42, true), size = view.getUint32(offset + 24, true), nameLength = view.getUint16(offset + 28, true);
    expect(view.getUint32(local, true)).toBe(0x04034b50);
    const name = new TextDecoder().decode(bytes.slice(offset + 46, offset + 46 + nameLength));
    const start = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true), data = bytes.slice(start, start + size);
    expect(crc32(data)).toBe(view.getUint32(offset + 16, true));
    files.set(name, data);
    offset += 46 + nameLength + view.getUint16(offset + 30, true) + view.getUint16(offset + 32, true);
  }
  expect(offset).toBe(end);
  return files;
}

describe("local download selection and preferences", () => {
  it("handles all/current/custom pages, deduplicating ranges in document order", () => {
    const pages = designPages(documentFixture());
    expect(selectedPageIds(pages, "second", "all", "")).toEqual(pages.map(page => page.id));
    expect(selectedPageIds(pages, "second", "current", "")).toEqual(["second"]);
    expect(selectedPageIds(pages, "second", "custom", "3, 1-2, 2")).toEqual(pages.map(page => page.id));
    expect(selectedPageIds(pages, "second", "custom", " 2 - 3 ")).toEqual(["second", "third"]);
    for (const value of ["", "0", "4", "3-2", "1.5", "1,", "one", "1-99999999999"]) expect(() => selectedPageIds(pages, "second", "custom", value)).toThrow();
    expect(() => selectedPageIds(pages, "removed", "current", "")).toThrow("no longer exists");
  });
  it("rejects corrupt preferences and never restores content or page identifiers", () => {
    for (const value of [null, "bad JSON", "[]", '{"format":"png"}', JSON.stringify({ ...DEFAULT_DOWNLOAD, scale: -1 })]) expect(readDownloadSettings(value)).toEqual(DEFAULT_DOWNLOAD);
    expect(readDownloadSettings(JSON.stringify({ ...DEFAULT_DOWNLOAD, format: "pdf_print", pageIds: ["private"], title: "private" }))).toEqual({ ...DEFAULT_DOWNLOAD, format: "pdf_print" });
    expect(downloadSettingsKey(documentFixture())).toBe("canvaisdead:download:v1:640x360");
    expect(validDownloadSettings({ ...DEFAULT_DOWNLOAD, quality: NaN })).toBe(false);
    expect(safeProps("app_design_exported", { format: "pdf_print", title: "private" })).toEqual({ format: "pdf_print" });
  });
});

describe("download artifacts", () => {
  it("builds standard ZIP headers, checksums, Unicode names and byte-exact payloads", async () => {
    expect(crc32(new TextEncoder().encode("123456789"))).toBe(0xcbf43926);
    const data = Uint8Array.from([0, 255, 1, 254, 2]), archive = zipFiles([{ name: "résumé.png", data }, { name: "empty.svg", data: new Uint8Array() }]);
    expect(archive.type).toBe("application/zip");
    const files = await unzipStored(archive);
    expect([...files.keys()]).toEqual(["résumé.png", "empty.svg"]);
    expect(files.get("résumé.png")).toEqual(data); expect(files.get("empty.svg")).toHaveLength(0);
    expect(() => zipFiles([{ name: "../bad", data }])).toThrow();
    expect(() => zipFiles([{ name: "a", data }, { name: "a", data }])).toThrow();
  });
  it("exports selected SVG pages in order, with escaped text and no notes or unselected pages", async () => {
    const design = documentFixture(), result = await exportDesign(design, { ...DEFAULT_DOWNLOAD, format: "svg", scale: 2, transparent: true, pageIds: ["third", "second", "second"] });
    const files = await unzipStored(result.blob);
    expect([...files.keys()]).toEqual([`${design.name}-page-2.svg`, `${design.name}-page-3.svg`]);
    const svg = new TextDecoder().decode([...files.values()][0]);
    expect(svg).toContain('width="1280" height="720" viewBox="0 0 640 360"');
    expect(svg).toContain("Second page"); expect(svg).not.toContain("Private speaker note"); expect(svg).not.toContain("<rect");
    expect(result.name).toBe(`${design.name}.zip`);
    const single = await exportDesign({ ...design, name: "../strange/name" }, { ...DEFAULT_DOWNLOAD, format: "svg", pageIds: ["second"] });
    expect(single.name).toBe("-strange-name-page-2.svg"); expect(single.blob.type).toBe("image/svg+xml");
    expect(await single.blob.text()).toContain('<rect width="640"');
  });
  it("snapshots content, settings and page IDs before asynchronous rendering", async () => {
    const design = documentFixture(), ids = ["second"], options = { ...DEFAULT_DOWNLOAD, format: "jpg" as const, scale: 2, quality: 0.6, pageIds: ids };
    const raster = vi.fn(async () => { designPages(design)[1].els[0].text = "Modified while rendering"; options.scale = 4; ids[0] = "third"; return png; });
    const before = structuredClone(design);
    const result = await exportDesign(design, options, {}, raster);
    expect(raster.mock.calls[0]).toEqual([expect.objectContaining({ els: designPages(before)[1].els }), "jpg", 2, { transparent: false, quality: 0.6, opaque: false }]);
    expect(result.name).toContain("page-2.jpg");
  });
  it.each(["pdf_standard", "pdf_print"] as const)("produces a real multi-page %s with original page dimensions", async format => {
    const design = documentFixture(), before = structuredClone(design), raster = vi.fn(async () => png), progress = vi.fn();
    const result = await exportDesign(design, { ...DEFAULT_DOWNLOAD, format, transparent: true, pageIds: ["third", "second"] }, { onProgress: progress }, raster);
    const pdf = await PDFDocument.load(await result.blob.arrayBuffer());
    expect(pdf.getPageCount()).toBe(2); expect(pdf.getPages().map(page => page.getSize())).toEqual([{ width: 480, height: 270 }, { width: 480, height: 270 }]);
    expect(result.blob.type).toBe("application/pdf"); expect(result.name).toMatch(/\.pdf$/);
    expect(raster.mock.calls[0]).toEqual([expect.objectContaining({ els: designPages(before)[1].els }), "png", format === "pdf_print" ? 300 / 96 : 1, { transparent: false, quality: 0.92, opaque: true }]);
    expect(progress.mock.calls).toEqual([[0, 2], [1, 2], [2, 2]]); expect(design).toEqual(before);
  });
  it("rejects missing pages and rendering failures without returning a partial artifact", async () => {
    const design = documentFixture(), raster = vi.fn(async () => { throw new Error("Image could not be read"); });
    await expect(exportDesign(design, { ...DEFAULT_DOWNLOAD, pageIds: [] }, {}, raster)).rejects.toThrow("existing pages");
    await expect(exportDesign(design, { ...DEFAULT_DOWNLOAD, pageIds: ["gone"] }, {}, raster)).rejects.toThrow("existing pages");
    expect(raster).not.toHaveBeenCalled();
    await expect(exportDesign(design, { ...DEFAULT_DOWNLOAD, pageIds: ["second", "third"] }, {}, raster)).rejects.toThrow("Image could not be read");
    expect(raster).toHaveBeenCalledTimes(1);
  });
  it("cancels before starting and between pages without returning a partial download", async () => {
    const design = documentFixture(), controller = new AbortController(), raster = vi.fn(async () => png), options = { ...DEFAULT_DOWNLOAD, pageIds: ["second", "third"] };
    controller.abort(); await expect(exportDesign(design, options, { signal: controller.signal }, raster)).rejects.toMatchObject({ name: "AbortError" });
    expect(raster).not.toHaveBeenCalled();
    const next = new AbortController();
    await expect(exportDesign(design, options, { signal: next.signal, onProgress: count => { if (count === 1) next.abort(); } }, raster)).rejects.toMatchObject({ name: "AbortError" });
    expect(raster).toHaveBeenCalledTimes(1);
  });
  it("rejects excessive output before reading it into an archive", async () => {
    const design = documentFixture(), huge = new Blob(["small test payload"]), read = vi.spyOn(huge, "arrayBuffer");
    Object.defineProperty(huge, "size", { value: MAX_DOWNLOAD_BYTES + 1 });
    await expect(exportDesign(design, { ...DEFAULT_DOWNLOAD, pageIds: ["second"] }, {}, async () => huge)).rejects.toThrow("fewer pages");
    expect(read).not.toHaveBeenCalled();
  });
});

describe("raster size, background and encoding", () => {
  it("loads hidden-page text fonts before measuring and painting", async () => {
    const design = blankDesign({ w: 10, h: 10 }), load = vi.fn(async () => []);
    const element = makeEl("text", design, { fontFamily: "Example", fontWeight: 700, fontSize: 20, italic: true });
    vi.stubGlobal("document", { fonts: { ready: Promise.resolve(), load } });
    await prepareExportFonts([element, { ...element, id: "other" }]);
    expect(load).toHaveBeenCalledExactlyOnceWith("italic 700 20px Example");
  });
  it("rejects oversized/invalid canvases before allocating memory", () => {
    expect(rasterDimensions({ w: 1920, h: 1080 }, 300 / 96)).toEqual({ width: 6000, height: 3375 });
    for (const scale of [NaN, Infinity, -1, 0, 100]) expect(() => rasterDimensions({ w: 1920, h: 1080 }, scale)).toThrow();
    expect(() => rasterDimensions({ w: 8000, h: 8000 }, 1)).toThrow("too large");
  });
  it("omits only the page fill for transparency and keeps shapes in SVG", async () => {
    const design = blankDesign({ w: 10, h: 10 }), fillRect = vi.fn();
    const ctx = { scale() {}, fillRect, fillStyle: "" };
    vi.stubGlobal("document", { createElement: () => ({ getContext: () => ctx }), fonts: { ready: Promise.resolve() } });
    await renderToCanvas(design, 2, { transparent: true }); expect(fillRect).not.toHaveBeenCalled();
    await renderToCanvas(design); expect(fillRect).toHaveBeenCalledOnce();
    const shaped = addEl(design, makeEl("rect", design, { fill: "#ff0000" }));
    expect(toSVG(shaped, undefined, { transparent: true }).match(/<rect/g)).toHaveLength(1);
  });
  it("passes JPG quality, composites over white, and releases the canvas after encoding", async () => {
    const colors: string[] = [], ctx = { fillStyle: "", scale() {}, fillRect() { colors.push(this.fillStyle); } };
    const canvas = { width: 0, height: 0, getContext: () => ctx, toBlob: vi.fn((callback: BlobCallback) => callback(png)) };
    vi.stubGlobal("document", { createElement: () => canvas, fonts: { ready: Promise.resolve() } });
    const design = { ...blankDesign({ w: 10, h: 10 }), bg: "#123456" };
    await exportBlob(design, "jpg", 2, { transparent: true, quality: 0.4 });
    expect(colors).toEqual(["#ffffff", "#123456"]);
    expect(canvas.toBlob.mock.calls[0]).toEqual([expect.any(Function), "image/jpeg", 0.4]);
    expect([canvas.width, canvas.height]).toEqual([0, 0]);
    canvas.toBlob.mockImplementation(callback => callback(null));
    await expect(exportBlob(design, "png")).rejects.toThrow("encode"); expect(canvas.width).toBe(0);
  });
});
