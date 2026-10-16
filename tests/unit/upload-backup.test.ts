import { describe, expect, it, vi } from "vitest";
import { readUploadBackup, uploadBackupBlob } from "@/lib/uploads/backup";
import { MAX_UPLOAD_BYTES, type Upload } from "@/lib/uploads/model";
import { createUploadStore } from "@/lib/uploads/store";
import type { UploadRepository } from "@/lib/uploads/repository";

const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 42]);
const asset = (id = "original", name = "Original.png"): Upload => ({ version: 1, id, name, mime: "image/png", width: 20, height: 10, createdAt: 100, updatedAt: 200, original: new Blob([png], { type: "image/png" }), thumbnail: new Blob([png], { type: "image/png" }) });
function fixture() {
  const records = new Map<string, Upload>();
  const repository: UploadRepository = { list: async () => [...records.values()], add: async item => { records.set(item.id, item); }, change: async () => {} };
  const prepare = vi.fn(async () => { throw Error("Backup copies must not recompress the original"); });
  return { records, repository, prepare };
}
function replaceRecord(bytes: Uint8Array<ArrayBuffer>, index: number, patch: (record: Record<string, unknown>) => void) {
  let offset = "CanvaIsDead uploads\n".length;
  for (let i = 0; ; i++) {
    const length = new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getUint32(0, true), start = offset + 4;
    const value = JSON.parse(new TextDecoder().decode(bytes.subarray(start, start + length)));
    if (i === index) {
      patch(value); const next = new TextEncoder().encode(JSON.stringify(value)), size = new Uint8Array(4); new DataView(size.buffer).setUint32(0, next.length, true);
      return new Blob([bytes.slice(0, offset), size, next, bytes.slice(start + length)]);
    }
    offset = start + length + (i === 0 ? 0 : value.originalBytes + value.thumbnailBytes);
  }
}
describe("portable local Uploads backups", () => {
  it("round-trips unplaced originals, previews, metadata and Trash without altering the source", async () => {
    const items = [asset(), { ...asset("trash", "引っ越し 🌈.png"), trashedAt: 1 }], progress = vi.fn();
    const file = await uploadBackupBlob(items, { progress }), result = await readUploadBackup(file);
    expect(result).toHaveLength(2); expect(progress.mock.calls).toEqual([[0, 2], [1, 2], [2, 2]]);
    for (const [i, copy] of result.entries()) {
      expect({ ...copy, original: null, thumbnail: null }).toEqual({ ...items[i], original: null, thumbnail: null });
      expect(new Uint8Array(await copy.original.arrayBuffer())).toEqual(png); expect(new Uint8Array(await copy.thumbnail.arrayBuffer())).toEqual(png);
    }
    expect(items[1].trashedAt).toBe(1); expect(await readUploadBackup(await uploadBackupBlob([]))).toEqual([]);
  });
  it("supports a real archive above 256 MiB without whole-file text or arrayBuffer reads", async () => {
    const original = new Blob([png, new Uint8Array(44 * 1024 * 1024)], { type: "image/png" });
    const items = Array.from({ length: 6 }, (_, i) => ({ ...asset(`file-${i}`), original }));
    const file = await uploadBackupBlob(items); expect(file.size).toBeGreaterThan(256 * 1024 * 1024);
    Object.defineProperties(file, { text: { value: () => { throw Error("whole-file text"); } }, arrayBuffer: { value: () => { throw Error("whole-file bytes"); } } });
    const restored = await readUploadBackup(file); expect(restored).toHaveLength(6);
    expect(restored.every(item => item.original.size === original.size)).toBe(true);
    expect(new Uint8Array(await restored[5].original.slice(0, 9).arrayBuffer())).toEqual(png);
    // Binary-format capacity; this fixture does not claim PNG decoding or browser quota evidence.
  }, 60_000);
  it("rejects truncation, trailing bytes, unsupported versions and oversized records", async () => {
    const file = await uploadBackupBlob([asset()]), bytes = new Uint8Array(await file.arrayBuffer());
    for (const bad of [file.slice(0, 3), file.slice(0, file.size - 1), new Blob([file, "extra"]), replaceRecord(bytes, 0, record => { record.version = 2; }), replaceRecord(bytes, 0, record => { record.count = 2; })]) await expect(readUploadBackup(bad)).rejects.toThrow();
    const large = bytes.slice(); new DataView(large.buffer).setUint32("CanvaIsDead uploads\n".length, 1_000_000, true);
    await expect(readUploadBackup(new Blob([large]))).rejects.toThrow("invalid");
  });
  it("validates every file and its checksums before any restore is returned", async () => {
    const file = await uploadBackupBlob([asset(), asset("second")]), bytes = new Uint8Array(await file.arrayBuffer());
    for (const bad of [
      replaceRecord(bytes, 2, record => { record.originalHash = "0".repeat(64); }),
      replaceRecord(bytes, 2, record => { record.thumbnailHash = "0".repeat(64); }),
      replaceRecord(bytes, 2, record => { record.id = "original"; }),
      replaceRecord(bytes, 2, record => { record.width = -1; }),
      replaceRecord(bytes, 2, record => { record.name = "../file.png"; }),
      replaceRecord(bytes, 2, record => { record.originalBytes = MAX_UPLOAD_BYTES + 1; }),
      replaceRecord(bytes, 2, record => { record.thumbnailBytes = 2 * 1024 * 1024; }),
      replaceRecord(bytes, 2, record => { record.mime = "image/svg+xml"; }),
    ]) await expect(readUploadBackup(bad)).rejects.toThrow();
    const changed = bytes.slice(); changed[changed.length - 5] ^= 1;
    await expect(readUploadBackup(new Blob([changed]))).rejects.toThrow("damaged");
  });
  it("rejects invalid exports, duplicate IDs and image types masquerading as PNG", async () => {
    await expect(uploadBackupBlob([asset(), asset()])).rejects.toThrow("invalid");
    await expect(uploadBackupBlob([{ ...asset(), original: new Blob(["<svg/>"], { type: "image/png" }) }])).rejects.toThrow("invalid");
    await expect(uploadBackupBlob([{ ...asset(), version: 2 } as unknown as Upload])).rejects.toThrow("invalid");
  });
  it("cancels before or between files without returning a partial archive or library", async () => {
    const controller = new AbortController(); controller.abort();
    await expect(uploadBackupBlob([asset()], { signal: controller.signal })).rejects.toMatchObject({ name: "AbortError" });
    const blob = await uploadBackupBlob([asset(), asset("second")]);
    for (const action of ["export", "import"]) {
      const task = new AbortController(), options = { signal: task.signal, progress: (done: number) => { if (done === 1) task.abort(); } };
      await expect(action === "export" ? uploadBackupBlob([asset(), asset("second")], options) : readUploadBackup(blob, options)).rejects.toMatchObject({ name: "AbortError" });
    }
  });
  it("restores independent active copies, including old Trash, and preserves existing account uploads", async () => {
    const f = fixture(), original = { ...asset(), trashedAt: 1 }; f.records.set(original.id, original);
    const items = await readUploadBackup(await uploadBackupBlob([original])), store = createUploadStore(f.repository, f.prepare);
    const [one] = await store.enqueueCopies(items), [two] = await store.enqueueCopies(items);
    expect(f.records.get(original.id)).toBe(original); expect(one.id).not.toBe(original.id); expect(two.id).not.toBe(one.id);
    expect(one.trashedAt).toBeUndefined(); expect(one.createdAt).toBe(100); expect(one.updatedAt).toBeGreaterThan(200);
    expect(new Uint8Array(await one.original.arrayBuffer())).toEqual(png); expect(f.prepare).not.toHaveBeenCalled(); expect(f.records.size).toBe(3);
  });
  it("retains failed copies for retry with the same ID after a partial storage failure", async () => {
    const f = fixture(), add = f.repository.add; let full = true;
    f.repository.add = async item => { if (item.name === "Second.png" && full) throw new DOMException("full", "QuotaExceededError"); return add(item); };
    const store = createUploadStore(f.repository, f.prepare), result = await store.enqueueCopies([asset(), asset("second", "Second.png")]);
    expect(result).toHaveLength(1); const job = store.getSnapshot().jobs[0]; expect(job.status).toBe("failed");
    expect(new Uint8Array(await store.pendingFile(job.id)!.arrayBuffer())).toEqual(png); expect(await store.settle()).toBe(false);
    full = false; await store.retry(job.id); expect(await store.settle()).toBe(true); expect(f.records.has(job.id)).toBe(true); expect(f.records.size).toBe(2); expect(f.prepare).not.toHaveBeenCalled();
  });
});
