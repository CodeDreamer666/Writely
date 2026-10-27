import {
    describe,
    expect,
    it,
} from "vitest";
import {
    TUTORIAL_GOAL_PHRASE,
    TUTORIAL_GOAL_REVISION,
    TUTORIAL_PHRASE,
    TUTORIAL_REVISION,
    TUTORIAL_TEXT,
} from "../../src/lib/writely/tutorial";
import {
    compareTexts,
    sentences,
    type Block,
} from "../../src/lib/writely/compare";

/** Each version rebuilt from the comparison, paragraph by paragraph. */
function sides(blocks: Block[]) {
    const before: string[] = [],
        after: string[] = [];
    for (const block of blocks) {
        if (block.kind === "same") {
            before.push(block.text);
            after.push(block.text);
        } else if (block.kind === "removed") before.push(block.text);
        else if (block.kind === "added") after.push(block.text);
        else {
            before.push(
                block.pieces
                    .filter((p) => p.kind !== "added")
                    .map((p) => p.text)
                    .join(""),
            );
            after.push(
                block.pieces
                    .filter((p) => p.kind !== "removed")
                    .map((p) => p.text)
                    .join(""),
            );
        }
    }
    return { before: before.join("\n\n"), after: after.join("\n\n") };
}

const changed = (blocks: Block[]) =>
    blocks.flatMap((block) =>
        block.kind === "edited"
            ? block.pieces
                  .filter((p) => p.kind !== "same")
                  .map((p) => [p.kind, p.text])
            : block.kind === "same"
              ? []
              : [[block.kind, block.text]],
    );

const LONG =
    "The bus was almost empty when I left the city. A woman in a green coat sat near the front. Outside, the streets were still wet from the morning rain.";

describe("compareTexts", () => {
    it("finds nothing to show for identical text", () => {
        const result = compareTexts("One.\n\nTwo.", "One.\n\nTwo.");
        expect(result.changes).toBe(0);
        expect(result.blocks.map((b) => b.kind)).toEqual(["same", "same"]);
    });

    it("marks only the replaced word in a small edit", () => {
        const result = compareTexts(
            "The quick fox ran home.",
            "The slow fox ran home.",
        );
        expect(result.changes).toBe(1);
        expect(changed(result.blocks)).toEqual([
            ["removed", "quick"],
            ["added", "slow"],
        ]);
    });

    it("joins nearby word edits into one phrase change", () => {
        const result = compareTexts(
            "We saw the big red dog by the gate today.",
            "We saw the small blue dog by the gate today.",
        );
        expect(result.changes).toBe(1);
        expect(changed(result.blocks)).toEqual([
            ["removed", "big red"],
            ["added", "small blue"],
        ]);
    });

    it("shows a rewritten sentence as one removal then one addition", () => {
        const result = compareTexts(
            LONG,
            "The bus was almost empty when I left the city. Nobody looked up when the doors closed behind me. Outside, the streets were still wet from the morning rain.",
        );
        expect(result.changes).toBe(1);
        expect(changed(result.blocks)).toEqual([
            ["removed", "A woman in a green coat sat near the front."],
            ["added", "Nobody looked up when the doors closed behind me."],
        ]);
        const pieces = (result.blocks[0] as Extract<Block, { kind: "edited" }>)
            .pieces;
        expect(pieces[0]).toEqual({
            kind: "same",
            text: "The bus was almost empty when I left the city. ",
        });
        expect(pieces.at(-1)?.text).toBe(
            " Outside, the streets were still wet from the morning rain.",
        );
    });

    it("shows a mostly rewritten sentence whole, not word by word", () => {
        const result = compareTexts(
            "It was a nice place with many nice books and I liked it.",
            "It was a hushed room that smelled of old paper, its shelves crowded with spines.",
        );
        expect(changed(result.blocks)).toEqual([
            [
                "removed",
                "It was a nice place with many nice books and I liked it.",
            ],
            [
                "added",
                "It was a hushed room that smelled of old paper, its shelves crowded with spines.",
            ],
        ]);
        expect(result.changes).toBe(1);
    });

    it("compares a rewritten paragraph as whole sections, removed first", () => {
        const result = compareTexts(
            `Intro stays.\n\n${LONG}\n\nEnding stays.`,
            "Intro stays.\n\nEverything about that morning felt borrowed and strange to me.\n\nEnding stays.",
        );
        expect(result.blocks.map((b) => b.kind)).toEqual([
            "same",
            "removed",
            "added",
            "same",
        ]);
        expect(result.changes).toBe(1);
        const [, removed, added] = result.blocks as Extract<
            Block,
            { change: number }
        >[];
        expect(removed!.change).toBe(added!.change);
    });

    it("keeps unchanged paragraphs around added and removed ones", () => {
        const result = compareTexts(
            "First.\n\nSecond.\n\nThird.",
            "First.\n\nThird.\n\nA brand new closing paragraph.",
        );
        expect(result.blocks.map((b) => b.kind)).toEqual([
            "same",
            "removed",
            "same",
            "added",
        ]);
        expect(result.changes).toBe(2);
    });

    it("numbers changes in reading order", () => {
        const result = compareTexts(
            "Alpha one here.\n\nBeta two here.\n\nGamma three here.",
            "Alpha 1 here.\n\nBeta two here.\n\nGamma 3 here.",
        );
        const ids = result.blocks.flatMap((b) =>
            b.kind === "edited"
                ? b.pieces.flatMap((p) =>
                      p.change === undefined ? [] : [p.change],
                  )
                : [],
        );
        expect([...new Set(ids)]).toEqual([0, 1]);
    });

    it("shows a real two-phrase revision as two readable changes", () => {
        const revised = TUTORIAL_TEXT.replace(
            TUTORIAL_PHRASE,
            TUTORIAL_REVISION,
        ).replace(TUTORIAL_GOAL_PHRASE, TUTORIAL_GOAL_REVISION);
        const result = compareTexts(TUTORIAL_TEXT, revised);
        expect(result.changes).toBe(2);
        // Two changes, each one removal and one addition: no scattered single words.
        expect(changed(result.blocks)).toHaveLength(4);
        expect(sides(result.blocks)).toEqual({
            before: TUTORIAL_TEXT,
            after: revised,
        });
    });

    it("doesn't count spacing as a change", () => {
        expect(compareTexts("One. Two.", "One.  Two.").changes).toBe(0);
        expect(compareTexts("Same words.", "Same words.").changes).toBe(0);
    });

    it("always rebuilds both versions exactly", () => {
        const cases: [string, string][] = [
            ["", "A whole new document."],
            ["Something written.", ""],
            [LONG, LONG.replace("green", "grey").replace("rain", "storm")],
            [
                "One. Two. Three.\n\nFour five six.",
                "One. Three. Two!\n\nFour six five seven.",
            ],
            [
                "Short.\n\nA paragraph that will move.\n\nEnd.",
                "A paragraph that will move.\n\nShort.\n\nEnd.",
            ],
        ];
        for (const [before, after] of cases) {
            const result = compareTexts(before, after);
            expect(sides(result.blocks)).toEqual({ before, after });
        }
    });
});

describe("sentences", () => {
    it("splits after sentence ends and joins back exactly", () => {
        const text = "Hi there. “Really?” she asked! Fine… done";
        expect(sentences(text).join("")).toBe(text);
        expect(sentences(text)).toEqual([
            "Hi there. ",
            "“Really?” she asked! ",
            "Fine… done",
        ]);
    });
});
