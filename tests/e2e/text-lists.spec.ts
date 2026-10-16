import { readFile } from "node:fs/promises";
import { test, expect, waitForDesignSave, type Page } from "./fixtures";
import { captureTextLists, chooseList, fileLibrary, LIST_TEXT, listMetrics, selectListText, setupTextLists } from "../../scripts/parity/text-lists-evidence";
import { designPages } from "../../lib/design/pages";
import { readDesignBackup } from "../../lib/design/backup-file";

const saved = async (page: Page) => {
  const id = page.url().split("/").at(-1), design = (await fileLibrary(page)).find(item => item.id === id);
  if (!design) throw Error("Open design missing from the saved library");
  return designPages(design)[0].els;
};
async function download(page: Page, format: "svg" | "png") {
  await page.getByRole("button", { name: "File", exact: true }).click(); await page.getByRole("menuitem", { name: "Download", exact: true }).click();
  const panel = page.getByRole("dialog", { name: "Download design", exact: true });
  await panel.getByRole("combobox", { name: "File type", exact: true }).selectOption(format);
  const pending = page.waitForEvent("download"); await panel.getByRole("button", { name: "Download", exact: true }).click();
  const bytes = await readFile((await (await pending).path())!); await page.keyboard.press("Escape"); return bytes;
}
test.beforeEach(async ({ page, context }) => { await context.grantPermissions(["clipboard-read", "clipboard-write"]); await setupTextLists(page); });

test("List menu supports keyboard choice, wrapping and one-step undo without changing text", async ({ page }, info) => {
  const before = await fileLibrary(page); await captureTextLists(page, info.project.name, "after", "plain");
  const button = page.getByRole("button", { name: "List", exact: true }); await button.focus(); await button.press("ArrowDown");
  const menu = page.getByRole("menu", { name: "List style", exact: true });
  await expect(menu.getByRole("menuitemradio", { name: "No list", exact: true })).toBeChecked();
  await expect(menu.getByRole("menuitemradio", { name: "No list", exact: true })).toBeFocused();
  const opened = await captureTextLists(page, info.project.name, "after", "menu");
  expect(opened.metrics.menu!.x).toBeGreaterThanOrEqual(0); expect(opened.metrics.menu!.x + opened.metrics.menu!.w).toBeLessThanOrEqual(opened.metrics.viewport.w);
  expect(opened.metrics.menu!.y + opened.metrics.menu!.h).toBeLessThanOrEqual(opened.metrics.viewport.h);
  await menu.press("Escape"); await expect(button).toBeFocused(); expect(await fileLibrary(page)).toEqual(before);
  await button.press("ArrowDown"); await menu.press("End"); await expect(menu.getByRole("menuitemradio", { name: "Numbered list", exact: true })).toBeFocused(); await page.keyboard.press("Enter");
  await waitForDesignSave(page); await expect(button).toBeFocused(); await expect(button).toHaveAttribute("aria-pressed", "true");
  const listed = await fileLibrary(page), captured = await captureTextLists(page, info.project.name, "after", "numbered"), m = captured.metrics;
  expect((await saved(page))[0]).toMatchObject({ text: LIST_TEXT, listStyle: "number" });
  expect(m.canvas.filter(line => line.marker).map(line => line.text)).toEqual(["1.", "2.", "3.", "4."]);
  expect(m.canvas.filter(line => !line.marker).length).toBeGreaterThan(4); expect(m.selection!.height).toBeCloseTo(m.canvas.filter(line => !line.marker).length * 28 * 1.4);
  expect(m.thumbnails.map(line => line.text)).toEqual(m.canvas.map(line => line.text)); expect(m.documentWidth).toBe(m.viewport.w);
  await chooseList(page, "Numbered list"); await page.getByRole("button", { name: "Undo", exact: true }).click(); await waitForDesignSave(page); expect(await fileLibrary(page)).toEqual(before); await expect(page.getByRole("button", { name: "Undo", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Redo", exact: true }).click(); await waitForDesignSave(page); expect(await fileLibrary(page)).toEqual(listed);
});

test("editing a list keeps numbering out of editable text and preserves caret, history and reload", async ({ page }) => {
  await chooseList(page, "Numbered list"); const before = await fileLibrary(page); await selectListText(page, true);
  const editor = page.getByRole("textbox", { name: "Edit text", exact: true }); await expect(editor).toHaveValue(LIST_TEXT);
  const draft = Array.from({ length: 10 }, (_, i) => `Item ${i + 1}`).join("\n");
  await editor.fill(draft); await editor.press("ControlOrMeta+End"); await editor.press("Enter"); await editor.press("End"); await editor.pressSequentially("Last item");
  const text = draft + "\nLast item"; await expect(editor).toHaveValue(text);
  expect(await page.locator(".cv-list-marker").allTextContents()).toEqual(Array.from({ length: 11 }, (_, i) => `${i + 1}.`));
  expect(await editor.evaluate(node => (node as HTMLTextAreaElement).selectionStart)).toBe(text.length); expect(await fileLibrary(page)).toEqual(before);
  await editor.press("Escape"); await waitForDesignSave(page); const edited = await fileLibrary(page); expect((await saved(page))[0]).toMatchObject({ text, listStyle: "number" });
  await page.getByRole("button", { name: "Undo", exact: true }).click(); await waitForDesignSave(page); expect(await fileLibrary(page)).toEqual(before);
  await page.getByRole("button", { name: "Redo", exact: true }).click(); await waitForDesignSave(page); expect(await fileLibrary(page)).toEqual(edited);
  await page.reload(); await expect(page.getByTestId("page").locator('tspan[text-anchor="end"]')).toHaveCount(11); expect(await fileLibrary(page)).toEqual(edited);
});

test("bullet and number markers survive real SVG and PNG downloads and can be removed", async ({ page }) => {
  await chooseList(page, "Bulleted list"); expect((await listMetrics(page)).canvas.filter(line => line.marker).map(line => line.text)).toEqual(["•", "•", "•", "•"]);
  await chooseList(page, "Numbered list"); const canvas = await listMetrics(page);
  const svg = (await download(page, "svg")).toString("utf8"); expect(svg).not.toContain("Private list notes");
  const spans = await page.evaluate(text => Array.from(new DOMParser().parseFromString(text, "image/svg+xml").querySelectorAll("tspan"), node => node.textContent), svg);
  expect(spans).toEqual(canvas.canvas.map(line => line.text));
  const png = await download(page, "png");
  const marks = await page.getByTestId("page").locator('tspan[text-anchor="end"]').evaluateAll(nodes => nodes.map(node => ({ x: Number(node.getAttribute("x")), y: Number(node.getAttribute("y")) })));
  const pixels = await page.evaluate(async ({ base64, marks }) => {
    const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0)), bitmap = await createImageBitmap(new Blob([bytes], { type: "image/png" }));
    const canvas = document.createElement("canvas"); canvas.width = bitmap.width; canvas.height = bitmap.height; const ctx = canvas.getContext("2d")!; ctx.drawImage(bitmap, 0, 0); bitmap.close();
    return { width: canvas.width, height: canvas.height, markers: marks.map(mark => { const data = ctx.getImageData(Math.floor(mark.x - 25), Math.floor(mark.y - 28), 26, 32).data; let dark = 0; for (let i = 0; i < data.length; i += 4) if (data[i] < 100 && data[i + 1] < 100 && data[i + 2] < 100 && data[i + 3] > 100) dark++; return dark; }) };
  }, { base64: png.toString("base64"), marks });
  expect(pixels.width).toBe(800); expect(pixels.height).toBe(600); expect(pixels.markers).toHaveLength(4); expect(pixels.markers.every(count => count > 10)).toBe(true);
  await chooseList(page, "No list"); expect((await saved(page))[0].listStyle).toBeUndefined(); expect((await saved(page))[0].text).toBe(LIST_TEXT); expect((await listMetrics(page)).canvas.every(line => !line.marker)).toBe(true);
});

test("native clipboard and downloaded backups retain list formatting and locked lists cannot change", async ({ page }) => {
  await chooseList(page, "Bulleted list"); await page.getByTestId("page").focus(); await page.keyboard.press("ControlOrMeta+c");
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(LIST_TEXT.split("\n").map(line => `• ${line}`).join("\n"));
  await page.keyboard.press("ControlOrMeta+v"); await expect.poll(async () => (await saved(page)).length).toBe(2); await waitForDesignSave(page);
  const elements = await saved(page); expect(elements[1]).toMatchObject({ text: LIST_TEXT, listStyle: "bullet" }); expect(elements[1].id).not.toBe(elements[0].id);
  await page.getByRole("button", { name: "Lock", exact: true }).click(); await waitForDesignSave(page); await expect(page.getByRole("button", { name: "List", exact: true })).toHaveCount(0);
  const originalId = page.url().split("/").at(-1)!, before = await fileLibrary(page), original = before.find(d => d.id === originalId)!;
  await page.getByRole("link", { name: "Home", exact: true }).click(); await expect(page.getByTestId("designs")).toBeVisible();
  const pending = page.waitForEvent("download"); await page.getByRole("button", { name: "Back up designs", exact: true }).click(); const backup = await pending, path = (await backup.path())!, bytes = await readFile(path);
  expect(await readDesignBackup(new Blob([new Uint8Array(bytes)]))).toEqual(before);
  await page.getByLabel("Import design backup", { exact: true }).setInputFiles({ name: backup.suggestedFilename(), mimeType: "application/x-canvaisdead-backup", buffer: bytes });
  await expect(page.getByText(`${before.length} ${before.length === 1 ? "design imported as a new copy" : "designs imported as new copies"}.`, { exact: true })).toBeVisible();
  const imported = await fileLibrary(page); expect(imported).toHaveLength(before.length * 2);
  for (const source of before) expect(imported.find(d => d.id === source.id)).toEqual(source);
  const originalIds = new Set(before.map(d => d.id)), copies = imported.filter(d => !originalIds.has(d.id)); expect(copies).toHaveLength(before.length);
  const copy = copies.find(d => d.name === original.name)!; expect(designPages(copy)[0].els.map(e => [e.text, e.listStyle, e.locked])).toEqual(designPages(original)[0].els.map(e => [e.text, e.listStyle, e.locked]));
});
