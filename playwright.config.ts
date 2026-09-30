import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  workers: 1,
  fullyParallel: false,
  use: { baseURL: "http://127.0.0.1:5174", trace: "retain-on-failure" },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1000 },
      },
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 7"], defaultBrowserType: "chromium" },
    },
  ],
  webServer: [
    {
      command:
        "PYTHONPATH=../companion-ai/src ../companion-ai/.venv-admin/bin/python tests/server.py",
      url: "http://127.0.0.1:8001/api/status",
      reuseExistingServer: false,
    },
    {
      command:
        "npm run build -- --mode test && npm run preview -- --port 5174 --mode test",
      url: "http://127.0.0.1:5174",
      reuseExistingServer: false,
    },
  ],
});
