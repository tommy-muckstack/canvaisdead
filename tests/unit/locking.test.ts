import { describe, expect, it } from "vitest";
import { addEl, alignEl, blankDesign, commit, duplicateEl, hist, hitTest, makeEl, patchEl, redo, removeEls, reorder, setElementLocked, undo } from "@/lib/design/ops";

function fixture() {
  const design = blankDesign({ w: 500, h: 500 });
  const back = makeEl("rect", design, { x: 40, y: 40, w: 150, h: 150 });
  const front = makeEl("text", design, { x: 40, y: 40, w: 150, fontSize: 30, text: "Keep me" });
  return { design: addEl(addEl(design, back), front), back, front };
}

describe("persistent element locks", () => {
  it("survives serialization and participates in undo/redo", () => {
    const { design, front } = fixture();
    const history = commit(hist(design), setElementLocked(design, front.id, true));
    const restored = JSON.parse(JSON.stringify(history.present));
    expect(restored.els[1].locked).toBe(true);
    expect(undo(history).present.els[1].locked).toBeUndefined();
    expect(redo(undo(history)).present.els[1].locked).toBe(true);
    const unlocked = commit(history, setElementLocked(history.present, front.id, false));
    expect(unlocked.present.els[1].locked).toBe(false);
    expect(undo(unlocked).present.els[1].locked).toBe(true);
  });

  it("blocks geometry, content, style, stacking and deletion until explicitly unlocked", () => {
    const { design, front, back } = fixture();
    const locked = setElementLocked(design, front.id, true);
    for (const patch of [{ x: 100 }, { rotation: 90 }, { text: "Overwrite" }, { underline: true }, { locked: false, x: 100 }]) {
      expect(patchEl(locked, front.id, patch)).toBe(locked);
    }
    expect(alignEl(locked, front.id, "bottom")).toBe(locked);
    expect(reorder(locked, front.id, "back")).toBe(locked);
    expect(removeEls(locked, [front.id])).toBe(locked);
    expect(removeEls(locked, [back.id, front.id]).els.map(e => e.id)).toEqual([front.id]);
    const unlocked = setElementLocked(locked, front.id, false);
    expect(patchEl(unlocked, front.id, { text: "Editable again" }).els[1].text).toBe("Editable again");
    expect(removeEls(unlocked, [front.id]).els).toHaveLength(1);
  });

  it("allows selecting the top locked object to unlock without making it editable", () => {
    const { design, front, back } = fixture();
    const locked = setElementLocked(design, front.id, true);
    expect(hitTest(locked, 60, 60)?.id).toBe(back.id);
    expect(hitTest(locked, 60, 60, undefined, true)?.id).toBe(front.id);
    expect(duplicateEl(locked, front.id).design.els[2].locked).toBe(true);
  });

  it("does not create history entries for unchanged locks or blocked edits", () => {
    const { design, front } = fixture();
    expect(setElementLocked(design, "absent", true)).toBe(design);
    expect(setElementLocked(design, front.id, false)).toBe(design);
    const locked = setElementLocked(design, front.id, true);
    expect(setElementLocked(locked, front.id, true)).toBe(locked);
    const history = hist(locked);
    expect(commit(history, patchEl(locked, front.id, { x: 100 }))).toBe(history);
  });
});
