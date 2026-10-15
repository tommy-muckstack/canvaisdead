import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  use: {
    baseURL: "http://127.0.0.1:3188/canvaisdead",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
  webServer: {
    command: "DEMO_MODE=1 npm run start -- --hostname 127.0.0.1 --port 3188",
    env: { AUTH_SECRET: "playwright-local-guest-only" }, // Isolated local server; never a deployed credential.
    url: "http://127.0.0.1:3188/canvaisdead/login",
    reuseExistingServer: false,
  },
});
