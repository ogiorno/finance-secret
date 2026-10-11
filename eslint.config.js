import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["**/node_modules/**", "**/build/**", "**/.svelte-kit/**", "packages/ui/**", ".claude/**", "apps/web/static/**", "apps/web/playwright-report/**", "apps/web/test-results/**"] },
  js.configs.recommended,
  ...tseslint.configs.strict,
  { rules: { "@typescript-eslint/no-explicit-any": "error" } },
  { files: ["**/*.mjs"], languageOptions: { globals: { console: "readonly", URL: "readonly", process: "readonly" } } },
);
