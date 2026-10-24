import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { emailOTP } from "better-auth/plugins";
import { env } from "~/env";
import { db } from "~/server/db";
import { sendResetCode } from "~/server/email";

/** Whether the sign-in page offers "Continue with Google". */
export const googleEnabled = Boolean(
    env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET,
);

export const auth = betterAuth({
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    database: prismaAdapter(db, {
        provider: "postgresql",
    }),
    emailAndPassword: {
        enabled: true,
    },
    socialProviders: googleEnabled
        ? {
              google: {
                  clientId: env.GOOGLE_CLIENT_ID!,
                  clientSecret: env.GOOGLE_CLIENT_SECRET!,
              },
          }
        : {},
    plugins: [
        // Forgot password: a 6-digit code by email, checked before the new password is chosen.
        emailOTP({
            async sendVerificationOTP({ email, otp, type }) {
                if (type === "forget-password") await sendResetCode(email, otp);
            },
        }),
    ],
    user: {
        // Settings › Delete account removes the user and, through cascades, all of their writing.
        deleteUser: { enabled: true },
    },
});

export type Session = typeof auth.$Infer.Session;
