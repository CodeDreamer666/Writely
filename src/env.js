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
        // Google sign-in, the only way into Writely.
        GOOGLE_CLIENT_ID: z.string(),
        GOOGLE_CLIENT_SECRET: z.string(),
        // "1" turns on email and password sign-up and sign-in, for the end-to-end tests only.
        E2E_PASSWORD_SIGN_IN: z.literal("1").optional(),
        // Sends feedback copies through Resend.
        RESEND_API_KEY: z.string().optional(),
        EMAIL_FROM: z.string().optional(),
        // Where feedback from Settings is also emailed (needs the two above). It is always saved to the database.
        FEEDBACK_EMAIL: z.string().email().optional(),
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
        GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
        E2E_PASSWORD_SIGN_IN: process.env.E2E_PASSWORD_SIGN_IN,
        RESEND_API_KEY: process.env.RESEND_API_KEY,
        EMAIL_FROM: process.env.EMAIL_FROM,
        FEEDBACK_EMAIL: process.env.FEEDBACK_EMAIL,
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
