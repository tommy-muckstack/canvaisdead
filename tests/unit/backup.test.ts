import { describe, expect, it } from "vitest";
import { importDesignCopies, parseDesignBackup, serializeDesignBackup } from "@/lib/design/backup";
import { addEl, blankDesign, makeEl, toSVG } from "@/lib/design/ops";
import { TEMPLATES, fromTemplate } from "@/lib/design/templates";
import { createLocalStore } from "@/lib/local-store";
import { isDesignLibrary } from "@/lib/design/validate";
import { pageCanvas } from "@/lib/design/pages";

const pixel = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jN2QAAAAASUVORK5CYII=";
function fixture() {
  const design = blankDesign({ w: 800, h: 600 }, "A portable design");
  return addEl(addEl(design,
    makeEl("text", design, { text: "Keep my formatting", underline: true, strikethrough: true, italic: true, locked: true, rotation: 18 })),
    makeEl("image", design, { src: pixel, w: 100, h: 100 }));
}

describe("local design backups", () => {
  it("round-trips all templates, formatting, lock state and embedded uploaded images", () => {
    const designs = [...TEMPLATES.map(fromTemplate), fixture()];
    expect(parseDesignBackup(serializeDesignBackup(designs))).toEqual(designs);
    expect(parseDesignBackup(serializeDesignBackup([]))).toEqual([]);
  });

  it("imports separate editable copies without replacing or mutating originals", () => {
    const original = fixture();
    const backup = parseDesignBackup(serializeDesignBackup([original]));
    const result = importDesignCopies([original], backup);
    expect(result).toHaveLength(2);
    expect(result[1]).toBe(original);
    expect(result[0].id).not.toBe(original.id);
    expect(result[0].name).toBe(original.name);
    expect(pageCanvas(result[0]).els).toEqual(original.els);
    pageCanvas(result[0]).els[0].text = "Edited copy";
    expect(original.els[0].text).toBe("Keep my formatting");
    expect(pageCanvas(backup[0]).els[0].text).toBe("Keep my formatting");
    const again = importDesignCopies(result, backup);
    expect(new Set(again.map(design => design.id)).size).toBe(3);
  });

  it.each(["", "{", "null", "[]", '{"format":"other","version":1,"designs":[]}', '{"format":"canvaisdead","version":1,"designs":[{}]}'])("rejects invalid backup %j", raw => {
    expect(() => parseDesignBackup(raw)).toThrow();
  });

  it("rejects newer backup versions instead of silently dropping unsupported features", () => {
    expect(() => parseDesignBackup(JSON.stringify({ format: "canvaisdead", version: 7, designs: [fixture()] }))).toThrow("version is not supported");
  });

  it.each(["https://example.com/picture.png", "//example.com/picture.png", "javascript:alert(1)", "data:image/svg+xml,<svg/>", "blob:old-browser-url"])('rejects nonportable image %j before any import', src => {
    const design = fixture();
    design.els[1].src = src;
    expect(() => parseDesignBackup(serializeDesignBackup([design]))).toThrow("external or unsupported image");
  });

  it("rejects SVG paint servers, injected attributes and invalid numeric shapes", () => {
    for (const paint of ['" onload="alert(1)', "url(https://example.com/paint.svg#paint)", "url(#paint)"]) {
      const design = fixture();
      design.bg = paint;
      expect(() => parseDesignBackup(serializeDesignBackup([design]))).toThrow("invalid design data");
      design.bg = "#fff"; design.els[0].fill = paint;
      expect(() => parseDesignBackup(serializeDesignBackup([design]))).toThrow("invalid design data");
    }
    const design = fixture();
    design.els[1].w = -100;
    expect(() => parseDesignBackup(serializeDesignBackup([design]))).toThrow("invalid design data");
  });

  it("validates the whole library before returning any designs", () => {
    const valid = fixture(), invalid = fixture();
    invalid.els[1].id = invalid.els[0].id;
    expect(() => parseDesignBackup(serializeDesignBackup([valid, invalid]))).toThrow("invalid design data");
  });

  it("keeps a failed import in memory and retry saves the same copies once", () => {
    const original = fixture();
    let persisted = serializeDesignBackup([original]);
    // The local library uses the existing array schema, independent of backup versioning.
    persisted = JSON.stringify(parseDesignBackup(persisted));
    let full = true;
    const store = createLocalStore("designs", [], () => ({
      getItem: () => persisted,
      setItem: (_key, value) => { if (full) throw new Error("Quota exceeded"); persisted = value; },
    }), isDesignLibrary);
    store.load();
    const imported = parseDesignBackup(serializeDesignBackup([fixture()]));
    expect(store.set(previous => importDesignCopies(previous, imported))).toBe(false);
    const pending = store.getSnapshot().value;
    expect(pending).toHaveLength(2);
    expect(JSON.parse(persisted)).toEqual([original]);
    full = false;
    expect(store.retry()).toBe(true);
    expect(JSON.parse(persisted)).toEqual(pending);
  });

  it("escapes color values at the SVG serialization boundary", () => {
    const design = fixture(), paint = '" onload="alert(1)';
    design.bg = paint;
    design.els.push(makeEl("rect", design, { fill: paint, stroke: paint, strokeWidth: 1 }), makeEl("line", design, { stroke: paint }));
    design.els[0].fill = paint;
    const svg = toSVG(design);
    expect(svg).not.toContain('" onload="');
    expect(svg).toContain('fill="&quot; onload=&quot;alert(1)"');
    expect(svg).toContain('stroke="&quot; onload=&quot;alert(1)"');
  });
});
