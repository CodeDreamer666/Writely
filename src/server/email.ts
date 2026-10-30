import "server-only";
import { env } from "~/env";

/** Whether feedback copies can actually reach an inbox. */
export const canSendEmail = Boolean(env.RESEND_API_KEY && env.EMAIL_FROM);

/** Emails a copy of new feedback to FEEDBACK_EMAIL. Does nothing when email isn't configured. */
export async function sendFeedbackEmail(feedback: {
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
            subject: "Writely feedback",
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
