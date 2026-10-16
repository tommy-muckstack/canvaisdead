import { defineConfig } from "@playwright/test";

// Public, logged-out observations only. No local server or stored account state.
export default defineConfig({
  testDir: "./scripts/parity/reference",
  testMatch: "public-capture.spec.ts",
  timeout: 90_000,
  retries: 0,
  workers: 1,
  reporter: "line",
  use: { browserName: "chromium", trace: "off", screenshot: "off", video: "off", locale: "en-US", timezoneId: "America/New_York" },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
});
