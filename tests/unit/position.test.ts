import { describe, expect, it } from "vitest";
import type { El } from "@/lib/design/types";
import { blankDesign, commit, elHeight, hist, makeEl, redo, rotatePoint, toSVG, undo, type Measure } from "@/lib/design/ops";
import { distributeSelection, normalizeRotation, POSITION_LIMIT, positionMetrics, positionSelection, validPositionValue, type PositionField } from "@/lib/design/position";
import { alignSelection, selectionBounds } from "@/lib/design/selection";
import { groupElements, selectionUnits } from "@/lib/design/groups";
import { designPages, editPage, pageCanvas } from "@/lib/design/pages";
import { parseDesignBackup, serializeDesignBackup } from "@/lib/design/backup";
import { pasteElements, selectionClipboard } from "@/lib/design/clipboard";
import { isDesignLibrary } from "@/lib/design/validate";
import { createLocalStore } from "@/lib/local-store";

const measure: Measure = (text, size) => text.length * size;
const source = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jN2QAAAAASUVORK5CYII=";
function fixture(over: Partial<El> = {}) {
  const d = blankDesign({ w: 800, h: 600 });
  d.els = [makeEl("rect", d, { id: "a", x: 100, y: 80, w: 200, h: 100, ...over })];
  return d;
}
const near = (a: { x: number; y: number }, b: { x: number; y: number }) => { expect(a.x).toBeCloseTo(b.x, 7); expect(a.y).toBeCloseTo(b.y, 7); };
const anchor = (e: El, y = 0) => rotatePoint(e.x, e.y + elHeight(e, measure) * y, e.x + e.w / 2, e.y + elHeight(e, measure) / 2, e.rotation);

describe("exact position fields", () => {
  it("reports local frame dimensions and measured text height, and union bounds for multiple elements", () => {
    const d = fixture({ rotation: -90 });
    expect(positionMetrics(d.els)).toEqual({ x: 100, y: 80, w: 200, h: 100, rotation: 270 });
    const text = makeEl("text", d, { text: "abcdef", w: 40, fontSize: 20, lineHeight: 1.5 });
    expect(positionMetrics([text], measure)!.h).toBe(90);
    expect(positionMetrics([...d.els, text], measure)).toEqual({ ...selectionBounds([...d.els, text], measure), rotation: 0 });
    expect(positionMetrics([])).toBeNull();
  });
  it("sets fractional and negative coordinates without rounding or changing unselected elements", () => {
    const d = fixture({ rotation: 37 }); d.els.push(makeEl("ellipse", d, { id: "b" }));
    const next = positionSelection(positionSelection(d, ["a"], "x", -12.3456, false), ["a"], "y", 240.125, false);
    expect(next.els[0]).toEqual({ ...d.els[0], x: -12.3456, y: 240.125 }); expect(next.els[1]).toBe(d.els[1]);
    expect(d.els[0].x).toBe(100);
  });
  it("sets single rotation absolutely and treats full-turn equivalents as no-ops", () => {
    const d = fixture({ rotation: -90 });
    for (const angle of [-90, 270, 630]) expect(positionSelection(d, ["a"], "rotation", angle, false)).toBe(d);
    const next = positionSelection(d, ["a"], "rotation", -405.5, false);
    expect(next.els[0]).toEqual({ ...d.els[0], rotation: 314.5 });
    expect(normalizeRotation(-720)).toBe(0);
  });
  it("resizes a rotated shape about its visible top-left corner with optional ratio locking", () => {
    for (const rotation of [0, 37, 90, -120]) {
      const d = fixture({ rotation }), before = anchor(d.els[0]);
      const wide = positionSelection(d, ["a"], "w", 310.25, false);
      expect(wide.els[0].w).toBe(310.25); expect(wide.els[0].h).toBe(100); near(anchor(wide.els[0]), before);
      const tall = positionSelection(d, ["a"], "h", 225, true);
      expect(tall.els[0].w).toBe(450); expect(tall.els[0].h).toBe(225); near(anchor(tall.els[0]), before);
      expect(tall.els[0].rotation).toBe(rotation);
    }
  });
  it("keeps image crop windows, flips and embedded source bytes when changing frame dimensions", () => {
    const d = fixture({ type: "image", src: source, flipX: true, flipY: true, imageCrop: { x: 50, y: 20, w: 200, h: 100, sourceW: 400, sourceH: 200 } });
    const next = positionSelection(d, ["a"], "w", 400, true);
    expect(next.els[0]).toEqual({ ...d.els[0], w: 400, h: 200 });
    const independent = positionSelection(d, ["a"], "h", 40, false);
    expect(independent.els[0]).toEqual({ ...d.els[0], h: 40 });
  });
  it("reflows width around each text anchor and scales font size when the ratio is locked", () => {
    for (const textAnchor of ["start", "middle", "end"] as const) {
      const d = fixture({ type: "text", text: "abcdefgh", w: 80, fontSize: 20, lineHeight: 1.5, textAnchor, letterSpacingEm: .1, rotation: 37 });
      const fraction = textAnchor === "start" ? 0 : textAnchor === "middle" ? .5 : 1, fixed = anchor(d.els[0], fraction);
      const narrow = positionSelection(d, ["a"], "w", 40, false, measure);
      expect(elHeight(narrow.els[0], measure)).toBe(120); expect(narrow.els[0].fontSize).toBe(20); near(anchor(narrow.els[0], fraction), fixed);
      expect(positionSelection(d, ["a"], "h", 120, false, measure)).toBe(d);
      const scaled = positionSelection(d, ["a"], "h", 120, true, measure);
      expect(scaled.els[0].fontSize).toBe(40); expect(scaled.els[0].w).toBe(160); expect(scaled.els[0].letterSpacingEm).toBe(.1); near(anchor(scaled.els[0], fraction), fixed);
      expect(positionSelection(d, ["a"], "w", 1, true, measure)).toBe(d);
    }
  });
  it("keeps lines horizontal in their local frame and does not change stroke weight via Height", () => {
    const d = fixture({ type: "line", h: 0, strokeWidth: 4, rotation: 37 });
    const next = positionSelection(d, ["a"], "w", 350, true);
    expect(next.els[0]).toMatchObject({ w: 350, h: 0, strokeWidth: 4, rotation: 37 }); near(anchor(next.els[0]), anchor(d.els[0]));
    expect(positionSelection(d, ["a"], "h", 20, true)).toBe(d);
  });
  it("rejects invalid and unchanged input without adding history entries", () => {
    const d = fixture();
    for (const field of ["x", "y", "w", "h", "rotation"] as PositionField[]) {
      for (const value of [NaN, Infinity, -Infinity, POSITION_LIMIT + 1, -POSITION_LIMIT - 1]) expect(positionSelection(d, ["a"], field, value, false)).toBe(d);
      expect(positionSelection(d, ["missing"], field, 100, true)).toBe(d);
      expect(positionSelection(d, ["a"], field, positionMetrics(d.els)![field], true)).toBe(d);
    }
    for (const value of [0, -1, .001]) { expect(validPositionValue("w", value)).toBe(false); expect(positionSelection(d, ["a"], "h", value, true)).toBe(d); }
    const enormous = fixture({ type: "text", text: "a".repeat(50_000), fontSize: 32 });
    expect(positionSelection(enormous, ["a"], "w", .01, false, measure)).toBe(enormous);
  });
});

describe("positioning multiple elements and groups", () => {
  const pair = () => { const d = fixture(); d.els.push(makeEl("text", d, { id: "b", text: "ab", x: 400, y: 200, w: 80, fontSize: 20, rotation: 30 })); return groupElements(d, ["a", "b"], null, "group"); };
  it("moves a complete rotated group by its union origin and keeps all relative geometry", () => {
    const d = pair(), box = positionMetrics(d.els, measure)!;
    const next = positionSelection(d, ["a", "b"], "x", -25.5, true, measure);
    expect(positionMetrics(next.els, measure)!.x).toBeCloseTo(-25.5);
    for (let i = 0; i < 2; i++) expect(next.els[i]).toEqual({ ...d.els[i], x: d.els[i].x - box.x - 25.5 });
  });
  it("uniformly scales by either dimension and applies a relative rotation about the selection center", () => {
    const d = pair(), box = positionMetrics(d.els, measure)!;
    for (const field of ["w", "h"] as const) {
      const next = positionSelection(d, ["a", "b"], field, box[field] * 1.5, false, measure), bounds = positionMetrics(next.els, measure)!;
      near(bounds, box); expect(bounds.w).toBeCloseTo(box.w * 1.5); expect(bounds.h).toBeCloseTo(box.h * 1.5);
      expect(next.els[1].fontSize).toBeCloseTo(30); expect(next.els[0].groupPath).toEqual(["group"]);
    }
    const turned = positionSelection(d, ["a", "b"], "rotation", 90, true, measure);
    for (let i = 0; i < 2; i++) {
      const e = d.els[i], height = elHeight(e, measure), center = rotatePoint(e.x + e.w / 2, e.y + height / 2, box.x + box.w / 2, box.y + box.h / 2, 90);
      near(turned.els[i], { x: center.x - e.w / 2, y: center.y - height / 2 }); expect(turned.els[i].rotation).toBe(e.rotation + 90);
    }
    expect(positionMetrics(turned.els)!.rotation).toBe(0);
    expect(positionSelection(d, ["a", "b"], "rotation", 360, true, measure)).toBe(d);
  });
  it("protects an entire mixed-lock selection while allowing an explicitly selected unlocked member", () => {
    const d = pair(); d.els[1] = { ...d.els[1], locked: true };
    for (const field of ["x", "y", "w", "h", "rotation"] as PositionField[]) expect(positionSelection(d, ["a", "b"], field, 150, true)).toBe(d);
    const next = positionSelection(d, ["a"], "w", 300, false);
    expect(next.els[0].w).toBe(300); expect(next.els[1]).toBe(d.els[1]); expect(next.els[0].groupPath).toEqual(["group"]);
    expect(positionSelection(d, ["b"], "x", 5, false)).toBe(d);
  });
  it("aligns the rotated single or group visible bounds to each page edge and center", () => {
    for (const d of [fixture({ rotation: 37 }), pair(), fixture({ type: "text", text: "abcdefgh", w: 40, fontSize: 20, rotation: -25 })]) {
      for (const align of ["left", "center", "right", "top", "middle", "bottom"] as const) {
        const next = alignSelection(d, d.els.map(e => e.id), align, measure), b = selectionBounds(next.els, measure)!;
        if (align === "left") expect(b.x).toBeCloseTo(0);
        if (align === "right") expect(b.x + b.w).toBeCloseTo(d.w);
        if (align === "center") expect(b.x + b.w / 2).toBeCloseTo(d.w / 2);
        if (align === "top") expect(b.y).toBeCloseTo(0);
        if (align === "bottom") expect(b.y + b.h).toBeCloseTo(d.h);
        if (align === "middle") expect(b.y + b.h / 2).toBeCloseTo(d.h / 2);
        expect(alignSelection(next, d.els.map(e => e.id), align, measure)).toBe(next);
      }
    }
  });
});

describe("equal spacing and persistence", () => {
  const row = () => { const d = fixture(); d.els = [d.els[0], makeEl("rect", d, { id: "b", x: 350, y: 200, w: 50, h: 80 }), makeEl("ellipse", d, { id: "c", x: 600, y: 400, w: 100, h: 100 })]; return d; };
  it("makes edge gaps equal with unequal sizes, preserving endpoints and the other axis", () => {
    const d = row(), next = distributeSelection(d, ["c", "a", "b"], "horizontal");
    expect(next.els[0]).toBe(d.els[0]); expect(next.els[2]).toBe(d.els[2]); expect(next.els[1]).toEqual({ ...d.els[1], x: 425 });
    expect(distributeSelection(next, ["a", "b", "c"], "horizontal")).toBe(next);
    const vertical = distributeSelection(d, ["a", "b", "c"], "vertical"); expect(vertical.els[1]).toEqual({ ...d.els[1], y: 250 });
  });
  it("uses rotated group bounds as a single unit and keeps their member offsets unchanged", () => {
    const d = row(); d.els[1].rotation = 37;
    d.els.splice(2, 0, makeEl("rect", d, { id: "member", x: 360, y: 300, w: 70, h: 40, groupPath: ["g"] })); d.els[1].groupPath = ["g"];
    const ids = d.els.map(e => e.id), next = distributeSelection(d, ids, "horizontal"), boxes = selectionUnits(next.els, ids).map(unit => selectionBounds(unit.els)!).sort((a, b) => a.x - b.x);
    expect(boxes[1].x - boxes[0].x - boxes[0].w).toBeCloseTo(boxes[2].x - boxes[1].x - boxes[1].w);
    expect(next.els[1].x - d.els[1].x).toBeCloseTo(next.els[2].x - d.els[2].x); expect(next.els[1].rotation).toBe(37);
    expect(distributeSelection(next, ids, "horizontal")).toBe(next);
  });
  it("allows equal negative gaps for overlapping artwork and refuses too few or protected units", () => {
    const d = row(); d.els[1].x = 150; d.els[2].x = 200;
    const next = distributeSelection(d, ["a", "b", "c"], "horizontal"); expect(next.els[1].x).toBe(225);
    expect(distributeSelection(d, ["a", "c"], "horizontal")).toBe(d);
    d.els[1].locked = true; expect(distributeSelection(d, ["a", "b", "c"], "horizontal")).toBe(d);
  });
  it("stores one undo step, leaves other pages intact and preserves geometry in backups, clipboard and SVG", () => {
    const d = fixture({ type: "image", src: source, flipX: true }), page = designPages(d)[0], document = { id: d.id, name: d.name, w: d.w, h: d.h, updatedAt: d.updatedAt, pages: [page, { ...structuredClone(page), id: "other" }] };
    const next = editPage(document, page.id, canvas => positionSelection(canvas, ["a"], "w", 350.5, true));
    const history = commit(hist(document), next as typeof document); expect(history.past).toHaveLength(1); expect(undo(history).present).toBe(document); expect(redo(undo(history)).present).toBe(next);
    expect(pageCanvas(next, "other").els).toEqual(page.els);
    const memory = new Map<string, string>(), access = () => ({ getItem: (key: string) => memory.get(key) ?? null, setItem: (key: string, value: string) => { memory.set(key, value); } });
    const local = createLocalStore("position", [], access, isDesignLibrary); local.load(); expect(local.set([next])).toBe(true);
    const reload = createLocalStore("position", [], access, isDesignLibrary); expect(reload.load()).toBe(true); expect(reload.getSnapshot().value).toEqual([next]);
    expect(parseDesignBackup(serializeDesignBackup([next]))).toEqual([next]);
    const canvas = pageCanvas(next), pasted = pasteElements(blankDesign({ w: d.w, h: d.h }), selectionClipboard(canvas, ["a"], page.id)).design.els[0];
    expect(pasted).toMatchObject({ w: 350.5, h: 175.25, x: 100, y: 80, flipX: true }); expect(toSVG(canvas)).toContain('width="350.5"');
  });
});
