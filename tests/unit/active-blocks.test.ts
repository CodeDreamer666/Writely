import assert from "node:assert/strict";
import { Schema } from "@tiptap/pm/model";
import { test } from "vitest";
import { activeBlockRanges } from "../../src/lib/writely/editor/active-blocks";

const schema = new Schema({
    nodes: {
        doc: { content: "block+" },
        paragraph: { group: "block", content: "inline*" },
        list: { group: "block", content: "paragraph+" },
        text: { group: "inline" },
    },
    marks: { strong: {} },
});
const p = (text = "", bold = false) =>
    schema.node(
        "paragraph",
        null,
        text ? [schema.text(text, bold ? [schema.mark("strong")] : [])] : [],
    );
// Positions: "One" 0–5, empty 5–7, "Three" (bold) 7–14, a list holding "Four" 14–22.
const doc = schema.node("doc", null, [
    p("One"),
    p(),
    p("Three", true),
    schema.node("list", null, [p("Four")]),
]);

test("the caret marks only the top-level block it sits in", () => {
    assert.deepEqual(activeBlockRanges(doc, 2, 2), [[0, 5]]);
    // An empty paragraph and a formatted one are blocks like any other.
    assert.deepEqual(activeBlockRanges(doc, 6, 6), [[5, 7]]);
    assert.deepEqual(activeBlockRanges(doc, 10, 10), [[7, 14]]);
    // Inside a nested block, the whole top-level block stays bright.
    assert.deepEqual(activeBlockRanges(doc, 17, 17), [[14, 22]]);
});

test("a selection keeps every block it touches bright", () => {
    assert.deepEqual(activeBlockRanges(doc, 2, 10), [
        [0, 5],
        [5, 7],
        [7, 14],
    ]);
    assert.deepEqual(activeBlockRanges(doc, 0, doc.content.size).length, 4);
});
