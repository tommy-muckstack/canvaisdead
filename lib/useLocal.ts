"use client";
import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { createLocalStore, type LocalStore, type SaveState } from "./local-store";

// Browser memory only: retain unsaved edits across client navigation. Never cache user data on the server.
const browserStores = new Map<string, LocalStore<unknown>>();
export function useLocal<T>(ns: string, key: string, initial: T, validate?: (value: unknown) => value is T) {
  const storageKey = `canvaisdead:${ns}:${key}`;
  const initialValue = useRef(initial);
  const store = useMemo(() => {
    const create = () => createLocalStore(storageKey, initialValue.current, () => window.localStorage, validate);
    if (typeof window === "undefined") return create();
    let existing = browserStores.get(storageKey) as LocalStore<T> | undefined;
    if (!existing) {
      existing = create();
      browserStores.set(storageKey, existing as LocalStore<unknown>);
    }
    return existing;
  }, [storageKey, validate]);
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  useEffect(() => { store.load(); }, [store]);
  useEffect(() => {
    if (snapshot.status !== "unsaved" && snapshot.status !== "conflict") return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [snapshot.status]);
  const save: SaveState = { status: snapshot.status, error: snapshot.error, retry: store.retry };
  return [snapshot.value, store.set, snapshot.status !== "loading", save] as const;
}
