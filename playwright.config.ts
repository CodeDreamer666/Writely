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
    // Google is the only sign-in in the app; the tests sign up with a password instead.
    webServer: {
        command: "npm run dev",
        env: { E2E_PASSWORD_SIGN_IN: "1" },
        url: baseURL,
        reuseExistingServer: true,
        timeout: 120_000,
    },
});
