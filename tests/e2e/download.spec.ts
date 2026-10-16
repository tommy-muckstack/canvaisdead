import { readFile } from "node:fs/promises";
import { PDFDocument } from "pdf-lib";
import { expect, test } from "@playwright/test";

test("downloads custom pages as a ZIP, a sized transparent PNG, and a multi-page PDF locally", async ({ page }, testInfo) => {
  await page.goto("/canvaisdead/login");
  await page.getByRole("button", { name: "Use the demo account" }).click();
  await expect(page.getByTestId("designs")).toBeVisible();
  await page.locator(".cx-qc").getByRole("button", { name: "Presentation", exact: true }).click();
  await expect(page.getByTestId("page")).toBeVisible();
  await page.getByRole("textbox", { name: "Design name", exact: true }).fill("Local export check");
  await page.getByRole("button", { name: "Add page", exact: true }).click();
  await page.getByRole("button", { name: "Add page", exact: true }).click();
  await page.getByRole("button", { name: "Notes", exact: true }).click();
  await page.getByLabel("Notes for page 3", { exact: true }).fill("Private notes never exported");
  await page.getByRole("button", { name: "Close notes", exact: true }).click();
  await page.getByRole("button", { name: "Share", exact: true }).click();
  await page.getByRole("button", { name: "Download", exact: true }).click();
  const panel = page.getByRole("dialog", { name: "Download design" });
  await expect(panel.getByRole("combobox", { name: "File type", exact: true })).toHaveAccessibleDescription("High-quality images. Multiple pages download together in a ZIP file.");
  await expect(panel.getByLabel("File type", { exact: true })).toBeFocused();
  await panel.getByLabel("File type", { exact: true }).selectOption("svg");
  await panel.getByLabel("Select pages", { exact: true }).selectOption("custom");
  await panel.getByLabel("Page numbers", { exact: true }).fill("4");
  await expect(panel.getByLabel("Page numbers", { exact: true })).toHaveAccessibleDescription("Choose pages between 1 and 3.");
  await expect(panel.getByRole("button", { name: "Download", exact: true })).toBeDisabled();
  await panel.getByLabel("Page numbers", { exact: true }).fill("3, 1");
  const capture = await page.screenshot({ path: testInfo.outputPath("download-custom-pages.png") });
  if (process.env.CI) {
    // Only synthetic demo artwork. Retain review evidence in free job logs rather
    // than artifact storage; no production sessions or user files are involved.
    const styles = await panel.locator("select").evaluateAll(controls => controls.map(control => {
      const css = getComputedStyle(control), box = control.getBoundingClientRect();
      return { label: Array.from((control as HTMLSelectElement).labels ?? [], label => label.textContent), width: box.width, height: box.height, font: css.font, color: css.color, padding: css.padding, radius: css.borderRadius };
    }));
    console.info("PARITY_DOWNLOAD_CAPTURE " + JSON.stringify({ viewport: testInfo.project.name, styles, aria: await panel.ariaSnapshot(), png: capture.toString("base64") }));
  }
  let pending = page.waitForEvent("download");
  await panel.getByRole("button", { name: "Download", exact: true }).click();
  let file = await pending;
  expect(file.suggestedFilename()).toBe("Local export check.zip");
  const zip = await readFile((await file.path())!);
  expect(zip.readUInt32LE()).toBe(0x04034b50);
  expect(zip.toString()).toContain("Local export check-page-1.svg");
  expect(zip.toString()).toContain("Local export check-page-3.svg");
  expect(zip.toString()).not.toContain("page-2.svg");
  expect(zip.toString()).not.toContain("Private notes");

  await panel.getByLabel("File type", { exact: true }).selectOption("jpg");
  await panel.getByLabel("Select pages", { exact: true }).selectOption("current");
  const size = panel.getByRole("slider", { name: "Size", exact: true }), quality = panel.getByRole("slider", { name: "Quality", exact: true });
  await size.press("Home"); await quality.press("Home");
  await expect(size).toHaveAttribute("aria-valuetext", "0.5 times");
  await expect(size).toHaveAccessibleDescription("960 × 540 px");
  await expect(quality).toHaveAttribute("aria-valuetext", "10 percent");
  await expect(panel.getByLabel("File type", { exact: true })).toHaveAccessibleDescription("Smaller images for sharing. JPG always includes the page background.");
  pending = page.waitForEvent("download"); await panel.getByRole("button", { name: "Download", exact: true }).click(); file = await pending;
  expect(file.suggestedFilename()).toBe("Local export check-page-3.jpg");
  const jpg = await readFile((await file.path())!);
  expect([...jpg.subarray(0, 3)]).toEqual([255, 216, 255]);
  const jpeg = await page.evaluate(async data => {
    const image = new Image(); image.src = `data:image/jpeg;base64,${data}`; await image.decode();
    const canvas = document.createElement("canvas"); canvas.width = 1; canvas.height = 1;
    const ctx = canvas.getContext("2d")!; ctx.drawImage(image, 0, 0);
    return { width: image.naturalWidth, height: image.naturalHeight, pixel: Array.from(ctx.getImageData(0, 0, 1, 1).data) };
  }, jpg.toString("base64"));
  expect(jpeg).toMatchObject({ width: 960, height: 540 });
  expect(jpeg.pixel[3]).toBe(255); for (const channel of jpeg.pixel.slice(0, 3)) expect(channel).toBeGreaterThanOrEqual(250); // JPEG is lossy.

  await panel.getByLabel("File type", { exact: true }).selectOption("png");
  await panel.getByLabel("Select pages", { exact: true }).selectOption("current");
  await panel.getByLabel("Transparent background", { exact: true }).check();
  await size.press("Home");
  await panel.getByLabel("Save download settings", { exact: true }).check();
  pending = page.waitForEvent("download");
  await panel.getByRole("button", { name: "Download", exact: true }).click();
  file = await pending;
  const png = await readFile((await file.path())!);
  expect(png.readUInt32BE(16)).toBe(960); expect(png.readUInt32BE(20)).toBe(540);
  const alpha = await page.evaluate(async data => {
    const image = new Image(); image.src = `data:image/png;base64,${data}`; await image.decode();
    const canvas = document.createElement("canvas"); canvas.width = 1; canvas.height = 1;
    const ctx = canvas.getContext("2d")!; ctx.drawImage(image, 0, 0); return ctx.getImageData(0, 0, 1, 1).data[3];
  }, png.toString("base64"));
  expect(alpha).toBe(0);
  await panel.getByRole("button", { name: "Close download" }).click();
  await expect(page.getByRole("button", { name: "Share", exact: true })).toBeFocused();
  await page.getByRole("button", { name: "Share", exact: true }).click();
  await page.getByRole("button", { name: "Download", exact: true }).click();
  await expect(panel.getByLabel("Transparent background", { exact: true })).toBeChecked();
  await expect(size).toHaveValue("0.5");
  // Page selection is never saved with preferences.
  await expect(panel.getByLabel("Select pages", { exact: true })).toHaveValue("all");
  await panel.getByLabel("File type", { exact: true }).selectOption("pdf_standard");
  pending = page.waitForEvent("download");
  await panel.getByRole("button", { name: "Download", exact: true }).click();
  file = await pending;
  expect(file.suggestedFilename()).toBe("Local export check.pdf");
  const pdf = await PDFDocument.load(await readFile((await file.path())!));
  expect(pdf.getPageCount()).toBe(3); expect(pdf.getPage(0).getSize()).toEqual({ width: 1440, height: 810 });
  await panel.getByLabel("Save download settings", { exact: true }).uncheck();
  await page.screenshot({ path: testInfo.outputPath("download-pdf.png") });
  await panel.getByLabel("File type", { exact: true }).focus();
  await panel.getByLabel("File type", { exact: true }).press("Escape");
  await expect(panel).not.toBeVisible();
  await expect(page.getByRole("button", { name: "Share", exact: true })).toBeFocused();
});
