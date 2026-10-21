import assert from "node:assert/strict";
import { test } from "vitest";
import { highlightRanges } from "../../src/lib/writely/editor/card-highlights";
import type { Card } from "../../src/lib/writely/types";

type HighlightCard = Pick<Card, "id" | "bg" | "connectors">;
const links = (...targets: object[]) =>
    targets.map((target, i) => ({
        id: String(i),
        target,
    })) as Card["connectors"];

test("exact ranges, essay targets, hover/selection priority and orphaned/invalid ranges", () => {
    const cards: HighlightCard[] = [
        {
            id: "card",
            bg: "#FBEFB5",
            connectors: links(
                { kind: "word", from: 2, to: 5 },
                { kind: "essay" },
                { kind: "text", from: 1, to: 99 },
                { kind: "paragraph", from: 6, to: 10, orphaned: true },
            ),
        },
    ];
    assert.equal(highlightRanges(cards, null, null, 20).length, 1);
    assert.equal(highlightRanges(cards, null, null, 20)[0]!.opacity, 32);
    assert.equal(highlightRanges(cards, null, "card", 20)[0]!.opacity, 42);
    assert.equal(highlightRanges(cards, "card", "card", 20)[0]!.opacity, 52);
    assert.deepEqual(highlightRanges([], null, null, 20), []);
    // Only the first connection per card is rendered, even for older multi-link data.
    assert.deepEqual(highlightRanges(cards, null, null, 20)[0]!.to, 5);
    const essay = [{ ...cards[0]!, connectors: links({ kind: "essay" }) }];
    assert.equal(highlightRanges(essay, null, null, 20)[0]!.to, 20);
    for (const target of [
        { kind: "text", from: 1, to: 99 },
        { kind: "paragraph", from: 6, to: 10, orphaned: true },
    ])
        assert.deepEqual(
            highlightRanges(
                [{ ...cards[0]!, connectors: links(target) }],
                null,
                null,
                20,
            ),
            [],
        );
});

test("overlapping thoughts split into neutral shared ranges", () => {
    const overlapping: HighlightCard[] = [
        {
            id: "a",
            bg: "#FBEFB5",
            connectors: links({ from: 1, to: 8 }, { from: 1, to: 8 }),
        },
        { id: "b", bg: "#DDEBDD", connectors: links({ from: 5, to: 12 }) },
    ];
    const split = highlightRanges(overlapping, null, null, 20);
    assert.deepEqual(
        split.map((r) => [r.from, r.to, r.cardIds.length]),
        [
            [1, 5, 1],
            [5, 8, 2],
            [8, 12, 1],
        ],
    );
    assert.equal(split[1]!.color, "var(--muted)");
    assert.equal(split[0]!.color, "#FBEFB5");
    assert.equal(split[2]!.color, "#DDEBDD");
    assert.equal(
        highlightRanges(overlapping, "a", "b", 20)[1]!.color,
        "#FBEFB5",
    );
    assert.equal(
        highlightRanges(overlapping, null, "b", 20)[1]!.color,
        "#DDEBDD",
    );
    assert.equal(
        highlightRanges(overlapping, null, "b", 20)[0]!.color,
        "#FBEFB5",
    );
});
