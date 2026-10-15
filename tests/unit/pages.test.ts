import { describe, expect, it } from "vitest";
import { addEl, blankDesign, commit, hist, makeEl, patchEl, redo, resizeCanvas, toSVG, undo } from "@/lib/design/ops";
import { addPage, deletePage, designPages, duplicatePage, editPage, MAX_PAGES, movePage, pageCanvas, resizeDesign, titlePage } from "@/lib/design/pages";
import { importDesignCopies, parseDesignBackup, serializeDesignBackup } from "@/lib/design/backup";
import { isDesignLibrary } from "@/lib/design/validate";
import { createLocalStore } from "@/lib/local-store";
import type { Design } from "@/lib/design/types";

function fixture() {
  const design = blankDesign({ w: 800, h: 600 }, "My presentation");
  return addEl(design, makeEl("text", design, { id: "heading", text: "First page", underline: true, rotation: 15, x: 100, y: 80 }));
}

describe("multi-page documents", () => {
  it("opens legacy designs without rewriting them and migrates without losing content", () => {
    const legacy = fixture(), before = JSON.stringify(legacy), firstId = designPages(legacy)[0].id;
    expect(designPages(JSON.parse(before))[0].id).toBe(firstId);
    expect(pageCanvas(legacy)).toEqual(legacy);
    const next = addPage(legacy, firstId, "second");
    expect(designPages(next).map(page => page.id)).toEqual([firstId, "second"]);
    expect(pageCanvas(next, firstId)).toMatchObject({ bg: legacy.bg, els: legacy.els, w: 800, h: 600 });
    expect(pageCanvas(next, "second").els).toEqual([]);
    expect(next).not.toHaveProperty("els");
    expect(next).not.toHaveProperty("bg");
    expect(JSON.stringify(legacy)).toBe(before);
    expect(isDesignLibrary([next])).toBe(true);
  });

  it("keeps edits on their page when operations are queued and preserves other pages", () => {
    const legacy = fixture(), first = designPages(legacy)[0].id;
    // Text blur is committed before a click creates/selects the next page.
    const edited = editPage(legacy, first, canvas => patchEl(canvas, "heading", { text: "Committed on blur" }));
    let design = addPage(edited, first, "second");
    design = editPage(design, "second", canvas => addEl({ ...canvas, bg: "#ff5757" }, makeEl("rect", canvas, { id: "square" })));
    design = editPage(design, first, canvas => patchEl(canvas, "heading", { fill: "#123456" }));
    expect(pageCanvas(design, first).els[0]).toMatchObject({ text: "Committed on blur", fill: "#123456" });
    expect(pageCanvas(design, "second")).toMatchObject({ bg: "#ff5757", els: [{ id: "square", type: "rect" }] });
    const removed = deletePage(design, first);
    expect(editPage(removed, first, canvas => addEl(canvas, makeEl("image", canvas)))).toBe(removed);
  });

  it("duplicates an independent page including its background, title, media and locks", () => {
    let design: Design = fixture(); const first = designPages(design)[0].id;
    design = titlePage(design, first, "Cover");
    design = editPage(design, first, canvas => addEl({ ...canvas, bg: "#abcdef" }, makeEl("image", canvas, { locked: true, src: "data:image/png;base64,YQ==" })));
    const copy = duplicatePage(design, first, "copy");
    const [originalPage, copiedPage] = designPages(copy);
    expect(copiedPage).toMatchObject({ id: "copy", title: "Cover", bg: "#abcdef" });
    expect(copiedPage.els[1]).toMatchObject({ locked: true, src: "data:image/png;base64,YQ==" });
    expect(copiedPage.els.map(element => element.id)).not.toEqual(originalPage.els.map(element => element.id));
    const edited = editPage(copy, "copy", canvas => patchEl(canvas, copiedPage.els[0].id, { text: "Only the copy" }));
    expect(pageCanvas(edited, first).els[0].text).toBe("First page");
    expect(pageCanvas(edited, "copy").els[0].text).toBe("Only the copy");
    expect(copiedPage.els[0].text).toBe("First page");
  });

  it("undoes and redoes page creation, reorder, deletion and edits as document operations", () => {
    const legacy = fixture(), first = designPages(legacy)[0].id;
    let history = hist<Design>(legacy);
    history = commit(history, addPage(history.present, first, "second"));
    history = commit(history, editPage(history.present, "second", canvas => addEl(canvas, makeEl("text", canvas, { text: "Second page" }))));
    history = commit(history, movePage(history.present, "second", 0));
    const beforeDelete = history.present;
    history = commit(history, deletePage(history.present, "second"));
    expect(designPages(history.present).map(page => page.id)).toEqual([first]);
    history = undo(history);
    expect(history.present).toBe(beforeDelete);
    expect(pageCanvas(history.present).els[0].text).toBe("Second page");
    history = redo(history);
    expect(designPages(history.present)).toHaveLength(1);
    for (let i = 0; i < 4; i++) history = undo(history);
    expect(history.present).toBe(legacy);
    expect(history.past).toHaveLength(0);
    history = redo(history);
    expect(designPages(history.present)).toHaveLength(2);
  });

  it("never deletes the last page or records invalid/missing/no-op operations", () => {
    const design = fixture(), first = designPages(design)[0].id;
    for (const next of [deletePage(design, first), deletePage(design, "missing"), movePage(design, first, 0), movePage(design, first, -1), movePage(design, first, 1.5), addPage(design, "missing"), duplicatePage(design, "missing"), titlePage(design, first, ""), editPage(design, first, canvas => canvas)]) {
      expect(next).toBe(design);
      expect(commit(hist(design), next).past).toHaveLength(0);
    }
  });

  it("caps creation at the documented page count without changing an existing document", () => {
    let design: Design = fixture(); const first = designPages(design)[0].id;
    for (let i = 1; i < MAX_PAGES; i++) design = addPage(design, first, `p-${i}`);
    expect(designPages(design)).toHaveLength(MAX_PAGES);
    expect(addPage(design, first)).toBe(design);
    expect(duplicatePage(design, first)).toBe(design);
  });

  it("resizes every page and applies a template to only the target page", () => {
    const legacy = fixture(), first = designPages(legacy)[0].id;
    let design = duplicatePage(legacy, first, "second");
    design = resizeDesign(design, 1600, 1200);
    for (const page of designPages(design)) expect(page.els[0]).toMatchObject({ x: 200, y: 160, w: legacy.els[0].w * 2 });
    const template = addEl(blankDesign({ w: 400, h: 300 }), makeEl("star", legacy, { x: 10, y: 10, w: 50, h: 50 }));
    design = editPage(design, "second", () => resizeCanvas(template, design.w, design.h));
    expect(pageCanvas(design, first).els[0].text).toBe("First page");
    expect(pageCanvas(design, "second").els[0]).toMatchObject({ type: "star", x: 40, y: 40, w: 200, h: 200 });
    expect(designPages(design).map(page => page.id)).toEqual([first, "second"]);
    expect(resizeDesign(design, 0, 600)).toBe(design);
    expect(toSVG(pageCanvas(design, first))).toContain("First page");
    expect(toSVG(pageCanvas(design, "second"))).not.toContain("First page");
  });

  it("round-trips every page through local storage and versioned backups", () => {
    const legacy = fixture(), first = designPages(legacy)[0].id;
    const document = titlePage(duplicatePage(legacy, first, "second"), "second", "A second page");
    let raw = JSON.stringify([legacy]);
    const storage = { getItem: () => raw, setItem: (_key: string, value: string) => { raw = value; } };
    const store = createLocalStore("designs", [], () => storage, isDesignLibrary);
    store.load(); expect(store.set([document])).toBe(true);
    const reopened = createLocalStore("designs", [], () => storage, isDesignLibrary);
    expect(reopened.load()).toBe(true);
    expect(reopened.getSnapshot().value).toEqual([document]);
    const backup = serializeDesignBackup([document]);
    expect(JSON.parse(backup).version).toBe(2);
    const parsed = parseDesignBackup(backup);
    expect(parsed).toEqual([document]);
    const imported = importDesignCopies([document], parsed)[0];
    expect(imported.id).not.toBe(document.id);
    expect(designPages(imported).map(page => page.title)).toEqual(["", "A second page"]);
    designPages(imported)[1].els[0].text = "Changed imported copy";
    expect(designPages(document)[1].els[0].text).toBe("First page");
    expect(designPages(parsed[0])[1].els[0].text).toBe("First page");
    expect(parseDesignBackup(JSON.stringify({ format: "canvaisdead", version: 1, designs: [legacy] }))).toEqual([legacy]);
  });

  it("validates all pages and preserves corrupt persisted data instead of replacing it", () => {
    const legacy = fixture(), first = designPages(legacy)[0].id;
    const design = addPage(legacy, first, "second"), pages = designPages(design);
    for (const invalid of [{ ...design, pages: [] }, { ...design, pages: [pages[0], pages[0]] }, { ...design, pages: [{ ...pages[0], els: null }] }, { ...design, pages: [{ ...pages[0], title: 42 }] }, { ...design, bg: "#fff", els: [] }]) {
      const raw = JSON.stringify([invalid]); let writes = 0;
      const store = createLocalStore("designs", [], () => ({ getItem: () => raw, setItem: () => { writes++; } }), isDesignLibrary);
      expect(store.load()).toBe(false);
      expect(store.set([])).toBe(false);
      expect(writes).toBe(0);
      expect(() => parseDesignBackup(serializeDesignBackup([invalid as Design]))).toThrow("invalid design data");
    }
    const external = editPage(design, "second", canvas => addEl(canvas, makeEl("image", canvas, { src: "https://example.com/remote.png" })));
    expect(() => parseDesignBackup(serializeDesignBackup([external]))).toThrow("external or unsupported image");
  });
});
