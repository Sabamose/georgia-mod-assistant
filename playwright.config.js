import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: "smoke.spec.js",
  timeout: 60_000,
  use: {
    headless: true,
  },
  webServer: {
    command: "npm run dev -- --host localhost --port 4173",
    url: "http://localhost:4173",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
