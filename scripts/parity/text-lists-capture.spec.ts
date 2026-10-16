import { expect, test } from "../../tests/e2e/fixtures";
import { captureTextLists, setupTextLists } from "./text-lists-evidence";

test("capture preceding unsupported List control", async ({ page }, info) => {
  await setupTextLists(page); await captureTextLists(page, info.project.name, "before", "plain");
  await page.getByRole("button", { name: "List", exact: true }).click(); await captureTextLists(page, info.project.name, "before", "menu");
  await expect(page.getByText("Lists aren't supported yet", { exact: true })).not.toBeVisible({ timeout: 5000 });
  await captureTextLists(page, info.project.name, "before", "numbered");
});
