import assert from "node:assert/strict";
import { test } from "vitest";
import { formatEdited } from "../../src/lib/writely/edited-date";

test("edited labels use calendar days rather than elapsed hours", () => {
    const now = new Date(2026, 9, 25, 0, 5);
    assert.equal(formatEdited(new Date(2026, 9, 25), now), "Edited today");
    assert.equal(
        formatEdited(new Date(2026, 9, 24, 23, 59), now),
        "Edited yesterday",
    );
    assert.equal(formatEdited(new Date(2026, 9, 22), now), "Edited 3 days ago");
    assert.equal(formatEdited(new Date(2026, 9, 19), now), "Edited 6 days ago");
});

test("older dates abbreviate the month and include the year only when needed", () => {
    const now = new Date(2026, 9, 25);
    for (const date of [new Date(2026, 9, 18), new Date(2025, 11, 31)]) {
        const expected = date.toLocaleDateString(undefined, {
            day: "numeric",
            month: "short",
            ...(date.getFullYear() !== now.getFullYear() && {
                year: "numeric",
            }),
        });
        assert.equal(formatEdited(date, now), `Edited ${expected}`);
    }
    assert.equal(
        formatEdited(new Date(2025, 11, 31), new Date(2026, 0, 1)),
        "Edited yesterday",
    );
});
