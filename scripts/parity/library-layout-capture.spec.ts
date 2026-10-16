import { expect, test } from "../../tests/e2e/fixtures";
import { captureLibraryLayout, openProjects } from "./library-layout-evidence";

test("capture the parent Projects and Trash navigation layout", async ({ page }, info) => {
  await openProjects(page);
  await captureLibraryLayout(page, info.project.name, "before", "projects");
  // Direct navigation captures the parent empty state without claiming its
  // obscured mobile Trash link can be clicked.
  await page.goto("/canvaisdead/app/projects?view=trash");
  await expect(page.getByRole("heading", { name: "Your Trash is empty", exact: true })).toBeVisible();
  await captureLibraryLayout(page, info.project.name, "before", "trash");
});
