import { describe, expect, it } from "vitest";
import { alignSelection, duplicateSelection, elementsInMarquee, lockSelection, moveSelection, reorderSelection, resizeSelection, rotateSelection, selectedElements, selectionBounds, selectionOpacity, selectionRect, snapSelection, toggleSelection } from "@/lib/design/selection";
import { blankDesign, commit, elHeight, hist, makeEl, redo, removeEls, toSVG, undo } from "@/lib/design/ops";
import { designPages, editPage, pageCanvas } from "@/lib/design/pages";
import { isDesignLibrary } from "@/lib/design/validate";

function fixture() {
  const design = blankDesign({ w: 1000, h: 800 });
  design.els = [
    makeEl("rect", design, { id: "a", x: 100, y: 100, w: 100, h: 80, radius: 5, strokeWidth: 2 }),
    makeEl("ellipse", design, { id: "b", x: 400, y: 300, w: 200, h: 100 }),
    makeEl("text", design, { id: "c", x: 200, y: 500, w: 300, text: "Hello", fontSize: 40 }),
    makeEl("image", design, { id: "locked", x: 700, y: 100, w: 100, h: 100, locked: true, src: "data:image/png;base64,AA==" }),
  ];
  return design;
}
const ids = ["a", "b", "c"];
const near = (actual: { x: number; y: number }, expected: { x: number; y: number }) => {
  expect(actual.x).toBeCloseTo(expected.x, 8); expect(actual.y).toBeCloseTo(expected.y, 8);
};

describe("multi-element selection geometry", () => {
  it("toggles membership and resolves duplicates/stale IDs in stacking order", () => {
    expect(toggleSelection(["a", "b"], "a")).toEqual(["b"]);
    expect(toggleSelection(["a"], "b")).toEqual(["a", "b"]);
    expect(selectedElements(fixture(), ["b", "missing", "a", "b"]).map(e => e.id)).toEqual(["a", "b"]);
  });
  it("normalizes reverse marquees and selects intersecting unlocked boxes", () => {
    const box = selectionRect({ x: 620, y: 420 }, { x: 90, y: 90 });
    expect(box).toEqual({ x: 90, y: 90, w: 530, h: 330 });
    expect(elementsInMarquee(fixture(), box)).toEqual(["a", "b"]);
    expect(elementsInMarquee(fixture(), { x: 0, y: 0, w: 1000, h: 800 })).toEqual(ids);
    expect(elementsInMarquee(fixture(), { x: 0, y: 0, w: 0, h: 800 })).toEqual([]);
  });
  it("rejects empty corners of a rotated bounding box and includes its actual box", () => {
    const d = fixture(); d.els = [{ ...d.els[0], x: 100, y: 100, w: 100, h: 10, rotation: 45 }];
    expect(elementsInMarquee(d, { x: 112, y: 140, w: 2, h: 2 })).toEqual([]);
    expect(elementsInMarquee(d, { x: 145, y: 100, w: 10, h: 10 })).toEqual(["a"]);
    const bounds = selectionBounds(d.els)!;
    expect(bounds.w).toBeCloseTo(110 / Math.sqrt(2));
    expect(bounds.h).toBeCloseTo(110 / Math.sqrt(2));
  });
  it("uses measured text height for marquee selection and union bounds", () => {
    const d = fixture(); d.els = [{ ...d.els[2], x: 20, y: 30, w: 40, text: "abcd", fontSize: 20, lineHeight: 1.5 }];
    const measure = (text: string, size: number) => text.length * size;
    expect(selectionBounds(d.els, measure)).toEqual({ x: 20, y: 30, w: 40, h: 60 });
    expect(elementsInMarquee(d, { x: 20, y: 75, w: 40, h: 10 }, measure)).toEqual(["c"]);
  });
  it("snaps the selection union without snapping to its own members", () => {
    const d = fixture(); d.els = d.els.slice(0, 2);
    const snapped = snapSelection(d, ["a", "b"], 147, 0, 6);
    expect(snapped.dx).toBe(150); expect(snapped.guides.x).toContain(500);
    expect(snapSelection(d, ["a", "b"], 3, 3, 1).guides).toEqual({ x: [], y: [] });
  });
  it("uniformly scales every corner around its opposite anchor including rotated text", () => {
    const d = fixture(); d.els[1].rotation = 45; d.els[2].rotation = -20;
    const box = selectionBounds(selectedElements(d, ids))!;
    for (const handle of ["nw", "ne", "se", "sw"] as const) {
      const next = resizeSelection(d, ids, handle, handle.includes("w") ? -100 : 100, handle.includes("n") ? -80 : 80);
      const after = selectionBounds(selectedElements(next, ids))!;
      const anchor = { x: handle.includes("w") ? box.x + box.w : box.x, y: handle.includes("n") ? box.y + box.h : box.y };
      near({ x: handle.includes("w") ? after.x + after.w : after.x, y: handle.includes("n") ? after.y + after.h : after.y }, anchor);
      const factor = next.els[0].w / d.els[0].w;
      expect(next.els[1].w / d.els[1].w).toBeCloseTo(factor);
      expect(next.els[2].fontSize! / d.els[2].fontSize!).toBeCloseTo(factor);
      expect(next.els[0].strokeWidth / d.els[0].strokeWidth).toBeCloseTo(factor);
      expect(next.els[0].radius / d.els[0].radius).toBeCloseTo(factor);
      expect(next.els[1].rotation).toBe(45); expect(next.els[3]).toBe(d.els[3]);
    }
  });
  it("limits shrinking without changing relative positions and refuses partial locked transforms", () => {
    const d = fixture(), after = resizeSelection(d, ids, "se", -10000, -10000);
    expect(after.els[2].fontSize).toBeCloseTo(8);
    expect(after.els[0].w).toBeCloseTo(20);
    expect(resizeSelection(d, ["a", "locked"], "se", 100, 100)).toBe(d);
    expect(rotateSelection(d, ["a", "locked"], 90)).toBe(d);
  });
  it("rotates centers around the common center and preserves layout distances", () => {
    const d = fixture(), box = selectionBounds(selectedElements(d, ids))!, center = { x: box.x + box.w / 2, y: box.y + box.h / 2 };
    const after = rotateSelection(d, ids, 90);
    for (let i = 0; i < 3; i++) {
      const e = d.els[i], n = after.els[i], old = { x: e.x + e.w / 2, y: e.y + elHeight(e, (s, size) => s.length * size * .58) / 2 };
      near({ x: n.x + n.w / 2, y: n.y + elHeight(n, (s, size) => s.length * size * .58) / 2 }, { x: center.x - (old.y - center.y), y: center.y + (old.x - center.x) });
      expect(n.rotation).toBe(e.rotation + 90); expect(n.w).toBe(e.w);
    }
    const roundtrip = rotateSelection(after, ids, -90);
    for (let i = 0; i < 3; i++) near(roundtrip.els[i], d.els[i]);
  });
});

describe("bulk editing and persistence", () => {
  it("moves all unlocked members by the same delta and leaves originals untouched", () => {
    const d = fixture(), before = structuredClone(d), next = moveSelection(d, [...ids, "locked"], 10, -20);
    expect(next.els.slice(0, 3).map(e => [e.x, e.y])).toEqual([[110, 80], [410, 280], [210, 480]]);
    expect(next.els[3]).toBe(d.els[3]); expect(d).toEqual(before);
  });
  it("duplicates in stacking order with independent IDs and lock/style/media preservation", () => {
    const d = fixture(); let seq = 0;
    const result = duplicateSelection(d, ["locked", "a", "a"], () => `copy-${seq++}`);
    expect(result.ids).toEqual(["copy-0", "copy-1"]);
    expect(result.design.els.slice(4)).toEqual([{ ...d.els[0], id: "copy-0", x: 124, y: 124 }, { ...d.els[3], id: "copy-1", x: 724, y: 124 }]);
    expect(isDesignLibrary([JSON.parse(JSON.stringify(result.design))])).toBe(true);
    expect(toSVG(result.design)).toContain('x="724"');
  });
  it("aligns to the selection instead of the page and honors locked anchors", () => {
    const d = fixture(), next = alignSelection(d, ["a", "b"], "right");
    expect(next.els[0].x).toBe(500); expect(next.els[1].x).toBe(400);
    const anchored = alignSelection(d, ["a", "locked"], "right");
    expect(anchored.els[0].x).toBe(700); expect(anchored.els[3]).toBe(d.els[3]);
  });
  it("moves layer blocks by one step or to an edge without reversing the selection", () => {
    const d = fixture();
    const order = (direction: "front" | "back" | "forward" | "backward", selected = ["a", "b"]) => reorderSelection(d, selected, direction).els.map(e => e.id);
    expect(order("forward")).toEqual(["c", "a", "b", "locked"]);
    expect(order("front")).toEqual(["c", "locked", "a", "b"]);
    expect(order("backward", ["b", "c"])).toEqual(["b", "c", "a", "locked"]);
    expect(order("back", ["b", "c", "locked"])).toEqual(["b", "c", "a", "locked"]);
    expect(order("forward", ["a", "c"])).toEqual(["b", "a", "locked", "c"]);
  });
  it("locks/unlocks the entire selection and guards delete and opacity", () => {
    const d = fixture(), locked = lockSelection(d, ["a", "b"], true);
    expect(locked.els.slice(0, 2).every(e => e.locked)).toBe(true);
    expect(removeEls(locked, ["a", "b"])).toBe(locked);
    expect(selectionOpacity(locked, ["a", "b"], .2)).toBe(locked);
    expect(lockSelection(locked, ["a", "b"], false).els.slice(0, 2).every(e => !e.locked)).toBe(true);
    const opacity = selectionOpacity(d, ["a", "locked"], 0);
    expect(opacity.els[0].opacity).toBe(0); expect(opacity.els[3].opacity).toBe(1);
    expect(removeEls(d, ["a", "b", "locked"]).els.map(e => e.id)).toEqual(["c", "locked"]);
  });
  it("records a bulk edit as one history step and keeps other pages isolated", () => {
    const d = fixture(), page = designPages(d)[0];
    const document = { id: d.id, name: d.name, w: d.w, h: d.h, updatedAt: d.updatedAt, pages: [page, { ...structuredClone(page), id: "other" }] };
    const next = editPage(document, page.id, canvas => moveSelection(canvas, ids, 30, 40));
    const history = commit(hist(document), next as typeof document);
    expect(history.past).toHaveLength(1);
    expect(pageCanvas(history.present, "other").els).toEqual(page.els);
    expect(undo(history).present).toBe(document);
    expect(redo(undo(history)).present).toBe(next);
    expect(isDesignLibrary([JSON.parse(JSON.stringify(next))])).toBe(true);
  });
  it("avoids undo entries for unchanged, missing, locked or invalid operations", () => {
    const d = fixture();
    for (const next of [moveSelection(d, ids, 0, 0), moveSelection(d, ids, NaN, 0), moveSelection(d, ["locked"], 10, 20), alignSelection(d, ["missing"], "top"), reorderSelection(d, ["locked"], "front"), reorderSelection(d, ["a"], "back"), selectionOpacity(d, ids, 1), selectionOpacity(d, ids, Infinity), lockSelection(d, ids, false), duplicateSelection(d, []).design, resizeSelection(d, ids, "se", 0, 0), rotateSelection(d, ids, NaN)]) expect(next).toBe(d);
  });
});
