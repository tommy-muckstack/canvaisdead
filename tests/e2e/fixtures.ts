import { test as base, expect, type Page } from "@playwright/test";
import { designRecordDecoderSource } from "./upload-modules";

declare global {
  interface Window {
    designTestStorage: {
      keys: () => Promise<string[]>;
      entries: () => Promise<[string, string][]>;
      getItem: (key: string) => Promise<string>;
      setItem: (key: string, raw: string) => Promise<void>;
    };
  }
}
/** Test-only inspection/seeding of the real IndexedDB store. No production mocks or storage mirrors. */
export const test = base.extend<{ designStorageFixture: void }>({
  designStorageFixture: [async ({ context }, use) => {
    await context.addInitScript(decoderSource => {
      const codec = { exports: {} as typeof import("@/lib/design/record-file") };
      new Function("module", "exports", decoderSource)(codec, codec.exports);
      type Record = { owner: string; revision: string; version: number; value: unknown; data: Blob };
      async function records(write?: { key: string; raw: string }): Promise<Record[]> {
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
          const request = indexedDB.open("canvaisdead-designs", 1);
          request.onupgradeneeded = () => request.result.createObjectStore("libraries", { keyPath: "owner" });
          request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
        });
        return new Promise((resolve, reject) => {
          const tx = db.transaction("libraries", write ? "readwrite" : "readonly"), store = tx.objectStore("libraries");
          let result: Record[] = [];
          if (write) {
            let value: unknown; try { value = JSON.parse(write.raw); } catch { value = write.raw; }
            store.put({ owner: write.key.slice("canvaisdead:".length, -":designs".length), version: 1, revision: crypto.randomUUID(), value });
          }
          const request = store.getAll(); request.onsuccess = () => { result = request.result; };
          tx.oncomplete = () => { db.close(); resolve(result); };
          tx.onabort = () => { db.close(); reject(tx.error); };
        });
      }
      const key = (record: Record) => `canvaisdead:${record.owner}:designs`;
      // Small fixtures only. Capacity tests use the production repository directly.
      const raw = async (record: Record) => record.version === 2 ? JSON.stringify(await codec.exports.readDesignRecords(record.data)) : typeof record.value === "string" ? record.value : JSON.stringify(record.value);
      window.designTestStorage = {
        keys: async () => (await records()).map(key),
        entries: async () => Promise.all((await records()).map(async record => [key(record), await raw(record)] as [string, string])),
        getItem: async wanted => {
          // Wait for the UI's real commit acknowledgement before inspecting persisted artwork.
          const deadline = Date.now() + 10_000;
          while (document.querySelector('.cv-save-state[aria-label="Saving in this browser…"]')) {
            if (Date.now() > deadline) throw Error("Design save did not settle");
            await new Promise(resolve => setTimeout(resolve, 10));
          }
          const record = (await records()).find(record => key(record) === wanted);
          if (!record) throw Error("Expected a persisted design library");
          return raw(record);
        },
        setItem: async (key, raw) => { await records({ key, raw }); },
      };
    }, await designRecordDecoderSource());
    await use();
  }, { auto: true }],
});
export { expect, type Page };

export async function waitForDesignSave(page: Page) {
  if (await page.locator(".cv-save-state").count()) await expect(page.getByRole("status", { name: "Saved in this browser only", exact: true })).toBeVisible();
}
