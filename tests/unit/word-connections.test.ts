import assert from "node:assert/strict";
import { Schema } from "@tiptap/pm/model";
import {
    Mapping,
    StepMap,
} from "@tiptap/pm/transform";
import { test } from "vitest";
import {
    remapConnectors,
    targetAtPosition,
} from "../../src/lib/writely/annotation-model";
import type { Card } from "../../src/lib/writely/types";
import {
    documentWords,
    wordLineFromRects,
} from "../../src/lib/writely/word-connections";

const schema = new Schema({
    nodes: {
        doc: { content: "paragraph+" },
        paragraph: { content: "inline*", group: "block" },
        text: { group: "inline" },
        hard_break: { inline: true, group: "inline" },
    },
    marks: { bold: {} },
});
const doc = schema.node("doc", null, [
    schema.node("paragraph", null, [
        schema.text("A re"),
        schema.text("mark", [schema.mark("bold")]),
        schema.text("able word."),
        schema.node("hard_break"),
        schema.text("Next café 你好."),
    ]),
]);

test("words span marks, hard breaks and Unicode, and remap with edits", () => {
    const words = documentWords(doc);
    assert.deepEqual(
        words.map((word) => word.quote),
        ["A", "remarkable", "word", "Next", "café", "你好"],
    );
    for (const word of words) {
        assert.equal(doc.textBetween(word.from, word.to, ""), word.quote);
        assert.equal(targetAtPosition(doc, word.from)!.kind, "word");
    }
    assert.equal(targetAtPosition(doc, 2), null);
    const word = words[1]!;
    assert.deepEqual(
        targetAtPosition(doc, word.from, "selection", { ...word }),
        word,
    );
    assert.equal(
        targetAtPosition(doc, word.from, "selection", {
            from: 1,
            to: word.to,
            quote: doc.textBetween(1, word.to, " "),
        })!.kind,
        "text",
    );
    assert.equal(targetAtPosition(doc, word.from, "sentence")!.kind, "text");
    assert.equal(
        targetAtPosition(doc, word.from, "paragraph")!.kind,
        "paragraph",
    );
    const updated = schema.node("doc", null, [
        schema.node("paragraph", null, schema.text("Well " + doc.textContent)),
    ]);
    const linked = [
        { id: "card", connectors: [{ id: "link", target: word }] },
    ] as Card[];
    const mapped = remapConnectors(
        linked,
        new Mapping([new StepMap([1, 0, 5])]),
        updated,
    )[0]!.connectors![0]!.target;
    assert.equal(mapped.quote, "remarkable");
    assert.equal(mapped.from, word.from + 5);
    assert.deepEqual(JSON.parse(JSON.stringify(mapped)), mapped);
});

test("word lines are measured in workspace coordinates through wrapping and zoom", () => {
    const workspace = {
        offsetWidth: 400,
        offsetHeight: 300,
        scrollLeft: 0,
        scrollTop: 70,
        getBoundingClientRect: () =>
            ({ left: 10, top: 20, width: 400, height: 300 }) as DOMRect,
    };
    const rect = (
        left: number,
        right: number,
        top: number,
        bottom: number,
    ) => ({
        left,
        right,
        top,
        bottom,
        width: right - left,
        height: bottom - top,
    });
    assert.deepEqual(
        wordLineFromRects(
            [rect(30, 60, 40, 60), rect(60, 110, 40, 60)],
            workspace,
        ),
        {
            x1: 20,
            x2: 100,
            y: 110,
            point: { x: 60, y: 110 },
        },
    );
    assert.equal(wordLineFromRects([], workspace), null);
    assert.deepEqual(
        wordLineFromRects(
            [rect(30, 310, 40, 60), rect(30, 130, 70, 90)],
            workspace,
        )!.point,
        { x: 70, y: 140 },
    );
    const zoomed = {
        ...workspace,
        getBoundingClientRect: () =>
            ({ left: 10, top: 20, width: 800, height: 600 }) as DOMRect,
    };
    assert.deepEqual(
        wordLineFromRects([rect(50, 210, 60, 100)], zoomed)!.point,
        {
            x: 60,
            y: 110,
        },
    );
});
