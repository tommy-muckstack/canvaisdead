export type SaveStatus = "loading" | "saved" | "unsaved" | "load-error" | "conflict";
export type SaveState = { status: SaveStatus; error: string | null; retry: () => boolean };
type Snapshot<T> = { value: T; status: SaveStatus; error: string | null };
type StorageAccess = () => Pick<Storage, "getItem" | "setItem">;

/** Synchronous, local-only persistence. Failed writes keep the latest value in memory. */
export function createLocalStore<T>(key: string, initial: T, storage: StorageAccess, validate?: (value: unknown) => value is T) {
  const serverSnapshot: Snapshot<T> = { value: initial, status: "loading", error: null };
  let snapshot = serverSnapshot;
  let persisted: string | null = null;
  const listeners = new Set<() => void>();
  function publish(next: Snapshot<T>) {
    snapshot = next;
    listeners.forEach(listener => listener());
  }
  function load() {
    if (snapshot.status !== "loading" && snapshot.status !== "load-error") return snapshot.status === "saved";
    try {
      const raw = storage().getItem(key);
      const value: unknown = raw === null ? initial : JSON.parse(raw);
      if (validate && !validate(value)) throw new Error("Invalid saved data");
      persisted = raw;
      publish({ value: value as T, status: "saved", error: null });
      return true;
    } catch {
      publish({ ...snapshot, status: "load-error", error: "Your designs could not be read from this browser. Existing saved data has not been changed. Check browser storage access and try again." });
      return false;
    }
  }
  function write(value: T) {
    try {
      const target = storage();
      // Never replace another tab's newer library with this tab's stale copy.
      if (target.getItem(key) !== persisted) {
        publish({ value, status: "conflict", error: "Your designs changed in another tab. Download a backup of these edits before reloading to open the saved version." });
        return false;
      }
      const raw = JSON.stringify(value);
      if (raw !== persisted) target.setItem(key, raw);
      persisted = raw;
      publish({ value, status: "saved", error: null });
      return true;
    } catch {
      publish({ value, status: "unsaved", error: "Changes could not be saved in this browser. Storage may be full or unavailable. Keep this tab open, download a backup, or free browser storage and retry." });
      return false;
    }
  }
  function set(update: T | ((previous: T) => T)) {
    if (snapshot.status === "loading" || snapshot.status === "load-error") return false;
    const value = typeof update === "function" ? (update as (previous: T) => T)(snapshot.value) : update;
    return write(value);
  }
  return {
    getSnapshot: () => snapshot,
    getServerSnapshot: () => serverSnapshot,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    load,
    set,
    retry: () => snapshot.status === "load-error" || snapshot.status === "loading" ? load() : write(snapshot.value),
  };
}

export type LocalStore<T> = ReturnType<typeof createLocalStore<T>>;
