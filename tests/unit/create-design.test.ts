import { describe, expect, it } from "vitest";
import { changeDimensionUnit, customSize, editDimension, recentDesignSizes, searchSizePresets, swapDimensions, toggleDimensionRatio, type DimensionDraft } from "@/lib/design/create";
import { blankDesign, SIZES } from "@/lib/design/ops";
import { isDesignLibrary } from "@/lib/design/validate";

describe("custom design dimensions", () => {
  it.each(["", " ", "0", "-1", "NaN", "Infinity", "1e3", "0xff", "10px", "1,2.3"])("rejects invalid dimension %j instead of silently substituting a preset", value => {
    expect(customSize(value, "1080", "px").error).toBeTruthy();
    expect(customSize("1080", value, "px").error).toBeTruthy();
  });
  it("handles the exact side and area boundaries in both orientations", () => {
    for (const [w, h] of [[40, 40], [8000, 3125], [3125, 8000], [5000, 5000]]) expect(customSize(String(w), String(h), "px").size).toEqual({ w, h });
    for (const [w, h] of [[39, 40], [40, 39], [8001, 40], [40, 8001], [8000, 3126], [5001, 5000]]) expect(customSize(String(w), String(h), "px").error).toBeTruthy();
  });
  it("uses the export coordinate system for physical units and preserves a US Letter canvas", () => {
    for (const [w, h, unit] of [["8.5", "11", "in"], ["215.9", "279.4", "mm"], ["21.59", "27.94", "cm"]] as const) {
      const result = customSize(w, h, unit);
      expect(result.size).toEqual({ w: 816, h: 1056 });
      expect(isDesignLibrary([blankDesign(result.size!)])).toBe(true);
    }
    expect(customSize("21", "29.7", "cm").size).toEqual({ w: 794, h: 1123 });
    expect(customSize("8,5", "11", "in").size).toEqual({ w: 816, h: 1056 });
  });
  it("keeps the output pixels stable through unit changes, including the maximum edge", () => {
    for (const [w, h] of [[816, 1056], [8000, 3125], [40, 40], [794, 1123]]) {
      let draft: DimensionDraft = { width: String(w), height: String(h), unit: "px", ratio: null };
      for (const unit of ["in", "cm", "mm", "px"] as const) {
        draft = changeDimensionUnit(draft, unit);
        expect(customSize(draft.width, draft.height, unit).size).toEqual({ w, h });
      }
    }
  });
  it("does not fill missing or invalid fields when switching units", () => {
    expect(changeDimensionUnit({ width: "", height: "invalid", unit: "px", ratio: null }, "cm")).toMatchObject({ width: "", height: "invalid", unit: "cm" });
  });
  it("locks an oversized ratio so either side can be reduced into range", () => {
    let draft: DimensionDraft = { width: "16000", height: "9000", unit: "px", ratio: null };
    draft = toggleDimensionRatio(draft);
    draft = editDimension(draft, "width", "6400");
    expect(customSize(draft.width, draft.height, draft.unit).size).toEqual({ w: 6400, h: 3600 });
    draft = editDimension(draft, "height", "1080");
    expect(draft).toMatchObject({ width: "1920", height: "1080" });
    draft = editDimension(draft, "height", "");
    expect(draft.width).toBe("1920");
    draft = editDimension(draft, "height", "720");
    expect(draft.width).toBe("1280");
    draft = editDimension(toggleDimensionRatio(draft), "width", "500");
    expect(draft.height).toBe("720");
  });
  it("swaps the locked ratio along with the sides and retains it across units", () => {
    let draft = swapDimensions(toggleDimensionRatio({ width: "1920", height: "1080", unit: "px", ratio: null }));
    draft = editDimension(draft, "width", "540");
    expect(draft).toMatchObject({ width: "540", height: "960", ratio: 1080 / 1920 });
    draft = editDimension(changeDimensionUnit(draft, "in"), "height", "20");
    expect(customSize(draft.width, draft.height, draft.unit).size).toEqual({ w: 1080, h: 1920 });
  });
  it("cannot lock missing or non-finite dimensions", () => {
    for (const width of ["", "-1", "Infinity", "0"]) expect(toggleDimensionRatio({ width, height: "100", unit: "px", ratio: null }).ratio).toBeNull();
  });
});

describe("blank design discovery", () => {
  it("searches names and dimensions regardless of case or dimension separator", () => {
    expect(searchSizePresets(SIZES, "PRESENTATION").map(size => size.id)).toEqual(["presentation"]);
    for (const query of ["1080×1920", "1080 x 1920", "1080x1920 px"]) expect(searchSizePresets(SIZES, query).map(size => size.id)).toEqual(["story", "presentation"]);
    expect(searchSizePresets(SIZES, "US Letter").map(size => size.id)).toEqual(["doc"]);
    expect(searchSizePresets(SIZES, "nonexistent-size")).toEqual([]);
    expect(searchSizePresets(SIZES, "  ")).toEqual(SIZES);
  });
  it("derives recent sizes from real active designs without mutation, duplicates or invalid sizes", () => {
    const designs = [
      { ...blankDesign({ w: 1080, h: 1920 }), updatedAt: 20 },
      { ...blankDesign({ w: 816, h: 1056 }), updatedAt: 30 },
      { ...blankDesign({ w: 1080, h: 1920 }), updatedAt: 40 },
      { ...blankDesign({ w: 500, h: 500 }), updatedAt: 50, trashedAt: 60 },
      { ...blankDesign({ w: 20000, h: 20000 }), updatedAt: 70 },
    ];
    const before = structuredClone(designs);
    expect(recentDesignSizes(designs)).toEqual([{ w: 1080, h: 1920 }, { w: 816, h: 1056 }]);
    expect(designs).toEqual(before);
    expect(recentDesignSizes([])).toEqual([]);
    expect(recentDesignSizes(SIZES.map(size => blankDesign(size)))).toHaveLength(6);
  });
});
