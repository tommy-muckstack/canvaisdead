import { test, expect } from "./fixtures";
import { uploadModules } from "./upload-modules";

test.beforeEach(async ({ page }) => { await page.goto("/canvaisdead/login"); await uploadModules(page); });

test("upload database upgrade retains version 1 originals and read-only snapshots do not prune Trash", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const owner = "g_legacyuploadtest", name = `canvaisdead:${owner}:uploads`;
    const original = new Blob(["original-bytes"], { type: "image/png" }), thumbnail = new Blob(["preview"], { type: "image/png" });
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(name, 1); request.onupgradeneeded = () => request.result.createObjectStore("assets", { keyPath: "id" });
      request.onsuccess = () => {
        const db = request.result, tx = db.transaction("assets", "readwrite");
        tx.objectStore("assets").add({ version: 1, id: "original", name: "Original.png", mime: "image/png", width: 20, height: 10, createdAt: 1, updatedAt: 1, original, thumbnail, trashedAt: 1 });
        tx.oncomplete = () => { db.close(); resolve(); }; tx.onabort = () => { db.close(); reject(tx.error); };
      }; request.onerror = () => reject(request.error);
    });
    const repo = window.uploadHandoffTest.repository.createUploadRepository(owner), first = await repo.snapshot(), second = await repo.snapshot();
    return { first: first.assets.length, second: second.assets.length, revision: first.revision, bytes: await first.assets[0].original.text(), trash: first.assets[0].trashedAt };
  });
  expect(result).toEqual({ first: 1, second: 1, revision: null, bytes: "original-bytes", trash: 1 });
});

test("an aborted receipt transaction commits no copy, and retries preserve later account edits and deletion", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { createUploadRepository } = window.uploadHandoffTest.repository, { copyGuestUploads } = window.uploadHandoffTest.handoff;
    const handoff = { guestId: "g_receiptuploadtest", accountId: "receipt-account" }, source = createUploadRepository(handoff.guestId), target = createUploadRepository(handoff.accountId);
    await source.add({ version: 1, id: "a", name: "Original.png", mime: "image/png", width: 20, height: 10, createdAt: 1, updatedAt: 1, original: new Blob(["original"], { type: "image/png" }), thumbnail: new Blob(["preview"], { type: "image/png" }) });
    const add = IDBObjectStore.prototype.add; IDBObjectStore.prototype.add = function(value, key) {
      if (this.name === "handoffs") throw new DOMException("fixture quota", "QuotaExceededError");
      return key === undefined ? add.call(this, value) : add.call(this, value, key);
    };
    let failed = false;
    try { await copyGuestUploads(handoff, source, target); } catch { failed = true; } finally { IDBObjectStore.prototype.add = add; }
    const afterFailure = (await target.snapshot()).assets.length;
    const retry = await copyGuestUploads(handoff, source, target), copy = (await target.snapshot()).assets[0];
    await target.change([{ id: copy.id, action: { kind: "rename", name: "Account edit.png" } }]);
    await copyGuestUploads(handoff, source, target); const renamed = (await target.snapshot()).assets[0].name;
    await target.change([{ id: copy.id, action: { kind: "trash" } }]); const trash = (await target.snapshot()).assets[0];
    await target.change([{ id: copy.id, action: { kind: "delete", trashedAt: trash.trashedAt! } }]);
    const again = await copyGuestUploads(handoff, source, target);
    return { failed, afterFailure, copied: retry.copied, renamed, copiedAgain: again.copied, remaining: (await target.snapshot()).assets.length, original: await (await source.snapshot()).assets[0].original.text() };
  });
  expect(result).toEqual({ failed: true, afterFailure: 0, copied: 1, renamed: "Account edit.png", copiedAgain: 0, remaining: 0, original: "original" });
});

test("source changes during a committed transfer prevent acknowledgment and a retry includes new uploads", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { createUploadRepository } = window.uploadHandoffTest.repository, { copyGuestUploads, transferGuestWorkspace } = window.uploadHandoffTest.handoff;
    const pair = { guestId: "g_changinguploads", accountId: "changing-account" }, source = createUploadRepository(pair.guestId), target = createUploadRepository(pair.accountId);
    const original = { version: 1 as const, id: "first", name: "First.png", mime: "image/png", width: 20, height: 10, createdAt: 1, updatedAt: 1, original: new Blob(["first"], { type: "image/png" }), thumbnail: new Blob(["preview"], { type: "image/png" }) };
    await source.add(original); let acknowledged = false, changed = false;
    const concurrent = { ...target, adopt: async (...args: Parameters<typeof target.adopt>) => { const ok = await target.adopt(...args); if (!changed) { changed = true; await source.add({ ...original, id: "second", name: "Second.png" }); } return ok; } };
    try { await transferGuestWorkspace(() => copyGuestUploads(pair, source, concurrent), async () => ({}), async () => { acknowledged = true; }); } catch { /* Expected revision conflict. */ }
    const blocked = !acknowledged;
    await transferGuestWorkspace(() => copyGuestUploads(pair, source, target), async () => ({}), async () => { acknowledged = true; });
    return { blocked, acknowledged, names: (await target.snapshot()).assets.map(item => item.name).sort(), sourceCount: (await source.snapshot()).assets.length };
  });
  expect(result).toEqual({ blocked: true, acknowledged: true, names: ["First.png", "Second.png"], sourceCount: 2 });
});

test("an existing target ID and unsupported metadata fail closed without replacing originals", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { createUploadRepository } = window.uploadHandoffTest.repository, { guestUploadReceipt } = window.uploadHandoffTest.handoff;
    const owner = "collision-account", repo = createUploadRepository(owner);
    const source = { version: 1 as const, id: "source", name: "Source.png", mime: "image/png", width: 20, height: 10, createdAt: 1, updatedAt: 1, original: new Blob(["source"], { type: "image/png" }), thumbnail: new Blob(["preview"], { type: "image/png" }) };
    const receipt = await guestUploadReceipt("g_collisionguest", source), existing = { ...source, id: receipt.id, name: "Existing account.png" };
    await repo.add(existing); let collision = false;
    try { await repo.adopt({ ...source, id: receipt.id }, receipt); } catch { collision = true; }
    const preserved = (await repo.snapshot()).assets[0].name;
    const db = await new Promise<IDBDatabase>((resolve, reject) => { const request = indexedDB.open(`canvaisdead:${owner}:uploads`, 2); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
    await new Promise<void>((resolve, reject) => { const tx = db.transaction("meta", "readwrite"); tx.objectStore("meta").put({ key: "library", version: 2, revision: "future" }); tx.oncomplete = () => resolve(); tx.onabort = () => reject(tx.error); });
    let future = false; try { await repo.add({ ...source, id: "should-not-save" }); } catch { future = true; }
    const ids = await new Promise<IDBValidKey[]>((resolve, reject) => { const tx = db.transaction("assets", "readonly"), request = tx.objectStore("assets").getAllKeys(); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); }); db.close();
    return { collision, preserved, future, onlyOriginal: ids.length === 1 && ids[0] === receipt.id };
  });
  expect(result).toEqual({ collision: true, preserved: "Existing account.png", future: true, onlyOriginal: true });
});

test("an unreadable account library blocks guest acknowledgment until repaired", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { createUploadRepository } = window.uploadHandoffTest.repository, { copyGuestUploads, transferGuestWorkspace } = window.uploadHandoffTest.handoff;
    const pair = { guestId: "g_unreadableuploads", accountId: "unreadable-account" }, source = createUploadRepository(pair.guestId), target = createUploadRepository(pair.accountId);
    const original = { version: 1 as const, id: "original", name: "Original.png", mime: "image/png", width: 20, height: 10, createdAt: 1, updatedAt: 1, original: new Blob(["original"], { type: "image/png" }), thumbnail: new Blob(["preview"], { type: "image/png" }) };
    await source.add(original); await target.add({ ...original, id: "account" });
    const db = await new Promise<IDBDatabase>((resolve, reject) => { const request = indexedDB.open(`canvaisdead:${pair.accountId}:uploads`, 2); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
    const putAccount = (version: number) => new Promise<void>((resolve, reject) => { const tx = db.transaction("assets", "readwrite"); tx.objectStore("assets").put({ ...original, id: "account", version }); tx.oncomplete = () => resolve(); tx.onabort = () => reject(tx.error); });
    await putAccount(2); let acknowledged = false, failed = false;
    const transfer = () => transferGuestWorkspace(() => copyGuestUploads(pair, source, target), async () => ({}), async () => { acknowledged = true; });
    try { await transfer(); } catch { failed = true; }
    const blocked = !acknowledged, count = await new Promise<number>((resolve, reject) => { const request = db.transaction("assets", "readonly").objectStore("assets").count(); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
    await putAccount(1); db.close(); await transfer();
    return { failed, blocked, countBeforeRepair: count, acknowledged, afterRepair: (await target.snapshot()).assets.length, source: await (await source.snapshot()).assets[0].original.text() };
  });
  expect(result).toEqual({ failed: true, blocked: true, countBeforeRepair: 1, acknowledged: true, afterRepair: 2, source: "original" });
});
