import { waitForDesignSave } from "./fixtures";
import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "./fixtures";
import type { El } from "@/lib/design/types";
import { readUploadBackup } from "@/lib/uploads/backup";
import { captureDropEvidence, expectCenterAtDrop, observeCanvasDrops } from "../../scripts/parity/drop-evidence";

const panel = (page: Page) => page.getByRole("region", { name: "Uploads library", exact: true });
async function open(page: Page) { await page.getByRole("navigation", { name: "Tools" }).getByRole("button", { name: "Uploads", exact: true }).click(); await expect(panel(page)).toBeVisible(); }
async function source(page: Page, name = "Original.png") {
  const data = await page.evaluate(async () => { const canvas = document.createElement("canvas"); canvas.width = 2000; canvas.height = 1000; const ctx = canvas.getContext("2d")!; ctx.fillStyle = "#00c4cc"; ctx.fillRect(0, 0, 1000, 1000); ctx.fillStyle = "#7d2ae8"; ctx.fillRect(1000, 0, 1000, 500); return canvas.toDataURL("image/png"); });
  return { name, mimeType: "image/png", buffer: Buffer.from(data.split(",")[1], "base64"), data };
}
async function upload(page: Page, name = "Original.png") { const file = await source(page, name); await page.getByTestId("upload").setInputFiles(file); await expect(panel(page).getByRole("button", { name: `Add ${name}`, exact: true })).toBeVisible(); return file; }
async function saved(page: Page): Promise<{ pages?: { els: El[] }[]; els?: El[] }> {
  const id = page.url().split("/").at(-1)!; return page.evaluate(async id => { const key = (await window.designTestStorage.keys()).find(key => key.endsWith(":designs"))!; return JSON.parse((await window.designTestStorage.getItem(key))).find((design: { id: string }) => design.id === id); }, id);
}
const elements = async (page: Page) => { const d = await saved(page); return d.pages?.[0].els ?? d.els!; };
async function actions(page: Page, name: string, action: string) { const trigger = panel(page).getByRole("button", { name: `Upload actions for ${name}`, exact: true }); await trigger.focus(); await trigger.press("Enter"); await page.getByRole("menu", { name: `Upload actions for ${name}`, exact: true }).getByRole("menuitem", { name: action, exact: true }).click(); }
test.beforeEach(async ({ page }) => {
  await page.goto("/canvaisdead/login"); const cookies = page.getByRole("button", { name: "Accept all cookies" }); if (await cookies.isVisible()) await cookies.click();
  await page.getByRole("button", { name: "Use the demo account" }).click(); await expect(page.getByTestId("designs")).toBeVisible();
  await page.locator(".cx-qc").getByRole("button", { name: "Presentation", exact: true }).click(); await expect(page.getByTestId("page")).toBeVisible(); await open(page);
});

test("original bytes survive library reload, cross-design reuse, insertion and download", async ({ page }, info) => {
  const requests: string[] = []; page.on("request", request => { if (request.postData()) requests.push(request.postData()!); });
  const original = await upload(page); expect(await elements(page)).toEqual([]);
  await waitForDesignSave(page); await page.reload(); await expect(page.getByTestId("page")).toBeVisible(); await open(page); await expect(panel(page).getByRole("button", { name: "Add Original.png" })).toBeVisible();
  const download = page.waitForEvent("download"); await actions(page, "Original.png", "Download original"); const file = await download; expect(await readFile((await file.path())!)).toEqual(original.buffer);
  await page.goto("/canvaisdead/app"); await expect(page.getByTestId("designs")).toBeVisible(); await page.locator(".cx-qc").getByRole("button", { name: "Presentation", exact: true }).click(); await expect(page.getByTestId("page")).toBeVisible(); await open(page);
  await panel(page).getByRole("button", { name: "Add Original.png", exact: true }).click(); await expect.poll(async () => (await elements(page)).length).toBe(1);
  expect((await elements(page))[0]).toMatchObject({ src: original.data, w: 1152, h: 576 });
  await page.getByTestId("page").focus(); await page.keyboard.press("ControlOrMeta+z"); await expect.poll(async () => (await elements(page)).length).toBe(0); await page.keyboard.press("ControlOrMeta+Shift+z"); await expect.poll(async () => (await elements(page)).length).toBe(1);
  await open(page); await page.screenshot({ path: info.outputPath("uploads-library.png"), fullPage: true });
  expect(requests.every(body => !body.includes(original.data.slice(0, 100)))).toBe(true);
});

test("rename, search, bulk trash, restore and confirmed deletion preserve placed copies", async ({ page }) => {
  const original = await upload(page); await upload(page, "Second.png"); await panel(page).getByRole("button", { name: "Add Original.png", exact: true }).click(); await expect.poll(async () => (await elements(page)).length).toBe(1); await open(page);
  await actions(page, "Original.png", "Rename"); const dialog = page.getByRole("dialog", { name: "Rename upload" }); await dialog.getByLabel("File name", { exact: true }).fill("Renamed.png"); await dialog.getByRole("button", { name: "Save", exact: true }).click(); await expect(dialog).toHaveCount(0);
  await panel(page).getByRole("searchbox", { name: "Search uploads" }).fill("renamed"); await expect(panel(page).getByRole("button", { name: "Add Renamed.png" })).toBeVisible(); await expect(panel(page).getByRole("button", { name: "Add Second.png" })).toHaveCount(0); await panel(page).getByRole("button", { name: "Clear upload search" }).click();
  await panel(page).getByRole("button", { name: "Select items", exact: true }).click(); await panel(page).getByRole("button", { name: "Select all", exact: true }).click(); await panel(page).getByRole("button", { name: "Move to trash", exact: true }).click(); await expect(panel(page).getByRole("heading", { name: "Upload your first image" })).toBeVisible();
  await panel(page).getByRole("tab", { name: "Trash", exact: true }).click(); await actions(page, "Renamed.png", "Restore"); await expect(panel(page).getByRole("button", { name: "Select Renamed.png", exact: true })).toHaveCount(0);
  await actions(page, "Second.png", "Delete permanently"); const confirmation = page.getByRole("dialog", { name: "Delete uploads permanently?" }); await confirmation.getByRole("button", { name: "Cancel", exact: true }).click(); await expect(panel(page).getByRole("button", { name: "Select Second.png", exact: true })).toBeVisible();
  await actions(page, "Second.png", "Delete permanently"); await confirmation.getByRole("button", { name: "Delete permanently", exact: true }).click(); await expect(panel(page).getByRole("heading", { name: "Trash is empty" })).toBeVisible();
  expect((await elements(page))[0].src).toBe(original.data); await waitForDesignSave(page); await page.reload(); await expect.poll(async () => (await elements(page))[0].src).toBe(original.data); await open(page); await expect(panel(page).getByRole("button", { name: "Add Renamed.png", exact: true })).toBeVisible();
});

test("invalid files and aborted quota transactions report failures and retry safely", async ({ page }) => {
  await page.getByTestId("upload").setInputFiles({ name: "pretend.png", mimeType: "image/png", buffer: Buffer.from('<svg onload="alert(1)"/>') }); await expect(panel(page).getByText("This format is not supported yet.", { exact: false })).toBeVisible(); await panel(page).getByRole("button", { name: "Dismiss pretend.png" }).click();
  await page.evaluate(async () => { const add = IDBObjectStore.prototype.add; IDBObjectStore.prototype.add = function() { IDBObjectStore.prototype.add = add; throw new DOMException("fixture quota", "QuotaExceededError"); }; });
  const original = await source(page); await page.getByTestId("upload").setInputFiles(original); await expect(panel(page).getByText("This browser's storage is full.", { exact: false })).toBeVisible(); await expect(panel(page).getByRole("button", { name: "Add Original.png", exact: true })).toHaveCount(0);
  await panel(page).getByRole("button", { name: "Retry Original.png", exact: true }).click(); await expect(panel(page).getByRole("button", { name: "Add Original.png", exact: true })).toHaveCount(1);
  await waitForDesignSave(page); await page.reload(); await expect(page.getByTestId("page")).toBeVisible(); await open(page); await expect(panel(page).getByRole("button", { name: "Add Original.png", exact: true })).toHaveCount(1);
});

test("a file drop imports locally and a delayed insertion cannot write to another page", async ({ page }) => {
  const original = await source(page);
  const transfer = await page.evaluateHandle(({ data, name }) => { const bytes = Uint8Array.from(atob(data.split(",")[1]), char => char.charCodeAt(0)), transfer = new DataTransfer(); transfer.items.add(new File([bytes], name, { type: "image/png" })); return transfer; }, { data: original.data, name: original.name });
  await panel(page).dispatchEvent("drop", { dataTransfer: transfer }); await expect(panel(page).getByRole("button", { name: "Add Original.png", exact: true })).toBeVisible();
  await page.evaluate(async () => { const read = Blob.prototype.arrayBuffer; Blob.prototype.arrayBuffer = function() { Blob.prototype.arrayBuffer = read; return new Promise((resolve, reject) => { (window as unknown as { resumeUploadRead: () => void }).resumeUploadRead = () => { void read.call(this).then(resolve, reject); }; }); }; });
  await panel(page).getByRole("button", { name: "Add Original.png", exact: true }).click(); await expect(panel(page).getByText("Adding image to your design…")).toBeVisible();
  await page.keyboard.press("ControlOrMeta+Enter"); await expect.poll(async () => (await saved(page)).pages?.length).toBe(2);
  await page.evaluate(async () => (window as unknown as { resumeUploadRead: () => void }).resumeUploadRead()); await expect(panel(page).getByText("The page changed while reading the file.", { exact: false })).toBeVisible(); expect((await saved(page)).pages!.every(page => page.els.length === 0)).toBe(true);
  await panel(page).getByRole("button", { name: "Add Original.png", exact: true }).click(); await expect.poll(async () => (await saved(page)).pages![1].els.length).toBe(1); expect((await saved(page)).pages![0].els).toEqual([]);
});

test("native thumbnail drag inserts at the canvas drop point", async ({ page }, info) => {
  test.skip(info.project.name === "mobile", "Native mouse dragging does not verify touch dragging.");
  const original = await upload(page), canvas = page.getByTestId("page"), box = (await canvas.boundingBox())!;
  await observeCanvasDrops(page);
  await panel(page).getByRole("button", { name: "Add Original.png", exact: true }).dragTo(canvas, { targetPosition: { x: box.width * .3, y: box.height * .4 } });
  await expect.poll(async () => (await elements(page)).length).toBe(1); const image = (await elements(page))[0]; expect(image.src).toBe(original.data);
  const center = { x: image.x + image.w / 2, y: image.y + image.h / 2 };
  const drops = await captureDropEvidence(page, info.project.name, "upload-native", [{ clientX: box.x + box.width * .3, clientY: box.y + box.height * .4 }], [center]);
  expect(drops).toHaveLength(1); expect(drops[0].trusted).toBe(true); expect(drops[0].types).toEqual(["application/x-canvaisdead-upload"]); expectCenterAtDrop(center, drops[0]);
  await canvas.focus(); await page.keyboard.press("ControlOrMeta+z"); await expect.poll(() => elements(page)).toEqual([]);
  await page.keyboard.press("ControlOrMeta+Shift+z"); await expect.poll(() => elements(page)).toEqual([image]);
  await waitForDesignSave(page); await page.reload(); await expect(page.getByTestId("page")).toBeVisible(); await expect.poll(() => elements(page)).toEqual([image]);
});

test("accepted drops queue behind a slow original read and each keeps its own undo step", async ({ page }, info) => {
  const original = await upload(page), canvas = page.getByTestId("page"), box = (await canvas.boundingBox())!;
  await observeCanvasDrops(page);
  // Synthetic events exercise the async insertion race, not physical drag gestures.
  const transfer = await page.evaluateHandle(() => new DataTransfer());
  await panel(page).getByRole("button", { name: "Add Original.png", exact: true }).dispatchEvent("dragstart", { dataTransfer: transfer });
  await page.evaluate(async () => { const read = Blob.prototype.arrayBuffer; Blob.prototype.arrayBuffer = function() { Blob.prototype.arrayBuffer = read; return new Promise((resolve, reject) => { (window as unknown as { resumeUploadRead: () => void }).resumeUploadRead = () => { void read.call(this).then(resolve, reject); }; }); }; });
  await canvas.dispatchEvent("drop", { dataTransfer: transfer, clientX: box.x + box.width * .2, clientY: box.y + box.height * .3 });
  await expect(panel(page).getByText("Adding image to your design…")).toBeVisible();
  await canvas.dispatchEvent("drop", { dataTransfer: transfer, clientX: box.x + box.width * .7, clientY: box.y + box.height * .6 });
  expect(await elements(page)).toEqual([]);
  await page.evaluate(async () => (window as unknown as { resumeUploadRead: () => void }).resumeUploadRead());
  await expect.poll(async () => (await elements(page)).length).toBe(2); const placed = await elements(page);
  expect(placed[0].id).not.toBe(placed[1].id); expect(placed.every(image => image.src === original.data)).toBe(true);
  const centers = placed.map(image => ({ x: image.x + image.w / 2, y: image.y + image.h / 2 }));
  const drops = await captureDropEvidence(page, info.project.name, "upload-queued", [{ clientX: box.x + box.width * .2, clientY: box.y + box.height * .3 }, { clientX: box.x + box.width * .7, clientY: box.y + box.height * .6 }], centers);
  expect(drops).toHaveLength(2);
  drops.forEach((drop, index) => { expect(drop.trusted).toBe(false); expect(drop.types).toEqual(["application/x-canvaisdead-upload"]); expectCenterAtDrop(centers[index], drop); });
  await canvas.focus(); await page.keyboard.press("ControlOrMeta+z"); await expect.poll(() => elements(page)).toEqual([placed[0]]);
  await page.keyboard.press("ControlOrMeta+z"); await expect.poll(() => elements(page)).toEqual([]);
  await page.keyboard.press("ControlOrMeta+Shift+z"); await expect.poll(() => elements(page)).toEqual([placed[0]]);
  await page.keyboard.press("ControlOrMeta+Shift+z"); await expect.poll(() => elements(page)).toEqual(placed);
  await waitForDesignSave(page); await page.reload(); await expect(page.getByTestId("page")).toBeVisible(); await expect.poll(() => elements(page)).toEqual(placed);
});

test("an uploaded original remains editable through crop, flip, reload and SVG export", async ({ page }) => {
  const original = await upload(page); await panel(page).getByRole("button", { name: "Add Original.png", exact: true }).click();
  await expect.poll(async () => (await elements(page)).length).toBe(1);
  await page.getByRole("button", { name: "Crop", exact: true }).click(); await page.getByRole("combobox", { name: "Crop aspect ratio" }).selectOption("1");
  await page.getByRole("button", { name: "Done cropping", exact: true }).click();
  await page.getByRole("button", { name: "Flip", exact: true }).click(); await page.getByRole("menuitemcheckbox", { name: "Flip horizontal", exact: true }).click();
  await expect.poll(async () => (await elements(page))[0].flipX).toBe(true); const edited = (await elements(page))[0];
  expect(edited.src).toBe(original.data); expect(edited.imageCrop).toMatchObject({ sourceW: 2000, sourceH: 1000 }); expect(edited.imageCrop!.w).toBeCloseTo(edited.imageCrop!.h);
  await waitForDesignSave(page); await page.reload(); await expect(page.getByTestId("page")).toBeVisible(); expect((await elements(page))[0]).toEqual(edited);
  await page.getByRole("button", { name: "Share", exact: true }).click(); await page.getByRole("button", { name: "Download", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Download design" }); await dialog.getByLabel("File type", { exact: true }).selectOption("svg");
  const pending = page.waitForEvent("download"); await dialog.getByRole("button", { name: "Download", exact: true }).click(); const file = await pending;
  const svg = await readFile((await file.path())!, "utf8"); expect(svg).toContain(original.data); expect(svg).toContain("matrix(-1 0 0 1");
  expect(svg).toContain(`viewBox="${edited.imageCrop!.x} ${edited.imageCrop!.y} ${edited.imageCrop!.w} ${edited.imageCrop!.h}"`);
});

async function downloadUploadsBackup(page: Page) {
  await panel(page).getByText("Back up or restore uploads", { exact: true }).click();
  const pending = page.waitForEvent("download"); await panel(page).getByRole("button", { name: "Back up uploads", exact: true }).click();
  const file = await pending; return (await file.path())!;
}
async function clearFixtureUploads(page: Page) {
  await page.evaluate(() => new Promise<void>((resolve, reject) => {
    const request = indexedDB.open("canvaisdead:demo:uploads", 2);
    request.onsuccess = () => { const db = request.result, tx = db.transaction("assets", "readwrite"); tx.objectStore("assets").clear(); tx.oncomplete = () => { db.close(); resolve(); }; tx.onabort = () => { db.close(); reject(tx.error); }; };
    request.onerror = () => reject(request.error);
  }));
  await waitForDesignSave(page); await page.reload(); await expect(page.getByTestId("page")).toBeVisible(); await open(page);
}

test("a portable uploads backup restores unplaced originals and Trash as independent active copies", async ({ page }, info) => {
  const original = await upload(page); await upload(page, "From Trash.png"); await actions(page, "From Trash.png", "Move to trash");
  const path = await downloadUploadsBackup(page), archived = await readUploadBackup(new Blob([await readFile(path)]));
  expect(archived.map(item => item.name).sort()).toEqual(["From Trash.png", "Original.png"]);
  expect(archived.find(item => item.name === "From Trash.png")!.trashedAt).toBeGreaterThan(0);
  await clearFixtureUploads(page); await expect(panel(page).getByRole("heading", { name: "Upload your first image" })).toBeVisible();
  await panel(page).getByText("Back up or restore uploads", { exact: true }).click();
  await panel(page).getByLabel("Restore uploads backup", { exact: true }).setInputFiles(path);
  await expect(panel(page).locator(".cv-upload-backups").getByRole("status")).toContainText("2 of 2 uploads restored");
  await expect(panel(page).getByRole("button", { name: "Add From Trash.png", exact: true })).toHaveCount(1);
  const pending = page.waitForEvent("download"); await actions(page, "Original.png", "Download original"); expect(await readFile((await (await pending).path())!)).toEqual(original.buffer);
  expect(await elements(page)).toEqual([]);
  await panel(page).getByLabel("Restore uploads backup", { exact: true }).setInputFiles(path);
  await expect(panel(page).getByRole("button", { name: "Add Original.png", exact: true })).toHaveCount(2);
  await waitForDesignSave(page); await page.reload(); await expect(page.getByTestId("page")).toBeVisible(); await open(page);
  await expect(panel(page).getByRole("button", { name: "Add From Trash.png", exact: true })).toHaveCount(2);
  await panel(page).getByText("Back up or restore uploads", { exact: true }).click();
  await page.screenshot({ path: info.outputPath("uploads-backup-restored.png"), fullPage: true });
});

test("a damaged archive changes no uploads and quota failures retain restored originals for retry", async ({ page }) => {
  await upload(page); const path = await downloadUploadsBackup(page), bytes = await readFile(path);
  await panel(page).getByLabel("Restore uploads backup", { exact: true }).setInputFiles({ name: "broken.canvaisdead-uploads", mimeType: "application/x-canvaisdead-uploads", buffer: bytes.subarray(0, bytes.length - 1) });
  await expect(panel(page).locator(".cv-upload-backups").getByRole("alert")).toContainText("incomplete or invalid");
  await expect(panel(page).getByRole("button", { name: "Add Original.png", exact: true })).toHaveCount(1);
  await page.evaluate(() => { const add = IDBObjectStore.prototype.add; IDBObjectStore.prototype.add = function(value, key) { if (this.name === "assets") { IDBObjectStore.prototype.add = add; throw new DOMException("fixture quota", "QuotaExceededError"); } return key === undefined ? add.call(this, value) : add.call(this, value, key); }; });
  await panel(page).getByLabel("Restore uploads backup", { exact: true }).setInputFiles(path);
  await expect(panel(page).locator(".cv-upload-backups").getByRole("status")).toContainText("0 of 1 uploads restored");
  await expect(panel(page).getByRole("button", { name: "Add Original.png", exact: true })).toHaveCount(1);
  await panel(page).getByRole("button", { name: "Retry Original.png", exact: true }).click();
  await expect(panel(page).getByRole("button", { name: "Add Original.png", exact: true })).toHaveCount(2);
});

test("cancelling backup validation adds no copies and leaves the original archive reusable", async ({ page }) => {
  await upload(page); const path = await downloadUploadsBackup(page);
  await page.evaluate(() => { const read = Blob.prototype.arrayBuffer; Blob.prototype.arrayBuffer = function() { Blob.prototype.arrayBuffer = read; return new Promise((resolve, reject) => { (window as unknown as { resumeBackupRead: () => void }).resumeBackupRead = () => { void read.call(this).then(resolve, reject); }; }); }; });
  await panel(page).getByLabel("Restore uploads backup", { exact: true }).setInputFiles(path);
  await expect(panel(page).getByRole("button", { name: "Cancel backup", exact: true })).toBeVisible();
  await page.waitForFunction(() => typeof (window as unknown as { resumeBackupRead?: () => void }).resumeBackupRead === "function");
  await panel(page).getByRole("button", { name: "Cancel backup", exact: true }).click();
  await page.evaluate(() => (window as unknown as { resumeBackupRead: () => void }).resumeBackupRead());
  await expect(panel(page).locator(".cv-upload-backups").getByRole("status")).toContainText("Backup cancelled");
  await expect(panel(page).getByRole("button", { name: "Add Original.png", exact: true })).toHaveCount(1);
  await panel(page).getByLabel("Restore uploads backup", { exact: true }).setInputFiles(path);
  await expect(panel(page).getByRole("button", { name: "Add Original.png", exact: true })).toHaveCount(2);
});
