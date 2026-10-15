import { describe, expect, it } from "vitest";
import { blankDesign, commit, hist, makeEl, redo, toSVG, undo } from "@/lib/design/ops";
import { findLayer, layerKey, layerMoveContext, layerScope, layerThumbnail, layersOverlap, overlappingLayerIds, reorderLayersAt } from "@/lib/design/layers";
import { groupElements, layerTree, validGroups } from "@/lib/design/groups";
import { parseDesignBackup, serializeDesignBackup } from "@/lib/design/backup";
import { designPages, editPage, pageCanvas } from "@/lib/design/pages";
import { createLocalStore } from "@/lib/local-store";
import { isDesignLibrary } from "@/lib/design/validate";

function fixture() {
  const d = blankDesign({ w: 800, h: 600 });
  d.els = ["a", "b", "c", "d", "e"].map((id, i) => makeEl("rect", d, { id, x: i * 120, y: 50, w: 100, h: 80, fill: `#${i + 1}12345` }));
  return d;
}
const order = (d: ReturnType<typeof fixture>) => d.els.map(e => e.id);
const target = (id: string, side: "before" | "after" = "before", kind: "element" | "group" = "element") => ({ target: { kind, id }, side });
describe("layer insertion preserves editing structure", () => {
  it("inserts on either side in visual front-to-back order", () => {
    const d = fixture();
    expect(order(reorderLayersAt(d, ["a"], target("d")))).toEqual(["b", "c", "d", "a", "e"]);
    expect(order(reorderLayersAt(d, ["e"], target("b", "after")))).toEqual(["a", "e", "b", "c", "d"]);
    expect(order(d)).toEqual(["a", "b", "c", "d", "e"]);
  });
  it("moves separated selected siblings as a block without reversing their order", () => {
    const d = fixture();
    expect(order(reorderLayersAt(d, ["d", "b"], target("e")))).toEqual(["a", "c", "e", "b", "d"]);
    expect(order(reorderLayersAt(d, ["d", "b"], target("a", "after")))).toEqual(["b", "d", "a", "c", "e"]);
  });
  it("moves complete nested groups without changing membership, geometry or source references", () => {
    let d = groupElements(fixture(), ["b", "c"], null, "inner"); d = groupElements(d, ["b", "c", "d"], null, "outer");
    const next = reorderLayersAt(d, ["b", "c", "d"], target("a", "after"));
    expect(order(next)).toEqual(["b", "c", "d", "a", "e"]); expect(validGroups(next.els)).toBe(true);
    for (const e of next.els) expect(e).toBe(d.els.find(original => original.id === e.id));
    const node = findLayer(layerTree(next.els), { kind: "group", id: "inner" })!;
    expect(layerScope(node)).toBe("outer"); expect(layerScope(findLayer(layerTree(next.els), { kind: "element", id: "c" })!)).toBe("inner");
    expect(layerKey(node)).not.toBe(layerKey({ kind: "element", id: "inner" }));
  });
  it("reorders group members only among siblings and rejects implicit reparenting", () => {
    const d = groupElements(fixture(), ["b", "c", "d"], null, "g");
    const next = reorderLayersAt(d, ["b"], target("d")); expect(order(next)).toEqual(["a", "c", "d", "b", "e"]); expect(validGroups(next.els)).toBe(true);
    expect(reorderLayersAt(d, ["b"], target("e"))).toBe(d);
    expect(reorderLayersAt(d, ["e"], target("b"))).toBe(d);
    expect(reorderLayersAt(d, ["b", "e"], target("c"))).toBe(d);
    expect(layerMoveContext(d.els, ["b", "e"])).toBeNull();
  });
  it("preserves groups when inserting a sibling on either side of a group target", () => {
    const d = groupElements(fixture(), ["b", "c"], null, "g");
    expect(order(reorderLayersAt(d, ["a"], target("g", "before", "group")))).toEqual(["b", "c", "a", "d", "e"]);
    expect(order(reorderLayersAt(d, ["e"], target("g", "after", "group")))).toEqual(["a", "e", "b", "c", "d"]);
  });
  it("protects locked members atomically and permits an explicitly selected unlocked sibling", () => {
    const d = groupElements(fixture(), ["b", "c", "d"], null, "g"); d.els[2] = { ...d.els[2], locked: true };
    expect(reorderLayersAt(d, ["b", "c", "d"], target("e"))).toBe(d);
    expect(reorderLayersAt(d, ["a", "c"], target("e"))).toBe(d);
    expect(order(reorderLayersAt(d, ["b"], target("d")))).toEqual(["a", "c", "d", "b", "e"]);
  });
  it("does not add history for missing targets, selected targets, empty or unchanged moves", () => {
    const d = fixture();
    for (const next of [reorderLayersAt(d, [], target("b")), reorderLayersAt(d, ["missing"], target("b")), reorderLayersAt(d, ["a"], target("missing")), reorderLayersAt(d, ["a", "b"], target("b")), reorderLayersAt(d, ["b"], target("a")), reorderLayersAt(d, ["b"], target("c", "after"))]) expect(next).toBe(d);
  });
  it("retains every element exactly once through all source/target pairs", () => {
    const d = fixture();
    for (const source of d.els) for (const dest of d.els) for (const side of ["before", "after"] as const) {
      const next = reorderLayersAt(d, [source.id], target(dest.id, side));
      expect(new Set(order(next)).size).toBe(d.els.length); expect([...order(next)].sort()).toEqual(order(d));
      expect(next.els.filter(e => e.id !== source.id)).toEqual(d.els.filter(e => e.id !== source.id));
    }
  });
});
describe("overlapping layers and original artwork previews", () => {
  it("includes the selection and direct overlapping frames, but excludes mere edge contact and transitive neighbors", () => {
    const d = fixture(); d.els[1].x = 50; d.els[2].x = 140; d.els[3].x = 100;
    expect(overlappingLayerIds(d, ["a"])).toEqual(new Set(["a", "b"]));
    expect(overlappingLayerIds(d, [])).toEqual(new Set()); expect(overlappingLayerIds(d, ["missing"])).toEqual(new Set());
  });
  it("uses actual rotated rectangles rather than axis-aligned union corners", () => {
    const d = fixture(), thin = { ...d.els[0], x: 100, y: 100, w: 100, h: 10, rotation: 45 };
    expect(layersOverlap(thin, { ...d.els[1], x: 112, y: 140, w: 2, h: 2 })).toBe(false);
    expect(layersOverlap(thin, { ...d.els[1], x: 145, y: 100, w: 10, h: 10 })).toBe(true);
    expect(layersOverlap(thin, { ...thin, x: 1000 })).toBe(false);
  });
  it("uses measured text height and includes locked overlapping artwork", () => {
    const d = fixture(); d.els[0] = makeEl("text", d, { id: "a", text: "abcdef", x: 0, y: 0, w: 40, fontSize: 20, lineHeight: 1.5 });
    d.els[1] = { ...d.els[1], x: 0, y: 65, w: 40, h: 10, locked: true };
    const measure = (text: string, size: number) => text.length * size;
    expect(overlappingLayerIds(d, ["a"], measure).has("b")).toBe(true);
  });
  it("renders escaped text and cropped, flipped images in a rotated group's preview", () => {
    const d = fixture(), text = makeEl("text", d, { id: "text", text: "<script>&", x: -100, y: -50, w: 200, fontSize: 20, rotation: 30 });
    const image = makeEl("image", d, { src: "data:image/png;base64,AA==", x: 50, y: 40, w: 200, h: 100, flipX: true, imageCrop: { sourceW: 400, sourceH: 200, x: 20, y: 10, w: 200, h: 100 } });
    const html = layerThumbnail([text, image]); expect(html).toContain('width="48" height="40"'); expect(html).toContain("&lt;script&gt;&amp;"); expect(html).toContain('viewBox="20 10 200 100"'); expect(html).toContain('matrix(-1 0 0 1 300 0)'); expect(html).not.toContain("<script>");
    expect(layerThumbnail([])).toBe("");
  });
});
describe("layer order stays local and portable", () => {
  it("records one gesture, isolates pages and preserves export paint order through reload and backup", () => {
    const d = fixture(), page = designPages(d)[0], document = { id: d.id, name: d.name, w: d.w, h: d.h, updatedAt: d.updatedAt, pages: [page, { ...structuredClone(page), id: "other" }] };
    const next = editPage(document, page.id, canvas => reorderLayersAt(canvas, ["a", "b"], target("e")));
    const h = commit(hist(document), next as typeof document); expect(h.past).toHaveLength(1); expect(undo(h).present).toBe(document); expect(redo(undo(h)).present).toBe(next);
    expect(pageCanvas(next, "other").els).toEqual(d.els);
    const svg = toSVG(pageCanvas(next)); expect(svg.indexOf('fill="#512345"')).toBeLessThan(svg.indexOf('fill="#112345"'));
    expect(parseDesignBackup(serializeDesignBackup([next]))).toEqual([next]);
    const data = new Map<string, string>(), access = () => ({ getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); } });
    const store = createLocalStore("layers", [], access, isDesignLibrary); store.load(); expect(store.set([next])).toBe(true);
    const reload = createLocalStore("layers", [], access, isDesignLibrary); expect(reload.load()).toBe(true); expect(reload.getSnapshot().value).toEqual([next]);
  });
});
