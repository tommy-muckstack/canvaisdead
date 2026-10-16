import type { Upload } from "./model";
import type { UploadRepository } from "./repository";

export type UploadJob = { id: string; name: string; status: "queued" | "reading" | "saving" | "failed"; error?: string };
type Snapshot = { assets: Upload[]; jobs: UploadJob[]; status: "loading" | "ready" | "error"; error: string | null; operationError: string | null; changing: number };
type Prepare = (file: File, id: string, signal: AbortSignal) => Promise<Upload>;
const message = (error: unknown) => error instanceof Error && error.name === "QuotaExceededError" ? "This browser's storage is full. Free some space, then retry. The original file has not been changed." : error instanceof Error ? error.message : "Local upload storage is unavailable. Try again.";
/** Serial import queue persists in browser memory across editor navigation. */
export function createUploadStore(repository: UploadRepository, prepare: Prepare, changed: () => void = () => {}) {
  const initial: Snapshot = { assets: [], jobs: [], status: "loading", error: null, operationError: null, changing: 0 };
  let snapshot = initial, revision = 0, loading: Promise<void> | null = null, tail: Promise<unknown> = Promise.resolve();
  const operations = new Set<Promise<boolean>>();
  const listeners = new Set<() => void>(), files = new Map<string, { file: File; controller: AbortController; prepared?: Upload }>();
  const publish = (patch: Partial<Snapshot>) => { snapshot = { ...snapshot, ...patch }; listeners.forEach(listener => listener()); };
  async function refresh() {
    const version = ++revision;
    try { const assets = await repository.list(); if (version === revision) publish({ assets, status: "ready", error: null }); }
    catch (error) { if (version === revision) publish({ status: "error", error: message(error) }); }
  }
  const job = (id: string, patch: Partial<UploadJob>) => publish({ jobs: snapshot.jobs.map(item => item.id === id ? { ...item, ...patch } : item) });
  const dismiss = (id: string) => {
    if (snapshot.jobs.find(item => item.id === id)?.status === "saving") return;
    files.get(id)?.controller.abort(); files.delete(id); publish({ jobs: snapshot.jobs.filter(item => item.id !== id) });
  };
  async function process(id: string) {
    const pending = files.get(id); if (!pending || pending.controller.signal.aborted) return null;
    try {
      job(id, { status: "reading", error: undefined });
      pending.prepared ??= await prepare(pending.file, id, pending.controller.signal);
      if (pending.controller.signal.aborted || !files.has(id)) return null;
      job(id, { status: "saving" }); await repository.add(pending.prepared);
      files.delete(id); publish({ jobs: snapshot.jobs.filter(item => item.id !== id) });
      try { changed(); } catch { /* The file already committed. */ }
      await refresh(); return pending.prepared;
    } catch (error) {
      if (!pending.controller.signal.aborted && files.has(id)) job(id, { status: "failed", error: message(error) });
      return null;
    }
  }
  const schedule = (id: string) => { const next = tail.then(() => process(id)); tail = next.catch(() => null); return next; };
  return {
    getSnapshot: () => snapshot, getServerSnapshot: () => initial,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    load: () => { loading ??= refresh().finally(() => { loading = null; }); return loading; }, refresh,
    enqueue: async (selected: readonly File[]) => {
      const jobs = selected.map(file => { const id = `upload_${crypto.randomUUID()}`; files.set(id, { file, controller: new AbortController() }); return { id, name: file.name, status: "queued" as const }; });
      publish({ jobs: [...snapshot.jobs, ...jobs] });
      const results = await Promise.all(jobs.map(item => schedule(item.id))); return results.filter((item): item is Upload => !!item);
    },
    retry: (id: string) => { const item = snapshot.jobs.find(item => item.id === id); if (item?.status !== "failed") return Promise.resolve(null); job(id, { status: "queued", error: undefined }); return schedule(id); },
    dismiss,
    change: (targets: Parameters<UploadRepository["change"]>[0]) => {
      const work = (async () => {
        publish({ operationError: null, changing: snapshot.changing + 1 });
        try {
          await repository.change(targets);
          try { changed(); } catch { /* The change already committed. */ }
          await refresh(); return true;
        } catch (error) { publish({ operationError: message(error) }); return false; }
        finally { publish({ changing: snapshot.changing - 1 }); }
      })();
      operations.add(work); void work.then(() => operations.delete(work), () => operations.delete(work)); return work;
    },
    pendingFile: (id: string) => files.get(id)?.file,
    pending: () => snapshot.jobs.length > 0 || snapshot.changing > 0,
    settle: async () => {
      while (true) {
        const imports = tail, changes = [...operations], read = loading;
        await Promise.all([imports, ...changes, read]);
        if (imports === tail && operations.size === 0 && !loading) return snapshot.jobs.length === 0;
      }
    },
    clearOperationError: () => publish({ operationError: null }),
  };
}
export type UploadStore = ReturnType<typeof createUploadStore>;
