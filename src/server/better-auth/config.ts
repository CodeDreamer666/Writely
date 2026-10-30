import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { env } from "~/env";
import { db } from "~/server/db";

export const auth = betterAuth({
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    database: prismaAdapter(db, {
        provider: "postgresql",
    }),
    // Google is the only way in. Email and password stay switched off except for the end-to-end
    // tests, which sign test accounts up without a Google account.
    emailAndPassword: {
        enabled: env.E2E_PASSWORD_SIGN_IN === "1",
    },
    socialProviders: {
        google: {
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
        },
    },
    account: {
        accountLinking: {
            // Accounts made with email and password never verified their address. Google verifies
            // it, so signing in with Google under the same email opens that existing account.
            requireLocalEmailVerified: false,
        },
    },
    user: {
        // Settings › Delete account removes the user and, through cascades, all of their writing.
        deleteUser: { enabled: true },
    },
});
