import { describe, expect, it } from "vitest";
import { copyProjectPages, emptyProjectPage, readProjectPageDrag } from "@/lib/design/project-pages";
import { designPages, MAX_PAGES } from "@/lib/design/pages";
import { blankDesign, commit, hist, makeEl, redo, undo } from "@/lib/design/ops";
import type { Design, PagedDesign } from "@/lib/design/types";
import { designBackupBlob, readDesignBackup } from "@/lib/design/backup-file";
import { importDesignCopies } from "@/lib/design/backup";
import { safeProps } from "@/lib/analytics/taxonomy";
import { defaultTextEffect } from "@/lib/design/text-effects";

function fixture() {
  const destination: Design = { ...blankDesign({ w: 300, h: 300 }, "Working"), id: "destination", updatedAt: 100, starred: true };
  const base = blankDesign({ w: 400, h: 200 });
  const source: PagedDesign = { id: "source", name: "Source", w: 400, h: 200, updatedAt: 50, pages: [
    { id: "a", title: "First", notes: "First notes", bg: "#e9e1ff", els: [makeEl("text", base, { id: "text", x: 40, y: 20, w: 120, h: 60, fontSize: 40, strokeWidth: 2, radius: 8, rotation: 25, text: "Keep text", locked: true, letterSpacingEm: .1, lineHeight: 1.6, listStyle: "bullet", textCurve: 15, textEffect: defaultTextEffect("outline"), link: { kind: "page", pageId: "b" } })] },
    { id: "b", title: "Second", notes: "Second notes", bg: "#00c4cc", els: [makeEl("rect", base, { id: "shape", x: 100, y: 50, w: 80, h: 40, link: { kind: "page", pageId: "a" } }), makeEl("text", base, { id: "url", text: "External", link: { kind: "url", url: "https://example.com/" } })] },
  ] }; return { destination, source, target: designPages(destination)[0].id };
}
describe("copy saved project pages", () => {
  it("copies selected pages in source order with independent identities, remapped links, notes and exact source preservation", () => {
    const { destination, source, target } = fixture(), before = structuredClone(source);
    const result = copyProjectPages(destination, source, ["b", "a"], target, "add"), pages = designPages(result.design);
    expect(pages.map(page => page.title)).toEqual(["", "First", "Second"]); expect(pages[0]).toEqual(designPages(destination)[0]);
    expect(pages[1].notes).toBe("First notes"); expect(pages[2].notes).toBe("Second notes"); expect(result.design).toMatchObject({ id: destination.id, name: destination.name, w: 300, h: 300, starred: true });
    expect(pages[1].els[0].link).toEqual({ kind: "page", pageId: pages[2].id }); expect(pages[2].els[0].link).toEqual({ kind: "page", pageId: pages[1].id });
    expect(new Set(pages.flatMap(page => [page.id, ...page.els.map(e => e.id)])).size).toBe(6); expect(result.removedLinks).toBe(0); expect(source).toEqual(before);
    expect(pages[2].els[1].link).not.toBe(source.pages[1].els[1].link);
  });
  it("replaces the target identity without invalidating existing incoming links and uses one undo step", () => {
    const { destination, source, target } = fixture();
    const original: PagedDesign = { id: destination.id, name: destination.name, w: 300, h: 300, updatedAt: 100, starred: true, pages: [designPages(destination)[0], { id: "keep", title: "Keep", bg: "#ffffff", els: [makeEl("rect", destination, { link: { kind: "page", pageId: target } })] }] };
    const result = copyProjectPages(original, source, ["a", "b"], target, "replace");
    expect(designPages(result.design)[0].id).toBe(target); expect(designPages(result.design)[2]).toBe(original.pages[1]);
    const history = commit(hist(original), result.design); expect(undo(history).present).toEqual(original); expect(redo(undo(history)).present).toEqual(result.design);
  });
  it("fits geometry uniformly and preserves nested groups, locks, formatting, crop and original image bytes", () => {
    const { destination, source, target } = fixture();
    const image = makeEl("image", { ...destination, w: 400, h: 200 }, { id: "image", src: "data:image/png;base64,AAAA", x: 20, y: 40, w: 80, h: 100, groupPath: ["root", "inner"], imageCrop: { x: .1, y: .2, w: .5, h: .5, sourceW: 400, sourceH: 400 }, flipX: true }); source.pages[0].els[0].groupPath = ["root", "inner"]; source.pages[0].els.push(image, makeEl("rect", destination, { id: "outer-child", groupPath: ["root"] }));
    const result = copyProjectPages(destination, source, ["a"], target, "replace"), [text, copiedImage] = designPages(result.design)[0].els;
    expect(text).toMatchObject({ x: 30, y: 90, w: 90, h: 45, fontSize: 30, strokeWidth: 1.5, radius: 6, rotation: 25, locked: true, letterSpacingEm: .1, lineHeight: 1.6, listStyle: "bullet", textCurve: 15, textEffect: source.pages[0].els[0].textEffect });
    expect(text.groupPath).toEqual(copiedImage.groupPath); expect(text.groupPath).not.toEqual(["root", "inner"]); expect(copiedImage).toMatchObject({ src: image.src, imageCrop: image.imageCrop, flipX: true });
    expect(copiedImage.imageCrop).not.toBe(image.imageCrop); expect(text.textEffect).not.toBe(source.pages[0].els[0].textEffect);
  });
  it("removes references to uncopied foreign pages but retains available same-document targets", () => {
    const { destination, source, target } = fixture();
    const partial = copyProjectPages(destination, source, ["a"], target, "replace"); expect(partial.removedLinks).toBe(1); expect(designPages(partial.design)[0].els[0].link).toBeUndefined();
    const own = copyProjectPages(source, source, ["a"], "a", "add"); expect(designPages(own.design)[1].els[0].link).toEqual({ kind: "page", pageId: "b" }); expect(own.removedLinks).toBe(0);
  });
  it("rejects unavailable selections, duplicate IDs and page-limit overflow without changing either document", () => {
    const { destination, source, target } = fixture(), before = structuredClone({ destination, source });
    for (const ids of [[], ["missing"], ["a", "a"]]) expect(() => copyProjectPages(destination, source, ids, target, "add")).toThrow("no longer available");
    expect(() => copyProjectPages(destination, { ...source, trashedAt: 1 }, ["a"], target, "replace")).toThrow();
    const full: PagedDesign = { ...source, pages: Array.from({ length: MAX_PAGES }, (_, index) => ({ id: `p${index}`, title: "", bg: "#ffffff", els: [] })) };
    expect(() => copyProjectPages(full, source, ["a"], "p0", "add")).toThrow("350 pages"); expect(designPages(copyProjectPages(full, source, ["a"], "p0", "replace").design)).toHaveLength(MAX_PAGES);
    expect(() => copyProjectPages(destination, source, ["a"], target, "add", () => "a")).toThrow("identifiers"); expect({ destination, source }).toEqual(before);
  });
  it("round-trips copied artwork and favorites through real record backups and independent imports", async () => {
    const { destination, source, target } = fixture(), result = copyProjectPages(destination, source, ["a", "b"], target, "replace");
    const restored = await readDesignBackup(designBackupBlob([result.design, source])); expect(restored).toEqual([result.design, source]);
    const [copy] = importDesignCopies(restored, [result.design]); const pages = designPages(copy); expect(copy.starred).toBe(true); expect(copy.id).not.toBe(destination.id); expect(pages[0].els[0].link).toEqual({ kind: "page", pageId: pages[1].id });
  });
  it("recognizes an unused blank page and accepts bounded local drag identifiers only", () => {
    const { destination } = fixture(), page = designPages(destination)[0]; expect(emptyProjectPage(page)).toBe(true);
    for (const patch of [{ title: "Keep title" }, { notes: "Keep notes" }, { bg: "#123456" }, { els: [makeEl("rect", destination)] }]) expect(emptyProjectPage({ ...page, ...patch })).toBe(false);
    expect(readProjectPageDrag('{"designId":"source","pageIds":["a"]}')).toEqual({ designId: "source", pageIds: ["a"] });
    for (const value of ["", "{", "null", '{"designId":"source","pageIds":["a","a"]}', '{"designId":"source","pageIds":[]}', "x".repeat(64_001)]) expect(readProjectPageDrag(value)).toBeNull();
    expect(safeProps("app_project_pages_applied", { placement: "add", selection: "multiple", name: "Private", id: "source" })).toEqual({ placement: "add", selection: "multiple" });
  });
});
