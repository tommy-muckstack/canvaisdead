import { describe, expect, it } from "vitest";
import { canGroup, canUngroup, copyElements, editableSelectionIds, expandGroupSelection, groupElements, groupMembers, groupParent, layerTree, MAX_GROUP_DEPTH, selectedGroup, selectionUnits, toggleGroupSelection, ungroupElements, validGroups } from "@/lib/design/groups";
import { addEl, blankDesign, commit, hist, makeEl, patchEl, removeEls, reorder, toSVG, undo, redo } from "@/lib/design/ops";
import { alignSelection, duplicateSelection, lockSelection, moveSelection, reorderSelection, resizeSelection, rotateSelection, selectionBounds, selectionOpacity } from "@/lib/design/selection";
import { designPages, duplicatePage, editPage, pageCanvas } from "@/lib/design/pages";
import { importDesignCopies, parseDesignBackup, serializeDesignBackup } from "@/lib/design/backup";
import { copyGuestDesigns } from "@/lib/design/guest-handoff";
import { isDesignLibrary } from "@/lib/design/validate";
import { createLocalStore } from "@/lib/local-store";

function fixture() {
  let d = blankDesign({ w: 1000, h: 800 });
  for (const [i, id] of ["a", "b", "c", "d", "e"].entries()) d = addEl(d, makeEl(i === 2 ? "text" : "rect", d, { id, x: 50 + i * 100, y: 50 + i * 100, w: 80, h: 80, text: "Group text", fontSize: 20 }));
  return d;
}
const nested = () => groupElements(groupElements(fixture(), ["a", "b"], null, "inner"), ["a", "b", "c"], null, "outer");
const order = (d: ReturnType<typeof fixture>) => d.els.map(e => e.id);
const path = (d: ReturnType<typeof fixture>, id: string) => d.els.find(e => e.id === id)!.groupPath;

describe("persistent group structure", () => {
  it("groups separate layers into one block, keeping member geometry and relative order", () => {
    const d = fixture(), before = structuredClone(d), result = groupElements(d, ["c", "a"], null, "g");
    expect(order(result)).toEqual(["b", "a", "c", "d", "e"]);
    expect(path(result, "a")).toEqual(["g"]); expect(path(result, "c")).toEqual(["g"]);
    expect(result.els.find(e => e.id === "a")).toEqual({ ...d.els[0], groupPath: ["g"] });
    expect(validGroups(result.els)).toBe(true); expect(d).toEqual(before);
  });
  it("nests existing groups and ungroups one level without losing inner membership", () => {
    const d = nested();
    expect(path(d, "a")).toEqual(["outer", "inner"]); expect(path(d, "c")).toEqual(["outer"]);
    expect(groupParent(d.els, "inner")).toBe("outer"); expect(groupParent(d.els, "outer")).toBeNull();
    const result = ungroupElements(d, ["a", "b", "c"]);
    expect(path(result, "a")).toEqual(["inner"]); expect(path(result, "c")).toBeUndefined();
    expect(validGroups(result.els)).toBe(true);
    const inner = ungroupElements(d, ["a", "b"], "outer");
    expect(inner.els.slice(0, 3).map(e => e.groupPath)).toEqual([["outer"], ["outer"], ["outer"]]);
  });
  it("can regroup sibling members inside an existing group", () => {
    const d = ungroupElements(nested(), ["a", "b"], "outer");
    const result = groupElements(d, ["a", "c"], "outer", "subgroup");
    expect(order(result)).toEqual(["b", "a", "c", "d", "e"]);
    expect(path(result, "a")).toEqual(["outer", "subgroup"]); expect(validGroups(result.els)).toBe(true);
  });
  it("does not wrap every member of an existing group in a redundant child group", () => {
    const d = nested(), ids = ["a", "b", "c"];
    expect(canGroup(d.els, ids, "outer")).toBe(false);
    const result = groupElements(d, ids, "outer", "redundant");
    expect(result).toBe(d);
    expect(isDesignLibrary([result])).toBe(true);
    expect(parseDesignBackup(serializeDesignBackup([result]))).toEqual([d]);
  });
  it("detaches an individual member and collapses one-child groups", () => {
    const d = nested(), result = ungroupElements(d, ["a"], "inner");
    expect(order(result)).toEqual(["b", "a", "c", "d", "e"]);
    expect(result.els.slice(0, 3).map(e => e.groupPath)).toEqual([["outer"], ["outer"], ["outer"]]);
    expect(validGroups(result.els)).toBe(true);
    const detached = ungroupElements(result, ["a"], "outer");
    expect(path(detached, "a")).toBeUndefined(); expect(path(detached, "b")).toEqual(["outer"]);
    expect(order(detached)).toEqual(["b", "c", "a", "d", "e"]); expect(validGroups(detached.els)).toBe(true);
  });
  it("rejects partial units, locked members, reused IDs and excessive nesting", () => {
    const d = nested();
    expect(canGroup(d.els, ["a", "d"])).toBe(false);
    expect(groupElements(d, ["a", "d"], null, "bad")).toBe(d);
    expect(ungroupElements(d, ["a"], "outer")).toBe(d);
    expect(groupElements(d, ["a", "b", "c", "d"], null, "inner")).toBe(d);
    const locked = lockSelection(d, ["a"], true);
    expect(canGroup(locked.els, ["a", "b", "c", "d"])).toBe(false);
    expect(canUngroup(locked.els, ["a", "b", "c"])).toBe(false);
    expect(ungroupElements(locked, ["a", "b", "c"])).toBe(locked);
    let deep = fixture();
    for (let i = 0; i < MAX_GROUP_DEPTH; i++) {
      if (i) deep = addEl(deep, makeEl("rect", deep, { id: `depth-${i}` }));
      deep = groupElements(deep, deep.els.map(e => e.id), null, `depth-group-${i}`);
    }
    expect(validGroups(deep.els)).toBe(true);
    deep = addEl(deep, makeEl("rect", deep, { id: "one-more" }));
    expect(canGroup(deep.els, deep.els.map(e => e.id))).toBe(false);
  });
});

describe("group selection and editing", () => {
  it("expands clicks/marquees to whole units and drills through nested groups", () => {
    const d = nested();
    expect(expandGroupSelection(d.els, ["a"])).toEqual(["a", "b", "c"]);
    expect(expandGroupSelection(d.els, ["a"], "outer")).toEqual(["a", "b"]);
    expect(expandGroupSelection(d.els, ["a"], "inner")).toEqual(["a"]);
    expect(toggleGroupSelection(d.els, ["d"], "b")).toEqual(["a", "b", "c", "d"]);
    expect(toggleGroupSelection(d.els, ["a", "b", "c", "d"], "a")).toEqual(["d"]);
    expect(selectedGroup(d.els, ["a", "b"])).toBe("inner");
    expect(selectedGroup(d.els, ["a"])).toBeNull();
    expect(selectionUnits(d.els, ["a", "b", "c", "d"]).map(n => n.id)).toEqual(["outer", "d"]);
  });
  it("moves and transforms a group together while edits to one member keep membership", () => {
    const d = nested(), ids = ["a", "b", "c"], moved = moveSelection(d, ids, 10, -20);
    expect(moved.els.slice(0, 3).map(e => [e.x, e.y])).toEqual([[60, 30], [160, 130], [260, 230]]);
    const scaled = resizeSelection(moved, ids, "se", 100, 100), rotated = rotateSelection(scaled, ids, 90);
    expect(rotated.els.slice(0, 3).map(e => e.groupPath)).toEqual(d.els.slice(0, 3).map(e => e.groupPath));
    const edited = patchEl(d, "c", { text: "Still grouped" });
    expect(path(edited, "c")).toEqual(["outer"]); expect(validGroups(edited.els)).toBe(true);
  });
  it("treats mixed-lock groups atomically while explicitly selected unlocked members remain editable", () => {
    const d = lockSelection(nested(), ["b"], true), ids = ["a", "b", "c"];
    expect(editableSelectionIds(d.els, [...ids, "d"])).toEqual(["d"]);
    expect(expandGroupSelection(d.els, ["a", "d"], null, true)).toEqual(["d"]);
    for (const next of [moveSelection(d, ids, 10, 20), selectionOpacity(d, ids, .5), removeEls(d, ids), reorderSelection(d, ids, "front"), resizeSelection(d, ids, "se", 40, 40), rotateSelection(d, ids, 45), alignSelection(d, ids, "right")]) expect(next).toBe(d);
    expect(moveSelection(d, ["a"], 5, 0).els[0].x).toBe(d.els[0].x + 5);
    expect(lockSelection(d, ids, false).els.slice(0, 3).every(e => !e.locked)).toBe(true);
  });
  it("aligns groups as units instead of collapsing their members onto each other", () => {
    const d = nested(), gap = d.els[1].x - d.els[0].x;
    const pageAligned = alignSelection(d, ["a", "b", "c"], "right");
    const box = selectionBounds(pageAligned.els.slice(0, 3))!;
    expect(box.x + box.w).toBeCloseTo(1000);
    expect(pageAligned.els[1].x - pageAligned.els[0].x).toBe(gap);
    const pair = alignSelection(d, ["a", "b", "c", "d"], "right");
    expect(selectionBounds(pair.els.slice(0, 3))!.x + selectionBounds(pair.els.slice(0, 3))!.w).toBeCloseTo(pair.els[3].x + pair.els[3].w);
    expect(pair.els[1].x - pair.els[0].x).toBe(gap);
  });
  it("keeps nested layer ordering inside each parent and moves whole groups as blocks", () => {
    const d = nested();
    expect(order(reorderSelection(d, ["a", "b", "c"], "front"))).toEqual(["d", "e", "a", "b", "c"]);
    const child = reorder(d, "a", "front");
    expect(order(child)).toEqual(["b", "a", "c", "d", "e"]); expect(validGroups(child.els)).toBe(true);
    const inner = reorderSelection(d, ["a", "b"], "front");
    expect(order(inner)).toEqual(["c", "a", "b", "d", "e"]); expect(validGroups(inner.els)).toBe(true);
  });
  it("duplicates complete groups with new ancestry and members inside their existing parent", () => {
    const d = nested(); let seq = 0;
    const whole = duplicateSelection(d, ["a", "b", "c"], () => `copy-${seq++}`);
    const copies = whole.design.els.slice(5);
    expect(copies[0].groupPath).toHaveLength(2); expect(copies[0].groupPath).not.toContain("outer");
    expect(copies[0].groupPath).toEqual(copies[1].groupPath); expect(copies[2].groupPath).toEqual(copies[0].groupPath!.slice(0, 1));
    expect(validGroups(whole.design.els)).toBe(true);
    const member = duplicateSelection(d, ["a"], () => "a-copy");
    expect(order(member.design)).toEqual(["a", "b", "a-copy", "c", "d", "e"]);
    expect(path(member.design, "a-copy")).toEqual(["outer", "inner"]); expect(validGroups(member.design.els)).toBe(true);
    const inner = duplicateSelection(d, ["a", "b"]);
    expect(validGroups(inner.design.els)).toBe(true); expect(inner.design.els[3].groupPath?.[0]).toBe("outer");
  });
  it("deletes a member without orphaning groups and restores ancestry in one undo step", () => {
    const d = nested(), deleted = removeEls(d, ["a"]);
    expect(path(deleted, "b")).toEqual(["outer"]); expect(validGroups(deleted.els)).toBe(true);
    const h = commit(hist(d), deleted); expect(h.past).toHaveLength(1); expect(undo(h).present).toBe(d); expect(redo(undo(h)).present).toBe(deleted);
    expect(groupMembers(removeEls(d, ["a", "b", "c"]).els, "outer")).toEqual([]);
  });
});

describe("group persistence and validation", () => {
  it("round-trips groups through version 3 backups, with independent paths on import", () => {
    const d = nested(), raw = serializeDesignBackup([d]);
    expect(JSON.parse(raw).version).toBe(3); expect(JSON.parse(serializeDesignBackup([fixture()])).version).toBe(2);
    expect(parseDesignBackup(raw)).toEqual([d]);
    const copy = pageCanvas(importDesignCopies([d], parseDesignBackup(raw))[0]);
    copy.els[0].groupPath![0] = "changed-copy";
    expect(d.els[0].groupPath![0]).toBe("outer");
    for (const version of [1, 2]) expect(() => parseDesignBackup(JSON.stringify({ format: "canvaisdead", version, designs: [d] }))).toThrow("require backup version 3");
    for (const version of [1, 2]) expect(parseDesignBackup(JSON.stringify({ format: "canvaisdead", version, designs: [fixture()] }))).toHaveLength(1);
  });
  it("preserves every page and creates independent group IDs when duplicating a page", () => {
    const d = nested(), first = designPages(d)[0].id, document = duplicatePage(d, first, "copy-page");
    const copy = pageCanvas(document, "copy-page");
    expect(copy.els[0].groupPath).not.toEqual(d.els[0].groupPath); expect(validGroups(copy.els)).toBe(true);
    const edited = editPage(document, "copy-page", page => ungroupElements(page, copy.els.slice(0, 3).map(e => e.id)));
    expect(pageCanvas(edited, first).els).toEqual(d.els); expect(parseDesignBackup(serializeDesignBackup([edited]))).toEqual([edited]);
    expect(copyElements(d.els)[0].groupPath).not.toBe(d.els[0].groupPath);
  });
  it("rejects malformed or ambiguous paths without overwriting saved data", () => {
    const cases: unknown[] = [null, "group", [], [""], [1], ["outer", "outer"], ["x".repeat(129)], Array.from({ length: 33 }, (_, i) => `g${i}`)];
    const invalids = cases.map(groupPath => ({ ...nested(), els: nested().els.map((e, i) => i === 0 ? { ...e, groupPath } : e) }));
    const interleaved = nested(); [interleaved.els[1], interleaved.els[3]] = [interleaved.els[3], interleaved.els[1]]; invalids.push(interleaved);
    const ambiguous = nested(); ambiguous.els[1].groupPath = ["inner"]; invalids.push(ambiguous);
    for (const invalid of invalids) {
      expect(isDesignLibrary([invalid])).toBe(false);
      const raw = JSON.stringify([invalid]); let writes = 0;
      const store = createLocalStore("groups", [], () => ({ getItem: () => raw, setItem: () => { writes++; } }), isDesignLibrary);
      store.load(); expect(store.getSnapshot().status).toBe("load-error"); expect(store.set([])).toBe(false); expect(writes).toBe(0);
      expect(() => parseDesignBackup(JSON.stringify({ format: "canvaisdead", version: 3, designs: [invalid] }))).toThrow("invalid design data");
    }
  });
  it("keeps group metadata out of artwork and preserves it during local guest handoff", async () => {
    const d = nested(), ungrouped = { ...d, els: d.els.map(e => { const next = { ...e }; delete next.groupPath; return next; }) };
    expect(toSVG(d)).toBe(toSVG(ungrouped));
    const guestId = "g_1234567890abcdef", accountId = "account", memory = new Map([[guestId, [d]]]);
    await copyGuestDesigns({
      read: async owner => ({ revision: null, value: memory.get(owner) ?? [] }),
      write: async (owner, _expected, value) => { memory.set(owner, value as typeof d[]); return { revision: null, value }; },
    }, { guestId, accountId });
    const copied = memory.get(accountId)!;
    expect(pageCanvas(copied[0]).els).toEqual(d.els); expect(isDesignLibrary(copied)).toBe(true);
    expect(layerTree(d.els)[0]).toMatchObject({ kind: "group", id: "outer" });
  });
});
