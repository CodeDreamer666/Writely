import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
    /**
     * Server-side environment variables. The app won't build with invalid values.
     */
    server: {
        BETTER_AUTH_SECRET:
            process.env.NODE_ENV === "production"
                ? z.string()
                : z.string().optional(),
        BETTER_AUTH_URL: z.string().url().optional(),
        DATABASE_URL: z
            .url()
            .regex(
                /^postgres(ql)?:\/\//,
                "DATABASE_URL must be a PostgreSQL connection URL",
            ),
        NODE_ENV: z
            .enum(["development", "test", "production"])
            .default("development"),
    },

    /**
     * Client-side environment variables. Expose them by prefixing with `NEXT_PUBLIC_`.
     */
    client: {},

    /**
     * Destructured manually because `process.env` can't be destructured in edge runtimes or the client.
     */
    runtimeEnv: {
        BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
        BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
        DATABASE_URL: process.env.DATABASE_URL,
        NODE_ENV: process.env.NODE_ENV,
    },
    /**
     * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation (useful for Docker builds).
     */
    skipValidation: !!process.env.SKIP_ENV_VALIDATION,
    /**
     * Treat empty strings as undefined, so `SOME_VAR=''` fails validation.
     */
    emptyStringAsUndefined: true,
});
