import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // ESLint 9'da context.getAncestors hatası veren kurallar
      "@next/next/no-duplicate-head": "off",
      "@next/next/no-page-custom-font": "off",
      "@next/next/google-font-display": "off",
      "@next/next/google-font-preconnect": "off",
      "@next/next/no-css-tags": "off",
      "@next/next/no-head-element": "off",
      
      // TypeScript kuralları - warning seviyesinde
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-require-imports": "warn",
      "@typescript-eslint/no-unused-expressions": "warn",
      
      // React hooks kuralları - warning seviyesinde
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      
      // Diğer kurallar
      "prefer-const": "warn",
    },
  },
];

export default eslintConfig;
