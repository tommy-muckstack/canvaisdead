import { test } from "../../tests/e2e/fixtures";
import { captureFontLayout, delayedFont, FONT_BODY, FONT_HEADING, selectFontBody, setupFontLayout } from "./font-layout-evidence";

test("capture preceding font layout before and after native font loading", async ({ page }, info) => {
  await setupFontLayout(page); await selectFontBody(page);
  await captureFontLayout(page, info.project.name, "before", "fallback");
  await (await delayedFont(page, FONT_BODY))(); await (await delayedFont(page, FONT_HEADING))();
  await captureFontLayout(page, info.project.name, "before", "loaded");
});
