import { readFile } from "node:fs/promises";
import { expect, test, waitForDesignSave, type Page } from "./fixtures";
import { captureFontLayout, delayedFont, fileLibrary, FONT_BODY, FONT_HEADING, fontMetrics, selectFontBody, setupFontLayout } from "../../scripts/parity/font-layout-evidence";

const lines = (values: { lines: { text: string | null }[] }[]) => values.map(item => item.lines.map(line => line.text));
async function exportedLines(page: Page) {
  await page.getByRole("button", { name: "File", exact: true }).click(); await page.getByRole("menuitem", { name: "Download", exact: true }).click();
  const panel = page.getByRole("dialog", { name: "Download design", exact: true });
  await panel.getByRole("combobox", { name: "File type", exact: true }).selectOption("svg");
  const pending = page.waitForEvent("download"); await panel.getByRole("button", { name: "Download", exact: true }).click();
  const text = await readFile((await (await pending).path())!, "utf8");
  expect(text).not.toContain("Private notes");
  return page.evaluate(text => Array.from(new DOMParser().parseFromString(text, "image/svg+xml").querySelectorAll("text"), node => Array.from(node.querySelectorAll("tspan"), line => line.textContent)), text);
}
test.beforeEach(async ({ page }) => { await setupFontLayout(page); });

test("successive native font loads refresh canvas, selection and page thumbnails without editing the design", async ({ page }, info) => {
  await selectFontBody(page); const before = await fileLibrary(page);
  const fallback = await captureFontLayout(page, info.project.name, "after", "fallback");
  const finishBody = await delayedFont(page, FONT_BODY); await finishBody();
  await expect.poll(async () => lines((await fontMetrics(page)).canvas)[0]).not.toEqual(lines(fallback.metrics.canvas)[0]);
  const body = await fontMetrics(page);
  expect(body.selection!.height).toBeCloseTo(body.canvas[0].lines.length * 36 * 1.4);
  expect(body.selection!.height).toBeLessThan(fallback.metrics.selection!.height);
  expect(lines(body.thumbnails)).toEqual(lines(body.canvas));
  const finishHeading = await delayedFont(page, FONT_HEADING); await finishHeading();
  await expect.poll(async () => lines((await fontMetrics(page)).canvas)[1]).not.toEqual(lines(body.canvas)[1]);
  const loaded = await captureFontLayout(page, info.project.name, "after", "loaded");
  expect(lines(loaded.metrics.thumbnails)).toEqual(lines(loaded.metrics.canvas));
  expect(loaded.metrics.documentWidth).toBeLessThanOrEqual(loaded.metrics.viewport.w);
  expect(await fileLibrary(page)).toEqual(before); await expect(page.getByRole("button", { name: "Undo", exact: true })).toBeDisabled();
  expect(await exportedLines(page)).toEqual(lines(loaded.metrics.canvas));
});

test("font completion preserves active text, caret and one-step edit history", async ({ page }) => {
  const before = await fileLibrary(page), id = page.url().split("/").at(-1)!;
  await selectFontBody(page);
  const canvas = page.getByTestId("page"), box = await canvas.boundingBox(); if (!box) throw Error("Canvas missing");
  await page.mouse.dblclick(box.x + 140 * box.width / 800, box.y + 100 * box.height / 600);
  const editor = page.getByRole("textbox", { name: "Edit text", exact: true }), draft = "iiiiiiiiii iiiiiiiiii iiiiiiiiii iiiiiiiiii iiiiiiiiii iiiiiiiiii";
  await editor.fill(draft); await editor.press("Home"); await editor.press("Shift+ArrowRight");
  const initial = await editor.evaluate(node => { const input = node as HTMLTextAreaElement; return { start: input.selectionStart, end: input.selectionEnd, height: parseFloat(input.style.height) }; });
  await (await delayedFont(page, FONT_BODY))();
  await expect(editor).toHaveValue(draft); await expect(editor).toBeFocused();
  await expect.poll(() => editor.evaluate(node => parseFloat(node.style.height))).toBeLessThan(initial.height);
  expect(await editor.evaluate(node => { const input = node as HTMLTextAreaElement; return [input.selectionStart, input.selectionEnd]; })).toEqual([initial.start, initial.end]);
  expect(await fileLibrary(page)).toEqual(before);
  await editor.press("Escape"); await waitForDesignSave(page);
  const edited = await fileLibrary(page); expect(edited.find(d => d.id === id)).not.toEqual(before.find(d => d.id === id));
  await page.getByRole("button", { name: "Undo", exact: true }).click(); await waitForDesignSave(page); expect(await fileLibrary(page)).toEqual(before); await expect(page.getByRole("button", { name: "Undo", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Redo", exact: true }).click(); await waitForDesignSave(page); expect(await fileLibrary(page)).toEqual(edited);
  expect(await exportedLines(page)).toEqual(lines((await fontMetrics(page)).canvas));
});

test("project cards and visible layer previews follow real font metrics across loading cycles", async ({ page }) => {
  const before = await fileLibrary(page);
  await page.getByRole("link", { name: "Home", exact: true }).click();
  const card = page.getByRole("link", { name: "Open Font loading", exact: true }); await expect(card).toBeVisible();
  const fallback = await card.locator("text").first().locator("tspan").allTextContents();
  await (await delayedFont(page, FONT_BODY))();
  await expect.poll(() => card.locator("text").first().locator("tspan").allTextContents()).not.toEqual(fallback);
  const preview = await card.locator("text").first().locator("tspan").allTextContents();
  await card.click(); await expect(page.getByTestId("page")).toBeVisible();
  await expect.poll(async () => lines((await fontMetrics(page)).canvas)[0]).toEqual(preview);
  await page.getByRole("button", { name: "Position", exact: true }).click(); await page.getByRole("tab", { name: "Layers", exact: true }).click();
  const heading = page.locator('[data-layer-key="element:heading"] .cv-layer-preview text'); await expect(heading).toBeVisible();
  const beforeHeading = await heading.locator("tspan").allTextContents(); await (await delayedFont(page, FONT_HEADING))();
  await expect.poll(() => heading.locator("tspan").allTextContents()).not.toEqual(beforeHeading);
  expect(await heading.locator("tspan").allTextContents()).toEqual(lines((await fontMetrics(page)).canvas)[1]);
  expect(await fileLibrary(page)).toEqual(before); await expect(page.getByRole("button", { name: "Undo", exact: true })).toBeDisabled();
});

test("a failed font request keeps fallback artwork and local history intact", async ({ page }) => {
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await selectFontBody(page); const before = await fileLibrary(page), fallback = await fontMetrics(page);
  await (await delayedFont(page, FONT_BODY, true))();
  const failed = await fontMetrics(page);
  expect(lines(failed.canvas)).toEqual(lines(fallback.canvas)); expect(failed.selection!.height).toBe(fallback.selection!.height);
  expect(lines(failed.thumbnails)).toEqual(lines(failed.canvas)); expect(await fileLibrary(page)).toEqual(before);
  await expect(page.getByRole("button", { name: "Undo", exact: true })).toBeDisabled(); expect(errors).toEqual([]);
});
