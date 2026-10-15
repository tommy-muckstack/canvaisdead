import { describe, expect, it } from "vitest";
import { blankDesign, elHeight, makeEl, resizeBox, resizeElement, rotatePoint, type Handle, type Rect } from "@/lib/design/ops";
import type { El } from "@/lib/design/types";

const handles: Handle[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
function at(box: Rect & { rotation?: number }, x: number, y: number) {
  return rotatePoint(box.x + box.w * x, box.y + box.h * y, box.x + box.w / 2, box.y + box.h / 2, box.rotation ?? 0);
}
function samePoint(actual: { x: number; y: number }, expected: { x: number; y: number }) {
  expect(actual.x).toBeCloseTo(expected.x, 8);
  expect(actual.y).toBeCloseTo(expected.y, 8);
}
const fixture = (type: El["type"], rotation: number) => makeEl(type, blankDesign({ w: 800, h: 600 }), { x: 100, y: 80, w: 200, h: 100, rotation });

describe("rotated resizing", () => {
  it("moves a 90-degree east handle down while preserving its opposite edge", () => {
    const original = { x: 100, y: 100, w: 200, h: 100, rotation: 90 };
    const result = resizeBox(original, "e", 0, 50);
    expect(result.w).toBeCloseTo(250);
    expect(result.h).toBe(100);
    expect(result.x).toBeCloseTo(75);
    expect(result.y).toBeCloseTo(125);
    samePoint(at({ ...result, rotation: 90 }, 0, 0.5), { x: 200, y: 50 });
    samePoint(at({ ...result, rotation: 90 }, 1, 0.5), { x: 200, y: 300 });
  });

  for (const rotation of [0, 15, 45, 90, 135, 180, 270, -30]) {
    it(`keeps each opposite handle fixed at ${rotation} degrees`, () => {
      const original = { x: 100, y: 80, w: 200, h: 100, rotation };
      for (const handle of handles) {
        const fx = handle.includes("w") ? 1 : handle.includes("e") ? 0 : 0.5;
        const fy = handle.includes("n") ? 1 : handle.includes("s") ? 0 : 0.5;
        const before = at(original, fx, fy);
        const localDelta = { x: (0.5 - fx) * 80, y: (0.5 - fy) * 40 };
        const delta = rotatePoint(localDelta.x, localDelta.y, 0, 0, rotation);
        const result = resizeBox(original, handle, delta.x, delta.y);
        samePoint(at({ ...result, rotation }, fx, fy), before);
        samePoint(at({ ...result, rotation }, 1 - fx, 1 - fy), {
          x: at(original, 1 - fx, 1 - fy).x + delta.x,
          y: at(original, 1 - fx, 1 - fy).y + delta.y,
        });
      }
    });
  }

  it("honors aspect ratio for vertical drags and at the minimum size", () => {
    const original = { x: 100, y: 80, w: 200, h: 100, rotation: 45 };
    const delta = rotatePoint(0, 50, 0, 0, 45);
    const larger = resizeBox(original, "se", delta.x, delta.y, true);
    expect(larger.w).toBeCloseTo(300);
    expect(larger.h).toBeCloseTo(150);
    samePoint(at({ ...larger, rotation: 45 }, 0, 0), at(original, 0, 0));
    const shrink = rotatePoint(500, 500, 0, 0, 45);
    const smaller = resizeBox(original, "nw", shrink.x, shrink.y, true);
    expect(smaller.w).toBe(16);
    expect(smaller.h).toBe(8);
    samePoint(at({ ...smaller, rotation: 45 }, 1, 1), at(original, 1, 1));
  });

  it("does not widen a thin shape or shift a line when resizing the other axis", () => {
    expect(resizeBox({ x: 0, y: 0, w: 2, h: 100 }, "s", 0, 20)).toEqual({ x: 0, y: 0, w: 2, h: 120 });
    const line = { ...fixture("line", 45), h: 0, strokeWidth: 4 };
    const delta = rotatePoint(50, 0, 0, 0, 45);
    const result = { ...line, ...resizeElement(line, "e", delta.x, delta.y) };
    expect(result.w).toBeCloseTo(250);
    expect(result.h).toBe(0);
    samePoint(at({ ...result, h: elHeight(result, measure) }, 0, 0.5), at({ ...line, h: 4 }, 0, 0.5));
  });

  const measure = (text: string, size: number) => Array.from(text).length * size;
  it("scales text at corners without moving the opposite corner", () => {
    const original = { ...fixture("text", 30), text: "one two three four", fontSize: 20 };
    const delta = rotatePoint(-60, -30, 0, 0, 30);
    const result = { ...original, ...resizeElement(original, "nw", delta.x, delta.y, false, measure) };
    expect(result.fontSize).toBeGreaterThan(original.fontSize);
    expect(result.w / original.w).toBeCloseTo(result.fontSize / original.fontSize);
    samePoint(at({ ...result, h: elHeight(result, measure) }, 1, 1), at({ ...original, h: elHeight(original, measure) }, 1, 1));
  });

  it("reflows text from its fixed top edge and respects text width/font minimums", () => {
    const original = { ...fixture("text", 45), text: "one two three four", fontSize: 20 };
    const delta = rotatePoint(100, 0, 0, 0, 45);
    const result = { ...original, ...resizeElement(original, "w", delta.x, delta.y, false, measure) };
    expect(result.w).toBeCloseTo(100);
    expect(result.fontSize).toBe(20);
    expect(elHeight(result, measure)).toBeGreaterThan(elHeight(original, measure));
    samePoint(at({ ...result, h: elHeight(result, measure) }, 1, 0), at({ ...original, h: elHeight(original, measure) }, 1, 0));
    const shrink = rotatePoint(1000, 1000, 0, 0, 45);
    const minimum = { ...original, ...resizeElement(original, "nw", shrink.x, shrink.y, false, measure) };
    expect(minimum.fontSize).toBeCloseTo(8);
    expect(minimum.w).toBeGreaterThanOrEqual(40);
    samePoint(at({ ...minimum, h: elHeight(minimum, measure) }, 1, 1), at({ ...original, h: elHeight(original, measure) }, 1, 1));
  });
});
