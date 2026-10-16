import { test, expect } from "./fixtures";
import { designModules } from "./upload-modules";
import { originalPNG } from "../fixtures/png";

test.beforeEach(async ({ page }) => { await page.goto("/canvaisdead/login"); await designModules(page); });

test("legacy localStorage and version 1 records migrate only after a successful atomic Blob commit", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { createDesignRepository, designStorageKey } = window.designHandoffTest.repository;
    const repository = createDesignRepository(), original = { id: "design", name: "Legacy", w: 800, h: 600, bg: "#fff", els: [], updatedAt: 1 };
    const raw = JSON.stringify([original]); localStorage.setItem(designStorageKey("legacy-local"), raw);
    await window.designTestStorage.setItem(designStorageKey("legacy-record"), raw);
    const before = await repository.read("legacy-record"), put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function(value, key) {
      if (this.name === "libraries" && value.version === 2) throw new DOMException("fixture quota", "QuotaExceededError");
      return key === undefined ? put.call(this, value) : put.call(this, value, key);
    };
    let rejected = false;
    try { await repository.write("legacy-record", before, [{ ...original, name: "Unsaved" }]); } catch { rejected = true; } finally { IDBObjectStore.prototype.put = put; }
    const preserved = await repository.read("legacy-record");
    for (const owner of ["legacy-local", "legacy-record"]) await repository.write(owner, await repository.read(owner), [{ ...original, name: "Migrated" }]);
    const stored = await repository.recover!("legacy-record") as { version: number; data: Blob; value?: unknown };
    const reopened = await createDesignRepository().read("legacy-record");
    return { rejected, preserved: preserved.value[0].name, revisionPreserved: before.revision === preserved.revision, legacyUntouched: localStorage.getItem(designStorageKey("legacy-local")) === raw, version: stored.version, blob: stored.data instanceof Blob, noInlineValue: !("value" in stored), reopened: reopened.value[0].name };
  });
  expect(result).toEqual({ rejected: true, preserved: "Legacy", revisionPreserved: true, legacyUntouched: true, version: 2, blob: true, noInlineValue: true, reopened: "Migrated" });
});

test("concurrent Blob saves retain exactly one winner and stale revisions cannot overwrite it", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { createDesignRepository } = window.designHandoffTest.repository, repository = createDesignRepository();
    const original = { id: "design", name: "Before", w: 800, h: 600, bg: "#fff", els: [], updatedAt: 1 };
    await repository.write("race", await repository.read("race"), [original]);
    const first = await repository.read("race"), second = await createDesignRepository().read("race");
    const outcomes = await Promise.allSettled([repository.write("race", first, [{ ...original, name: "One" }]), repository.write("race", second, [{ ...original, name: "Two" }])]);
    const saved = await repository.read("race"), winning = outcomes.find(value => value.status === "fulfilled");
    let stale = false; try { await repository.write("race", first, [original]); } catch { stale = true; }
    return { fulfilled: outcomes.filter(value => value.status === "fulfilled").length, conflict: outcomes.some(value => value.status === "rejected" && value.reason.name === "DesignConflict"), winner: winning?.status === "fulfilled" && saved.value[0].name === winning.value.value[0].name, stale, retained: (await repository.read("race")).revision === saved.revision };
  });
  expect(result).toEqual({ fulfilled: 1, conflict: true, winner: true, stale: true, retained: true });
});

test("unreadable Blob payloads stay recoverable and future record versions cannot be overwritten", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { createDesignRepository } = window.designHandoffTest.repository, { designRecoveryFile } = window.designHandoffTest.recovery;
    const repository = createDesignRepository(), original = { id: "design", name: "Saved", w: 800, h: 600, bg: "#fff", els: [], updatedAt: 1 };
    const saved = await repository.write("corrupt", await repository.read("corrupt"), [original]);
    const data = new Blob([new Uint8Array([255, 0, 123])]);
    const db = await new Promise<IDBDatabase>((resolve, reject) => { const request = indexedDB.open("canvaisdead-designs", 1); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
    const replace = (version: number) => new Promise<void>((resolve, reject) => { const tx = db.transaction("libraries", "readwrite"); tx.objectStore("libraries").put({ version, owner: "corrupt", revision: saved.revision, data }); tx.oncomplete = () => resolve(); tx.onabort = () => reject(tx.error); });
    await replace(2); let unreadable = false; try { await repository.read("corrupt"); } catch { unreadable = true; }
    const recovery = await designRecoveryFile(await repository.recover!("corrupt"));
    await replace(99); let protectedVersion = false; try { await repository.write("corrupt", saved, [original]); } catch { protectedVersion = true; }
    db.close(); const retained = await repository.recover!("corrupt") as { version: number; data: Blob };
    return { unreadable, recovered: Array.from(new Uint8Array(await recovery.blob.arrayBuffer())), protectedVersion, version: retained.version, bytes: Array.from(new Uint8Array(await retained.data.arrayBuffer())) };
  });
  expect(result).toEqual({ unreadable: true, recovered: [255, 0, 123], protectedVersion: true, version: 99, bytes: [255, 0, 123] });
});

test("a library above the native structured-value ceiling survives backup, restore and guest handoff with exact originals", async ({ page }) => {
  test.setTimeout(240_000);
  const src = `data:image/png;base64,${originalPNG(4096, 4096).toString("base64")}`;
  const result = await page.evaluate(async src => {
    const { createDesignRepository } = window.designHandoffTest.repository, { copyGuestDesigns } = window.designHandoffTest.handoff, { designBackupBlob, readDesignBackup } = window.designHandoffTest.backup;
    const repository = createDesignRepository(), owner = "g_blobcapacitycase", account = "blob-account";
    const image = { id: "image", type: "image" as const, x: 0, y: 0, w: 300, h: 300, rotation: 0, opacity: 1, fill: "#fff", stroke: "#000", strokeWidth: 0, radius: 0, src };
    const design = { id: "original", name: "Large original", w: 800, h: 600, bg: "#fff", updatedAt: 1, els: Array.from({ length: 3 }, (_, i) => ({ ...image, id: `image-${i}` })) };
    await repository.write(owner, await repository.read(owner), [design]);
    let loaded = await createDesignRepository().read(owner);
    const savedPayload = await repository.recover!(owner) as { data: Blob };
    const changed = { ...loaded.value[0], name: "Edited after reload" };
    await repository.write(owner, loaded, [changed]); loaded = await repository.read(owner);
    const backup = designBackupBlob(loaded.value), restored = await readDesignBackup(backup);
    await repository.write("restored", await repository.read("restored"), restored);
    const copied = await copyGuestDesigns(repository, { guestId: owner, accountId: account });
    const again = await copyGuestDesigns(repository, { guestId: owner, accountId: account });
    const exact = (items: typeof loaded.value) => items.every(item => "els" in item && item.els.length === 3 && item.els.every(element => element.src === src));
    const decoded = new Image(); decoded.src = src; await decoded.decode();
    return { payloadBytes: savedPayload.data.size, backupBytes: backup.size, originalExact: exact((await repository.read(owner)).value), restoredExact: exact((await repository.read("restored")).value), accountExact: exact((await repository.read(account)).value), name: (await repository.read(account)).value[0].name, copied: copied.copied, copiedAgain: again.copied, width: decoded.naturalWidth };
  }, src);
  expect(result.payloadBytes).toBeGreaterThan(133169152); expect(result.backupBytes).toBeGreaterThan(133169152);
  expect(result).toMatchObject({ originalExact: true, restoredExact: true, accountExact: true, name: "Edited after reload", copied: 1, copiedAgain: 0, width: 4096 });
});
