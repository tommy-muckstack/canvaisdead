import { expect, type Page, waitForDesignSave } from "../../tests/e2e/fixtures";
import { blankDesign, makeEl } from "../../lib/design/ops";
import type { Design } from "../../lib/design/types";

export async function fileLibrary(page: Page): Promise<Design[]> {
  return page.evaluate(async () => JSON.parse(await window.designTestStorage.getItem((await window.designTestStorage.keys())[0])));
}
export async function setupFileMenu(page: Page) {
  await page.goto("/canvaisdead/login"); await page.getByRole("button", { name: "Use the demo account" }).click();
  await expect(page.getByTestId("designs")).toBeVisible();
  await page.locator(".cx-qc").getByRole("button", { name: "Presentation", exact: true }).click();
  await expect(page.getByTestId("page")).toBeVisible(); await waitForDesignSave(page);
  const id = page.url().split("/").at(-1)!;
  const doc = blankDesign({ w: 800, h: 600 });
  const design = { id, name: "File actions", w: 800, h: 600, updatedAt: 1, pages: [
    { id: "p_cover", title: "Cover", notes: "Private cover notes", bg: "#ffffff", els: [
      makeEl("rect", doc, { id: "frame", x: 80, y: 90, w: 220, h: 140, fill: "#00c4cc", locked: true, groupPath: ["g_outer", "g_inner"] }),
      makeEl("image", doc, { id: "original", x: 400, y: 90, w: 160, h: 160, flipX: true, imageCrop: { x: 8, y: 0, w: 16, h: 16, sourceW: 32, sourceH: 16 }, groupPath: ["g_outer", "g_inner"] }),
      makeEl("text", doc, { id: "headline", x: 80, y: 350, w: 600, text: "Keep your files. Lose the subscription.", fontSize: 32 }),
    ] },
    { id: "p_second", title: "Details", notes: "Private second-page notes", bg: "#f2ecff", els: [makeEl("text", doc, { id: "details", x: 80, y: 100, w: 500, text: "Everything stays local", fontSize: 32 })] },
  ] } satisfies Design;
  await page.evaluate(async design => {
    const image = document.createElement("canvas"); image.width = 32; image.height = 16;
    const ctx = image.getContext("2d")!; ctx.fillStyle = "#ff5757"; ctx.fillRect(0, 0, 16, 16); ctx.fillStyle = "#5271ff"; ctx.fillRect(16, 0, 16, 16);
    design.pages[0].els[1].src = image.toDataURL("image/png");
    const key = (await window.designTestStorage.keys())[0], library = JSON.parse(await window.designTestStorage.getItem(key));
    await window.designTestStorage.setItem(key, JSON.stringify(library.map((item: { id: string }) => item.id === design.id ? design : item)));
  }, design);
  await page.reload(); await expect(page.getByTestId("page")).toBeVisible(); await waitForDesignSave(page);
  return id;
}
export async function captureFileMenu(page: Page, viewport: string, variant: string, state: string) {
  await page.evaluate(() => document.fonts.ready); await page.mouse.move(0, 0);
  const menu = page.getByRole("menu", { name: "File", exact: true });
  const metrics = await page.getByRole("button", { name: "File", exact: true }).evaluate(button => {
    const read = (node: Element) => { const b = node.getBoundingClientRect(), s = getComputedStyle(node); return { x: b.x, y: b.y, w: b.width, h: b.height, font: s.font, color: s.color, padding: s.padding, gap: s.gap, radius: s.borderRadius, shadow: s.boxShadow }; };
    const menu = document.querySelector('[role="menu"][aria-label="File"]');
    return { viewport: { w: innerWidth, h: innerHeight }, documentWidth: document.documentElement.scrollWidth, button: read(button), menu: menu && read(menu), items: menu && Array.from(menu.querySelectorAll("button"), read) };
  });
  const observation = { viewport, variant, state, metrics, visible: await menu.isVisible(), aria: await menu.count() ? await menu.ariaSnapshot() : null };
  if (process.env.CI) console.log("PARITY_FILE_MENU " + JSON.stringify({ ...observation, png: (await page.screenshot()).toString("base64") }));
  return observation;
}
