import { defineConfig } from "@playwright/test";

const baseURL = process.env.WRITELY_TEST_URL ?? "http://localhost:3000";

export default defineConfig({
    testDir: "./tests/e2e",
    workers: 1,
    reporter: "list",
    use: {
        baseURL,
        channel: "chrome",
        viewport: { width: 1440, height: 1000 },
    },
    // Starts the app unless one is already running at the test URL.
    webServer: {
        command: "npm run dev",
        url: baseURL,
        reuseExistingServer: true,
        timeout: 120_000,
    },
});
