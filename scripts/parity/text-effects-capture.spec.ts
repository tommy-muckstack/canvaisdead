import { expect, test } from "../../tests/e2e/fixtures";
import { captureEffects, setupTextEffects } from "./text-effects-evidence";
test("capture preceding unsupported Effects control", async ({ page }, info) => {
  await setupTextEffects(page); await captureEffects(page, info.project.name, "before", "plain");
  await page.getByRole("button", { name: "Effects", exact: true }).click(); await captureEffects(page, info.project.name, "before", "panel");
  await expect(page.getByText("Effects aren't supported yet", { exact: true })).not.toBeVisible({ timeout: 5000 });
  await captureEffects(page, info.project.name, "before", "outline");
});
