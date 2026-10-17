import { test } from "../../tests/e2e/fixtures";
import { captureProjectPages, projectPanel, setupProjectPages } from "./project-pages-evidence";
test("capture preceding Projects browser and untouched canvas", async ({ page }, info) => {
  await setupProjectPages(page); await projectPanel(page); await captureProjectPages(page, info.project.name, "before", "list");
  await page.getByRole("button", { name: "Hide side panel", exact: true }).click(); await captureProjectPages(page, info.project.name, "before", "canvas");
});
