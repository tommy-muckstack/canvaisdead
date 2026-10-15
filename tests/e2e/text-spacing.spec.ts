import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import type { El } from "@/lib/design/types";
import { blankDesign, makeEl } from "@/lib/design/ops";

const fixture = makeEl("text", blankDesign({ w: 800, h: 600 }), { id: "heading", text: "Readable type\nSecond line", x: 120, y: 160, w: 400, fontSize: 32, fontWeight: 400 });
async function saved(page: Page): Promise<El> {
  const id = page.url().split("/").at(-1)!;
  return page.evaluate(id => { const key = Object.keys(localStorage).find(key => key.endsWith(":designs"))!, d = JSON.parse(localStorage.getItem(key)!).find((value: { id: string }) => value.id === id); return (d.pages ? d.pages[0].els : d.els)[0]; }, id);
}
async function spacing(page: Page) { await page.getByRole("button", { name: "Spacing", exact: true }).click(); return page.getByRole("dialog", { name: "Text spacing" }); }
test.beforeEach(async ({ page }) => {
  await page.goto("/canvaisdead/login");
  const cookies = page.getByRole("button", { name: "Accept all cookies" }); if (await cookies.isVisible()) await cookies.click();
  await page.getByRole("button", { name: "Use the demo account" }).click(); await expect(page.getByTestId("designs")).toBeVisible();
  await page.locator(".cx-qc").getByRole("button", { name: "Presentation", exact: true }).click(); await expect(page.getByTestId("page")).toBeVisible();
  const id = page.url().split("/").at(-1)!;
  await page.evaluate(({ id, fixture }) => { const key = Object.keys(localStorage).find(key => key.endsWith(":designs"))!, designs = JSON.parse(localStorage.getItem(key)!); localStorage.setItem(key, JSON.stringify(designs.map((d: { id: string }) => d.id === id ? { ...d, w: 800, h: 600, els: [fixture] } : d))); }, { id, fixture });
  await page.reload(); await expect(page.getByTestId("page")).toBeVisible();
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
  await page.reload(); await expect(page.getByTestId("page").locator("text")).toHaveAttribute("letter-spacing", "8");
  await page.getByTestId("page").locator("text").click(); await spacing(page);
  await letters.fill("999"); await expect(letters).toHaveAttribute("aria-invalid", "true"); await letters.press("Tab"); await expect(letters).toHaveValue("250"); expect(await saved(page)).toEqual(committed);
  const slider = panel.getByRole("slider", { name: "Letter spacing", exact: true }); await slider.press("ArrowRight");
  await expect.poll(async () => (await saved(page)).letterSpacingEm).toBe(.251);
  await page.screenshot({ path: testInfo.outputPath("text-spacing-controls.png") });
});

test("end anchoring holds text in place as typing adds lines and export retains spacing", async ({ page }) => {
  const panel = await spacing(page);
  await panel.getByRole("spinbutton", { name: "Letter spacing value" }).fill("100"); await panel.getByRole("spinbutton", { name: "Letter spacing value" }).press("Enter");
  await panel.getByRole("spinbutton", { name: "Line spacing value" }).fill("1.8"); await panel.getByRole("spinbutton", { name: "Line spacing value" }).press("Enter");
  await panel.getByRole("button", { name: "Anchor end" }).click(); await panel.getByRole("button", { name: "Close text spacing" }).click();
  const outline = page.getByTestId("selection").locator("rect").first(), before = (await outline.boundingBox())!, initial = await saved(page);
  await page.getByTestId("page").locator("text").dblclick(); const editor = page.getByRole("textbox", { name: "Edit text", exact: true });
  expect(parseFloat(await editor.evaluate(el => getComputedStyle(el).letterSpacing))).toBeGreaterThan(0);
  await editor.fill(initial.text + "\nThird line\nFourth line"); await editor.press("Escape");
  await expect.poll(async () => (await saved(page)).text).toContain("Fourth line");
  const after = (await outline.boundingBox())!; expect(after.y + after.height).toBeCloseTo(before.y + before.height, 1); expect(after.height).toBeGreaterThan(before.height);
  await page.getByRole("button", { name: "Share", exact: true }).click(); await page.getByRole("button", { name: "Download", exact: true }).click();
  const downloadPanel = page.getByRole("dialog", { name: "Download design" }); await downloadPanel.getByLabel("File type", { exact: true }).selectOption("svg");
  const pending = page.waitForEvent("download"); await downloadPanel.getByRole("button", { name: "Download", exact: true }).click(); const file = await pending;
  const svg = await readFile((await file.path())!, "utf8"); expect(svg).toContain('letter-spacing="3.2"'); expect(svg).toContain("Fourth line</tspan>");
});

test("outside click commits a spacing preview before moving text and locks hide the controls", async ({ page }) => {
  const panel = await spacing(page), field = panel.getByRole("spinbutton", { name: "Line spacing value" });
  await field.fill("2");
  const canvas = page.getByTestId("page"), text = canvas.locator("text"), box = (await text.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down(); await page.mouse.move(box.x + box.width / 2 + 20, box.y + box.height / 2 + 20); await page.mouse.up();
  await expect(panel).toHaveCount(0); await expect.poll(async () => (await saved(page)).lineHeight).toBe(2);
  const moved = await saved(page); expect(moved.x).not.toBe(fixture.x);
  await canvas.focus(); await page.keyboard.press("ControlOrMeta+z"); await expect.poll(async () => (await saved(page)).x).toBe(fixture.x); expect((await saved(page)).lineHeight).toBe(2);
  await text.click(); await page.getByRole("button", { name: "Lock", exact: true }).click(); await expect(page.getByRole("button", { name: "Spacing", exact: true })).toHaveCount(0);
});
