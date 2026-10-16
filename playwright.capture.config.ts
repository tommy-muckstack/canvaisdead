import { defineConfig } from "@playwright/test";
import regression from "./playwright.config";

// Separate from the regression inventory: captures the parent component for review.
export default defineConfig({ ...regression, testDir: "./scripts/parity", testMatch: "*-capture.spec.ts" });
