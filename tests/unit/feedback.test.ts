import { describe, expect, it } from "vitest";
import {
    FEEDBACK_MAX,
    FEEDBACK_MIN,
    feedbackSchema,
} from "~/lib/writely/feedback";

const valid = {
    category: "idea" as const,
    message: "Please add a dark theme for night writing.",
    allowContact: false,
};

describe("feedbackSchema", () => {
    it("accepts a normal message and trims it", () => {
        const parsed = feedbackSchema.parse({
            ...valid,
            message: `  ${valid.message}  `,
        });
        expect(parsed.message).toBe(valid.message);
    });

    it("rejects messages that are too short or too long", () => {
        expect(
            feedbackSchema.safeParse({
                ...valid,
                message: "x".repeat(FEEDBACK_MIN - 1),
            }).success,
        ).toBe(false);
        expect(
            feedbackSchema.safeParse({
                ...valid,
                message: "x".repeat(FEEDBACK_MAX + 1),
            }).success,
        ).toBe(false);
    });

    it("rejects whitespace-only messages and unknown categories", () => {
        expect(
            feedbackSchema.safeParse({ ...valid, message: " ".repeat(40) })
                .success,
        ).toBe(false);
        expect(
            feedbackSchema.safeParse({ ...valid, category: "spam" }).success,
        ).toBe(false);
    });
});
