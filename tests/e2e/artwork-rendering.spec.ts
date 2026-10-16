import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { expect, test, waitForDesignSave, type Page } from "./fixtures";
import { blankDesign, makeEl } from "@/lib/design/ops";
import { designModules } from "./upload-modules";
import { originalPNG } from "../fixtures/png";

async function create(page: Page) {
  await page.goto("/canvaisdead/login");
  const cookies = page.getByRole("button", { name: "Accept all cookies" }); if (await cookies.isVisible()) await cookies.click();
  await page.getByRole("button", { name: "Use the demo account" }).click(); await expect(page.getByTestId("designs")).toBeVisible();
  await page.locator(".cx-qc").getByRole("button", { name: "Presentation", exact: true }).click();
  await expect(page.getByTestId("page")).toBeVisible(); await waitForDesignSave(page);
}
async function seed(page: Page, src: string, sourceSize = 64) {
  await designModules(page);
  const id = page.url().split("/").at(-1)!, image = makeEl("image", blankDesign({ w: 800, h: 600 }), { x: 100, y: 100, w: 240, h: 160, rotation: 15, opacity: .7, flipX: true, imageCrop: { x: sourceSize / 4, y: sourceSize / 4, w: sourceSize / 2, h: sourceSize / 2, sourceW: sourceSize, sourceH: sourceSize }, groupPath: ["artwork-group"] });
  // Pass one source through the browser protocol; build/persist the full design in the browser.
  // The JSON-based small-test storage adapter cannot represent this capacity fixture.
  const timings = await page.evaluate(async ({ id, image, src }) => {
    const key = (await window.designTestStorage.keys())[0], owner = key.slice("canvaisdead:".length, -":designs".length);
    const repository = window.designHandoffTest.repository.createDesignRepository(), saved = await repository.read(owner);
    const start = performance.now();
    await repository.write(owner, saved, saved.value.map(d => d.id === id ? {
      ...d, name: "Original artwork", w: 800, h: 600,
      els: Array.from({ length: 8 }, (_, index) => ({ ...image, id: `image-${index}`, x: 20 + index % 4 * 190, y: 60 + Math.floor(index / 4) * 240, w: 150, h: 150, src })),
    } : d));
    const written = performance.now(), reopened = (await repository.read(owner)).value.find(d => d.id === id);
    const images = reopened && "els" in reopened ? reopened.els : [];
    return { writeMs: Math.round(written - start), readMs: Math.round(performance.now() - written), count: images.length, exact: images.every(element => element.src === src) };
  }, { id, image, src });
  console.info("Native original-image save/read", JSON.stringify(timings));
  expect(timings).toMatchObject({ count: 8, exact: true });
  await page.reload();
  // A full original-image library must finish decoding before the editor mounts.
  // Surface a read error immediately; this is not a blanket timeout for interactions.
  await expect(page.getByTestId("page").or(page.getByRole("alert").filter({ hasText: "could not be read" }))).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId("page").locator("image")).toHaveCount(8);
}

test("independent SVG images retain crops, flips and original sources across editor, pages, Layers, Projects and Present", async ({ page }, info) => {
  await create(page);
  const source = `data:image/png;base64,${originalPNG(64, 64).toString("base64")}`; await seed(page, source);
  const editor = page.url();
  await expect(page.getByTestId("page").locator('svg[overflow="hidden"]')).toHaveCount(8);
  await expect(page.getByRole("tablist", { name: "Design pages" }).locator("image")).toHaveCount(8);
  await page.getByRole("button", { name: "Position", exact: true }).click(); await page.getByRole("tab", { name: "Layers", exact: true }).click();
  const group = page.getByRole("list", { name: "Design layers" }).locator('[data-layer-key="group:artwork-group"]');
  await group.scrollIntoViewIfNeeded(); await expect(group.locator(".cv-layer-preview image")).toHaveCount(8);
  await page.screenshot({ path: info.outputPath("artwork-editor-layers.png") });
  await page.getByRole("button", { name: "Share", exact: true }).click(); await page.getByRole("button", { name: "Download", exact: true }).click();
  const panel = page.getByRole("dialog", { name: "Download design" }); await panel.getByLabel("File type", { exact: true }).selectOption("svg");
  const downloading = page.waitForEvent("download"); await panel.getByRole("button", { name: "Download", exact: true }).click();
  const download = await downloading, svg = await readFile((await download.path())!, "utf8");
  expect(svg.match(/<image /g)).toHaveLength(8); expect(svg.split(source)).toHaveLength(9); expect(svg).toContain('viewBox="16 16 32 32"');
  await page.goto("/canvaisdead/app/projects");
  await expect(page.getByRole("link", { name: "Open Original artwork", exact: true }).locator("image")).toHaveCount(8);
  await expect(page.getByRole("button", { name: "Back up designs", exact: true })).toBeEnabled();
  await page.screenshot({ path: info.outputPath("artwork-projects.png") });
  await page.goto(`${editor}/present`); await expect(page.getByTestId("presentation-slide").locator("image")).toHaveCount(8);
  expect(await page.getByTestId("presentation-slide").locator("image").evaluateAll(images => images.every(image => image.getAttribute("href") === images[0].getAttribute("href")))).toBe(true);
});

test("a page above the single-string ceiling remains editable after native save/reload and leaves library backup reachable", async ({ page }, info) => {
  test.setTimeout(180_000);
  const source = `data:image/png;base64,${originalPNG(4096, 4096).toString("base64")}`;
  expect(source.length * 8).toBeGreaterThan(536870888);
  await create(page); await seed(page, source, 4096);
  const decoded = await page.getByTestId("page").locator("image").evaluateAll(async images => {
    const src = images[0].getAttribute("href")!, image = new Image(); image.src = src; await image.decode();
    const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(src));
    return { width: image.width, height: image.height, equal: images.every(item => item.getAttribute("href") === src), hash: Array.from(new Uint8Array(hash), value => value.toString(16).padStart(2, "0")).join("") };
  });
  expect(decoded).toEqual({ width: 4096, height: 4096, equal: true, hash: createHash("sha256").update(source).digest("hex") });
  await page.getByRole("textbox", { name: "Design name" }).fill("Large artwork retained");
  await expect(page.getByRole("status", { name: "Saved in this browser only", exact: true })).toBeVisible({ timeout: 60_000 });
  await page.reload(); await expect(page.getByRole("textbox", { name: "Design name" })).toHaveValue("Large artwork retained", { timeout: 60_000 });
  await expect(page.getByTestId("page").locator("image")).toHaveCount(8);
  await page.goto("/canvaisdead/app/projects"); await expect(page.getByRole("link", { name: "Open Large artwork retained", exact: true }).locator("image")).toHaveCount(8, { timeout: 60_000 });
  await expect(page.getByRole("button", { name: "Back up designs", exact: true })).toBeEnabled();
  await page.screenshot({ path: info.outputPath("large-artwork-projects.png") });
});
