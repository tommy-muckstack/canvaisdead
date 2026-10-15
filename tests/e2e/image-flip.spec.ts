import { waitForDesignSave } from "./fixtures";
import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "./fixtures";
import type { El } from "@/lib/design/types";
import { blankDesign, makeEl, rotatePoint } from "@/lib/design/ops";

const fixture = makeEl("image", blankDesign({ w: 800, h: 600 }), { id: "photo", x: 160, y: 200, w: 400, h: 200 });
async function saved(page: Page): Promise<El> {
  const id = page.url().split("/").at(-1)!;
  return page.evaluate(async id => { const key = (await window.designTestStorage.keys()).find(key => key.endsWith(":designs"))!, d = JSON.parse((await window.designTestStorage.getItem(key))).find((value: { id: string }) => value.id === id); return (d.pages ? d.pages[0].els : d.els)[0]; }, id);
}
async function flip(page: Page, axis: "horizontal" | "vertical") {
  await page.getByRole("button", { name: "Flip", exact: true }).click();
  await page.getByRole("menuitemcheckbox", { name: `Flip ${axis}`, exact: true }).click();
}
test.beforeEach(async ({ page }) => {
  await page.goto("/canvaisdead/login");
  const cookies = page.getByRole("button", { name: "Accept all cookies" }); if (await cookies.isVisible()) await cookies.click();
  await page.getByRole("button", { name: "Use the demo account" }).click(); await expect(page.getByTestId("designs")).toBeVisible();
  await page.locator(".cx-qc").getByRole("button", { name: "Presentation", exact: true }).click(); await expect(page.getByTestId("page")).toBeVisible();
  const id = page.url().split("/").at(-1)!;
  await page.evaluate(async ({ id, fixture }) => {
    const canvas = document.createElement("canvas"); canvas.width = 400; canvas.height = 200; const ctx = canvas.getContext("2d")!;
    // Original four-quadrant artwork makes both reflections observable in encoded exports.
    for (const [index, color] of ["#ff0000", "#00ff00", "#0000ff", "#ffff00"].entries()) { ctx.fillStyle = color; ctx.fillRect(index % 2 * 200, Math.floor(index / 2) * 100, 200, 100); }
    const key = (await window.designTestStorage.keys()).find(key => key.endsWith(":designs"))!, designs = JSON.parse((await window.designTestStorage.getItem(key)));
    await window.designTestStorage.setItem(key, JSON.stringify(designs.map((d: { id: string }) => d.id === id ? { ...d, w: 800, h: 600, els: [{ ...fixture, src: canvas.toDataURL("image/png") }] } : d)));
  }, { id, fixture });
  await waitForDesignSave(page); await page.reload(); await expect(page.getByTestId("page")).toBeVisible();
  if (await page.getByRole("button", { name: "Hide side panel", exact: true }).isVisible()) await page.getByRole("button", { name: "Hide side panel", exact: true }).click();
  await page.getByTestId("page").locator("image").click();
});

test("Flip is keyboard accessible, stays in the viewport and survives undo, reload and lock changes", async ({ page }, testInfo) => {
  const original = await saved(page), trigger = page.getByRole("button", { name: "Flip", exact: true }), menu = page.getByRole("menu", { name: "Flip image" });
  await trigger.press("ArrowDown"); await expect(menu.getByRole("menuitemcheckbox", { name: "Flip horizontal" })).toBeFocused();
  const box = (await menu.boundingBox())!, viewport = page.viewportSize()!; expect(box.x).toBeGreaterThanOrEqual(8); expect(box.x + box.width).toBeLessThanOrEqual(viewport.width - 8); expect(box.y + box.height).toBeLessThanOrEqual(viewport.height - 8);
  await page.keyboard.press("End"); await expect(menu.getByRole("menuitemcheckbox", { name: "Flip vertical" })).toBeFocused();
  await page.keyboard.press("Escape"); await expect(trigger).toBeFocused(); expect(await saved(page)).toEqual(original);
  await trigger.click(); await trigger.click(); await expect(menu).toHaveCount(0);
  await flip(page, "horizontal"); await expect.poll(async () => (await saved(page)).flipX).toBe(true); const flipped = await saved(page);
  expect(flipped.src).toBe(original.src); expect(flipped).toMatchObject({ x: original.x, y: original.y, w: original.w, h: original.h });
  await page.getByTestId("page").focus(); await page.keyboard.press("ControlOrMeta+z"); await expect.poll(() => saved(page)).toEqual(original);
  await page.keyboard.press("ControlOrMeta+Shift+z"); await expect.poll(() => saved(page)).toEqual(flipped);
  await waitForDesignSave(page); await page.reload(); await expect(page.getByTestId("page")).toBeVisible(); expect(await saved(page)).toEqual(flipped); await page.getByTestId("page").locator("image").click();
  await trigger.click(); await expect(menu.getByRole("menuitemcheckbox", { name: "Flip horizontal" })).toBeChecked(); await page.screenshot({ path: testInfo.outputPath("image-flip-menu.png") });
  await page.keyboard.press("Escape"); await flip(page, "horizontal"); await expect.poll(() => saved(page)).toEqual(original);
  await page.getByRole("button", { name: "Lock", exact: true }).click(); await expect(trigger).toHaveCount(0);
  await page.getByRole("button", { name: "Unlock", exact: true }).click(); await expect(trigger).toBeVisible();
  await page.getByTestId("page").focus(); await page.keyboard.press("ControlOrMeta+d"); await page.keyboard.press("ControlOrMeta+a"); await page.keyboard.press("ControlOrMeta+g"); await expect(trigger).toHaveCount(0);
});

test("flipped crop handles trim the visual edge and crop panning follows screen directions", async ({ page }) => {
  const original = await saved(page); await flip(page, "horizontal"); await flip(page, "vertical");
  await page.getByRole("button", { name: "Crop", exact: true }).click(); await expect(page.getByTestId("image-crop")).toBeVisible();
  await page.getByRole("button", { name: "Crop left", exact: true }).press("Shift+ArrowRight");
  await page.getByRole("button", { name: "Crop top", exact: true }).press("Shift+ArrowDown");
  await page.getByRole("button", { name: "Done cropping", exact: true }).click();
  await expect.poll(async () => (await saved(page)).imageCrop).toEqual({ x: 0, y: 0, w: 390, h: 190, sourceW: 400, sourceH: 200 });
  const cropped = await saved(page); expect(cropped).toMatchObject({ x: 170, y: 210, w: 390, h: 190, flipX: true, flipY: true, src: original.src });
  await page.getByRole("button", { name: "Crop", exact: true }).click(); await page.getByRole("slider", { name: "Crop zoom" }).press("End");
  const before = await page.getByTestId("page").locator('g>svg[overflow="hidden"]').getAttribute("viewBox");
  await page.getByRole("button", { name: "Reposition image crop" }).press("Shift+ArrowRight");
  const after = await page.getByTestId("page").locator('g>svg[overflow="hidden"]').getAttribute("viewBox"); expect(Number(after!.split(" ")[0])).toBeGreaterThan(Number(before!.split(" ")[0]));
  await page.keyboard.press("Escape"); expect(await saved(page)).toEqual(cropped);
  await page.getByRole("button", { name: "Crop", exact: true }).click(); await page.getByRole("button", { name: "Reset crop", exact: true }).click(); await page.getByRole("button", { name: "Done cropping", exact: true }).click();
  expect(await saved(page)).toMatchObject({ flipX: true, flipY: true, src: original.src, imageCrop: { x: 0, y: 0, w: 400, h: 200, sourceW: 400, sourceH: 200 } });
});

test("rotated cropped flips agree in SVG and PNG pixels for each axis combination", async ({ page }) => {
  test.setTimeout(60_000);
  const id = page.url().split("/").at(-1)!;
  await page.evaluate(async id => {
    const key = (await window.designTestStorage.keys()).find(key => key.endsWith(":designs"))!, designs = JSON.parse((await window.designTestStorage.getItem(key)));
    const design = designs.find((d: { id: string }) => d.id === id), e = design.els[0]; e.rotation = 37; e.imageCrop = { x: 40, y: 20, w: 240, h: 120, sourceW: 400, sourceH: 200 };
    await window.designTestStorage.setItem(key, JSON.stringify(designs));
  }, id);
  await waitForDesignSave(page); await page.reload(); await expect(page.getByTestId("page")).toBeVisible(); await page.getByTestId("page").locator("image").click();
  for (const axis of ["horizontal", "vertical", "horizontal"] as const) {
    await flip(page, axis); const e = await saved(page);
    const samples = [[.15, .15], [.85, .15], [.15, .85], [.85, .85]].map(([u, v]) => {
      const c = e.imageCrop!, sourceX = c.x + (e.flipX ? 1 - u : u) * c.w, sourceY = c.y + (e.flipY ? 1 - v : v) * c.h;
      const index = (sourceX >= 200 ? 1 : 0) + (sourceY >= 100 ? 2 : 0);
      const point = rotatePoint(e.x + e.w * u, e.y + e.h * v, e.x + e.w / 2, e.y + e.h / 2, e.rotation);
      return { x: Math.round(point.x), y: Math.round(point.y), color: [[255, 0, 0, 255], [0, 255, 0, 255], [0, 0, 255, 255], [255, 255, 0, 255]][index] };
    });
    await page.getByRole("button", { name: "Share", exact: true }).click(); await page.getByRole("button", { name: "Download", exact: true }).click(); const panel = page.getByRole("dialog", { name: "Download design" });
    for (const format of ["svg", "png"]) {
      await panel.getByLabel("File type", { exact: true }).selectOption(format);
      const pending = page.waitForEvent("download"); await panel.getByRole("button", { name: "Download", exact: true }).click(); const file = await pending, buffer = await readFile((await file.path())!);
      const pixels = await page.evaluate(async ({ data, mime, samples }) => {
        const image = new Image(); image.src = `data:${mime};base64,${data}`; await image.decode(); const canvas = document.createElement("canvas"); canvas.width = image.width; canvas.height = image.height;
        const ctx = canvas.getContext("2d")!; ctx.drawImage(image, 0, 0); return samples.map(({ x, y }) => Array.from(ctx.getImageData(x, y, 1, 1).data));
      }, { data: buffer.toString("base64"), mime: format === "svg" ? "image/svg+xml" : "image/png", samples });
      expect(pixels).toEqual(samples.map(sample => sample.color));
    }
    await page.getByRole("button", { name: "Close download", exact: true }).click();
  }
});
