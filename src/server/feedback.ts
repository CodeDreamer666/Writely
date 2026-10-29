import "server-only";
import { TRPCError } from "@trpc/server";
import {
    FEEDBACK_PER_HOUR,
    type FeedbackInput,
} from "~/lib/writely/feedback";
import { db } from "~/server/db";
import { sendFeedbackEmail } from "~/server/email";

/**
 * Saves one piece of feedback from a signed-in writer. The account email is kept only when they
 * agreed to be contacted. A copy goes to the inbox set in FEEDBACK_EMAIL when email is configured;
 * a failure there never loses the saved feedback.
 */
export async function saveFeedback(
    user: { id: string; email: string },
    input: FeedbackInput,
    userAgent: string | null,
) {
    const recent = await db.feedback.count({
        where: {
            userId: user.id,
            createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
        },
    });
    if (recent >= FEEDBACK_PER_HOUR)
        throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message:
                "You’ve sent a lot of feedback just now. Please try again later.",
        });
    const saved = await db.feedback.create({
        data: {
            userId: user.id,
            category: input.category,
            message: input.message,
            contactEmail: input.allowContact ? user.email : null,
            page: input.page ?? null,
            userAgent: userAgent?.slice(0, 300) ?? null,
        },
    });
    await sendFeedbackEmail(saved).catch((error: unknown) =>
        console.error("[writely] Could not email feedback:", error),
    );
    return { id: saved.id };
}
