import { expect, test } from "@playwright/test";
import { rotatePoint } from "@/lib/design/ops";
import type { Design, El } from "@/lib/design/types";

test("dragging a rotated side handle resizes along its local axis without moving the opposite edge", async ({ page }, testInfo) => {
  await page.goto("/canvaisdead/login");
  const cookies = page.getByRole("button", { name: "Accept all cookies" });
  if (await cookies.isVisible()) await cookies.click();
  await page.getByRole("button", { name: "Use the demo account" }).click();
  await expect(page.getByTestId("designs")).toBeVisible();
  await page.locator(".cx-qc").getByRole("button", { name: "Presentation", exact: true }).click();
  await expect(page.getByTestId("page")).toBeVisible();
  const id = new URL(page.url()).pathname.split("/").at(-1)!;
  const original: El = { id: "rotated-rectangle", type: "rect", x: 200, y: 150, w: 200, h: 100, rotation: 45, opacity: 1, fill: "#ff5757", stroke: "#000000", strokeWidth: 0, radius: 0 };
  const key = await page.evaluate(({ id, original }) => {
    const key = Object.keys(localStorage).find(key => key.endsWith(":designs"))!;
    const designs: Design[] = JSON.parse(localStorage.getItem(key)!);
    localStorage.setItem(key, JSON.stringify(designs.map(design => design.id === id ? { ...design, w: 800, h: 600, els: [original] } : design)));
    return key;
  }, { id, original });
  await page.reload();
  const canvas = page.getByTestId("page");
  await canvas.locator('rect[fill="#ff5757"]').click();
  const handle = page.locator('[data-handle="e"]');
  await expect(handle).toBeVisible();
  const bounds = (await handle.boundingBox())!;
  const scale = (await canvas.boundingBox())!.width / 800;
  const delta = rotatePoint(50 * scale, 0, 0, 0, 45);
  await page.screenshot({ path: testInfo.outputPath("rotated-before.png") });
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width / 2 + delta.x, bounds.y + bounds.height / 2 + delta.y, { steps: 5 });
  await page.mouse.up();
  const saved: El = await page.evaluate(({ key, id }) => {
    const designs: Design[] = JSON.parse(localStorage.getItem(key)!);
    const design = designs.find(design => design.id === id)!;
    return ("pages" in design ? design.pages[0].els : design.els)[0];
  }, { key, id });
  expect(saved.w).toBeCloseTo(250, 0);
  expect(saved.h).toBe(100);
  const fixed = (element: El) => rotatePoint(element.x, element.y + element.h / 2, element.x + element.w / 2, element.y + element.h / 2, element.rotation);
  expect(fixed(saved).x).toBeCloseTo(fixed(original).x, 5);
  expect(fixed(saved).y).toBeCloseTo(fixed(original).y, 5);
  await page.screenshot({ path: testInfo.outputPath("rotated-after.png") });
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(canvas.locator('rect[fill="#ff5757"]')).toHaveAttribute("width", "200");
});
