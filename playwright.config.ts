import { defineConfig } from "@playwright/test";

// By default the tests build the app and serve the production build on port 3100.
// Set E2E_BASE_URL (for example http://localhost:3000) to run against a server that is already up.
// The browser is the Edge already installed on Windows; set PW_CHANNEL=chromium to use Playwright's own.
const external = process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: external ?? "http://localhost:3100",
    channel: process.env.PW_CHANNEL ?? "msedge",
    viewport: { width: 1440, height: 900 },
    trace: "retain-on-failure",
  },
  webServer: external
    ? undefined
    : {
        command: "npm run build && npx next start -p 3100",
        url: "http://localhost:3100",
        reuseExistingServer: true,
        timeout: 300_000,
      },
});
