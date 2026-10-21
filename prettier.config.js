/** @type {import('prettier').Config & import('prettier-plugin-tailwindcss').PluginOptions} */
const config = {
    tabWidth: 4,
    plugins: ["./prettier-plugin-imports.js", "prettier-plugin-tailwindcss"],
};
export default config;
