import { defineConfig } from "vitest/config";
import path from "node:path";
export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname) } },
  // Next preserves JSX for its compiler; component unit tests need executable JSX.
  oxc: { jsx: { runtime: "automatic" } },
  test: { testTimeout: 30_000 },
});
