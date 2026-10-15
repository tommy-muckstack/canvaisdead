import { expect, test } from "@playwright/test";

test("a saved lock prevents edits and can be unlocked after reload", async ({ page }, testInfo) => {
  await page.goto("/canvaisdead/login");
  const cookies = page.getByRole("button", { name: "Accept all cookies" });
  if (await cookies.isVisible()) await cookies.click();
  await page.getByRole("button", { name: "Use the demo account" }).click();
  await expect(page).toHaveURL(/\/app$/);
  await page.locator(".cx-qc").getByRole("button", { name: "Presentation", exact: true }).click();
  const canvas = page.getByTestId("page");
  await expect(canvas).toBeVisible();
  await page.getByRole("button", { name: "Text", exact: true }).click();
  await page.getByRole("button", { name: "Add a heading", exact: true }).click();
  const text = canvas.locator("text");
  await expect(text).toHaveCount(1);
  const before = await text.getAttribute("transform");
  const textX = await text.locator("tspan").getAttribute("x");
  await page.screenshot({ path: testInfo.outputPath("unlocked.png") });
  await page.getByRole("button", { name: "Lock", exact: true }).click();
  await expect(page.getByRole("button", { name: "Unlock", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("[data-handle]")).toHaveCount(0);
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Delete");
  await expect(text).toHaveCount(1);
  expect(await text.getAttribute("transform")).toBe(before);
  await expect(text.locator("tspan")).toHaveAttribute("x", textX!);

  await page.reload();
  await expect(text).toHaveCount(1);
  await text.click();
  await expect(page.getByRole("button", { name: "Unlock", exact: true })).toBeVisible();
  await text.dblclick();
  await expect(page.getByRole("textbox", { name: "Edit text" })).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath("locked-after-reload.png") });

  await page.getByRole("button", { name: "Unlock", exact: true }).click();
  await expect(page.locator('[data-handle="rotate"]')).toBeVisible();
  await text.dblclick();
  await page.getByRole("textbox", { name: "Edit text" }).fill("Unlocked and editable");
  await page.getByRole("textbox", { name: "Edit text" }).press("Escape");
  await expect(text).toHaveText("Unlocked and editable");
});
