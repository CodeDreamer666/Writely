import nextVitals from "eslint-config-next/core-web-vitals";
import tseslint from "typescript-eslint";

export default tseslint.config(
    {
        ignores: [
            ".data/**",
            ".impeccable/**",
            ".restore-backup-*/**",
            ".before-newer-version-restore-*/**",
            ".next/**",
            "generated/**",
            "next-env.d.ts",
            "evidence/**",
            "test-results/**",
            "playwright-report/**",
        ],
    },
    ...nextVitals,
    {
        files: ["src/app/components/writely/**/*.{ts,tsx}"],
        rules: {
            // These imperative Tiptap/DOM integrations predate React Compiler; keep
            // their existing synchronization semantics during the dependency upgrade.
            "react-hooks/refs": "off",
            "react-hooks/set-state-in-effect": "off",
        },
    },
    {
        files: ["tests/e2e/**"],
        rules: { "react-hooks/rules-of-hooks": "off" },
    },
    {
        files: ["src/app/components/writely/annotations.tsx"],
        rules: {
            // Drag snapshots are deliberately mutable; performance.now() below is
            // called by a pointer-event callback, not by the component render.
            "react-hooks/preserve-manual-memoization": "off",
            "react-hooks/purity": "off",
        },
    },
    {
        // Auth transitions intentionally reload the app to clear account-scoped state.
        files: [
            "src/app/sign-in/auth-form.tsx",
            "src/app/components/writely/writely-app.tsx",
        ],
        rules: { "@next/next/no-location-assign-relative-destination": "off" },
    },
    {
        files: ["**/*.ts", "**/*.tsx"],
        extends: [
            ...tseslint.configs.recommended,
            ...tseslint.configs.recommendedTypeChecked,
            ...tseslint.configs.stylisticTypeChecked,
        ],
        rules: {
            "@typescript-eslint/array-type": "off",
            "@typescript-eslint/consistent-type-definitions": "off",
            "@typescript-eslint/consistent-type-imports": [
                "warn",
                { prefer: "type-imports", fixStyle: "inline-type-imports" },
            ],
            "@typescript-eslint/no-unused-vars": [
                "warn",
                { argsIgnorePattern: "^_" },
            ],
            "@typescript-eslint/require-await": "off",
            "@typescript-eslint/no-misused-promises": [
                "error",
                { checksVoidReturn: { attributes: false } },
            ],
            // Writely deliberately treats empty strings (an untitled draft, an unset colour) as missing.
            "@typescript-eslint/prefer-nullish-coalescing": "off",
        },
    },
    {
        linterOptions: {
            reportUnusedDisableDirectives: true,
        },
        languageOptions: {
            parserOptions: {
                projectService: true,
            },
        },
    },
);
