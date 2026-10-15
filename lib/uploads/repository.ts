import { changeUpload, expiredUpload, validUpload, type Upload, type UploadAction } from "./model";

export type UploadRepository = { list: () => Promise<Upload[]>; add: (item: Upload) => Promise<void>; change: (targets: { id: string; action: UploadAction }[]) => Promise<void> };
export function uploadDatabaseName(owner: string) { if (!owner) throw Error("An account is required for local uploads."); return `canvaisdead:${owner}:uploads`; }
/** Separate local database per account; every mutation re-reads the current record in one transaction. */
export function createUploadRepository(owner: string, factory: () => IDBFactory = () => indexedDB): UploadRepository {
  const name = uploadDatabaseName(owner);
  const open = () => new Promise<IDBDatabase>((resolve, reject) => {
    let blocked = false; const request = factory().open(name, 1);
    request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains("assets")) request.result.createObjectStore("assets", { keyPath: "id" }); };
    request.onblocked = () => { blocked = true; reject(Error("Close other tabs using this upload library, then retry.")); };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => { const db = request.result; db.onversionchange = () => db.close(); if (blocked) db.close(); else resolve(db); };
  });
  async function transaction<T>(run: (store: IDBObjectStore, result: (value: T) => void, fail: (error: unknown) => void) => void): Promise<T> {
    const db = await open();
    return new Promise<T>((resolve, reject) => {
      let tx: IDBTransaction;
      try { tx = db.transaction("assets", "readwrite"); } catch (error) { db.close(); reject(error); return; }
      let value: T, failure: unknown;
      const fail = (error: unknown) => { failure = error; tx.abort(); };
      tx.oncomplete = () => { db.close(); resolve(value); };
      tx.onabort = () => { db.close(); reject(failure ?? tx.error ?? Error("Local upload storage is unavailable.")); };
      try { run(tx.objectStore("assets"), result => { value = result; }, fail); } catch (error) { fail(error); }
    });
  }
  return {
    list: () => transaction((store, result, fail) => {
      const request = store.getAll(); request.onsuccess = () => {
        const items: unknown[] = request.result;
        if (!items.every(validUpload)) { fail(Error("Saved uploads could not be read. Existing files have not been changed.")); return; }
        const now = Date.now(); for (const item of items) if (expiredUpload(item, now)) store.delete(item.id);
        result(items.filter(item => !expiredUpload(item, now)));
      };
    }),
    add: item => transaction((store, result, fail) => {
      if (!validUpload(item)) { fail(Error("Invalid local image data.")); return; }
      const request = store.get(item.id); request.onsuccess = () => {
        try {
          // Retry after a completed write may safely reuse its ID, never overwrite a later rename/trash.
          if (request.result !== undefined) { if (!validUpload(request.result) || request.result.createdAt !== item.createdAt || request.result.original.size !== item.original.size) { fail(Error("This upload ID is already in use.")); return; } }
          else store.add(item);
          result(undefined);
        } catch (error) { fail(error); }
      };
    }),
    change: targets => transaction((store, result, fail) => {
      for (const { id, action } of targets) { const request = store.get(id); request.onsuccess = () => {
        if (request.result === undefined) return;
        if (!validUpload(request.result)) { fail(Error("This saved upload could not be read. It has not been changed.")); return; }
        try { const next = changeUpload(request.result, action); if (next === null) store.delete(id); else if (next !== request.result) store.put(next); } catch (error) { fail(error); }
      }; }
      result(undefined);
    }),
  };
}
