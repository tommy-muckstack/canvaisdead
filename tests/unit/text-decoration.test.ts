import { afterEach, describe, expect, it, vi } from "vitest";
import { addEl, blankDesign, commit, duplicateEl, hist, makeEl, patchEl, redo, toSVG, undo } from "@/lib/design/ops";
import { renderToCanvas } from "@/lib/design/render";

afterEach(() => vi.unstubAllGlobals());

describe("text decorations", () => {
  it("retains independent toggles through save, duplicate, undo and redo", () => {
    const design = blankDesign({ w: 400, h: 300 });
    const element = makeEl("text", design, { text: "Design freely" });
    let history = hist(addEl(design, element));
    history = commit(history, patchEl(history.present, element.id, { underline: true }));
    history = commit(history, patchEl(history.present, element.id, { strikethrough: true }));
    expect(toSVG(undo(history).present)).toContain('text-decoration="underline"');
    const restored = JSON.parse(JSON.stringify(redo(undo(history)).present));
    const duplicate = duplicateEl(restored, element.id);
    expect(duplicate.design.els[1]).toMatchObject({ underline: true, strikethrough: true });
    expect(toSVG(duplicate.design).match(/text-decoration="underline line-through"/g)).toHaveLength(2);
    const strikeOnly = patchEl(restored, element.id, { underline: false });
    expect(toSVG(strikeOnly)).toContain('text-decoration="line-through"');
    expect(toSVG(patchEl(strikeOnly, element.id, { strikethrough: false }))).not.toContain("text-decoration");
  });

  it("keeps legacy text undecorated and escapes decorated text", () => {
    const design = blankDesign({ w: 400, h: 300 });
    const element = makeEl("text", design, { text: '<b>&"' });
    expect(toSVG(addEl(design, element))).not.toContain("text-decoration");
    const svg = toSVG(addEl(design, { ...element, underline: true }));
    expect(svg).toContain('&lt;b&gt;&amp;&quot;');
    expect(svg).toContain('text-decoration="underline"');
  });

  it.each(["left", "center", "right"] as const)("exports decorations on each nonempty line with %s alignment", async align => {
    const strokes: { x1: number; x2: number; y: number; color: string }[] = [];
    const paints: { text: string; x: number; font: string }[] = [];
    let start = { x: 0, y: 0 }, end = { x: 0, y: 0 };
    const ctx = {
      font: "", strokeStyle: "", lineWidth: 0,
      scale() {}, save() {}, restore() {}, fillRect() {}, beginPath() {},
      measureText(text: string) { return { width: text.length * 10 }; },
      fillText(text: string, x: number) { paints.push({ text, x, font: this.font }); },
      moveTo(x: number, y: number) { start = { x, y }; },
      lineTo(x: number, y: number) { end = { x, y }; },
      stroke() { strokes.push({ x1: start.x, x2: end.x, y: start.y, color: this.strokeStyle }); },
    };
    const canvas = { getContext: () => ctx };
    vi.stubGlobal("document", { createElement: () => canvas, fonts: { ready: Promise.resolve() } });
    const design = blankDesign({ w: 400, h: 300 });
    const element = makeEl("text", design, { text: "One\n\nTwo", x: 40, y: 50, w: 120, fontSize: 20, fontFamily: "sans-serif", fontWeight: 700, italic: true, underline: true, strikethrough: true, align, fill: "#123456" });
    await renderToCanvas(addEl(design, element));
    expect(paints.map(p => p.text)).toEqual(["One", "", "Two"]);
    expect(paints.every(p => p.font === "italic 700 20px sans-serif")).toBe(true);
    const left = align === "left" ? 40 : align === "center" ? 85 : 130;
    expect(strokes).toHaveLength(4);
    expect(strokes.every(s => s.x1 === left && s.x2 === left + 30 && s.color === "#123456")).toBe(true);
    expect(strokes[0].y).toBeCloseTo(68.4);
    expect(strokes[1].y).toBeCloseTo(60.4);
    expect(strokes[2].y - strokes[0].y).toBeCloseTo(48);
  });
});
