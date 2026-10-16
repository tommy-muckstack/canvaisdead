import { waitForDesignSave } from "./fixtures";
import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "./fixtures";
import type { El } from "@/lib/design/types";
import { blankDesign, makeEl } from "@/lib/design/ops";
import { captureTextSpacing, textCanvasPoint } from "../../scripts/parity/text-spacing-evidence";

const fixture = makeEl("text", blankDesign({ w: 800, h: 600 }), { id: "heading", text: "Readable type\nSecond line", x: 120, y: 160, w: 400, fontSize: 32, fontWeight: 400 });
async function saved(page: Page): Promise<El> {
  const id = page.url().split("/").at(-1)!;
  return page.evaluate(async id => { const key = (await window.designTestStorage.keys()).find(key => key.endsWith(":designs"))!, d = JSON.parse((await window.designTestStorage.getItem(key))).find((value: { id: string }) => value.id === id); return (d.pages ? d.pages[0].els : d.els)[0]; }, id);
}
async function spacing(page: Page) { await page.getByRole("button", { name: "Spacing", exact: true }).click(); return page.getByRole("dialog", { name: "Text spacing" }); }
test.beforeEach(async ({ page }) => {
  await page.goto("/canvaisdead/login");
  const cookies = page.getByRole("button", { name: "Accept all cookies" }); if (await cookies.isVisible()) await cookies.click();
  await page.getByRole("button", { name: "Use the demo account" }).click(); await expect(page.getByTestId("designs")).toBeVisible();
  await page.locator(".cx-qc").getByRole("button", { name: "Presentation", exact: true }).click(); await expect(page.getByTestId("page")).toBeVisible();
  const id = page.url().split("/").at(-1)!;
  await page.evaluate(async ({ id, fixture }) => { const key = (await window.designTestStorage.keys()).find(key => key.endsWith(":designs"))!, designs = JSON.parse((await window.designTestStorage.getItem(key))); await window.designTestStorage.setItem(key, JSON.stringify(designs.map((d: { id: string }) => d.id === id ? { ...d, w: 800, h: 600, els: [fixture] } : d))); }, { id, fixture });
  await waitForDesignSave(page); await page.reload(); await expect(page.getByTestId("page")).toBeVisible();
  if (await page.getByRole("button", { name: "Hide side panel", exact: true }).isVisible()) await page.getByRole("button", { name: "Hide side panel", exact: true }).click();
  await page.getByTestId("page").locator("text").click();
});

test("spacing previews, validates, commits once and survives undo and reload", async ({ page }, testInfo) => {
  const original = await saved(page), panel = await spacing(page), letters = panel.getByRole("spinbutton", { name: "Letter spacing value" });
  await letters.fill("250");
  await expect(page.getByTestId("page").locator("text")).toHaveAttribute("letter-spacing", "8"); expect(await saved(page)).toEqual(original);
  await letters.press("Enter"); await expect.poll(async () => (await saved(page)).letterSpacingEm).toBe(.25);
  const committed = await saved(page);
  await panel.getByRole("spinbutton", { name: "Line spacing value" }).fill("2"); await panel.getByRole("spinbutton", { name: "Line spacing value" }).press("Escape");
  await expect(panel).toHaveCount(0); expect(await saved(page)).toEqual(committed); await expect(page.getByRole("button", { name: "Spacing", exact: true })).toBeFocused();
  await page.getByTestId("page").focus(); await page.keyboard.press("ControlOrMeta+z"); await expect.poll(() => saved(page)).toEqual(original);
  await page.keyboard.press("ControlOrMeta+Shift+z"); await expect.poll(() => saved(page)).toEqual(committed);
  await waitForDesignSave(page); await page.reload(); await expect(page.getByTestId("page").locator("text")).toHaveAttribute("letter-spacing", "8");
  await page.getByTestId("page").locator("text").click(); await spacing(page);
  await letters.fill("999"); await expect(letters).toHaveAttribute("aria-invalid", "true"); await letters.press("Tab"); await expect(letters).toHaveValue("250"); expect(await saved(page)).toEqual(committed);
  const slider = panel.getByRole("slider", { name: "Letter spacing", exact: true }); await slider.press("ArrowRight");
  await expect.poll(async () => (await saved(page)).letterSpacingEm).toBe(.251);
  await page.screenshot({ path: testInfo.outputPath("text-spacing-controls.png") });
});

test("Escape discards focused number and slider previews before returning focus", async ({ page }) => {
  const original = await saved(page), trigger = page.getByRole("button", { name: "Spacing", exact: true });
  for (const [label, value] of [["Letter spacing", "250"], ["Line spacing", "2"]]) {
    const panel = await spacing(page), field = panel.getByRole("spinbutton", { name: `${label} value` });
    await field.fill(value); await field.press("Escape");
    await expect(panel).toHaveCount(0); await expect(trigger).toBeFocused(); expect(await saved(page)).toEqual(original);

    const reopened = await spacing(page), slider = reopened.getByRole("slider", { name: label, exact: true });
    await slider.focus(); await page.keyboard.down("ArrowRight");
    try {
      await expect(slider).not.toHaveValue(label === "Letter spacing" ? "0" : "1.2");
      await page.keyboard.press("Escape");
    } finally { await page.keyboard.up("ArrowRight"); }
    await expect(reopened).toHaveCount(0); await expect(trigger).toBeFocused(); expect(await saved(page)).toEqual(original);
  }
});

test("end anchoring holds text in place as typing adds lines and export retains spacing", async ({ page }, info) => {
  const panel = await spacing(page);
  await panel.getByRole("spinbutton", { name: "Letter spacing value" }).fill("100"); await panel.getByRole("spinbutton", { name: "Letter spacing value" }).press("Enter");
  await panel.getByRole("spinbutton", { name: "Line spacing value" }).fill("1.8"); await panel.getByRole("spinbutton", { name: "Line spacing value" }).press("Enter");
  await panel.getByRole("button", { name: "Anchor end" }).click();
  await expect.poll(() => panel.locator("legend").evaluate(legend => {
    const box = legend.getBoundingClientRect(), hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
    return hit === legend || !!hit && legend.contains(hit);
  })).toBe(true);
  await captureTextSpacing(page, info.project.name, "controls");
  await panel.getByRole("button", { name: "Close text spacing" }).click();
  const outline = page.getByTestId("selection").locator("rect").first(), before = (await outline.boundingBox())!, initial = await saved(page);
  const canvas = page.getByTestId("page"), editor = page.getByRole("textbox", { name: "Edit text", exact: true });
  await test.step("double-click between the spaced text lines", async () => {
    const point = await textCanvasPoint(page);
    await canvas.dblclick({ position: { x: point.canvasX, y: point.canvasY } });
    await expect(editor).toBeFocused();
  });
  expect(parseFloat(await editor.evaluate(el => getComputedStyle(el).letterSpacing))).toBeGreaterThan(0);
  await editor.fill(initial.text + "\nThird line\nFourth line"); await editor.press("Escape");
  await expect.poll(async () => (await saved(page)).text).toContain("Fourth line");
  const after = (await outline.boundingBox())!; expect(after.y + after.height).toBeCloseTo(before.y + before.height, 1); expect(after.height).toBeGreaterThan(before.height);
  await test.step("double-click a painted text line and keep the same content", async () => {
    const point = await textCanvasPoint(page, true);
    await canvas.dblclick({ position: { x: point.canvasX, y: point.canvasY } });
    await expect(editor).toBeFocused(); await expect(editor).toHaveValue(initial.text + "\nThird line\nFourth line");
    await editor.press("Escape");
  });
  await captureTextSpacing(page, info.project.name, "edited");
  await page.getByRole("button", { name: "Share", exact: true }).click(); await page.getByRole("button", { name: "Download", exact: true }).click();
  const downloadPanel = page.getByRole("dialog", { name: "Download design" }); await downloadPanel.getByLabel("File type", { exact: true }).selectOption("svg");
  const pending = page.waitForEvent("download"); await downloadPanel.getByRole("button", { name: "Download", exact: true }).click(); const file = await pending;
  const svg = await readFile((await file.path())!, "utf8"); expect(svg).toContain('letter-spacing="3.2"'); expect(svg).toContain("Fourth line</tspan>");
});

test("outside click commits a spacing preview before moving text and locks hide the controls", async ({ page }) => {
  const canvas = page.getByTestId("page");
  // Keep the text below the open spacing popover, so this really is an outside
  // pointer-down on the artwork, including on the narrow viewport.
  await canvas.focus();
  for (let step = 0; step < 20; step++) await page.keyboard.press("Shift+ArrowDown");
  await expect.poll(async () => (await saved(page)).y).toBe(fixture.y + 200);
  const panel = await spacing(page), field = panel.getByRole("spinbutton", { name: "Line spacing value" });
  await field.fill("2");
  const point = await textCanvasPoint(page);
  await test.step("commit the spacing preview and drag from between lines", async () => {
    await page.mouse.move(point.x, point.y); await page.mouse.down(); await page.mouse.move(point.x + 20, point.y + 20); await page.mouse.up();
  });
  await expect(panel).toHaveCount(0); await expect.poll(async () => (await saved(page)).lineHeight).toBe(2);
  const moved = await saved(page); expect(moved.x).not.toBe(fixture.x);
  await canvas.focus(); await page.keyboard.press("ControlOrMeta+z"); await expect.poll(async () => (await saved(page)).x).toBe(fixture.x); expect((await saved(page)).lineHeight).toBe(2);
  const restored = await textCanvasPoint(page);
  await canvas.click({ position: { x: restored.canvasX, y: restored.canvasY } });
  await page.getByRole("button", { name: "Lock", exact: true }).click(); await expect(page.getByRole("button", { name: "Spacing", exact: true })).toHaveCount(0);
});
