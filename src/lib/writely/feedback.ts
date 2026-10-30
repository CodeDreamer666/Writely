import { z } from "zod";

/** Shortest message accepted, in characters. */
export const FEEDBACK_MIN = 10;
/** A ceiling the form never shows, so one request can't carry a runaway paste. */
export const FEEDBACK_MAX = 50_000;

/** How many messages one writer may send in a rolling hour, so a stuck button can’t flood the inbox. */
export const FEEDBACK_PER_HOUR = 5;

export const feedbackSchema = z.object({
    message: z.string().trim().min(FEEDBACK_MIN).max(FEEDBACK_MAX),
    /** Store the account email with the message so it can be answered. */
    allowContact: z.boolean(),
    /** The part of the app the writer was in, for context. */
    page: z.string().max(200).optional(),
});

export type FeedbackInput = z.infer<typeof feedbackSchema>;
