import { changeUpload, expiredUpload, validUpload, type Upload, type UploadAction } from "./model";

export type UploadRepository = { list: () => Promise<Upload[]>; add: (item: Upload) => Promise<void>; change: (targets: { id: string; action: UploadAction }[]) => Promise<void> };
export type UploadSnapshot = { revision: string | null; assets: Upload[] };
export type UploadReceipt = { version: 1; id: string; guestId: string; sourceId: string; fingerprint: string };
export type UploadTransferRepository = UploadRepository & {
  snapshot: () => Promise<UploadSnapshot>;
  revision: () => Promise<string | null>;
  adopt: (item: Upload, receipt: UploadReceipt) => Promise<boolean>;
};
export function uploadDatabaseName(owner: string) { if (!owner || owner.length > 128) throw Error("An account is required for local uploads."); return `canvaisdead:${owner}:uploads`; }
const validReceipt = (v: unknown): v is UploadReceipt => {
  const r = v as Partial<UploadReceipt> | null;
  return !!r && r.version === 1 && typeof r.id === "string" && r.id === `guest-upload-${r.fingerprint}` && typeof r.guestId === "string" && /^g_[A-Za-z0-9_-]{10,40}$/.test(r.guestId) && typeof r.sourceId === "string" && !!r.sourceId && r.sourceId.length <= 128 && typeof r.fingerprint === "string" && /^[a-f0-9]{64}$/.test(r.fingerprint);
};
function revision(value: unknown): string | null {
  if (value === undefined) return null;
  const v = value as { version?: unknown; revision?: unknown } | null;
  if (!v || v.version !== 1 || typeof v.revision !== "string" || !v.revision) throw Error("Saved upload metadata could not be read. Existing files have not been changed.");
  return v.revision;
}
/** v2 retains v1 assets and adds atomic revision/transfer receipts, without moving media off-device. */
export function createUploadRepository(owner: string, factory: () => IDBFactory = () => indexedDB): UploadTransferRepository {
  const name = uploadDatabaseName(owner);
  const open = () => new Promise<IDBDatabase>((resolve, reject) => {
    let blocked = false; const request = factory().open(name, 2);
    request.onupgradeneeded = () => {
      for (const [store, keyPath] of [["assets", "id"], ["handoffs", "id"], ["meta", "key"]]) if (!request.result.objectStoreNames.contains(store)) request.result.createObjectStore(store, { keyPath });
    };
    request.onblocked = () => { blocked = true; reject(Error("Close other tabs using this upload library, then retry.")); };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => { const db = request.result; db.onversionchange = () => db.close(); if (blocked) db.close(); else resolve(db); };
  });
  async function transaction<T>(mode: IDBTransactionMode, run: (tx: IDBTransaction, result: (value: T) => void, fail: (error: unknown) => void) => void): Promise<T> {
    const db = await open();
    return new Promise<T>((resolve, reject) => {
      let tx: IDBTransaction;
      try { tx = db.transaction(["assets", "handoffs", "meta"], mode, { durability: "strict" }); } catch (error) { db.close(); reject(error); return; }
      let value: T, failure: unknown;
      const fail = (error: unknown) => { failure = error; tx.abort(); };
      tx.oncomplete = () => { db.close(); resolve(value); };
      tx.onabort = () => { db.close(); reject(failure ?? tx.error ?? Error("Local upload storage is unavailable.")); };
      // Every operation checks metadata before any write, including future-schema protection.
      const check = tx.objectStore("meta").get("library"); check.onsuccess = () => {
        try { revision(check.result); run(tx, result => { value = result; }, fail); } catch (error) { fail(error); }
      };
    });
  }
  const changed = (tx: IDBTransaction) => tx.objectStore("meta").put({ key: "library", version: 1, revision: crypto.randomUUID() });
  const readRevision = () => transaction<string | null>("readonly", (tx, result, fail) => {
    const request = tx.objectStore("meta").get("library"); request.onsuccess = () => { try { result(revision(request.result)); } catch (error) { fail(error); } };
  });
  return {
    revision: readRevision,
    snapshot: () => transaction<UploadSnapshot>("readonly", (tx, result, fail) => {
      const snapshot: UploadSnapshot = { revision: null, assets: [] }; result(snapshot);
      const meta = tx.objectStore("meta").get("library"); meta.onsuccess = () => { try { snapshot.revision = revision(meta.result); } catch (error) { fail(error); } };
      const assets = tx.objectStore("assets").getAll(); assets.onsuccess = () => {
        if (!assets.result.every(validUpload)) { fail(Error("Saved uploads could not be read. Existing files have not been changed.")); return; }
        snapshot.assets = assets.result;
      };
    }),
    list: () => transaction("readwrite", (tx, result, fail) => {
      const store = tx.objectStore("assets"), request = store.getAll(); request.onsuccess = () => {
        try {
          const items: unknown[] = request.result;
          if (!items.every(validUpload)) { fail(Error("Saved uploads could not be read. Existing files have not been changed.")); return; }
          const now = Date.now(), expired = items.filter(item => expiredUpload(item, now));
          for (const item of expired) store.delete(item.id);
          if (expired.length) changed(tx);
          result(items.filter(item => !expiredUpload(item, now)));
        } catch (error) { fail(error); }
      };
    }),
    add: item => transaction("readwrite", (tx, result, fail) => {
      if (!validUpload(item)) { fail(Error("Invalid local image data.")); return; }
      const store = tx.objectStore("assets"), request = store.get(item.id); request.onsuccess = () => {
        try {
          if (request.result !== undefined) { if (!validUpload(request.result) || request.result.createdAt !== item.createdAt || request.result.original.size !== item.original.size) { fail(Error("This upload ID is already in use.")); return; } }
          else { store.add(item); changed(tx); }
          result(undefined);
        } catch (error) { fail(error); }
      };
    }),
    change: targets => transaction("readwrite", (tx, result, fail) => {
      const store = tx.objectStore("assets");
      for (const { id, action } of targets) { const request = store.get(id); request.onsuccess = () => {
        if (request.result === undefined) return;
        if (!validUpload(request.result)) { fail(Error("This saved upload could not be read. It has not been changed.")); return; }
        try { const next = changeUpload(request.result, action); if (next === null) { store.delete(id); changed(tx); } else if (next !== request.result) { store.put(next); changed(tx); } } catch (error) { fail(error); }
      }; }
      result(undefined);
    }),
    adopt: (item, receipt) => transaction("readwrite", (tx, result, fail) => {
      if (!validUpload(item) || !validReceipt(receipt) || item.id !== receipt.id) { fail(Error("Invalid guest upload copy. Existing files have not been changed.")); return; }
      const receipts = tx.objectStore("handoffs"), request = receipts.get(receipt.id);
      request.onsuccess = () => {
        try {
          if (request.result !== undefined) {
            if (!validReceipt(request.result) || request.result.guestId !== receipt.guestId || request.result.sourceId !== receipt.sourceId || request.result.fingerprint !== receipt.fingerprint) throw Error("A guest upload copy conflicts with existing account data.");
            // Keep a later rename, trash or permanent deletion. Receipts survive asset deletion.
            result(false); return;
          }
          const store = tx.objectStore("assets"), existing = store.get(item.id); existing.onsuccess = () => {
            try {
              if (existing.result !== undefined) throw Error("A guest upload copy conflicts with an existing file. It has not been replaced.");
              store.add(item); receipts.add(receipt); changed(tx); result(true);
            } catch (error) { fail(error); }
          };
        } catch (error) { fail(error); }
      };
    }),
  };
}
