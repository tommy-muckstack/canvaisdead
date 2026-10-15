import { describe, it, expect } from "vitest";
import { templatesForCanvas } from "@/lib/design/template-search";
import { TEMPLATES } from "@/lib/design/templates";
import { SIZES } from "@/lib/design/ops";

describe("canvas-aware template browsing", () => {
  it("prioritizes matching proportions without mutating the shared catalog", () => {
    const original = TEMPLATES.map(t => t.id);
    const result = templatesForCanvas(TEMPLATES, 1920, 1080, "");
    const size = SIZES.find(s => s.id === result[0].size)!;
    expect(size.w / size.h).toBe(16 / 9);
    expect(result).toHaveLength(TEMPLATES.length);
    expect(TEMPLATES.map(t => t.id)).toEqual(original);
  });
  it("filters every search word across name and category, ignoring case and whitespace", () => {
    expect(templatesForCanvas(TEMPLATES, 1080, 1080, "  SUNSET   social  ").map(t => t.id)).toEqual(["quote"]);
    expect(templatesForCanvas(TEMPLATES, 1080, 1080, "nonexistent-template")).toEqual([]);
  });
  it("adapts to portrait canvases without changing the templates", () => {
    const result = templatesForCanvas(TEMPLATES, 1080, 1920, "");
    const size = SIZES.find(s => s.id === result[0].size)!;
    expect(size.w / size.h).toBe(9 / 16);
    expect(result[0]).toBe(TEMPLATES.find(t => t.id === result[0].id));
  });
});
