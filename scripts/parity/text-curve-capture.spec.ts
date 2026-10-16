import { test } from "../../tests/e2e/fixtures";
import { captureCurve, openEffects, setupCurve } from "./text-curve-evidence";
test("capture preceding text shape controls", async ({ page }, info) => {
  await setupCurve(page); await captureCurve(page, info.project.name, "before", "plain");
  await openEffects(page); await captureCurve(page, info.project.name, "before", "panel");
});
