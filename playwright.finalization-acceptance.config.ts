import { defineConfig } from "@playwright/test";
import existing from "./playwright.production-acceptance.config";

export default defineConfig({
  ...existing,
  testMatch: ["home-research-discovery.spec.ts", "v20-finalization.spec.ts"],
  outputDir: "test-results/v20-finalization",
});
