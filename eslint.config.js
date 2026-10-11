import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["**/node_modules/**", "**/build/**", "**/.svelte-kit/**", "packages/ui/**", ".claude/**"] },
  js.configs.recommended,
  ...tseslint.configs.strict,
  { rules: { "@typescript-eslint/no-explicit-any": "error" } },
);
