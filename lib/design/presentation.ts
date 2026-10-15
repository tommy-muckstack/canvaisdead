import type { Design } from "./types";
import { designPages } from "./pages";
import { isDesignLibrary } from "./validate";
export type PresentMode = "standard" | "presenter" | "audience" | "autoplay";
export function presentMode(value: unknown): PresentMode { return value === "presenter" || value === "audience" || value === "autoplay" ? value : "standard"; }
export type SlideCommand = "next" | "previous" | "first" | "last";
export function slideIndex(index: number, count: number, command: SlideCommand, loop = false) {
  if (count < 1) return 0;
  const current = Math.max(0, Math.min(count - 1, index));
  if (command === "first") return 0;
  if (command === "last") return count - 1;
  const next = current + (command === "next" ? 1 : -1);
  return loop ? (next + count) % count : Math.max(0, Math.min(count - 1, next));
}
export function slideMessage(value: unknown, design: Design): string | null {
  if (!value || typeof value !== "object") return null;
  const message = value as Record<string, unknown>;
  return message.version === 1 && message.type === "slide" && typeof message.pageId === "string" && designPages(design).some(page => page.id === message.pageId) ? message.pageId : null;
}
export function presentationSession(value: unknown) { return typeof value === "string" && /^[0-9a-f-]{36}$/i.test(value) ? value : ""; }

type ReadState = { status: "loading" | "ready" | "error"; design: Design | null; error: string };
// Read-only: presentation refreshes cannot replace unsaved editor state or write a library.
export function createPresentationReader(key: string, id: string, storage: () => Pick<Storage, "getItem">) {
  const server: ReadState = { status: "loading", design: null, error: "" };
  let state = server, previousRaw: string | null | undefined;
  const listeners = new Set<() => void>();
  function read() {
    try {
      const raw = storage().getItem(key);
      if (state.status === "ready" && raw === previousRaw) return;
      const value: unknown = raw === null ? [] : JSON.parse(raw);
      if (!isDesignLibrary(value)) throw Error("Invalid saved library");
      const design = value.find(item => item.id === id) ?? null;
      state = { status: "ready", design, error: "" }; previousRaw = raw;
    } catch { state = { status: "error", design: state.design, error: "The saved presentation could not be read. Your files have not been changed." }; }
    listeners.forEach(listener => listener());
  }
  return { read, getSnapshot: () => state, getServerSnapshot: () => server, subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; } };
}
