import type { Design } from "./types";
import { isDesignLibrary } from "./validate";
import { designStorageBlob, readDesignRecords } from "./record-file";

export const DESIGN_DATABASE = "canvaisdead-designs";
export const designStorageKey = (owner: string) => `canvaisdead:${owner}:designs`;
export type DesignRecord = { revision: string | null; value: Design[]; legacy?: string | null };
type StoredLibrary = { owner: string; revision: string } & (
  { version: 1; value: Design[] } | { version: 2; data: Blob }
);
export type DesignRepository = {
  read: (owner: string) => Promise<DesignRecord>;
  write: (owner: string, expected: DesignRecord, value: Design[]) => Promise<DesignRecord>;
  recover?: (owner: string) => Promise<unknown>;
};
export class DesignConflict extends Error { constructor() { super("Your designs changed in another tab. Download a backup of these edits before reloading to open the saved version."); this.name = "DesignConflict"; } }
function record(value: unknown, owner: string): StoredLibrary {
  const v = value as { version?: unknown; owner?: unknown; revision?: unknown; value?: unknown; data?: unknown } | null;
  if (!v || v.owner !== owner || typeof v.revision !== "string" || !v.revision ||
    !(v.version === 1 && isDesignLibrary(v.value) || v.version === 2 && v.data instanceof Blob)) throw Error("Saved designs could not be read. Existing data has not been changed.");
  return v as StoredLibrary;
}
/** Account libraries are committed atomically. Legacy localStorage bytes are never removed or rewritten. */
export function createDesignRepository(factory: () => IDBFactory = () => indexedDB, legacy: () => Pick<Storage, "getItem"> = () => localStorage): DesignRepository {
  const open = () => new Promise<IDBDatabase>((resolve, reject) => {
    let blocked = false; const request = factory().open(DESIGN_DATABASE, 1);
    request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains("libraries")) request.result.createObjectStore("libraries", { keyPath: "owner" }); };
    request.onblocked = () => { blocked = true; reject(Error("Close other tabs using design storage, then retry.")); };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => { const db = request.result; db.onversionchange = () => db.close(); if (blocked) db.close(); else resolve(db); };
  });
  async function transaction<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore, result: (value: T) => void, fail: (error: unknown) => void) => void) {
    const db = await open();
    return new Promise<T>((resolve, reject) => {
      let tx: IDBTransaction;
      try { tx = mode === "readwrite" ? db.transaction("libraries", mode, { durability: "strict" }) : db.transaction("libraries", mode); } catch (error) { db.close(); reject(error); return; }
      let value: T, failure: unknown;
      const fail = (error: unknown) => { failure = error; tx.abort(); };
      tx.oncomplete = () => { db.close(); resolve(value); };
      tx.onabort = () => { db.close(); reject(failure ?? tx.error ?? Error("Design storage is unavailable.")); };
      try { run(tx.objectStore("libraries"), result => { value = result; }, fail); } catch (error) { fail(error); }
    });
  }
  const ownerKey = (owner: string) => { if (!owner || owner.length > 128) throw Error("An account is required for local designs."); return owner; };
  return {
    recover: owner => transaction<unknown>("readonly", (store, result, fail) => {
      const request = store.get(ownerKey(owner)); request.onsuccess = () => {
        try { result(request.result === undefined ? { legacy: legacy().getItem(designStorageKey(owner)) } : request.result); } catch (error) { fail(error); }
      };
    }),
    read: async owner => {
      const saved = await transaction<StoredLibrary | DesignRecord>("readonly", (store, result, fail) => {
        const request = store.get(ownerKey(owner)); request.onsuccess = () => {
          try {
            if (request.result !== undefined) { result(record(request.result, owner)); return; }
            const raw = legacy().getItem(designStorageKey(owner)), value: unknown = raw === null ? [] : JSON.parse(raw);
            if (!isDesignLibrary(value)) throw Error("Saved designs could not be read. Existing data has not been changed.");
            result({ revision: null, value, legacy: raw });
          } catch (error) { fail(error); }
        };
      });
      // Blob reads are asynchronous: decode only after the IndexedDB transaction
      // completes, never await them inside an active transaction callback.
      if (!("version" in saved) || saved.version === 1) return { revision: saved.revision, value: saved.value, ...("legacy" in saved ? { legacy: saved.legacy } : {}) };
      const value = await readDesignRecords(saved.data);
      if (!isDesignLibrary(value)) throw Error("Saved designs could not be read. Existing data has not been changed.");
      return { revision: saved.revision, value };
    },
    write: async (owner, expected, value) => {
      ownerKey(owner);
      if (!isDesignLibrary(value)) throw Error("Invalid design data. Existing saved designs have not been changed.");
      // The payload lives out of line. Only bounded metadata and a Blob reference
      // cross the native structured-value size boundary. Encode before opening tx.
      const data = await designStorageBlob(value);
      return transaction<DesignRecord>("readwrite", (store, result, fail) => {
        const request = store.get(ownerKey(owner)); request.onsuccess = () => {
          try {
            const current = request.result === undefined ? null : record(request.result, owner);
            if ((current?.revision ?? null) !== expected.revision || (!current && legacy().getItem(designStorageKey(owner)) !== (expected.legacy ?? null))) throw new DesignConflict();
            const next: StoredLibrary = { version: 2, owner, revision: crypto.randomUUID(), data };
            store.put(next); result({ revision: next.revision, value });
          } catch (error) { fail(error); }
        };
      });
    },
  };
}
