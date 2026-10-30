/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
    // Help guides that were merged into others keep their old links working.
    async redirects() {
        return [
            {
                source: "/help/linking",
                destination: "/help/thought-cards#connect-a-card-to-text",
                permanent: false,
            },
            {
                source: "/help/export",
                destination: "/help/getting-started#export-a-document",
                permanent: false,
            },
            {
                source: "/help/settings",
                destination: "/help",
                permanent: false,
            },
        ];
    },
};

export default config;
