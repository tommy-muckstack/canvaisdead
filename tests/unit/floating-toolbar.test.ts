import { describe, expect, it } from "vitest";
import { floatingToolbarPosition } from "@/lib/design/floating-toolbar";

describe("floating selection controls", () => {
  const viewport = { x: 72, y: 240, w: 310, h: 450 };
  it("keeps a wrapped toolbar above short text without covering it", () => {
    const position = floatingToolbarPosition({ x: 130, y: 400, w: 180, h: 22 }, { w: 300, h: 64 }, viewport);
    expect(position.y + 64).toBeLessThanOrEqual(386);
    expect(position.x).toBeGreaterThanOrEqual(72);
    expect(position.x + 300).toBeLessThanOrEqual(382);
  });
  it("moves below a top-edge selection and leaves the rotate control clear", () => {
    const position = floatingToolbarPosition({ x: 80, y: 245, w: 100, h: 50 }, { w: 300, h: 35 }, viewport);
    expect(position.y).toBeGreaterThanOrEqual(245 + 50 + 56);
    expect(position.y + 35).toBeLessThanOrEqual(690);
  });
  it("uses a side slot when a tall selection leaves no vertical space", () => {
    const position = floatingToolbarPosition({ x: 700, y: 20, w: 100, h: 700 }, { w: 300, h: 35 }, { x: 400, y: 40, w: 1000, h: 620 });
    expect(position.x).toBeGreaterThanOrEqual(814);
    expect(position.y).toBeGreaterThanOrEqual(40);
    expect(position.y + 35).toBeLessThanOrEqual(660);
  });
  it("keeps actions reachable when zoomed artwork fills or leaves the viewport", () => {
    for (const selection of [{ x: -100, y: -200, w: 1600, h: 1800 }, { x: -500, y: 1000, w: 10, h: 10 }]) {
      const position = floatingToolbarPosition(selection, { w: 300, h: 64 }, viewport);
      expect(position.x).toBeGreaterThanOrEqual(72); expect(position.x + 300).toBeLessThanOrEqual(382);
      expect(position.y).toBeGreaterThanOrEqual(240); expect(position.y + 64).toBeLessThanOrEqual(690);
    }
  });
});
