import { describe, expect, it } from "vitest";
import { ELEMENT_ASSETS, EMPTY_ELEMENT_LIBRARY, MAX_RECENT_ELEMENTS, assetById, elementAssetPreview, insertElementAsset, isElementLibrary, rememberElement, searchElements, starElement } from "@/lib/design/elements";
import { blankDesign, commit, hist, redo, toSVG, undo } from "@/lib/design/ops";
import { selectionBounds, moveSelection } from "@/lib/design/selection";
import { selectedGroup, ungroupElements, validGroups } from "@/lib/design/groups";
import { designPages, editPage, pageCanvas } from "@/lib/design/pages";
import { parseDesignBackup, serializeDesignBackup } from "@/lib/design/backup";
import { isDesignLibrary } from "@/lib/design/validate";
import { createLocalStore } from "@/lib/local-store";

const blank = () => blankDesign({ w: 800, h: 600 });
const ids = (query: string, filters = {}) => searchElements({ query, ...filters }).map(asset => asset.id);
describe("searching original element artwork", () => {
  it("finds by name, synonyms, case, accents and multiple words without mutating the catalog", () => {
    const before = JSON.stringify(ELEMENT_ASSETS);
    expect(ids("  ROUND  circle ")).toContain("circle"); expect(ids("ÉLLIPSE")).toEqual(["oval"]);
    expect(ids("purple flower")).toEqual(["flower"]); expect(ids("yellow sunshine")).toEqual(["sun"]);
    expect(ids("purple sunshine")).toEqual([]); expect(ids("unicorn not present")).toEqual([]);
    expect(JSON.stringify(ELEMENT_ASSETS)).toBe(before);
  });
  it("combines category, color, orientation and collection constraints", () => {
    expect(ids("circle", { category: "Graphics" })).toEqual([]);
    expect(ids("", { category: "Shapes", orientation: "Landscape" })).toContain("line");
    expect(ids("", { color: "Yellow", orientation: "Square", collection: "Colorful geometry" })).toContain("flower");
    expect(ids("", { category: "Photos" })).toEqual([]);
    expect(ids("", { collection: "missing" })).toEqual([]);
    expect(searchElements({}, [assetById("sun")!, assetById("circle")!]).map(asset => asset.id)).toEqual(["sun", "circle"]);
  });
});
describe("editable local asset insertion", () => {
  it("keeps every catalog item valid, self-contained and portable at small and large page sizes", () => {
    expect(new Set(ELEMENT_ASSETS.map(asset => asset.id)).size).toBe(ELEMENT_ASSETS.length);
    for (const size of [{ w: 40, h: 40 }, { w: 8000, h: 200 }, { w: 500, h: 8000 }]) for (const asset of ELEMENT_ASSETS) {
      const d = blankDesign(size), result = insertElementAsset(d, asset.id), elements = result.design.els;
      expect(result.ids).toHaveLength(asset.parts.length); expect(isDesignLibrary([result.design])).toBe(true); expect(validGroups(elements)).toBe(true);
      expect(elements.every(e => !e.src && e.type !== "image" && e.type !== "text")).toBe(true);
      const box = selectionBounds(elements)!; expect(box.x + box.w / 2).toBeCloseTo(size.w / 2); expect(box.y + box.h / 2).toBeCloseTo(size.h / 2);
      expect(Math.max(box.w, box.h)).toBeCloseTo(Math.min(size.w, size.h) * .3);
      expect(parseDesignBackup(serializeDesignBackup([result.design]))).toEqual([result.design]);
      expect(d.els).toEqual([]);
    }
  });
  it("places a graphic around a drop point and retains aspect ratio", () => {
    const d = blank(), atCenter = insertElementAsset(d, "cloud"), dropped = insertElementAsset(d, "cloud", { x: 100, y: 150 });
    const center = selectionBounds(atCenter.design.els)!, box = selectionBounds(dropped.design.els)!;
    expect(box.x + box.w / 2).toBeCloseTo(100); expect(box.y + box.h / 2).toBeCloseTo(150); expect(box.w / box.h).toBeCloseTo(center.w / center.h);
    const edge = selectionBounds(insertElementAsset(d, "cloud", { x: -100, y: 9999 }).design.els)!;
    expect(edge.x + edge.w / 2).toBeCloseTo(0); expect(edge.y + edge.h / 2).toBeCloseTo(600);
    expect(insertElementAsset(d, "cloud", { x: NaN, y: 0 }).design).toBe(d); expect(insertElementAsset(d, "absent").design).toBe(d);
  });
  it("creates independent groups, preserves existing locked artwork and supports member editing", () => {
    const first = insertElementAsset(blank(), "flower"); first.design.els[0].locked = true;
    const second = insertElementAsset(first.design, "flower");
    expect(second.ids.some(id => first.ids.includes(id))).toBe(false);
    expect(selectedGroup(first.design.els, first.ids)).not.toBe(selectedGroup(second.design.els, second.ids));
    expect(second.design.els.slice(0, first.ids.length)).toEqual(first.design.els);
    const moved = moveSelection(second.design, second.ids, 10, 20);
    expect(moved.els[0]).toBe(first.design.els[0]); expect(moved.els.at(-1)!.x).toBeCloseTo(second.design.els.at(-1)!.x + 10);
    const ungrouped = ungroupElements(moved, second.ids); expect(ungrouped.els.filter(e => second.ids.includes(e.id)).every(e => !e.groupPath)).toBe(true);
    const fresh = insertElementAsset(blank(), "flower"); expect(fresh.design.els[0].locked).toBeUndefined();
  });
  it("inserts in one undo step on the active page, reloads locally and exports actual vector artwork", () => {
    const d = blank(), page = designPages(d)[0], doc = { id: d.id, name: d.name, w: d.w, h: d.h, updatedAt: d.updatedAt, pages: [page, { ...structuredClone(page), id: "other" }] };
    const next = editPage(doc, "other", canvas => insertElementAsset(canvas, "camera").design), history = commit(hist(doc), next as typeof doc);
    expect(history.past).toHaveLength(1); expect(undo(history).present).toBe(doc); expect(redo(undo(history)).present).toBe(next);
    expect(pageCanvas(next, page.id).els).toEqual([]); const svg = toSVG(pageCanvas(next, "other"));
    expect(svg).toContain("<rect"); expect(svg).toContain("<ellipse"); expect(svg).not.toContain("<image");
    const data = new Map<string, string>(), storage = () => ({ getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); } });
    const store = createLocalStore("library", [], storage, isDesignLibrary); store.load(); expect(store.set([next])).toBe(true);
    const reload = createLocalStore("library", [], storage, isDesignLibrary); reload.load(); expect(reload.getSnapshot().value).toEqual([next]);
  });
  it("renders deterministic thumbnails with no remote media or undefined geometry", () => {
    for (const asset of ELEMENT_ASSETS) {
      const svg = elementAssetPreview(asset); expect(svg).toBe(elementAssetPreview(asset)); expect(svg).toContain('viewBox="'); expect(svg).not.toMatch(/NaN|Infinity|undefined|<image|<script|href=/);
    }
  });
});
describe("real recent and starred activity", () => {
  it("deduplicates, caps and orders recent additions without inventing activity", () => {
    let library = structuredClone(EMPTY_ELEMENT_LIBRARY); expect(library.recent).toEqual([]);
    for (const asset of ELEMENT_ASSETS) library = rememberElement(library, asset.id);
    expect(library.recent).toHaveLength(MAX_RECENT_ELEMENTS); expect(library.recent[0]).toBe(ELEMENT_ASSETS.at(-1)!.id);
    library = rememberElement(library, "circle"); library = rememberElement(library, "circle"); expect(library.recent.filter(id => id === "circle")).toHaveLength(1); expect(library.recent[0]).toBe("circle");
    expect(rememberElement(library, "missing")).toBe(library); expect(EMPTY_ELEMENT_LIBRARY.recent).toEqual([]);
  });
  it("stars independently of recent activity and rejects malformed versions without losing data", () => {
    const star = starElement(EMPTY_ELEMENT_LIBRARY, "sun"); expect(star.starred).toEqual(["sun"]); expect(star.recent).toEqual([]);
    expect(starElement(star, "sun").starred).toEqual([]); expect(starElement(star, "missing")).toBe(star);
    expect(isElementLibrary(star)).toBe(true); expect(isElementLibrary({ ...star, version: 2 })).toBe(false); expect(isElementLibrary({ ...star, starred: [3] })).toBe(false); expect(isElementLibrary({ ...star, recent: ["sun", "sun"] })).toBe(false);
    expect(isElementLibrary({ version: 1, recent: ["retired-catalog-id"], starred: [] })).toBe(true);
  });
  it("isolates account preferences and preserves failed/conflicting writes for retry", () => {
    const data = new Map<string, string>(); let full = false;
    const storage = () => ({ getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { if (full) throw Error("quota"); data.set(key, value); } });
    const one = createLocalStore("account-one", EMPTY_ELEMENT_LIBRARY, storage, isElementLibrary), two = createLocalStore("account-two", EMPTY_ELEMENT_LIBRARY, storage, isElementLibrary); one.load(); two.load();
    one.set(value => starElement(value, "sun")); expect(two.getSnapshot().value.starred).toEqual([]);
    full = true; expect(one.set(value => rememberElement(value, "circle"))).toBe(false); expect(one.getSnapshot().value.recent).toEqual(["circle"]);
    full = false; expect(one.retry()).toBe(true); expect(JSON.parse(data.get("account-one")!).recent).toEqual(["circle"]);
    data.set("account-one", JSON.stringify(starElement(EMPTY_ELEMENT_LIBRARY, "flower")));
    expect(one.set(value => rememberElement(value, "cloud"))).toBe(false); expect(one.getSnapshot().status).toBe("conflict"); expect(JSON.parse(data.get("account-one")!).starred).toEqual(["flower"]);
  });
});
