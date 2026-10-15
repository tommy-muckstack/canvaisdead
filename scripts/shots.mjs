// Drives the real app (production build, demo account) to capture product shots AND smoke-test the core flow.
import fs from "node:fs";
import { withApp, demoPage, out } from "./shotlib.mjs";
import assert from "node:assert/strict";
const dir = out("canvaisdead"); const pub = new URL("../public/home/", import.meta.url).pathname; fs.mkdirSync(pub, { recursive: true });
const save = async (page, name, opts = {}) => { await page.screenshot({ path: `${dir}/${name}.png`, ...opts }); fs.copyFileSync(`${dir}/${name}.png`, `${pub}${name}.png`); };
await withApp("canvaisdead", async ({ base, browser }) => {
  const { ctx, page } = await demoPage(browser, base, { w: 1440, h: 900, scale: 1 });
  await page.waitForSelector('[data-testid="designs"] a'); await page.waitForTimeout(400);
  await save(page, "dashboard");
  // open the pitch deck template design
  await page.locator('[data-testid="designs"] a[aria-label^="Open"]').nth(1).click(); await page.waitForSelector('[data-testid="page"]'); await page.waitForTimeout(500);
  const before = await page.locator('[data-testid="page"] g').first().innerHTML();
  // click on the big circle (right side of the page) and move it with the arrow keys + drag
  const box = await page.locator('[data-testid="page"]').boundingBox();
  await page.mouse.click(box.x + box.width * 0.83, box.y + box.height * 0.5); await page.waitForSelector('[data-testid="selection"]');
  await page.mouse.move(box.x + box.width * 0.83, box.y + box.height * 0.5); await page.mouse.down(); await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.4, { steps: 6 }); await page.mouse.up();
  const after = await page.locator('[data-testid="page"] g').first().innerHTML(); assert.notEqual(before, after, "dragging moves the element");
  await page.getByRole("button", { name: "Color #00C4CC" }).first().click();
  await page.waitForTimeout(300); await save(page, "editor");
  // text editing
  await page.mouse.dblclick(box.x + box.width * 0.2, box.y + box.height * 0.36); await page.waitForSelector('textarea[aria-label="Edit text"]');
  await page.fill('textarea[aria-label="Edit text"]', "Design that ships\non a Friday"); await page.locator('textarea[aria-label="Edit text"]').blur(); await page.waitForTimeout(300);
  assert.match(await page.locator('[data-testid="page"]').innerHTML(), /Design that ships/);
  await page.mouse.click(box.x + box.width * 0.2, box.y + box.height * 0.36); await page.waitForTimeout(250); await save(page, "text");
  // undo/redo
  await page.keyboard.press("Escape"); await page.getByRole("button", { name: "Undo" }).click(); assert.doesNotMatch(await page.locator('[data-testid="page"]').innerHTML(), /Design that ships/);
  await page.getByRole("button", { name: "Redo" }).click(); assert.match(await page.locator('[data-testid="page"]').innerHTML(), /Design that ships/);
  // add shape + upload an image
  await page.getByRole("button", { name: "Elements" }).click(); await page.getByRole("button", { name: "Add star" }).click(); await page.waitForSelector('[data-testid="selection"]');
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mP8z8Dwn4EIwDiqkL4KAcT9GO0U4BxoAAAAAElFTkSuQmCC", "base64");
  await page.getByRole("button", { name: "Uploads" }).click(); await page.setInputFiles('[data-testid="upload"]', { name: "dot.png", mimeType: "image/png", buffer: png }); await page.getByText("Image added").waitFor();
  // export PNG + SVG
  const dl1 = page.waitForEvent("download"); await page.getByRole("button", { name: "Download" }).click(); await page.getByRole("button", { name: /^PNG/ }).click(); const f1 = await dl1;
  await f1.saveAs(`${dir}/export.png`); assert.ok(fs.statSync(`${dir}/export.png`).size > 5000, "png export has content");
  const dl2 = page.waitForEvent("download"); await page.getByRole("button", { name: "Download" }).click(); await page.getByRole("button", { name: /^SVG/ }).click(); const f2 = await dl2;
  await f2.saveAs(`${dir}/export.svg`); assert.match(fs.readFileSync(`${dir}/export.svg`, "utf8"), /^<svg/);
  // templates panel
  await page.getByRole("button", { name: "Templates" }).click(); await page.waitForTimeout(400); await save(page, "templates");
  // persistence: reload and reopen
  await page.reload(); await page.waitForSelector('[data-testid="page"]'); assert.match(await page.locator('[data-testid="page"]').innerHTML(), /Design that ships/);
  // new blank design from home
  await page.goto(base + "/app"); await page.getByRole("button", { name: /Presentation/ }).click(); await page.waitForSelector('[data-testid="page"]'); assert.equal(await page.locator('[data-testid="page"]').getAttribute("viewBox"), "0 0 1920 1080");
  await page.screenshot({ path: `${dir}/blank-presentation.png` });
  await ctx.close();
  // marketing + login
  const c2 = await browser.newContext({ viewport: { width: 1440, height: 900 } }); const p2 = await c2.newPage();
  await p2.goto(base); await p2.waitForTimeout(500); await p2.screenshot({ path: `${dir}/home-top.png` }); await p2.screenshot({ path: `${dir}/home-full.png`, fullPage: true });
  await p2.goto(base + "/#pricing"); await p2.waitForTimeout(300); await p2.screenshot({ path: `${dir}/home-pricing.png` });
  await p2.goto(base + "/login"); await p2.waitForTimeout(300); await p2.screenshot({ path: `${dir}/login.png` });
  const m = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }); const p3 = await m.newPage(); await p3.goto(base); await p3.waitForTimeout(400); await p3.screenshot({ path: `${dir}/home-mobile.png` });
  console.log("canvaisdead shots + smoke OK");
});
