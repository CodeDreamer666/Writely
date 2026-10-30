import { z } from "zod";

/**
 * What: The kinds of feedback a writer can send, with the label shown for each.
 *
 * Used in:
 * - src/app/components/writely/feedback-settings.tsx (FeedbackSettings)
 * - src/server/feedback.ts (saveFeedback)
 *
 * Effect: Changes the choices on the feedback form. The first one is selected when the form opens.
 */
export const FEEDBACK_CATEGORIES = [
    ["idea", "Idea"],
    ["bug", "Problem"],
    ["praise", "Praise"],
    ["other", "Other"],
] as const;

export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number][0];

/** Shortest and longest message accepted, in characters. */
export const FEEDBACK_MIN = 10;
export const FEEDBACK_MAX = 2000;

/** How many messages one writer may send in a rolling hour, so a stuck button can’t flood the inbox. */
export const FEEDBACK_PER_HOUR = 5;

export const feedbackSchema = z.object({
    category: z.enum(["idea", "bug", "praise", "other"]),
    message: z.string().trim().min(FEEDBACK_MIN).max(FEEDBACK_MAX),
    /** Store the account email with the message so it can be answered. */
    allowContact: z.boolean(),
    /** The part of the app the writer was in, for context. */
    page: z.string().max(200).optional(),
});

export type FeedbackInput = z.infer<typeof feedbackSchema>;
