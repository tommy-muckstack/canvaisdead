"use client";
import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { createUploadRepository, uploadDatabaseName } from "@/lib/uploads/repository";
import { createUploadStore, type UploadStore } from "@/lib/uploads/store";
import { prepareUpload } from "@/lib/uploads/image";

const stores = new Map<string, UploadStore>();
export const uploadMemoryStore = (owner: string) => stores.get(owner);
export function notifyUploadChange(owner: string) {
  try { if (typeof BroadcastChannel !== "undefined") { const channel = new BroadcastChannel(uploadDatabaseName(owner)); channel.postMessage("changed"); channel.close(); } } catch { /* Focus refresh still works when cross-tab messaging is unavailable. */ }
}
export function useUploads(owner: string) {
  const store = useMemo(() => {
    if (typeof window === "undefined") return createUploadStore(createUploadRepository(owner), prepareUpload);
    let store = stores.get(owner);
    if (!store) {
      store = createUploadStore(createUploadRepository(owner), prepareUpload, () => notifyUploadChange(owner));
      stores.set(owner, store);
    }
    return store;
  }, [owner]);
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  useEffect(() => {
    void store.load(); const refresh = () => { void store.refresh(); };
    let channel: BroadcastChannel | null = null;
    try { if (typeof BroadcastChannel !== "undefined") channel = new BroadcastChannel(uploadDatabaseName(owner)); } catch { /* Refresh on focus when messaging is blocked. */ }
    if (channel) channel.onmessage = refresh;
    window.addEventListener("focus", refresh); const timer = window.setInterval(refresh, 60_000);
    return () => { window.removeEventListener("focus", refresh); window.clearInterval(timer); channel?.close(); };
  }, [store, owner]);
  useEffect(() => {
    if (!snapshot.jobs.some(job => job.status !== "failed")) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn);
  }, [snapshot.jobs]);
  const readSnapshot = useCallback(() => createUploadRepository(owner).snapshot(), [owner]);
  return { ...snapshot, store, readSnapshot };
}
