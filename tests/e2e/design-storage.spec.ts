import { waitForDesignSave } from "./fixtures";
import { readFile } from "node:fs/promises";
import { readDesignBackup } from "@/lib/design/backup-file";
import { test, expect, type Page } from "./fixtures";

async function create(page: Page) {
  await page.goto("/canvaisdead/app");
  await expect(page.getByTestId("designs")).toBeAttached();
  const cookies = page.getByRole("button", { name: "Accept all cookies" }); if (await cookies.isVisible()) await cookies.click();
  await page.locator(".cx-qc").getByRole("button", { name: "Presentation", exact: true }).click();
  await expect(page.getByTestId("page")).toBeVisible();
  await expect(page.getByRole("status", { name: "Saved in this browser only" })).toBeVisible();
}

test("legacy designs migrate on a successful save while the original localStorage bytes remain intact", async ({ page }) => {
  await create(page);
  const legacy = await page.evaluate(async () => {
    const key = (await window.designTestStorage.keys())[0], raw = await window.designTestStorage.getItem(key);
    localStorage.setItem(key, raw);
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open("canvaisdead-designs", 1);
      request.onsuccess = () => {
        const db = request.result, tx = db.transaction("libraries", "readwrite");
        tx.objectStore("libraries").delete(key.slice("canvaisdead:".length, -":designs".length));
        tx.oncomplete = () => { db.close(); resolve(); }; tx.onabort = () => { db.close(); reject(tx.error); };
      }; request.onerror = () => reject(request.error);
    });
    return { key, raw };
  });
  await waitForDesignSave(page); await page.reload(); await expect(page.getByTestId("page")).toBeVisible();
  await page.getByRole("textbox", { name: "Design name" }).fill("Migrated locally");
  await expect(page.getByRole("status", { name: "Saved in this browser only" })).toBeVisible();
  expect(await page.evaluate(key => localStorage.getItem(key), legacy.key)).toBe(legacy.raw);
  expect(await page.evaluate(key => window.designTestStorage.getItem(key), legacy.key)).toContain("Migrated locally");
  await waitForDesignSave(page); await page.reload(); await expect(page.getByRole("textbox", { name: "Design name" })).toHaveValue("Migrated locally");
});

test("two editors retain conflicting versions instead of silently overwriting saved artwork", async ({ page, context }) => {
  await create(page);
  const other = await context.newPage(); await other.goto(page.url()); await expect(other.getByTestId("page")).toBeVisible();
  await page.getByRole("textbox", { name: "Design name" }).fill("First tab saved");
  await expect(page.getByRole("status", { name: "Saved in this browser only" })).toBeVisible();
  await expect(other.getByRole("alert").filter({ hasText: "changed in another tab" })).toBeVisible();
  await other.getByRole("textbox", { name: "Design name" }).fill("Second tab retained");
  const pending = other.waitForEvent("download"); await other.getByRole("button", { name: "Download backup", exact: true }).click();
  const file = await pending, backup = { designs: await readDesignBackup(new Blob([await readFile((await file.path())!)])) };
  expect(backup.designs[0].name).toBe("Second tab retained");
  const saved = await page.evaluate(async () => JSON.parse(await window.designTestStorage.getItem((await window.designTestStorage.keys())[0])));
  expect(saved[0].name).toBe("First tab saved");
});

test("a real PNG above the old string quota survives insertion, reload, presentation and backup import", async ({ page }, info) => {
  test.setTimeout(120_000);
  await create(page);
  // Incompressible pixel data exercises real decoding and persistence, not a mocked file size.
  const data = await page.evaluate(() => {
    const canvas = document.createElement("canvas"); canvas.width = canvas.height = 1600;
    const ctx = canvas.getContext("2d")!, image = ctx.createImageData(1600, 1600); let seed = 12345;
    for (let i = 0; i < image.data.length; i += 4) {
      seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
      image.data[i] = seed & 255; image.data[i + 1] = (seed >>> 8) & 255; image.data[i + 2] = (seed >>> 16) & 255; image.data[i + 3] = 255;
    }
    ctx.putImageData(image, 0, 0); return canvas.toDataURL("image/png");
  });
  const bytes = Buffer.from(data.split(",")[1], "base64"); expect(bytes.length).toBeGreaterThan(5 * 1024 * 1024);
  await page.getByRole("navigation", { name: "Tools" }).getByRole("button", { name: "Uploads", exact: true }).click();
  await page.getByTestId("upload").setInputFiles({ name: "Large original.png", mimeType: "image/png", buffer: bytes });
  await page.getByRole("button", { name: "Add Large original.png", exact: true }).click();
  const storedSource = () => page.evaluate(async () => {
    const designs = JSON.parse(await window.designTestStorage.getItem((await window.designTestStorage.keys())[0]));
    const design = designs[0]; return (design.pages?.[0].els ?? design.els)[0]?.src;
  });
  await expect.poll(storedSource).toBe(data);
  await waitForDesignSave(page); await page.reload(); await expect(page.getByTestId("page")).toBeVisible(); expect(await storedSource()).toBe(data);
  const editor = page.url(); await page.goto(`${editor}/present`);
  await expect(page.getByTestId("presentation-slide").locator("image")).toHaveAttribute("href", data);
  await page.goto("/canvaisdead/app");
  const pending = page.waitForEvent("download"); await page.getByRole("button", { name: "Back up designs", exact: true }).click();
  const downloaded = await pending, path = (await downloaded.path())!;
  await page.getByLabel("Import design backup").setInputFiles(path);
  await expect(page.locator(".cv-design-files").getByRole("status")).toContainText("imported as a new copy");
  const sources = await page.evaluate(async () => {
    const designs = JSON.parse(await window.designTestStorage.getItem((await window.designTestStorage.keys())[0]));
    return designs.map((d: { pages?: { els: { src?: string }[] }[]; els?: { src?: string }[] }) => (d.pages?.[0].els ?? d.els!)[0].src);
  });
  expect(sources).toEqual([data, data]);
  await page.screenshot({ path: info.outputPath("large-image-library.png"), fullPage: true });
});
