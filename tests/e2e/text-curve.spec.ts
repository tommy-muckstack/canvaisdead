import { readFile } from "node:fs/promises";
import { test, expect, waitForDesignSave, type Page } from "./fixtures";
import { captureCurve, chooseCurve, CURVE_TEXT, fileLibrary, openEffects, selectCurveText, setupCurve } from "../../scripts/parity/text-curve-evidence";
import { effectElement } from "../../scripts/parity/text-effects-evidence";
import { readDesignBackup } from "../../lib/design/backup-file";
import { designPages } from "../../lib/design/pages";

test.beforeEach(async ({ page, context }) => { await context.grantPermissions(["clipboard-read", "clipboard-write"]); await setupCurve(page); });
test("curved text exposes Shape controls, both directions and a complete circle without losing source", async ({ page }, info) => {
  await captureCurve(page, info.project.name, "after", "plain");
  const panel = await openEffects(page); await panel.getByRole("button", { name: "Curve", exact: true }).scrollIntoViewIfNeeded();
  await captureCurve(page, info.project.name, "after", "panel");
  for (const [value, state] of [[50, "positive"], [-50, "negative"], [100, "circle"]] as const) {
    await chooseCurve(page, value); await panel.getByRole("button", { name: "Close text effects", exact: true }).click();
    const metrics = await captureCurve(page, info.project.name, "after", state); expect(metrics.documentWidth).toBe(metrics.viewport.w); expect(metrics.amount).toBe(String(value));
    expect(metrics.paths.map(p => p.text).join("")).toBe(CURVE_TEXT); expect(metrics.paths[0].bounds!.w).toBeGreaterThan(10); expect(metrics.paths[0].bounds!.h).toBeGreaterThan(10);
    expect(await effectElement(page)).toMatchObject({ text: CURVE_TEXT, textCurve: value });
  }
  await page.reload(); expect((await effectElement(page)).textCurve).toBe(100); await expect(page.getByTestId("page").locator("textPath")).toHaveText(CURVE_TEXT);
});

test("curve drafts cancel, validate, commit once and keep style and shape independently undoable", async ({ page }) => {
  let panel = await chooseCurve(page, 50); await panel.getByRole("button", { name: "Outline", exact: true }).click(); await waitForDesignSave(page); const before = await fileLibrary(page);
  let input = panel.getByRole("spinbutton", { name: "Curve value", exact: true }); await input.fill("-80"); expect(await fileLibrary(page)).toEqual(before);
  await input.press("Escape"); await expect(page.getByRole("button", { name: "Effects", exact: true })).toBeFocused(); expect(await fileLibrary(page)).toEqual(before);
  panel = await openEffects(page); input = panel.getByRole("spinbutton", { name: "Curve value", exact: true }); await input.fill("101"); await expect(input).toHaveAttribute("aria-invalid", "true"); await input.press("Enter"); expect(await fileLibrary(page)).toEqual(before);
  await input.fill("-25"); await input.press("Enter"); await waitForDesignSave(page); const changed = await fileLibrary(page);
  await panel.getByRole("button", { name: "Curve", exact: true }).click(); await page.getByRole("button", { name: "Undo", exact: true }).click(); await waitForDesignSave(page); expect(await fileLibrary(page)).toEqual(before);
  await page.getByRole("button", { name: "Redo", exact: true }).click(); await waitForDesignSave(page); expect(await fileLibrary(page)).toEqual(changed);
  await panel.getByRole("button", { name: "Close text effects", exact: true }).click(); await selectCurveText(page); panel = await openEffects(page);
  await panel.getByRole("button", { name: "Shape: None", exact: true }).click(); await waitForDesignSave(page); expect((await effectElement(page)).textCurve).toBeUndefined(); expect((await effectElement(page)).textEffect?.kind).toBe("outline");
  await chooseCurve(page, 0); await panel.getByRole("button", { name: "Remove effect", exact: true }).click(); await waitForDesignSave(page); expect(await effectElement(page)).toMatchObject({ textCurve: 0 }); expect((await effectElement(page)).textEffect).toBeUndefined();
});

test("double-click editing and native clipboard retain the curve and editable source", async ({ page }) => {
  const panel = await chooseCurve(page, 50); await panel.getByRole("button", { name: "Close text effects", exact: true }).click();
  await selectCurveText(page, true); const input = page.getByRole("textbox", { name: "Edit text", exact: true }); await expect(input).toHaveValue(CURVE_TEXT);
  await input.press("ControlOrMeta+End"); await input.pressSequentially(" ALWAYS"); expect(await input.evaluate(node => (node as HTMLTextAreaElement).selectionStart)).toBe((CURVE_TEXT + " ALWAYS").length);
  await input.press("Escape"); await waitForDesignSave(page); expect(await effectElement(page)).toMatchObject({ text: CURVE_TEXT + " ALWAYS", textCurve: 50 });
  await page.getByTestId("page").focus(); await page.keyboard.press("ControlOrMeta+c"); await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(CURVE_TEXT + " ALWAYS");
  await page.keyboard.press("ControlOrMeta+v"); await waitForDesignSave(page); const id = page.url().split("/").at(-1);
  await expect.poll(async () => designPages((await fileLibrary(page)).find(d => d.id === id)!)[0].els.length).toBe(2);
  const elements = designPages((await fileLibrary(page)).find(d => d.id === id)!)[0].els; expect(elements[1].textCurve).toBe(50); expect(elements[1].id).not.toBe(elements[0].id);
  await page.reload(); await expect(page.getByTestId("page").locator("[data-text-curve]")).toHaveCount(2);
});

async function download(page: Page, format: "svg" | "png") {
  await page.getByRole("button", { name: "File", exact: true }).click(); await page.getByRole("menuitem", { name: "Download", exact: true }).click();
  const panel = page.getByRole("dialog", { name: "Download design", exact: true }); await panel.getByRole("combobox", { name: "File type", exact: true }).selectOption(format);
  const pending = page.waitForEvent("download"); await panel.getByRole("button", { name: "Download", exact: true }).click(); const bytes = await readFile((await (await pending).path())!); await page.keyboard.press("Escape"); return bytes;
}
test("real SVG and PNG exports retain distinct curved shapes and local backups restore them", async ({ page }) => {
  const plain = await download(page, "png"), outputs = new Set<string>();
  for (const amount of [50, -50, 100]) {
    const panel = await chooseCurve(page, amount); if (amount === 100) { await panel.getByRole("button", { name: "Outline", exact: true }).click(); await waitForDesignSave(page); } await panel.getByRole("button", { name: "Close text effects", exact: true }).click();
    const svg = (await download(page, "svg")).toString("utf8"); expect(svg).toContain("<textPath"); expect(svg).toContain(CURVE_TEXT); expect(svg).not.toContain("Private effect notes"); expect(svg).not.toContain("https:");
    const png = await download(page, "png"); expect(png.equals(plain)).toBe(false); outputs.add(png.toString("base64"));
    const stats = await page.evaluate(async encoded => { const b = await createImageBitmap(new Blob([Uint8Array.from(atob(encoded), c => c.charCodeAt(0))], { type: "image/png" })); const c = document.createElement("canvas"); c.width = b.width; c.height = b.height; const ctx = c.getContext("2d")!; ctx.drawImage(b, 0, 0); b.close(); const pixels = ctx.getImageData(0, 0, c.width, c.height).data; let ink = 0; for (let i = 0; i < pixels.length; i += 4) if (pixels[i + 1] < 160) ink++; return { w: c.width, h: c.height, ink }; }, png.toString("base64"));
    expect(stats).toMatchObject({ w: 800, h: 600 }); expect(stats.ink).toBeGreaterThan(1000);
  }
  expect(outputs.size).toBe(3); const before = await fileLibrary(page); await page.getByRole("link", { name: "Home", exact: true }).click();
  const pending = page.waitForEvent("download"); await page.getByRole("button", { name: "Back up designs", exact: true }).click(); const file = await pending, bytes = await readFile((await file.path())!); expect(await readDesignBackup(new Blob([new Uint8Array(bytes)]))).toEqual(before);
  await page.getByLabel("Import design backup", { exact: true }).setInputFiles({ name: file.suggestedFilename(), mimeType: "application/x-canvaisdead-backup", buffer: bytes }); await expect(page.getByText(`${before.length} designs imported as new copies.`, { exact: true })).toBeVisible();
  const imported = await fileLibrary(page); expect(imported).toHaveLength(before.length * 2); for (const design of before) expect(imported.find(d => d.id === design.id)).toEqual(design);
});

test("a blocked bundled font reports an export error and can retry without losing the design", async ({ page }) => {
  const panel = await chooseCurve(page, 50); await panel.getByRole("button", { name: "Close text effects", exact: true }).click(); const before = await fileLibrary(page);
  await page.route("**/fonts/PlusJakartaSans-Variable.woff2", route => route.fulfill({ status: 503, body: "Unavailable" }));
  await page.getByRole("button", { name: "File", exact: true }).click(); await page.getByRole("menuitem", { name: "Download", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Download design", exact: true }); await dialog.getByRole("button", { name: "Download", exact: true }).click(); await expect(dialog.getByRole("alert")).toContainText("bundled font could not be loaded"); expect(await fileLibrary(page)).toEqual(before);
  await page.unroute("**/fonts/PlusJakartaSans-Variable.woff2"); const pending = page.waitForEvent("download"); await dialog.getByRole("button", { name: "Download", exact: true }).click(); expect((await readFile((await (await pending).path())!)).length).toBeGreaterThan(1000); expect(await fileLibrary(page)).toEqual(before);
});
