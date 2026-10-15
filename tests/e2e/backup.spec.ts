import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

test("a downloaded backup imports into an empty browser library and stays editable", async ({ page }, testInfo) => {
  await page.goto("/canvaisdead/login");
  const cookies = page.getByRole("button", { name: "Accept all cookies" });
  if (await cookies.isVisible()) await cookies.click();
  await page.getByRole("button", { name: "Use the demo account" }).click();
  await expect(page.getByTestId("designs")).toBeVisible();
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Back up designs", exact: true }).click();
  const download = await downloaded;
  const backupPath = (await download.path())!;
  const backup = JSON.parse(await readFile(backupPath, "utf8"));
  const expected = backup.designs[0];
  await page.evaluate(() => {
    const key = Object.keys(localStorage).find(key => key.endsWith(":designs"))!;
    localStorage.setItem(key, "[]");
  });
  await page.reload();
  await expect(page.getByTestId("designs").locator(".cd-card")).toHaveCount(0);
  await page.getByLabel("Import design backup").setInputFiles(backupPath);
  await expect(page.getByRole("status")).toContainText("imported as new copies");
  await expect(page.getByTestId("designs").locator(".cd-card")).toHaveCount(backup.designs.length);
  await page.screenshot({ path: testInfo.outputPath("restored-library.png") });
  await page.getByRole("link", { name: `Open ${expected.name}`, exact: true }).click();
  await expect(page).not.toHaveURL(new RegExp(expected.id + "$"));
  await page.getByRole("textbox", { name: "Design name" }).fill("Restored and editable");
  await page.reload();
  await expect(page.getByRole("textbox", { name: "Design name" })).toHaveValue("Restored and editable");
  await page.screenshot({ path: testInfo.outputPath("restored-editor.png") });
});

test("invalid backup import leaves the project library unchanged", async ({ page }) => {
  await page.goto("/canvaisdead/login");
  const cookies = page.getByRole("button", { name: "Accept all cookies" });
  if (await cookies.isVisible()) await cookies.click();
  await page.getByRole("button", { name: "Use the demo account" }).click();
  await expect(page.getByTestId("designs")).toBeVisible();
  const before = await page.getByTestId("designs").locator(".cd-card").count();
  await page.getByLabel("Import design backup").setInputFiles({ name: "broken.json", mimeType: "application/json", buffer: Buffer.from('{"format":"canvaisdead","version":1,"designs":[{}]}') });
  await expect(page.getByRole("alert")).toContainText("invalid design data");
  await expect(page.getByTestId("designs").locator(".cd-card")).toHaveCount(before);
});
