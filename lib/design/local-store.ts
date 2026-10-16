import type { SaveStatus } from "../local-store";
import type { Design } from "./types";
import { DesignConflict, type DesignRecord, type DesignRepository } from "./repository";
import { isDesignLibrary } from "./validate";

type Snapshot = { value: Design[]; status: SaveStatus; error: string | null };
export type DesignUpdate = (update: Design[] | ((previous: Design[]) => Design[])) => Promise<boolean>;
const saveError = "Changes could not be saved in this browser. Storage may be full or unavailable. Keep this tab open, download a backup, or free browser storage and retry.";
/** Publish edits immediately, acknowledge only committed revisions, and coalesce intervening autosaves. */
export function createDesignStore(owner: string, repository: DesignRepository, changed: () => void = () => {}) {
  const initial: Snapshot = { value: [], status: "loading", error: null };
  let snapshot = initial, base: DesignRecord | null = null, generation = 0, committed = 0;
  let loading: Promise<boolean> | null = null, running: Promise<void> | null = null;
  let detached = false;
  const listeners = new Set<() => void>(), waiting: { generation: number; resolve: (saved: boolean) => void }[] = [];
  const publish = (patch: Partial<Snapshot>) => { snapshot = { ...snapshot, ...patch }; listeners.forEach(listener => listener()); };
  const settle = (success: boolean, through = Infinity) => { for (let i = waiting.length - 1; i >= 0; i--) if (waiting[i].generation <= through) waiting.splice(i, 1)[0].resolve(success); };
  function releaseSavedSnapshot() {
    // A new editor must load current saved artwork before initializing history.
    // Keep pending work and recovery snapshots across client navigation.
    if (!detached || loading || snapshot.status !== "saved" || generation !== committed) return;
    base = null; snapshot = initial;
  }
  function pump() {
    if (running || !base || snapshot.status === "conflict") return;
    running = (async () => {
      while (generation > committed && snapshot.status === "saving") {
        const version = generation, value = snapshot.value;
        try {
          base = await repository.write(owner, base!, value); committed = version;
          publish({ status: generation === committed ? "saved" : "saving", error: null });
          settle(true, version);
          try { changed(); } catch { /* Storage already committed; notifications are best effort. */ }
        } catch (error) {
          publish({ status: error instanceof DesignConflict ? "conflict" : "unsaved", error: error instanceof DesignConflict ? error.message : saveError });
          settle(false); break;
        }
      }
    })().finally(() => { running = null; if (generation > committed && snapshot.status === "saving") pump(); releaseSavedSnapshot(); });
  }
  const wait = () => new Promise<boolean>(resolve => { waiting.push({ generation, resolve }); pump(); });
  function load(): Promise<boolean> {
    if (loading) return loading;
    if (snapshot.status !== "loading" && snapshot.status !== "load-error") return Promise.resolve(snapshot.status === "saved");
    loading = repository.read(owner).then(value => { base = value; publish({ value: value.value, status: "saved", error: null }); return true; }).catch(() => {
      publish({ status: "load-error", error: "Your designs could not be read from this browser. Existing saved data has not been changed. Check browser storage access and try again." }); return false;
    }).finally(() => { loading = null; releaseSavedSnapshot(); });
    return loading;
  }
  const set: DesignUpdate = update => {
    if (!base || snapshot.status === "loading" || snapshot.status === "load-error") return Promise.resolve(false);
    const value = typeof update === "function" ? update(snapshot.value) : update;
    if (!isDesignLibrary(value)) return Promise.resolve(false);
    if (value.length === snapshot.value.length && value.every((design, i) => design === snapshot.value[i])) return snapshot.status === "saving" ? wait() : Promise.resolve(snapshot.status === "saved");
    generation++;
    const conflict = snapshot.status === "conflict";
    publish({ value, status: conflict ? "conflict" : "saving", error: conflict ? snapshot.error : null });
    return conflict ? Promise.resolve(false) : wait();
  };
  return {
    getSnapshot: () => snapshot, getServerSnapshot: () => initial,
    subscribe: (listener: () => void) => {
      detached = false; listeners.add(listener);
      return () => { listeners.delete(listener); if (!listeners.size) { detached = true; releaseSavedSnapshot(); } };
    },
    load, set,
    retry: () => !base ? load() : snapshot.status === "conflict" ? Promise.resolve(false) : generation === committed ? Promise.resolve(true) : (publish({ status: "saving", error: null }), wait()),
    check: async () => {
      if (!base || running || snapshot.status !== "saved") return;
      const before = base;
      try {
        const latest = await repository.read(owner);
        if (base !== before || running || snapshot.status !== "saved") return;
        if (latest.revision !== base.revision || latest.legacy !== base.legacy) publish({ status: "conflict", error: new DesignConflict().message });
      } catch { /* A later read/save reports unavailable storage without discarding this tab's artwork. */ }
    },
  };
}
export type DesignStore = ReturnType<typeof createDesignStore>;
