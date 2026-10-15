import { waitForDesignSave } from "./fixtures";
import { expect, test } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await page.goto("/canvaisdead/login");
  await page.getByRole("button", { name: "Use the demo account" }).click();
  await expect(page.getByTestId("designs")).toBeVisible();
});

test("Create opens a searchable picker from Projects and returns keyboard focus on dismissal", async ({ page }, testInfo) => {
  await page.goto("/canvaisdead/app/projects");
  const trigger = page.getByRole("button", { name: "Create a design", exact: true });
  await trigger.focus(); await trigger.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Create a design" });
  const search = dialog.getByRole("searchbox", { name: "Search design types and sizes" });
  await expect(search).toBeFocused();
  await search.fill("nothing-matches");
  await expect(dialog.getByRole("status")).toContainText("No design types match");
  await search.fill("presentation");
  await expect(dialog.locator(".cx-create-presets button")).toHaveCount(1);
  const bounds = (await dialog.boundingBox())!, viewport = page.viewportSize()!;
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height);
  await page.screenshot({ path: testInfo.outputPath("create-preset-search.png") });
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0); await expect(trigger).toBeFocused();
  await trigger.click();
  await dialog.getByRole("searchbox").fill("presentation");
  await dialog.getByRole("button", { name: "Presentation 1920 × 1080 px", exact: true }).click();
  await expect(page.getByTestId("page")).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Design name" })).toHaveValue("Untitled design - Presentation");
});

test("Custom size validates, converts units, locks proportions and persists the requested canvas", async ({ page }, testInfo) => {
  await page.locator(".cx-qc").getByRole("button", { name: "Custom size", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Create a design" });
  await expect(dialog.getByRole("textbox", { name: "Width", exact: true })).toBeFocused();
  await dialog.getByRole("button", { name: "Create new design", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("Enter a positive");
  await dialog.getByLabel("Width", { exact: true }).fill("8000");
  await dialog.getByLabel("Height", { exact: true }).fill("8000");
  await dialog.getByRole("button", { name: "Create new design", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("25 million pixels");
  await dialog.getByLabel("Width", { exact: true }).fill("816");
  await dialog.getByLabel("Height", { exact: true }).fill("1056");
  await dialog.getByLabel("Units", { exact: true }).selectOption("in");
  await expect(dialog.getByLabel("Width", { exact: true })).toHaveValue("8.5");
  await expect(dialog.getByLabel("Height", { exact: true })).toHaveValue("11");
  await dialog.getByRole("button", { name: "Lock aspect ratio", exact: true }).click();
  await dialog.getByLabel("Width", { exact: true }).fill("17");
  await expect(dialog.getByLabel("Height", { exact: true })).toHaveValue("22");
  await dialog.getByRole("button", { name: "Swap width and height", exact: true }).click();
  await page.screenshot({ path: testInfo.outputPath("create-custom-size.png") });
  await dialog.getByRole("button", { name: "Create new design", exact: true }).click();
  await expect(page.getByTestId("page")).toBeVisible();
  await expect(page.getByTestId("page")).toHaveAttribute("viewBox", "0 0 2112 1632");
  const designId = page.url().split("/").at(-1)!;
  const savedSize = () => page.evaluate(async id => {
    const key = (await window.designTestStorage.keys()).find(key => key.endsWith(":designs"))!;
    const design = JSON.parse((await window.designTestStorage.getItem(key))).find((item: { id: string }) => item.id === id);
    return { w: design.w, h: design.h };
  }, designId);
  expect(await savedSize()).toEqual({ w: 2112, h: 1632 });
  await waitForDesignSave(page); await page.reload(); await expect(page.getByTestId("page")).toBeVisible();
  await expect(page.getByTestId("page")).toHaveAttribute("viewBox", "0 0 2112 1632");
  expect(await savedSize()).toEqual({ w: 2112, h: 1632 });
  await page.goto("/canvaisdead/app");
  await page.locator(".cx-qc").getByRole("button", { name: "Custom size", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "2112 × 1632 px", exact: true })).toBeVisible();
});

test("creation waits for a successful local save and retries the same design", async ({ page }) => {
  const before = await page.getByTestId("designs").locator(".cd-card").count();
  await page.getByRole("button", { name: "Create a design", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Create a design" });
  await page.evaluate(async () => {
    const original = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function(value, key) {
      if (this.name === "libraries") throw new DOMException("Storage full", "QuotaExceededError");
      return key === undefined ? original.call(this, value) : original.call(this, value, key);
    };
    window.restoreDesignStorage = () => { IDBObjectStore.prototype.put = original; };
  });
  await dialog.getByRole("button", { name: "Logo 500 × 500 px", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("could not be saved");
  await expect(page).toHaveURL(/\/app$/);
  await expect(dialog.getByRole("button", { name: "Logo 500 × 500 px", exact: true })).toBeDisabled();
  await page.evaluate(async () => window.restoreDesignStorage?.());
  await dialog.getByRole("button", { name: "Retry saving", exact: true }).click();
  await expect(page.getByTestId("page")).toBeVisible();
  await page.goto("/canvaisdead/app/projects");
  await expect(page.getByTestId("designs").locator(".cd-card")).toHaveCount(before + 1);
});

test("unimplemented design types explain availability without creating unrelated artwork", async ({ page }) => {
  const before = await page.getByTestId("designs").locator(".cd-card").count();
  await page.locator(".cx-qc").getByRole("button", { name: "Website", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Create a design" });
  await expect(dialog).toContainText("Website design and publishing are not available yet.");
  await dialog.getByRole("button", { name: "Close Create a design" }).click();
  await expect(page.getByTestId("designs").locator(".cd-card")).toHaveCount(before);
});

test("closing Create while a real IndexedDB write is queued prevents late navigation", async ({ page }) => {
  const before = await page.getByTestId("designs").locator(".cd-card").count();
  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open("canvaisdead-designs", 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result, tx = db.transaction("libraries", "readwrite"), store = tx.objectStore("libraries");
        let holding = true; const deadline = Date.now() + 15_000;
        (window as unknown as { releaseDesignWrite: () => void }).releaseDesignWrite = () => { holding = false; };
        const keepActive = () => { const get = store.get("fixture-lock"); get.onsuccess = () => { if (holding && Date.now() < deadline) keepActive(); }; };
        keepActive(); tx.oncomplete = () => db.close(); tx.onabort = () => db.close(); resolve();
      };
    });
  });
  await page.getByRole("button", { name: "Create a design", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Create a design" });
  await dialog.getByRole("button", { name: "Logo 500 × 500 px", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "Logo 500 × 500 px", exact: true })).toBeDisabled();
  await dialog.getByRole("button", { name: "Close Create a design", exact: true }).click();
  await page.evaluate(() => (window as unknown as { releaseDesignWrite: () => void }).releaseDesignWrite());
  await expect(page.getByTestId("designs").locator(".cd-card")).toHaveCount(before + 1);
  await expect.poll(() => page.evaluate(async () => JSON.parse(await window.designTestStorage.getItem((await window.designTestStorage.keys())[0])).length)).toBe(before + 1);
  await expect(page).toHaveURL(/\/app$/);
});
