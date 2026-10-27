import { defineConfig } from "@playwright/test";

const baseURL = process.env.WRITELY_TEST_URL ?? "http://localhost:3000";

/**
 * Captures the Help centre's screenshots from the running app: `npm run help:screenshots`.
 * Set PLAYWRIGHT_CHROMIUM to use a particular Chromium build.
 */
export default defineConfig({
    testDir: "./tests/help",
    workers: 1,
    reporter: "list",
    timeout: 300_000,
    use: {
        baseURL,
        deviceScaleFactor: 1.5,
        launchOptions: process.env.PLAYWRIGHT_CHROMIUM
            ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM }
            : {},
    },
    webServer: {
        command: "npm run dev",
        url: baseURL,
        reuseExistingServer: true,
        timeout: 120_000,
    },
});
