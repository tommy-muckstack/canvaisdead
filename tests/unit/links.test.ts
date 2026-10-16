import { describe, expect, it } from "vitest";
import { PDFArray, PDFDict, PDFDocument, PDFName, PDFString } from "pdf-lib";
import { normalizeLinkURL, setElementLinks, validElementLink } from "@/lib/design/links";
import { blankDesign, makeEl, approxMeasure, toSVG } from "@/lib/design/ops";
import { designPages, duplicatePage, movePage, pageCanvas } from "@/lib/design/pages";
import { importDesignCopies, parseDesignBackup, serializeDesignBackup } from "@/lib/design/backup";
import { designBackupBlob, readDesignBackup } from "@/lib/design/backup-file";
import { readDesignRecords } from "@/lib/design/record-file";
import { pasteElements, selectionClipboard, parseElementClipboard } from "@/lib/design/clipboard";
import { DEFAULT_DOWNLOAD, exportDesign } from "@/lib/design/download";
import { isDesignLibrary } from "@/lib/design/validate";
import type { Design } from "@/lib/design/types";

const url = { kind: "url" as const, url: "https://example.test/path?q=1#section" };
function fixture(): Design {
  const canvas = blankDesign({ w: 800, h: 600 });
  return { id: "links", name: "Links", w: 800, h: 600, updatedAt: 1, pages: [
    { id: "first", title: "Start", bg: "#ffffff", notes: "Private link note", els: [
      makeEl("text", canvas, { id: "website", text: "Read more", x: 100, y: 100, w: 300, fontSize: 30, link: url }),
      makeEl("rect", canvas, { id: "page", x: 100, y: 250, w: 200, h: 100, rotation: 90, link: { kind: "page", pageId: "second" } }),
      makeEl("rect", canvas, { id: "self", x: 400, y: 250, w: 100, h: 100, link: { kind: "page", pageId: "first" } }),
    ] },
    { id: "second", title: "End", bg: "#ffffff", els: [] },
  ] } as Design;
}
describe("element links", () => {
  it("normalizes ordinary destinations without permitting executable or local-file schemes", () => {
    expect(normalizeLinkURL(" example.test/hello ")).toBe("https://example.test/hello");
    expect(normalizeLinkURL("https://example.test/雪")).toContain("%E9%9B%AA");
    expect(normalizeLinkURL("mailto:hello@example.test")).toBe("mailto:hello@example.test");
    expect(normalizeLinkURL("tel:+15555550100")).toBe("tel:+15555550100");
    for (const value of ["javascript:alert(1)", "data:text/html,test", "file:///private/file", "ftp://example.test", "//example.test", "https://user:pass@example.test", "https:\\example.test", "java\nscript:alert(1)", "hello world", "mailto:", "tel:", "x".repeat(4097)]) expect(normalizeLinkURL(value)).toBeNull();
    for (const value of [null, {}, { kind: "url", url: "javascript:alert(1)" }, { kind: "url", url: "example.test" }, { kind: "page", pageId: "" }]) expect(validElementLink(value)).toBe(false);
  });
  it("changes a selection once, preserves locked members and removes links without touching geometry", () => {
    const canvas = pageCanvas(fixture()), before = structuredClone(canvas);
    canvas.els[0].locked = true;
    const changed = setElementLinks(canvas, canvas.els.map(e => e.id), { kind: "page", pageId: "second" });
    expect(changed.els[0]).toBe(canvas.els[0]); expect(changed.els[2].link).toEqual({ kind: "page", pageId: "second" });
    expect(setElementLinks(changed, [changed.els[2].id], changed.els[2].link!)).toBe(changed);
    const cleared = setElementLinks(changed, ["self"], null); expect(cleared.els[2].link).toBeUndefined();
    expect(cleared.els[2].x).toBe(before.els[2].x); expect(cleared.els[2].fill).toBe(before.els[2].fill);
  });
  it("remaps whole-design and self-page copies while reorder retains stable destinations", () => {
    const source = fixture(), [copy] = importDesignCopies([source], [source]), pages = designPages(copy);
    expect(pages[0].id).not.toBe("first"); expect(pages[0].els[1].link).toEqual({ kind: "page", pageId: pages[1].id }); expect(pages[0].els[2].link).toEqual({ kind: "page", pageId: pages[0].id });
    const duplicate = designPages(duplicatePage(source, "first", "third"))[1]; expect(duplicate.els[2].link).toEqual({ kind: "page", pageId: "third" }); expect(duplicate.els[1].link).toEqual({ kind: "page", pageId: "second" });
    expect(designPages(movePage(source, "second", 0))[1].els[1].link).toEqual({ kind: "page", pageId: "second" }); expect(designPages(source)[0].els[2].link).toEqual({ kind: "page", pageId: "first" });
  });
  it("validates versioned local backups and clipboard data without dropping destinations", async () => {
    const design = fixture();
    const json = serializeDesignBackup([design]); expect(JSON.parse(json).version).toBe(11); expect(parseDesignBackup(json)).toEqual([design]);
    expect(() => parseDesignBackup(json.replace('"version": 11', '"version": 10'))).toThrow("Links require");
    const blob = designBackupBlob([design]); expect(await readDesignBackup(blob)).toEqual([design]); expect(await readDesignRecords(blob)).toEqual([design]);
    const downgraded = new Blob([(await blob.text()).replace('"version":11', '"version":10')]); await expect(readDesignRecords(downgraded)).rejects.toThrow("Links require");
    const packet = selectionClipboard(pageCanvas(design), designPages(design)[0].els.map(e => e.id), "first"); expect(packet.version).toBe(8);
    expect(parseElementClipboard(JSON.stringify(packet)).els[1].link).toEqual({ kind: "page", pageId: "second" });
    expect(() => parseElementClipboard(JSON.stringify({ ...packet, version: 7 }))).toThrow();
    const pasted = pasteElements(pageCanvas(design), packet); expect(pasted.design.els.at(-2)?.link).toEqual({ kind: "page", pageId: "second" });
    const other = pasteElements({ ...pageCanvas(design), id: "another", els: [] }, packet); expect(other.notice).toContain("Page links were removed"); expect(other.design.els[0].link).toEqual(url); expect(other.design.els[1].link).toBeUndefined();
    const bad = structuredClone(design); designPages(bad)[0].els[0].link = { kind: "url", url: "javascript:alert(1)" }; expect(isDesignLibrary([bad])).toBe(false);
    expect(toSVG(pageCanvas(design))).not.toContain("example.test");
  });
});

const png = new Blob([Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aV1sAAAAASUVORK5CYII=", "base64")], { type: "image/png" });
it.each(["pdf_standard", "pdf_print"] as const)("exports working %s URL actions and selected-page destinations in PDF coordinates", async format => {
  const design = fixture(), result = await exportDesign(design, { ...DEFAULT_DOWNLOAD, format, pageIds: ["second", "first"] }, { measure: approxMeasure }, async () => png);
  const pdf = await PDFDocument.load(await result.blob.arrayBuffer()), pages = pdf.getPages(), annotations = pages[0].node.Annots()!;
  expect(annotations.size()).toBe(3);
  const web = annotations.lookup(0, PDFDict).lookup(PDFName.of("A"), PDFDict);
  expect(web.lookup(PDFName.of("S"), PDFName).toString()).toBe("/URI"); expect(web.lookup(PDFName.of("URI"), PDFString).decodeText()).toBe(url.url);
  const internal = annotations.lookup(1, PDFDict); expect(internal.lookup(PDFName.of("Dest"), PDFArray).get(0)).toEqual(pages[1].ref);
  expect(internal.lookup(PDFName.of("Rect"), PDFArray).asArray().map(v => Number(v.toString()))).toEqual([112.5, 150, 187.5, 300]);
  const partial = await exportDesign(design, { ...DEFAULT_DOWNLOAD, format, pageIds: ["first"] }, {}, async () => png);
  const subset = await PDFDocument.load(await partial.blob.arrayBuffer()); expect(subset.getPages()[0].node.Annots()!.size()).toBe(2);
});
