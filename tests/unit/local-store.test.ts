import { describe, expect, it, vi } from "vitest";
import { createLocalStore } from "@/lib/local-store";
import { isDesignLibrary } from "@/lib/design/validate";
import { blankDesign } from "@/lib/design/ops";
import { TEMPLATES, fromTemplate } from "@/lib/design/templates";

function fixture(raw: string | null = null) {
  const values = new Map<string, string>();
  if (raw !== null) values.set("designs", raw);
  const storage = {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => { values.set(key, value); }),
  };
  const store = createLocalStore("designs", [], () => storage, isDesignLibrary);
  return { store, storage, values };
}

describe("local design persistence", () => {
  it("does not read during construction or overwrite data during loading", () => {
    const design = blankDesign({ w: 800, h: 600 });
    const { store, storage } = fixture(JSON.stringify([design]));
    expect(storage.getItem).not.toHaveBeenCalled();
    expect(store.set([])).toBe(false);
    expect(store.load()).toBe(true);
    expect(store.getSnapshot()).toMatchObject({ value: [design], status: "saved" });
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(store.set(previous => [...previous])).toBe(true);
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("persists a new design before returning success to navigation", () => {
    const { store, values } = fixture();
    const design = blankDesign({ w: 800, h: 600 });
    store.load();
    expect(store.set(previous => [design, ...previous])).toBe(true);
    expect(JSON.parse(values.get("designs")!)).toEqual([design]);
    expect(store.getSnapshot().status).toBe("saved");
  });

  it.each(["{broken", "null", "{}", '[{"name":7}]', ""])('preserves unreadable data %j and refuses writes', raw => {
    const { store, storage, values } = fixture(raw);
    expect(store.load()).toBe(false);
    expect(store.getSnapshot().status).toBe("load-error");
    expect(store.set([])).toBe(false);
    expect(values.get("designs")).toBe(raw);
    expect(storage.setItem).not.toHaveBeenCalled();
    values.set("designs", "[]");
    expect(store.retry()).toBe(true);
  });

  it("recovers from denied storage access without first writing empty data", () => {
    let denied = true;
    const getItem = vi.fn(() => "[]");
    const setItem = vi.fn();
    const store = createLocalStore("designs", [], () => {
      if (denied) throw new Error("Access denied");
      return { getItem, setItem };
    }, isDesignLibrary);
    expect(store.load()).toBe(false);
    expect(store.set([])).toBe(false);
    denied = false;
    expect(store.retry()).toBe(true);
    expect(setItem).not.toHaveBeenCalled();
  });

  it("keeps the latest unsaved edits in memory and retries that version", () => {
    const design = blankDesign({ w: 800, h: 600 });
    const raw = JSON.stringify([design]);
    const { store, storage, values } = fixture(raw);
    store.load();
    storage.setItem.mockImplementation(() => { throw new Error("Quota exceeded"); });
    expect(store.set([{ ...design, name: "First edit" }])).toBe(false);
    expect(store.set(previous => previous.map(item => ({ ...item, name: "Latest edit" })))).toBe(false);
    expect(store.getSnapshot()).toMatchObject({ value: [{ name: "Latest edit" }], status: "unsaved" });
    expect(values.get("designs")).toBe(raw);
    expect(store.load()).toBe(false); // Remounting must not discard unsaved edits.
    storage.setItem.mockImplementation((key, value) => { values.set(key, value); });
    expect(store.retry()).toBe(true);
    expect(JSON.parse(values.get("designs")!)[0].name).toBe("Latest edit");
    expect(store.getSnapshot()).toMatchObject({ status: "saved", error: null });
  });

  it("does not overwrite a newer library detected in another tab", () => {
    const design = blankDesign({ w: 800, h: 600 });
    const { store, values } = fixture(JSON.stringify([design]));
    store.load();
    const otherVersion = JSON.stringify([{ ...design, name: "Other tab" }]);
    values.set("designs", otherVersion);
    expect(store.set([{ ...design, name: "This tab" }])).toBe(false);
    expect(store.getSnapshot()).toMatchObject({ status: "conflict", value: [{ name: "This tab" }] });
    expect(store.retry()).toBe(false);
    expect(values.get("designs")).toBe(otherVersion);
  });

  it("isolates users and preserves the saved library on write-access failure", () => {
    const { storage, values } = fixture();
    const first = createLocalStore("user-one", [], () => storage, isDesignLibrary);
    const second = createLocalStore("user-two", [], () => storage, isDesignLibrary);
    first.load(); second.load();
    const design = blankDesign({ w: 800, h: 600 });
    first.set([design]);
    expect(second.getSnapshot().value).toEqual([]);
    expect(values.has("user-two")).toBe(false);
    storage.getItem.mockImplementation(() => { throw new Error("Access revoked"); });
    expect(first.set([{ ...design, name: "Pending" }])).toBe(false);
    expect(JSON.parse(values.get("user-one")!)[0].name).toBe(design.name);
    expect(first.getSnapshot().status).toBe("unsaved");
  });

  it("accepts legacy templates and rejects malformed element data before rendering", () => {
    const designs = TEMPLATES.map(fromTemplate);
    expect(isDesignLibrary(designs)).toBe(true);
    const textDesign = designs.find(design => design.els.some(element => element.type === "text"))!;
    const broken = { ...textDesign, els: textDesign.els.map(element => ({ ...element, text: 42 })) };
    expect(isDesignLibrary([broken])).toBe(false);
    expect(isDesignLibrary([{ ...textDesign, w: 0 }])).toBe(false);
  });
});
