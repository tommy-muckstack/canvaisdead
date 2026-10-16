import { expect, test } from "@playwright/test";
import { captureCreatePicker, recordCreateDismissal } from "./create-picker-evidence";

test("capture the previous Create search and custom-size controls", async ({ page }, info) => {
  await page.goto("/canvaisdead/login");
  await page.getByRole("button", { name: "Use the demo account" }).click();
  await expect(page.getByTestId("designs")).toBeVisible();
  await page.goto("/canvaisdead/app/projects");
  const trigger = page.getByRole("button", { name: "Create a design", exact: true });
  await trigger.focus(); await trigger.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Create a design", exact: true });
  await dialog.getByRole("searchbox").fill("presentation");
  await expect(dialog.locator(".cx-create-presets button")).toHaveCount(1);
  await captureCreatePicker(page, info.project.name, "before", "search");
  await page.keyboard.press("Escape");
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => resolve())));
  const state = await recordCreateDismissal(page, info.project.name, "before");
  if (state.mounted) await dialog.getByRole("button", { name: "Close Create a design", exact: true }).click();
  await page.goto("/canvaisdead/app");
  await page.locator(".cx-qc").getByRole("button", { name: "Custom size", exact: true }).click();
  await dialog.getByLabel("Width", { exact: true }).fill("816");
  await dialog.getByLabel("Height", { exact: true }).fill("1056");
  await captureCreatePicker(page, info.project.name, "before", "custom");
});
