import js from "@eslint/js";
import parser from "@typescript-eslint/parser";
import typescript from "@typescript-eslint/eslint-plugin";
import hooks from "eslint-plugin-react-hooks";
import globals from "globals";

export default [
  { ignores: [".next/**", "node_modules/**", "vendor/**", "test-results/**", "playwright-report/**", "next-env.d.ts"] },
  {
    files: ["**/*.{js,mjs,cjs}"],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: js.configs.recommended.rules,
  },
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: { parser, globals: { ...globals.browser, ...globals.node } },
    plugins: { "@typescript-eslint": typescript, "react-hooks": hooks },
    rules: {
      ...js.configs.recommended.rules,
      ...typescript.configs.recommended.rules,
      // TypeScript checks undefined names and understands type-only declarations.
      "no-undef": "off",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",
    },
  },
];
