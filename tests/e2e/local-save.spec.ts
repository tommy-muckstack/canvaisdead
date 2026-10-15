import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

declare global { interface Window { restoreDesignStorage?: () => void } }

test.beforeEach(async ({ page }) => {
  await page.goto("/canvaisdead/login");
  const cookies = page.getByRole("button", { name: "Accept all cookies" });
  if (await cookies.isVisible()) await cookies.click();
  await page.getByRole("button", { name: "Use the demo account" }).click();
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByTestId("designs")).toBeVisible();
});

test("storage failure is visible, backup is local, and retry persists the latest edit", async ({ page }, testInfo) => {
  await page.locator(".cx-qc").getByRole("button", { name: "Presentation", exact: true }).click();
  await expect(page.getByTestId("page")).toBeVisible();
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
      if (key.endsWith(":designs")) throw new DOMException("Storage full", "QuotaExceededError");
      return original.call(this, key, value);
    };
    window.restoreDesignStorage = () => { Storage.prototype.setItem = original; };
  });
  await page.getByRole("textbox", { name: "Design name" }).fill("Local recovery test");
  await expect(page.getByRole("status")).toHaveText("Not saved");
  await expect(page.getByRole("alert")).toContainText("could not be saved");
  await page.screenshot({ path: testInfo.outputPath("storage-error.png") });
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download backup", exact: true }).click();
  const download = await downloaded;
  expect(download.suggestedFilename()).toBe("canvaisdead-designs.json");
  const backup = JSON.parse(await readFile((await download.path())!, "utf8"));
  expect(backup.designs.some((design: { name: string }) => design.name === "Local recovery test")).toBe(true);
  await page.evaluate(() => window.restoreDesignStorage?.());
  await page.getByRole("button", { name: "Retry saving", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.getByRole("status")).toHaveText("Saved locally");
  await page.reload();
  await expect(page.getByRole("textbox", { name: "Design name" })).toHaveValue("Local recovery test");
  await page.screenshot({ path: testInfo.outputPath("saved-after-reload.png") });
});

test("corrupt saved data is preserved and a failed read can be retried", async ({ page }) => {
  const original = await page.evaluate(() => {
    const key = Object.keys(localStorage).find(key => key.endsWith(":designs"))!;
    const value = localStorage.getItem(key)!;
    localStorage.setItem(key, "{broken");
    return { key, value };
  });
  await page.reload();
  await expect(page.getByRole("alert")).toContainText("could not be read");
  expect(await page.evaluate(key => localStorage.getItem(key), original.key)).toBe("{broken");
  await page.evaluate(({ key, value }) => localStorage.setItem(key, value), original);
  await page.getByRole("button", { name: "Retry reading designs", exact: true }).click();
  await expect(page.getByTestId("designs")).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
});
