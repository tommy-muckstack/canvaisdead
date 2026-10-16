import { readFile } from "node:fs/promises";
import { expect, test, waitForDesignSave, type Page } from "./fixtures";
import { captureResize, fileLibrary, setupResize } from "../../scripts/parity/resize-evidence";
import { designPages } from "@/lib/design/pages";
import { readDesignBackup } from "@/lib/design/backup-file";

const dialogFor = (page: Page) => page.getByRole("dialog", { name: "Resize", exact: true });
async function openResize(page: Page) { await page.getByRole("button", { name: "Resize", exact: true }).click(); const dialog = dialogFor(page); await expect(dialog).toBeVisible(); return dialog; }
async function twoSizes(page: Page) {
  const dialog = dialogFor(page), search = dialog.getByRole("textbox", { name: "Search resize options", exact: true });
  await search.fill("Logo"); await dialog.getByRole("checkbox", { name: "Logo 500 × 500 px", exact: true }).check();
  await search.fill("Story"); await dialog.getByRole("checkbox", { name: "Story 1080 × 1920 px", exact: true }).check();
}
test.beforeEach(async ({ page }) => { await setupResize(page); });

test("Resize controls fit both viewports, keep keyboard focus and dismiss without edits", async ({ page }, info) => {
  const before = await fileLibrary(page), trigger = page.getByRole("button", { name: "Resize", exact: true });
  await captureResize(page, info.project.name, "after", "closed");
  const dialog = await openResize(page);
  await expect(dialog.getByRole("textbox", { name: "Search resize options", exact: true })).toBeFocused();
  const capture = await captureResize(page, info.project.name, "after", "opened"), box = capture.metrics.panel!;
  expect(box.x).toBeGreaterThanOrEqual(8); expect(box.y).toBeGreaterThanOrEqual(8);
  expect(box.x + box.w).toBeLessThanOrEqual(capture.metrics.viewport.w - 8);
  expect(box.y + box.h).toBeLessThanOrEqual(capture.metrics.viewport.h - 8);
  expect(capture.metrics.documentWidth).toBeLessThanOrEqual(capture.metrics.viewport.w);
  await dialog.getByRole("button", { name: "Close Resize", exact: true }).focus(); await page.keyboard.press("Shift+Tab");
  await expect(dialog.getByRole("combobox", { name: "Pages to resize", exact: true })).toBeFocused();
  await page.keyboard.press("Tab"); await expect(dialog.getByRole("button", { name: "Close Resize", exact: true })).toBeFocused();
  await page.keyboard.press("Escape"); await expect(dialog).toHaveCount(0); await expect(trigger).toBeFocused();
  await openResize(page); await page.mouse.click(capture.metrics.viewport.w - 2, capture.metrics.viewport.h - 2);
  await expect(dialog).toHaveCount(0); await expect(trigger).toBeFocused(); expect(await fileLibrary(page)).toEqual(before);
});

test("custom unit and ratio resizing preserves pages, exact history, reload and exported artwork", async ({ page }) => {
  const id = page.url().split("/").at(-1)!, before = (await fileLibrary(page)).find(d => d.id === id)!;
  const dialog = await openResize(page), width = dialog.getByRole("textbox", { name: "Width", exact: true }), height = dialog.getByRole("textbox", { name: "Height", exact: true }), unit = dialog.getByRole("combobox", { name: "Units", exact: true });
  await unit.selectOption("in"); expect(Number(await width.inputValue())).toBeCloseTo(800 / 96, 5); expect(Number(await height.inputValue())).toBeCloseTo(6.25, 5);
  await unit.selectOption("cm"); expect(Number(await height.inputValue())).toBeCloseTo(15.875, 5);
  await unit.selectOption("px"); expect(Number(await width.inputValue())).toBeCloseTo(800, 3);
  await dialog.getByRole("button", { name: "Lock aspect ratio", exact: true }).click(); await width.fill("1600"); expect(Number(await height.inputValue())).toBeCloseTo(1200, 3);
  await dialog.getByRole("button", { name: "Resize this design", exact: true }).click(); await expect(dialog).toHaveCount(0); await waitForDesignSave(page);
  await expect(page).toHaveURL(new RegExp(`${id}$`));
  const resized = (await fileLibrary(page)).find(d => d.id === id)!;
  expect(resized).toMatchObject({ w: 1600, h: 1200 }); expect(designPages(resized)).toHaveLength(2);
  expect(designPages(resized)[0].els[0]).toMatchObject({ x: 160, y: 180, w: 440, h: 280, locked: true });
  expect(designPages(resized)[0].els[1]).toMatchObject({ x: 800, y: 180, w: 320, h: 320, src: designPages(before)[0].els[1].src, imageCrop: designPages(before)[0].els[1].imageCrop });
  expect(designPages(resized)[0].els[3]).toMatchObject({ fontSize: 64, text: "Keep your files. Lose the subscription." });
  expect(designPages(resized).map(p => [p.id, p.title, p.notes])).toEqual(designPages(before).map(p => [p.id, p.title, p.notes]));
  await page.getByRole("button", { name: "Undo", exact: true }).click(); await waitForDesignSave(page); expect((await fileLibrary(page)).find(d => d.id === id)).toEqual(before);
  await page.getByRole("button", { name: "Redo", exact: true }).click(); await waitForDesignSave(page); expect((await fileLibrary(page)).find(d => d.id === id)).toEqual(resized);
  await page.reload(); await expect(page.getByTestId("page")).toHaveAttribute("viewBox", "0 0 1600 1200"); expect((await fileLibrary(page)).find(d => d.id === id)).toEqual(resized);
  const presetDialog = await openResize(page); await presetDialog.getByRole("textbox", { name: "Search resize options", exact: true }).fill("Logo");
  await presetDialog.getByRole("checkbox", { name: "Logo 500 × 500 px", exact: true }).check(); await presetDialog.getByRole("button", { name: "Resize this design", exact: true }).click(); await waitForDesignSave(page);
  await expect(page).toHaveURL(new RegExp(`${id}$`)); await expect(page.getByTestId("page")).toHaveAttribute("viewBox", "0 0 500 500");
  expect((await fileLibrary(page)).find(d => d.id === id)).toMatchObject({ name: resized.name, w: 500, h: 500 });
  await page.getByRole("button", { name: "Undo", exact: true }).click(); await waitForDesignSave(page); expect((await fileLibrary(page)).find(d => d.id === id)).toEqual(resized);
  await page.getByRole("button", { name: "File", exact: true }).click(); await page.getByRole("menuitem", { name: "Download", exact: true }).click();
  const download = page.getByRole("dialog", { name: "Download design", exact: true });
  await download.getByRole("combobox", { name: "File type", exact: true }).selectOption("svg"); await download.getByRole("combobox", { name: "Select pages", exact: true }).selectOption("current");
  const pending = page.waitForEvent("download"); await download.getByRole("button", { name: "Download", exact: true }).click();
  const svg = await readFile((await (await pending).path())!, "utf8");
  const geometry = await page.evaluate(source => { const node = new DOMParser().parseFromString(source, "image/svg+xml").documentElement; return [node.getAttribute("width"), node.getAttribute("height"), node.getAttribute("viewBox")]; }, svg);
  expect(geometry).toEqual(["1600", "1200", "0 0 1600 1200"]); expect(svg).toContain(designPages(before)[0].els[1].src!); expect(svg).not.toContain("Private cover notes");
});

test("copy and resize commits active text editing, fits artwork and keeps the original independent", async ({ page }) => {
  const id = page.url().split("/").at(-1)!;
  await page.getByTestId("page").locator("text").dblclick(); await page.getByRole("textbox", { name: "Edit text", exact: true }).fill("Resize this edited artwork");
  const dialog = await openResize(page); await waitForDesignSave(page);
  const library = await fileLibrary(page), before = library.find(d => d.id === id)!;
  expect(designPages(before)[0].els[3].text).toBe("Resize this edited artwork");
  await dialog.getByRole("textbox", { name: "Width", exact: true }).fill("500"); await dialog.getByRole("textbox", { name: "Height", exact: true }).fill("500");
  await dialog.getByRole("button", { name: "Copy & resize", exact: true }).click();
  await expect(page).not.toHaveURL(new RegExp(`${id}$`)); await expect(page.getByRole("textbox", { name: "Design name", exact: true })).toHaveValue("Resize actions (500 × 500 px)"); await waitForDesignSave(page);
  const copies = await fileLibrary(page), copyId = page.url().split("/").at(-1)!, copy = copies.find(d => d.id === copyId)!;
  expect(copies).toHaveLength(library.length + 1); expect(copies.find(d => d.id === id)).toEqual(before);
  expect(copy).toMatchObject({ w: 500, h: 500 }); expect(designPages(copy)).toHaveLength(2);
  expect(designPages(copy)[0].els[0]).toMatchObject({ x: 50, y: 118.75, w: 137.5, h: 87.5, locked: true });
  expect(designPages(copy)[0].els[1]).toMatchObject({ x: 250, y: 118.75, w: 100, h: 100, src: designPages(before)[0].els[1].src, imageCrop: designPages(before)[0].els[1].imageCrop, flipX: true });
  const originals = new Set(designPages(before).flatMap(p => [p.id, ...p.els.flatMap(e => [e.id, ...(e.groupPath ?? [])])]));
  for (const key of designPages(copy).flatMap(p => [p.id, ...p.els.flatMap(e => [e.id, ...(e.groupPath ?? [])])])) expect(originals.has(key)).toBe(false);
  expect(designPages(copy).map(p => [p.title, p.notes])).toEqual(designPages(before).map(p => [p.title, p.notes]));
  await page.reload(); await expect(page.getByTestId("page")).toHaveAttribute("viewBox", "0 0 500 500"); expect((await fileLibrary(page)).find(d => d.id === copyId)).toEqual(copy);
});

test("multiple unique sizes copy chosen pages into Projects without changing the source", async ({ page }) => {
  const id = page.url().split("/").at(-1)!, before = await fileLibrary(page), source = before.find(d => d.id === id)!;
  await page.getByRole("tab", { name: "Page 2: Details", exact: true }).click();
  const dialog = await openResize(page); await twoSizes(page);
  await dialog.getByRole("textbox", { name: "Width", exact: true }).fill("500"); await dialog.getByRole("textbox", { name: "Height", exact: true }).fill("500");
  await expect(dialog.getByRole("status").filter({ hasText: "2 sizes selected" })).toBeVisible();
  await dialog.getByRole("combobox", { name: "Pages to resize", exact: true }).selectOption("current");
  await expect(dialog.getByRole("button", { name: "Resize this design", exact: true })).toBeDisabled();
  await dialog.getByRole("button", { name: "Copy & resize", exact: true }).click(); await expect(page).toHaveURL(/\/app\/projects$/);
  const after = await fileLibrary(page); expect(after).toHaveLength(before.length + 2); expect(after.find(d => d.id === id)).toEqual(source);
  for (const [w, h, x, y] of [[500, 500, 50, 125], [1080, 1920, 108, 690]]) {
    const copy = after.find(d => d.name === `Resize actions (${w} × ${h} px)`)!; expect(copy).toBeDefined(); expect(copy).toMatchObject({ w, h });
    const pages = designPages(copy); expect(pages).toHaveLength(1); expect(pages[0]).toMatchObject({ title: "Details", notes: "Private second-page notes" }); expect(pages[0].els[0]).toMatchObject({ x, y, text: "Everything stays local" });
    await expect(page.getByRole("link", { name: `Open ${copy.name}`, exact: true })).toBeVisible();
  }
});

test("invalid dimensions and pages cannot resize or create copies and cancellation keeps history unchanged", async ({ page }) => {
  const before = await fileLibrary(page), dialog = await openResize(page), width = dialog.getByRole("textbox", { name: "Width", exact: true }), height = dialog.getByRole("textbox", { name: "Height", exact: true });
  await width.fill("1e3"); await width.press("Tab"); await expect(dialog.getByRole("alert")).toHaveText("Enter a positive width and height."); await expect(width).toHaveAttribute("aria-invalid", "true");
  await width.fill("9000"); await expect(dialog.getByRole("alert")).toContainText("between 40 and 8,000");
  await width.fill("6000"); await height.fill("6000"); await expect(dialog.getByRole("alert")).toContainText("25 million pixels");
  await expect(dialog.getByRole("button", { name: "Copy & resize", exact: true })).toBeDisabled(); await expect(dialog.getByRole("button", { name: "Resize this design", exact: true })).toBeDisabled();
  await width.fill("500"); await height.fill("500"); await dialog.getByRole("combobox", { name: "Pages to resize", exact: true }).selectOption("custom");
  const numbers = dialog.getByRole("textbox", { name: "Page numbers", exact: true }); await numbers.fill("3"); await expect(dialog.getByText("Choose pages between 1 and 2.", { exact: true })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Copy & resize", exact: true })).toBeDisabled(); await numbers.fill("2");
  await expect(dialog.getByRole("button", { name: "Copy & resize", exact: true })).toBeEnabled(); await expect(dialog.getByRole("button", { name: "Resize this design", exact: true })).toBeDisabled();
  await dialog.getByRole("button", { name: "Close Resize", exact: true }).click(); expect(await fileLibrary(page)).toEqual(before); await expect(page.getByRole("button", { name: "Undo", exact: true })).toBeDisabled();
});

test("a failed resize batch stays recoverable as one transaction and retries without duplicate copies", async ({ page }) => {
  const before = await fileLibrary(page), url = page.url(); await openResize(page); await twoSizes(page);
  await page.evaluate(() => { const original = IDBObjectStore.prototype.put; IDBObjectStore.prototype.put = function(value, key) { if (this.name === "libraries") throw new DOMException("Full", "QuotaExceededError"); return key === undefined ? original.call(this, value) : original.call(this, value, key); }; window.restoreDesignStorage = () => { IDBObjectStore.prototype.put = original; }; });
  await dialogFor(page).getByRole("button", { name: "Copy & resize", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "could not be saved" })).toBeVisible(); await expect(page).toHaveURL(url); expect(await fileLibrary(page)).toEqual(before);
  const pending = page.waitForEvent("download"); await page.getByRole("button", { name: "Download backup", exact: true }).click();
  const restored = await readDesignBackup(new Blob([await readFile((await (await pending).path())!)])); expect(restored).toHaveLength(before.length + 2);
  const ids = new Set(before.map(d => d.id)), copies = restored.filter(d => !ids.has(d.id)); expect(copies).toHaveLength(2); expect(copies.every(d => designPages(d).length === 2)).toBe(true);
  await page.evaluate(() => window.restoreDesignStorage?.()); await page.getByRole("button", { name: "Retry saving", exact: true }).click(); await expect(page).toHaveURL(/\/app\/projects$/);
  expect(await fileLibrary(page)).toEqual(restored); await page.reload(); await expect(page.getByRole("link", { name: "Open Resize actions (500 × 500 px)", exact: true })).toBeVisible(); expect(await fileLibrary(page)).toEqual(restored);
});
