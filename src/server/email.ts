import "server-only";
import { env } from "~/env";

/** Whether password reset codes can actually reach an inbox. */
export const canSendEmail = Boolean(env.RESEND_API_KEY && env.EMAIL_FROM);

/**
 * Emails a 6-digit password reset code through Resend. In development without a key, the code is
 * logged instead so the flow can still be tried locally.
 */
export async function sendResetCode(email: string, otp: string) {
    if (!canSendEmail) {
        if (env.NODE_ENV !== "production") {
            console.info(`[writely] Password reset code for ${email}: ${otp}`);
            return;
        }
        throw new Error("Email sending is not configured.");
    }
    const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            from: env.EMAIL_FROM,
            to: email,
            subject: `${otp} is your Writely code`,
            text: `Your Writely password reset code is ${otp}. It expires in 5 minutes.\n\nIf you didn't ask for it, you can ignore this email.`,
        }),
    });
    if (!response.ok)
        throw new Error(`Resend refused the email (${response.status}).`);
}

/** Emails a copy of new feedback to FEEDBACK_EMAIL. Does nothing when email isn't configured. */
export async function sendFeedbackEmail(feedback: {
    category: string;
    message: string;
    contactEmail: string | null;
    page: string | null;
}) {
    if (!canSendEmail || !env.FEEDBACK_EMAIL) return;
    const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            from: env.EMAIL_FROM,
            to: env.FEEDBACK_EMAIL,
            ...(feedback.contactEmail
                ? { reply_to: feedback.contactEmail }
                : {}),
            subject: `Writely feedback: ${feedback.category}`,
            text: `${feedback.message}

—
From: ${feedback.contactEmail ?? "anonymous (no reply wanted)"}${
                feedback.page
                    ? `
Section: ${feedback.page}`
                    : ""
            }`,
        }),
    });
    if (!response.ok)
        throw new Error(`Resend refused the email (${response.status}).`);
}
