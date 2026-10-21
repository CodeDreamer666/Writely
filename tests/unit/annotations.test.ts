import assert from "node:assert/strict";
import { Schema } from "@tiptap/pm/model";
import {
    Mapping,
    StepMap,
} from "@tiptap/pm/transform";
import { test } from "vitest";
import {
    anchorPoint,
    cardArrowPoint,
    connectorPath,
    remapConnectors,
    remapSelection,
    selectionTarget,
    targetAtPosition,
} from "../../src/lib/writely/annotation-model";
import type { Card } from "../../src/lib/writely/types";

const schema = new Schema({
    nodes: {
        doc: { content: "paragraph+" },
        paragraph: { content: "text*", group: "block" },
        text: { group: "inline" },
    },
});
const prose = (...texts: string[]) =>
    schema.node(
        "doc",
        null,
        texts.map((t) =>
            schema.node("paragraph", null, t ? schema.text(t) : undefined),
        ),
    );
const card = (target: Card["connectors"]) =>
    ({
        id: "a",
        text: "",
        opacity: 1,
        bg: "#FCEFB5",
        fg: "#1F1D1A",
        connectors: target,
    }) as Card;

test("selection connections keep partial words and multi-paragraph boundaries exact", () => {
    const doc = prose("Alpha beta.", "Second paragraph.");
    for (const [from, to] of [
        [3, 6],
        [2, 24],
        [1, 6],
    ]) {
        const selected = {
            from: from!,
            to: to!,
            quote: doc.textBetween(from!, to!, " "),
        };
        assert.deepEqual(selectionTarget(doc, selected), {
            kind: "text",
            ...selected,
        });
    }
    assert.equal(selectionTarget(doc, { from: 1, to: 1, quote: "" }), null);
    assert.equal(
        selectionTarget(doc, { from: 1, to: 6, quote: "Stale" }),
        null,
    );
    const selected = { from: 3, to: 6, quote: "pha" };
    const mapped = remapSelection(
        selected,
        new Mapping([new StepMap([1, 0, 7])]),
        prose("Before Alpha beta.", "Second paragraph."),
    );
    assert.deepEqual(mapped, { from: 10, to: 13, quote: "pha" });
    assert.equal(
        remapSelection(
            selected,
            new Mapping([new StepMap([3, 3, 0])]),
            prose("Al beta.", "Second paragraph."),
        ),
        null,
    );
});

test("targets resolve to words, sentences, paragraphs, the essay and selections", () => {
    const doc = prose("First sentence. Second thought!", "A final paragraph.");
    assert.equal(targetAtPosition(doc, 3)!.quote, "First");
    assert.equal(
        targetAtPosition(doc, 5, "sentence")!.quote,
        "First sentence.",
    );
    assert.equal(
        targetAtPosition(doc, 3, "paragraph")!.quote,
        "First sentence. Second thought!",
    );
    assert.equal(targetAtPosition(doc, 0, "essay")!.kind, "essay");
    const selection = { from: 17, to: 31, quote: doc.textBetween(17, 31, " ") };
    assert.equal(
        targetAtPosition(doc, 18, "selection", selection)!.quote,
        selection.quote,
    );
    assert.equal(targetAtPosition(prose(""), 1), null);
});

test("connectors follow insertions and orphan on deletion", () => {
    const doc = prose("First sentence. Second thought!", "A final paragraph.");
    const linked = card([
        { id: "link", anchor: "right", target: targetAtPosition(doc, 3)! },
    ]);
    const insertion = new Mapping([new StepMap([1, 0, 5])]);
    const moved = remapConnectors(
        [linked],
        insertion,
        prose("Well First sentence. Second thought!", "A final paragraph."),
    )[0]!.connectors![0]!.target;
    assert.equal(moved.from, 6);
    assert.equal(moved.to, 11);
    assert.equal(moved.quote, "First");
    assert.equal(moved.orphaned, false);
    const deletion = new Mapping([new StepMap([1, 5, 0])]);
    assert.equal(
        remapConnectors(
            [linked],
            deletion,
            prose(" sentence. Second thought!", "A final paragraph."),
        )[0]!.connectors![0]!.target.orphaned,
        true,
    );
});

test("arrows start from the card's anchor and survive saved-data round trips", () => {
    assert.deepEqual(
        anchorPoint({ x: 10, y: 20, width: 200, height: 100 }, "right"),
        { x: 210, y: 70 },
    );
    assert(
        connectorPath({ x: 210, y: 70 }, { x: 400, y: 70 }, "right").startsWith(
            "M 210 70 C",
        ),
    );
    const rect = { x: 10, y: 20, width: 200, height: 100 },
        points = { right: [0.9, 0.45] as [number, number] };
    assert.deepEqual(cardArrowPoint(rect, points), { x: 190, y: 65 });
    assert.deepEqual(
        cardArrowPoint({ ...rect, width: 300, height: 200 }, points),
        { x: 280, y: 110 },
    );
    assert.deepEqual(cardArrowPoint({ ...rect, x: 50, y: 70 }, points), {
        x: 230,
        y: 115,
    });
    const legacyLinks = (["top", "right", "bottom", "left"] as const).map(
        (anchor, i) => ({
            id: String(i),
            anchor,
            target: { kind: "essay" },
        }),
    );
    const loadedLinks = JSON.parse(
        JSON.stringify(legacyLinks),
    ) as typeof legacyLinks;
    assert.deepEqual(loadedLinks, legacyLinks);
    assert(
        loadedLinks.every(() =>
            connectorPath(
                cardArrowPoint(rect, points),
                { x: 400, y: 70 },
                "right",
            ).startsWith("M 190 65 C"),
        ),
    );
});
