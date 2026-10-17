import { test } from "../../tests/e2e/fixtures";
import { setupLinks, captureLinks } from "./links-evidence";
test("capture preceding element link controls", async ({ page }, info) => {
  await setupLinks(page); await captureLinks(page, info.project.name, "before", "selected");
  await page.getByRole("button", { name: "Link", exact: true }).click(); await captureLinks(page, info.project.name, "before", "link");
});
