import { waitForDesignSave } from "./fixtures";
import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "./fixtures";
import type { El } from "@/lib/design/types";
import { blankDesign, makeEl } from "@/lib/design/ops";

const fixture = makeEl("image", blankDesign({ w: 800, h: 600 }), { id: "photo", x: 160, y: 200, w: 400, h: 200 });
async function saved(page: Page): Promise<El> {
  const id = page.url().split("/").at(-1)!;
  return page.evaluate(async id => {
    const key = (await window.designTestStorage.keys()).find(key => key.endsWith(":designs"))!, d = JSON.parse((await window.designTestStorage.getItem(key))).find((value: { id: string }) => value.id === id);
    return (d.pages ? d.pages[0].els : d.els)[0];
  }, id);
}
async function openCrop(page: Page) {
  await page.getByTestId("page").locator("image").first().dblclick();
  await expect(page.getByTestId("image-crop")).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Crop aspect ratio" })).toBeVisible();
}
test.beforeEach(async ({ page }) => {
  await page.goto("/canvaisdead/login"); await page.getByRole("button", { name: "Use the demo account" }).click();
  await expect(page.getByTestId("designs")).toBeVisible();
  await page.locator(".cx-qc").getByRole("button", { name: "Presentation", exact: true }).click();
  await expect(page.getByTestId("page")).toBeVisible();
  const id = page.url().split("/").at(-1)!;
  await page.evaluate(async ({ id, fixture }) => {
    // Original test artwork: two solid color fields generated in the browser.
    const canvas = document.createElement("canvas"); canvas.width = 400; canvas.height = 200;
    const ctx = canvas.getContext("2d")!; ctx.fillStyle = "#ff5757"; ctx.fillRect(0, 0, 200, 200); ctx.fillStyle = "#5271ff"; ctx.fillRect(200, 0, 200, 200);
    const key = (await window.designTestStorage.keys()).find(key => key.endsWith(":designs"))!, designs = JSON.parse((await window.designTestStorage.getItem(key)));
    await window.designTestStorage.setItem(key, JSON.stringify(designs.map((d: { id: string }) => d.id === id ? { ...d, w: 800, h: 600, els: [{ ...fixture, src: canvas.toDataURL("image/png") }] } : d)));
  }, { id, fixture });
  await waitForDesignSave(page); await page.reload(); await expect(page.getByTestId("page")).toBeVisible();
  if (await page.getByRole("button", { name: "Hide side panel", exact: true }).isVisible()) await page.getByRole("button", { name: "Hide side panel", exact: true }).click();
});

test("crop preview preserves source pixels, commits once, and reopens with undo and redo", async ({ page }, testInfo) => {
  const original = await saved(page);
  await page.getByTestId("page").locator("image").click();
  await page.getByRole("button", { name: "Crop", exact: true }).click();
  await expect(page.getByTestId("image-crop")).toBeVisible();
  await page.getByRole("combobox", { name: "Crop aspect ratio" }).selectOption("1");
  expect(await saved(page)).toEqual(original);
  await page.getByRole("slider", { name: "Crop zoom" }).press("End");
  await page.screenshot({ path: testInfo.outputPath("image-crop-settings.png") });
  await page.getByRole("button", { name: "Done cropping", exact: true }).click();
  await expect.poll(async () => (await saved(page)).imageCrop?.w).toBe(20);
  const cropped = await saved(page); expect(cropped.w).toBe(200); expect(cropped.src).toBe(original.src);
  await page.getByTestId("page").focus(); await page.keyboard.press("ControlOrMeta+z"); await expect.poll(() => saved(page)).toEqual(original);
  await page.keyboard.press("ControlOrMeta+Shift+z"); await expect.poll(() => saved(page)).toEqual(cropped);
  await waitForDesignSave(page); await page.reload(); await expect(page.getByTestId("page")).toBeVisible();
  expect(await saved(page)).toEqual(cropped); await openCrop(page);
  await page.getByRole("button", { name: "Reset crop", exact: true }).click();
  await page.getByRole("button", { name: "Done cropping", exact: true }).click();
  await expect.poll(async () => (await saved(page)).imageCrop).toEqual({ x: 0, y: 0, w: 400, h: 200, sourceW: 400, sourceH: 200 });
});

test("crop handles are keyboard accessible, cancellation keeps saved data, and locks protect cropping", async ({ page }) => {
  const original = await saved(page); await openCrop(page);
  await page.getByRole("button", { name: "Crop right", exact: true }).focus(); await page.keyboard.press("Shift+ArrowLeft");
  expect(await saved(page)).toEqual(original);
  await page.keyboard.press("Escape"); await expect(page.getByTestId("image-crop")).toHaveCount(0); expect(await saved(page)).toEqual(original);
  await openCrop(page);
  await page.getByRole("button", { name: "Crop right", exact: true }).focus(); await page.keyboard.press("Shift+ArrowLeft");
  await page.getByRole("button", { name: "Done cropping", exact: true }).click();
  await expect.poll(async () => (await saved(page)).w).toBe(390);
  const cropped = await saved(page); await openCrop(page);
  const handle = (await page.locator('[data-crop-handle="se"]').boundingBox())!;
  await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2); await page.mouse.down(); await page.mouse.move(handle.x - 20, handle.y - 20);
  await page.keyboard.press("Escape"); await page.mouse.up(); expect(await saved(page)).toEqual(cropped);
  await page.getByRole("button", { name: "Lock", exact: true }).click();
  await page.getByTestId("page").locator("image").first().dblclick(); await expect(page.getByTestId("image-crop")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Crop", exact: true })).toHaveCount(0);
});

test("Enter activates the focused crop button without overriding Cancel or Reset", async ({ page }) => {
  const original = await saved(page);
  for (const name of ["Cancel", "Cancel crop"]) {
    await openCrop(page);
    await page.getByRole("combobox", { name: "Crop aspect ratio" }).selectOption("1");
    await page.getByRole("button", { name, exact: true }).press("Enter");
    await expect(page.getByTestId("image-crop")).toHaveCount(0);
    expect(await saved(page)).toEqual(original);
  }
  await openCrop(page);
  await page.getByRole("combobox", { name: "Crop aspect ratio" }).selectOption("1");
  await page.getByRole("slider", { name: "Crop zoom" }).press("End");
  await page.getByRole("button", { name: "Reset crop", exact: true }).press("Enter");
  await expect(page.getByTestId("image-crop")).toBeVisible();
  await expect(page.getByRole("slider", { name: "Crop zoom" })).toHaveValue("1");
  expect(await saved(page)).toEqual(original);
  await page.getByRole("button", { name: "Done", exact: true }).press("Enter");
  await expect(page.getByTestId("image-crop")).toHaveCount(0);
  await expect.poll(async () => (await saved(page)).imageCrop).toEqual({ x: 0, y: 0, w: 400, h: 200, sourceW: 400, sourceH: 200 });
});

test("SVG and PNG exports show the repositioned crop instead of the full original", async ({ page }, testInfo) => {
  await openCrop(page); await page.getByRole("combobox", { name: "Crop aspect ratio" }).selectOption("1");
  const slider = page.getByRole("slider", { name: "Crop zoom" }); await slider.press("Home"); await slider.press("End");
  // Move the source right until the visible window lies wholly in the red half.
  await page.getByRole("button", { name: "Reposition image crop" }).focus();
  for (let i = 0; i < 12; i++) await page.keyboard.press("Shift+ArrowRight");
  await page.getByRole("button", { name: "Done cropping", exact: true }).click();
  const e = await saved(page); expect(e.imageCrop!.x + e.imageCrop!.w).toBeLessThan(200);
  await page.screenshot({ path: testInfo.outputPath("image-crop-applied.png") });
  await page.getByRole("button", { name: "Share", exact: true }).click(); await page.getByRole("button", { name: "Download", exact: true }).click();
  const panel = page.getByRole("dialog", { name: "Download design" });
  await panel.getByLabel("File type", { exact: true }).selectOption("svg");
  let pending = page.waitForEvent("download"); await panel.getByRole("button", { name: "Download", exact: true }).click(); let file = await pending;
  const svg = await readFile((await file.path())!, "utf8"); expect(svg).toContain(`viewBox="${e.imageCrop!.x} ${e.imageCrop!.y} ${e.imageCrop!.w} ${e.imageCrop!.h}"`); expect(svg).toContain(e.src!);
  await panel.getByLabel("File type", { exact: true }).selectOption("png");
  pending = page.waitForEvent("download"); await panel.getByRole("button", { name: "Download", exact: true }).click(); file = await pending;
  const png = await readFile((await file.path())!);
  const pixel = await page.evaluate(async ({ data, x, y }) => {
    const image = new Image(); image.src = `data:image/png;base64,${data}`; await image.decode();
    const canvas = document.createElement("canvas"); canvas.width = image.width; canvas.height = image.height;
    const ctx = canvas.getContext("2d")!; ctx.drawImage(image, 0, 0); return Array.from(ctx.getImageData(x, y, 1, 1).data);
  }, { data: png.toString("base64"), x: Math.round(e.x + e.w / 2), y: Math.round(e.y + e.h / 2) });
  expect(pixel).toEqual([255, 87, 87, 255]);
});
