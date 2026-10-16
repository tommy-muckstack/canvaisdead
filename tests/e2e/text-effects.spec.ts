import { readFile } from "node:fs/promises";
import { test, expect, waitForDesignSave, type Page } from "./fixtures";
import { captureEffects, effectElement, EFFECT_TEXT, fileLibrary, openEffects, selectEffectsText, setupTextEffects } from "../../scripts/parity/text-effects-evidence";
import { EFFECT_LABELS, TEXT_EFFECTS } from "../../lib/design/text-effects";
import { readDesignBackup } from "../../lib/design/backup-file";
import { designPages } from "../../lib/design/pages";

test.beforeEach(async ({ page, context }) => { await context.grantPermissions(["clipboard-read", "clipboard-write"]); await setupTextEffects(page); });
test("text effect gallery fits both widths and every style remains editable without changing source geometry", async ({ page }, info) => {
  const before = await effectElement(page); await captureEffects(page, info.project.name, "after", "plain");
  const panel = await openEffects(page); await expect(panel.getByRole("heading", { name: "Effects", exact: true })).toBeFocused();
  await expect(panel.getByRole("button", { name: "None", exact: true })).toHaveAttribute("aria-pressed", "true");
  const capture = await captureEffects(page, info.project.name, "after", "panel"); expect(capture.metrics.documentWidth).toBe(capture.metrics.viewport.w);
  for (const tile of capture.metrics.styles) { expect(tile.x).toBeGreaterThanOrEqual(0); expect(tile.x + tile.w).toBeLessThanOrEqual(capture.metrics.viewport.w); }
  for (const kind of TEXT_EFFECTS) {
    const tile = panel.getByRole("button", { name: EFFECT_LABELS[kind], exact: true }); await tile.click(); await waitForDesignSave(page); await expect(tile).toHaveAttribute("aria-pressed", "true");
    const e = await effectElement(page); expect(e.textEffect?.kind).toBe(kind); const geometry = { ...e }; delete geometry.textEffect; expect(geometry).toEqual(before);
    await expect(page.getByTestId("page").locator(`[data-text-effect="${kind}"]`)).toHaveCount(1);
    await expect(page.locator(`.cv-page-thumb [data-text-effect="${kind}"]`)).toHaveCount(1);
  }
  await panel.getByRole("button", { name: "Outline", exact: true }).click(); await waitForDesignSave(page);
  await panel.getByRole("button", { name: "Close text effects", exact: true }).click(); await expect(page.getByRole("button", { name: "Effects", exact: true })).toBeFocused();
  await captureEffects(page, info.project.name, "after", "outline");
});

test("effect previews cancel on Escape, commit once and ignore invalid settings and repeated choices", async ({ page }) => {
  let panel = await openEffects(page); await panel.getByRole("button", { name: "Drop", exact: true }).click(); await waitForDesignSave(page); const base = await fileLibrary(page);
  const offset = panel.getByRole("spinbutton", { name: "Offset value", exact: true }); await offset.fill("95"); expect(await fileLibrary(page)).toEqual(base);
  await offset.press("Escape"); await expect(panel).toHaveCount(0); await expect(page.getByRole("button", { name: "Effects", exact: true })).toBeFocused(); expect(await fileLibrary(page)).toEqual(base);
  panel = await openEffects(page); await offset.fill("101"); await expect(offset).toHaveAttribute("aria-invalid", "true"); await offset.press("Enter"); expect(await fileLibrary(page)).toEqual(base);
  await offset.fill("85"); await offset.press("Enter"); await waitForDesignSave(page); expect((await effectElement(page)).textEffect?.offset).toBe(85); const edited = await fileLibrary(page);
  await panel.getByRole("button", { name: "Drop", exact: true }).click(); await page.getByRole("button", { name: "Undo", exact: true }).click(); await waitForDesignSave(page); expect(await fileLibrary(page)).toEqual(base);
  await page.getByRole("button", { name: "Redo", exact: true }).click(); await waitForDesignSave(page); expect(await fileLibrary(page)).toEqual(edited);
  await page.getByRole("button", { name: "Close text effects", exact: true }).click(); await selectEffectsText(page); panel = await openEffects(page);
  await panel.getByRole("spinbutton", { name: "Direction value", exact: true }).fill("-90"); await page.getByRole("button", { name: "Close text effects", exact: true }).click(); await waitForDesignSave(page); expect((await effectElement(page)).textEffect?.direction).toBe(-90);
  await page.reload(); expect((await effectElement(page)).textEffect?.direction).toBe(-90);
});

test("effect text editing keeps caret and source text, and removal and locks preserve history", async ({ page }) => {
  let panel = await openEffects(page); await panel.getByRole("button", { name: "Hollow", exact: true }).click(); await waitForDesignSave(page); const before = await fileLibrary(page);
  await panel.getByRole("button", { name: "Close text effects", exact: true }).click(); await selectEffectsText(page, true);
  const input = page.getByRole("textbox", { name: "Edit text", exact: true }); await expect(input).toHaveValue(EFFECT_TEXT); await input.press("ControlOrMeta+End"); await input.pressSequentially(" TODAY");
  await expect(input).toHaveValue(EFFECT_TEXT + " TODAY"); expect(await input.evaluate(node => (node as HTMLTextAreaElement).selectionStart)).toBe((EFFECT_TEXT + " TODAY").length);
  await expect(page.locator('.cv-effect-edit-preview [data-text-effect="hollow"]')).toHaveCount(1); expect(await fileLibrary(page)).toEqual(before);
  await input.press("Escape"); await waitForDesignSave(page); expect(await effectElement(page)).toMatchObject({ text: EFFECT_TEXT + " TODAY", textEffect: { kind: "hollow" } });
  await page.getByRole("button", { name: "Undo", exact: true }).click(); await waitForDesignSave(page); expect(await fileLibrary(page)).toEqual(before); await selectEffectsText(page);
  panel = await openEffects(page); await panel.getByRole("button", { name: "Remove effect", exact: true }).click(); await waitForDesignSave(page); expect((await effectElement(page)).textEffect).toBeUndefined();
  await page.getByRole("button", { name: "Close text effects", exact: true }).click(); await page.getByRole("button", { name: "Undo", exact: true }).click(); await waitForDesignSave(page); await selectEffectsText(page);
  await page.getByRole("button", { name: "Lock", exact: true }).click(); await waitForDesignSave(page); await expect(page.getByRole("button", { name: "Effects", exact: true })).toHaveCount(0);
  await page.reload(); expect(await effectElement(page)).toMatchObject({ locked: true, textEffect: { kind: "hollow" } });
});

async function download(page: Page, format: "svg" | "png") {
  await page.getByRole("button", { name: "File", exact: true }).click(); await page.getByRole("menuitem", { name: "Download", exact: true }).click();
  const panel = page.getByRole("dialog", { name: "Download design", exact: true }); await panel.getByRole("combobox", { name: "File type", exact: true }).selectOption(format);
  const pending = page.waitForEvent("download"); await panel.getByRole("button", { name: "Download", exact: true }).click(); const bytes = await readFile((await (await pending).path())!); await page.keyboard.press("Escape"); return bytes;
}
test("all text effects survive actual SVG and PNG downloads with distinct rendered pixels", async ({ page }) => {
  test.setTimeout(120000); const plain = await download(page, "png"), images = new Set<string>();
  for (const kind of TEXT_EFFECTS) {
    const panel = await openEffects(page); await panel.getByRole("button", { name: EFFECT_LABELS[kind], exact: true }).click(); await waitForDesignSave(page); await panel.getByRole("button", { name: "Close text effects", exact: true }).click();
    const svg = (await download(page, "svg")).toString("utf8"); expect(svg).toContain(`data-text-effect="${kind}"`); expect(svg).toContain("SOME NOISE"); expect(svg).not.toContain("Private effect notes"); expect(svg).not.toContain("url(");
    const png = await download(page, "png"); expect(png.equals(plain)).toBe(false); const base64 = png.toString("base64"); images.add(base64);
    const stats = await page.evaluate(async base64 => {
      const bitmap = await createImageBitmap(new Blob([Uint8Array.from(atob(base64), c => c.charCodeAt(0))], { type: "image/png" }));
      const canvas = document.createElement("canvas"); canvas.width = bitmap.width; canvas.height = bitmap.height; const ctx = canvas.getContext("2d")!; ctx.drawImage(bitmap, 0, 0); bitmap.close();
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data; let ink = 0; for (let i = 0; i < data.length; i += 4) if (Math.min(data[i], data[i + 1], data[i + 2]) < 180 && data[i + 3] > 100) ink++;
      return { width: canvas.width, height: canvas.height, ink };
    }, base64); expect(stats.width).toBe(800); expect(stats.height).toBe(600); expect(stats.ink).toBeGreaterThan(300);
  }
  expect(images.size).toBe(TEXT_EFFECTS.length);
});

test("effect metadata survives native clipboard and an actual backup import as independent copies", async ({ page }) => {
  const panel = await openEffects(page); await panel.getByRole("button", { name: "Background", exact: true }).click(); await waitForDesignSave(page); await panel.getByRole("button", { name: "Close text effects", exact: true }).click();
  await page.getByTestId("page").focus(); await page.keyboard.press("ControlOrMeta+c"); await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(EFFECT_TEXT);
  await page.keyboard.press("ControlOrMeta+v"); await waitForDesignSave(page);
  const id = page.url().split("/").at(-1), before = await fileLibrary(page), source = before.find(d => d.id === id)!; expect(designPages(source)[0].els).toHaveLength(2);
  const [one, two] = designPages(source)[0].els; expect(two.textEffect).toEqual(one.textEffect); expect(two.id).not.toBe(one.id);
  await page.getByRole("link", { name: "Home", exact: true }).click(); await expect(page.getByTestId("designs")).toBeVisible();
  const pending = page.waitForEvent("download"); await page.getByRole("button", { name: "Back up designs", exact: true }).click(); const backup = await pending, bytes = await readFile((await backup.path())!); expect(await readDesignBackup(new Blob([new Uint8Array(bytes)]))).toEqual(before);
  await page.getByLabel("Import design backup", { exact: true }).setInputFiles({ name: backup.suggestedFilename(), mimeType: "application/x-canvaisdead-backup", buffer: bytes });
  await expect(page.getByText(`${before.length} designs imported as new copies.`, { exact: true })).toBeVisible();
  const imported = await fileLibrary(page); expect(imported).toHaveLength(before.length * 2); for (const design of before) expect(imported.find(d => d.id === design.id)).toEqual(design);
  const oldIds = new Set(before.map(d => d.id)), copy = imported.find(d => !oldIds.has(d.id) && d.name === source.name)!; expect(designPages(copy)[0].els.map(e => e.textEffect)).toEqual([one.textEffect, two.textEffect]);
});
