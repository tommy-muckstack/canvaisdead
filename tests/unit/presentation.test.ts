import { describe, expect, it, vi } from "vitest";
import { blankDesign, commit, hist, toSVG, undo } from "@/lib/design/ops";
import { addPage, designPages, duplicatePage, pageCanvas, setPageNotes } from "@/lib/design/pages";
import { createPresentationReader, presentMode, presentationSession, slideIndex, slideMessage } from "@/lib/design/presentation";
import { importDesignCopies, parseDesignBackup, serializeDesignBackup } from "@/lib/design/backup";
import { isDesignLibrary } from "@/lib/design/validate";
import { routeContext } from "@/lib/analytics/schema";

describe("local presentation state", () => {
  it("navigates and loops without moving beyond a deck", () => {
    expect(slideIndex(0, 3, "previous")).toBe(0); expect(slideIndex(2, 3, "next")).toBe(2);
    expect(slideIndex(2, 3, "next", true)).toBe(0); expect(slideIndex(0, 3, "previous", true)).toBe(2);
    expect(slideIndex(1, 3, "first")).toBe(0); expect(slideIndex(0, 3, "last")).toBe(2);
    expect(slideIndex(0, 1, "next", true)).toBe(0);
  });
  it("accepts only slide messages for existing pages and known modes", () => {
    const d = blankDesign({ w: 800, h: 600 }), id = designPages(d)[0].id;
    expect(slideMessage({ version: 1, type: "slide", pageId: id }, d)).toBe(id);
    for (const value of [null, {}, { version: 1, type: "script", pageId: id }, { version: 2, type: "slide", pageId: id }, { version: 1, type: "slide", pageId: "missing" }]) expect(slideMessage(value, d)).toBeNull();
    expect(presentMode("autoplay")).toBe("autoplay"); expect(presentMode("unknown")).toBe("standard");
    expect(presentationSession("../../other")).toBe("");
  });
  it("preserves private notes through migration, undo, duplication and backup without rendering them", () => {
    const d = blankDesign({ w: 800, h: 600 }), id = designPages(d)[0].id;
    const withNotes = setPageNotes(d, id, "Private speaker notes\nKeep this off the slide.");
    const h = commit(hist(d), withNotes); expect(undo(h).present).toEqual(d);
    const duplicate = duplicatePage(withNotes, id, "copy");
    const restored = importDesignCopies([], parseDesignBackup(serializeDesignBackup([duplicate])))[0];
    expect(designPages(restored).map(page => page.notes)).toEqual([designPages(withNotes)[0].notes, designPages(withNotes)[0].notes]);
    expect(toSVG(pageCanvas(restored))).not.toContain("Private speaker notes");
    const legacyNotes = { ...d, notes: "Legacy note" };
    expect(designPages(addPage(legacyNotes, id, "added"))[0].notes).toBe("Legacy note");
    expect(isDesignLibrary([{ ...legacyNotes, notes: 42 }])).toBe(false);
    expect(isDesignLibrary([{ ...withNotes, pages: [{ ...designPages(withNotes)[0], notes: {} }] }])).toBe(false);
  });
  it("reads live updates without exposing any write operation, and preserves the last valid slide on corruption", async () => {
    const d = blankDesign({ w: 800, h: 600 }); let raw: string | null = JSON.stringify([d]);
    const storage = { getItem: () => raw, setItem: vi.fn() };
    const reader = createPresentationReader(d.id, async () => { const text = storage.getItem(); const value: unknown = text === null ? [] : JSON.parse(text); if (!isDesignLibrary(value)) throw Error("invalid"); return { revision: null, value, legacy: text }; }), listener = vi.fn();
    reader.subscribe(listener); await reader.read(); expect(reader.getSnapshot().design).toEqual(d);
    const initial = reader.getSnapshot(); await reader.read(); expect(reader.getSnapshot()).toBe(initial);
    raw = JSON.stringify([{ ...d, name: "Updated live" }]); await reader.read(); expect(reader.getSnapshot().design?.name).toBe("Updated live");
    raw = "{broken"; await reader.read(); expect(reader.getSnapshot().status).toBe("error"); expect(reader.getSnapshot().design?.name).toBe("Updated live");
    raw = null; await reader.read(); expect(reader.getSnapshot().design).toBeNull();
    expect(storage.setItem).not.toHaveBeenCalled(); expect(listener).toHaveBeenCalledTimes(4);
  });
  it("redacts both design ids and synchronization tokens in presentation analytics", () => {
    expect(routeContext("/canvaisdead/app/design/private-id/present?session=secret", "/canvaisdead")).toEqual({ surface: "presentation", route: "/app/design/:id/present" });
  });
});
