"use client";
import { useEffect, useMemo, useSyncExternalStore } from "react";
import { createDesignStore, type DesignStore } from "./design/local-store";
import { createDesignRepository } from "./design/repository";
import type { SaveState } from "./local-store";

const stores = new Map<string, DesignStore>();
const channelName = (owner: string) => `canvaisdead:${owner}:design-changes`;
export const designMemorySnapshot = (owner: string) => stores.get(owner)?.getSnapshot();
export function useDesignLibrary(owner: string) {
  const store = useMemo(() => {
    const create = () => createDesignStore(owner, createDesignRepository(), () => {
      try { const channel = new BroadcastChannel(channelName(owner)); channel.postMessage("saved"); channel.close(); } catch { /* Focus checks still protect stale edits. */ }
    });
    if (typeof window === "undefined") return create();
    let store = stores.get(owner); if (!store) { store = create(); stores.set(owner, store); } return store;
  }, [owner]);
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  useEffect(() => {
    void store.load(); const check = () => { void store.check(); };
    let channel: BroadcastChannel | null = null;
    try { channel = new BroadcastChannel(channelName(owner)); channel.onmessage = check; } catch { /* No cross-tab messaging in this browser. */ }
    window.addEventListener("focus", check); return () => { window.removeEventListener("focus", check); channel?.close(); };
  }, [owner, store]);
  useEffect(() => {
    if (!["saving", "unsaved", "conflict"].includes(snapshot.status)) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn);
  }, [snapshot.status]);
  const save = { status: snapshot.status, error: snapshot.error, retry: store.retry } satisfies SaveState;
  return [snapshot.value, store.set, snapshot.status !== "loading", save] as const;
}
