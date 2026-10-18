import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Existing server components intentionally read request-time clocks; the
      // React rule treats these async server render functions like client renders.
      "react-hooks/purity": "warn",
      // These legacy forms are being migrated incrementally; warnings are capped in CI.
      "react-hooks/set-state-in-effect": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "prefer-const": "warn",
      "@next/next/no-html-link-for-pages": "warn",
    },
  },
  globalIgnores([".next/**", "coverage/**", "test-results/**", "playwright-report/**", ".playwright-browsers/**", ".swc-cache*/**", ".vercel/**", "sbom.cdx.json"]),
]);
