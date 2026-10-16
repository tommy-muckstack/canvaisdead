import { expect, test } from "@playwright/test";

test("capture the previous Download panel with synthetic local pages", async ({ page }, info) => {
  await page.goto("/canvaisdead/login");
  await page.getByRole("button", { name: "Use the demo account" }).click();
  await expect(page.getByTestId("designs")).toBeVisible();
  await page.locator(".cx-qc").getByRole("button", { name: "Presentation", exact: true }).click();
  await expect(page.getByTestId("page")).toBeVisible();
  await page.getByRole("textbox", { name: "Design name", exact: true }).fill("Local export check");
  await page.getByRole("button", { name: "Add page", exact: true }).click();
  await page.getByRole("button", { name: "Add page", exact: true }).click();
  await page.getByRole("button", { name: "Notes", exact: true }).click();
  await page.getByLabel("Notes for page 3", { exact: true }).fill("Private notes never exported");
  await page.getByRole("button", { name: "Close notes", exact: true }).click();
  await page.getByRole("button", { name: "Share", exact: true }).click();
  await page.getByRole("button", { name: "Download", exact: true }).click();
  const panel = page.getByRole("dialog", { name: "Download design" });
  // This capture intentionally reaches the old controls independently of the
  // failed exact-label lookup. Functional regressions retain exact-label checks.
  await panel.locator("select").nth(0).selectOption("svg");
  await panel.locator("select").nth(1).selectOption("custom");
  await panel.getByLabel("Page numbers", { exact: true }).fill("3, 1");
  const png = await page.screenshot({ path: info.outputPath("download-before.png") });
  const styles = await panel.locator("select").evaluateAll(controls => controls.map(control => {
    const css = getComputedStyle(control), box = control.getBoundingClientRect();
    return { label: Array.from((control as HTMLSelectElement).labels ?? [], label => label.textContent), width: box.width, height: box.height, font: css.font, fontSize: css.fontSize, fontWeight: css.fontWeight, color: css.color, padding: css.padding, margin: css.margin, radius: css.borderRadius, shadow: css.boxShadow };
  }));
  console.info("PARITY_DOWNLOAD_BASELINE " + JSON.stringify({ viewport: info.project.name, styles, aria: await panel.ariaSnapshot(), png: png.toString("base64") }));
});
