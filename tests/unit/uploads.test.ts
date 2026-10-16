import { describe, expect, it, vi } from "vitest";
import { changeUpload, expiredUpload, findUploads, insertUploadedImages, MAX_UPLOAD_BYTES, UPLOAD_RETENTION_MS, uploadFilename, uploadName, validUpload, type Upload } from "@/lib/uploads/model";
import { imageDataURL, imageMime, localImageBlob } from "@/lib/uploads/image";
import { createUploadStore } from "@/lib/uploads/store";
import { uploadDatabaseName, type UploadRepository } from "@/lib/uploads/repository";
import { blankDesign, commit, hist, redo, toSVG, undo } from "@/lib/design/ops";
import { parseDesignBackup, serializeDesignBackup } from "@/lib/design/backup";
import { pasteImages } from "@/lib/design/clipboard";

const header = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
const file = (name = "Original.png") => new File([header], name, { type: "image/png" });
const asset = (id = "a", name = "Original.png"): Upload => ({ version: 1, id, name, mime: "image/png", width: 2000, height: 1000, original: file(name), thumbnail: new Blob([header], { type: "image/png" }), createdAt: 100, updatedAt: 100 });
const deferred = <T>() => { let resolve!: (value: T) => void, reject!: (error: unknown) => void; const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const memory = () => {
  const records = new Map<string, Upload>();
  const repository: UploadRepository = { list: async () => [...records.values()], add: async item => { records.set(item.id, item); }, change: async targets => { for (const { id, action } of targets) { const item = records.get(id); if (item) { const next = changeUpload(item, action, 200); if (next) records.set(id, next); else records.delete(id); } } } };
  return { records, repository };
};
describe("original image bytes and local upload metadata", () => {
  it("detects supported binary formats without trusting a file extension or declared MIME", async () => {
    expect(imageMime(header)).toBe("image/png"); expect(imageMime(new Uint8Array([255, 216, 255]))).toBe("image/jpeg");
    expect(imageMime(new TextEncoder().encode("GIF89a"))).toBe("image/gif"); expect(imageMime(new TextEncoder().encode("RIFF1234WEBP"))).toBe("image/webp");
    expect(imageMime(new TextEncoder().encode("0000ftypavif0000"))).toBe("image/avif"); expect(imageMime(new TextEncoder().encode('<svg onload="alert(1)"/>'))).toBeNull();
    const renamed = new File([header], "wrong.svg", { type: "image/svg+xml" }), original = await localImageBlob(renamed);
    expect(original.type).toBe("image/png"); expect(new Uint8Array(await original.arrayBuffer())).toEqual(header);
    await expect(localImageBlob(new File(["<svg/>"], "fake.png", { type: "image/png" }))).rejects.toThrow("not supported");
  });
  it("rejects empty, excessive and cancelled imports before decoding", async () => {
    await expect(localImageBlob(new Blob())).rejects.toThrow("50 MB");
    const oversized = new Blob([header]); Object.defineProperty(oversized, "size", { value: MAX_UPLOAD_BYTES + 1 }); await expect(localImageBlob(oversized)).rejects.toThrow("50 MB");
    const controller = new AbortController(); controller.abort(); await expect(localImageBlob(file(), controller.signal)).rejects.toMatchObject({ name: "AbortError" });
  });
  it("base64-encodes exact bytes across chunk boundaries without recompression", async () => {
    const bytes = Uint8Array.from({ length: 100_003 }, (_, i) => i % 256), source = new Blob([bytes], { type: "image/webp" });
    const url = await imageDataURL(source); expect(url).toBe(`data:image/webp;base64,${Buffer.from(bytes).toString("base64")}`);
  });
  it("validates versions, metadata and blobs, keeps names as text and isolates account keys", () => {
    const item = asset(); expect(validUpload(item)).toBe(true);
    for (const patch of [{ version: 2 }, { width: Infinity }, { height: -1 }, { width: 251_000_000 }, { original: "https://example.com/image.png" }, { original: new Blob([header], { type: "image/svg+xml" }) }, { thumbnail: new Blob() }, { trashedAt: NaN }]) expect(validUpload({ ...item, ...patch })).toBe(false);
    expect(uploadName("  my/file\\name\u0000.png  ")).toBe("myfilename.png"); expect(uploadName("<script>.png")).toBe("<script>.png"); expect(() => uploadName("  ")).toThrow("name");
    expect(uploadFilename({ ...item, name: "Renamed" })).toBe("Renamed.png"); expect(uploadFilename(item)).toBe("Original.png");
    expect(uploadDatabaseName("one")).not.toBe(uploadDatabaseName("two")); expect(() => uploadDatabaseName("")).toThrow();
  });
  it("searches real names/types and separates active files from trash", () => {
    const items = [asset("a", "Summer Beach.png"), { ...asset("b", "Summer Night.png"), createdAt: 300 }, { ...asset("c", "Beach.png"), trashedAt: 100 }];
    expect(findUploads(items, "summer PNG").map(item => item.id)).toEqual(["b", "a"]); expect(findUploads(items, "Beach", true).map(item => item.id)).toEqual(["c"]);
    expect(findUploads(items, "unavailable")).toEqual([]); expect(items.map(item => item.id)).toEqual(["a", "b", "c"]);
  });
  it("renames only metadata and requires the exact trash generation for restore/permanent deletion", () => {
    const original = asset(), renamed = changeUpload(original, { kind: "rename", name: "New.png" }, 150)!;
    expect(renamed.original).toBe(original.original); expect(renamed.thumbnail).toBe(original.thumbnail);
    const trashed = changeUpload(renamed, { kind: "trash" }, 200)!; expect(changeUpload(trashed, { kind: "rename", name: "Stale.png" }, 210)).toBe(trashed);
    expect(changeUpload(trashed, { kind: "restore", trashedAt: 100 }, 210)).toBe(trashed); expect(changeUpload(trashed, { kind: "delete", trashedAt: 100 }, 210)).toBe(trashed);
    const restored = changeUpload(trashed, { kind: "restore", trashedAt: 200 }, 210)!; expect(restored.trashedAt).toBeUndefined(); expect(restored.name).toBe("New.png");
    expect(expiredUpload(trashed, 200 + UPLOAD_RETENTION_MS - 1)).toBe(false); expect(expiredUpload(trashed, 200 + UPLOAD_RETENTION_MS)).toBe(true);
    expect(changeUpload(trashed, { kind: "restore", trashedAt: 200 }, 200 + UPLOAD_RETENTION_MS)).toBe(trashed); expect(changeUpload(trashed, { kind: "delete", trashedAt: 200 }, 210)).toBeNull();
  });
});
describe("original images remain independent editable design content", () => {
  it("preserves source bytes in insertion, clipboard, backup and SVG, with one history step for a batch", async () => {
    const d = blankDesign({ w: 800, h: 600 }), item = asset(), src = await imageDataURL(item.original), image = { src, w: item.width, h: item.height };
    const inserted = insertUploadedImages(d, [image, image], { x: 200, y: 250 }); expect(inserted.ids).toHaveLength(2); expect(new Set(inserted.ids).size).toBe(2);
    expect(inserted.design.els[0]).toMatchObject({ src, w: 480, h: 240, x: -40, y: 130 }); expect(inserted.design.els[1].x).toBe(-16);
    const history = commit(hist(d), inserted.design); expect(history.past).toHaveLength(1); expect(undo(history).present).toBe(d); expect(redo(undo(history)).present).toBe(inserted.design);
    expect(parseDesignBackup(serializeDesignBackup([inserted.design]))).toEqual([inserted.design]); expect(toSVG(inserted.design)).toContain(src);
    expect(changeUpload(changeUpload(item, { kind: "trash" }, 200)!, { kind: "delete", trashedAt: 200 })).toBeNull(); expect(inserted.design.els[0].src).toBe(src);
    for (const mime of ["png", "jpeg", "webp", "gif", "avif"]) expect(pasteImages(d, [{ ...image, src: `data:image/${mime};base64,AA==` }]).design.els[0].src).toBe(`data:image/${mime};base64,AA==`);
    expect(() => insertUploadedImages(d, [{ ...image, src: "https://example.com/x.png" }])).toThrow(); expect(insertUploadedImages(d, []).design).toBe(d);
  });
});
describe("local import queue and async state", () => {
  it("serializes files, exposes true phases and publishes only after storage commits", async () => {
    const { records, repository } = memory(), gate = deferred<void>(), saving = deferred<void>(), prepared = vi.fn(async (f: File, id: string) => { if (f.name === "one.png") await gate.promise; return asset(id, f.name); });
    repository.add = vi.fn(async item => { if (item.name === "one.png") await saving.promise; records.set(item.id, item); });
    const store = createUploadStore(repository, prepared), result = store.enqueue([file("one.png"), file("two.png")]);
    await vi.waitFor(() => expect(store.getSnapshot().jobs.map(job => job.status)).toEqual(["reading", "queued"])); expect(prepared).toHaveBeenCalledTimes(1);
    gate.resolve(); await vi.waitFor(() => expect(store.getSnapshot().jobs[0].status).toBe("saving")); expect(store.getSnapshot().assets).toEqual([]);
    store.dismiss(store.getSnapshot().jobs[0].id); expect(store.getSnapshot().jobs[0].status).toBe("saving"); saving.resolve();
    expect((await result).map(item => item.name)).toEqual(["one.png", "two.png"]); expect(store.getSnapshot().assets).toHaveLength(2); expect(store.getSnapshot().jobs).toEqual([]);
  });
  it("retains prepared bytes after quota failure and retries the same ID without decoding again", async () => {
    const { repository } = memory(), save = repository.add; let fail = true;
    repository.add = async item => { if (fail) throw new DOMException("full", "QuotaExceededError"); return save(item); };
    const prepared = vi.fn(async (f: File, id: string) => asset(id, f.name)), store = createUploadStore(repository, prepared);
    expect(await store.enqueue([file()])).toEqual([]); const job = store.getSnapshot().jobs[0]; expect(job.status).toBe("failed"); expect(job.error).toContain("storage is full");
    fail = false; await store.retry(job.id); expect(prepared).toHaveBeenCalledTimes(1); expect(store.getSnapshot().assets[0].id).toBe(job.id); expect(store.getSnapshot().jobs).toEqual([]);
  });
  it("cancels queued/reading files without committing them and continues after an invalid file", async () => {
    const { records, repository } = memory(), gate = deferred<void>();
    const store = createUploadStore(repository, async (f, id, signal) => { if (f.name === "hold.png") { await gate.promise; if (signal.aborted) throw new DOMException("cancel", "AbortError"); } if (f.name === "bad.png") throw Error("bad image"); return asset(id, f.name); });
    const result = store.enqueue([file("hold.png"), file("cancel.png"), file("bad.png"), file("good.png")]); await vi.waitFor(() => expect(store.getSnapshot().jobs[0].status).toBe("reading"));
    store.dismiss(store.getSnapshot().jobs[1].id); store.dismiss(store.getSnapshot().jobs[0].id); gate.resolve();
    expect((await result).map(item => item.name)).toEqual(["good.png"]); expect([...records.values()].map(item => item.name)).toEqual(["good.png"]);
    expect(store.getSnapshot().jobs).toMatchObject([{ name: "bad.png", status: "failed" }]); store.dismiss(store.getSnapshot().jobs[0].id); expect(store.getSnapshot().jobs).toEqual([]);
  });
  it("ignores obsolete reads and retains the last visible library on read failure", async () => {
    const { repository } = memory(), first = deferred<Upload[]>(), second = deferred<Upload[]>(); let calls = 0;
    repository.list = () => ++calls === 1 ? first.promise : second.promise;
    const store = createUploadStore(repository, async (f, id) => asset(id, f.name)), one = store.refresh(), two = store.refresh();
    second.resolve([asset("new")]); await two; first.reject(Error("old read failed")); await one; expect(store.getSnapshot()).toMatchObject({ status: "ready", assets: [{ id: "new" }], error: null });
    repository.list = async () => { throw Error("read blocked"); }; await store.refresh(); expect(store.getSnapshot()).toMatchObject({ status: "error", assets: [{ id: "new" }], error: "read blocked" });
  });
  it("keeps a failed file-management operation visible and applies later changes to fresh metadata", async () => {
    const { records, repository } = memory(); records.set("a", asset()); const change = repository.change;
    const store = createUploadStore(repository, async (f, id) => asset(id, f.name)); await store.load(); repository.change = async () => { throw Error("write blocked"); };
    expect(await store.change([{ id: "a", action: { kind: "trash" } }])).toBe(false); expect(store.getSnapshot().assets[0].trashedAt).toBeUndefined(); expect(store.getSnapshot().operationError).toBe("write blocked");
    repository.change = change; records.set("a", { ...asset(), name: "Renamed elsewhere.png" }); await store.change([{ id: "a", action: { kind: "trash" } }]); expect(store.getSnapshot().assets[0]).toMatchObject({ name: "Renamed elsewhere.png", trashedAt: 200 });
  });
});
