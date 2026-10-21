import assert from "node:assert/strict";
import { test } from "vitest";
import {
    countWords,
    excerpt,
    highlightParts,
    htmlToPlainText,
    searchTerms,
} from "../../src/lib/writely/plain-text";

test("plain text keeps words apart across blocks and decodes entities", () => {
    assert.equal(
        htmlToPlainText(
            "<h2>Title</h2><p>Fish &amp; chips&nbsp;now</p><ul><li><p>one</p></li><li><p>two</p></li></ul><p>A&#39;s &lt;b&gt; &#x2014; ok</p>",
        ),
        "Title Fish & chips now one two A's <b> - ok",
    );
    assert.equal(htmlToPlainText("<p></p>"), "");
    assert.equal(htmlToPlainText("<p>“Curly” it’s</p>"), '"Curly" it\'s');
});

test("word counts ignore punctuation and keep contractions whole", () => {
    assert.equal(countWords(""), 0);
    assert.equal(countWords("It's a well-made, quiet room — really."), 6);
});

test("search terms are lowercased, trimmed and de-duplicated", () => {
    assert.deepEqual(searchTerms("  Quiet   LIBRARY quiet "), [
        "quiet",
        "library",
    ]);
    assert.deepEqual(searchTerms("it’s"), ["it's"]);
    assert.deepEqual(searchTerms("   "), []);
});

test("excerpts show the match in context", () => {
    const text =
        "word ".repeat(100) + "needle in the haystack " + "word ".repeat(50);
    const result = excerpt(text, ["needle"], 120);
    assert.ok(result.startsWith("…"));
    assert.ok(result.includes("needle"));
    assert.ok(result.length <= 125);
    assert.equal(excerpt("Short text", ["nothing"]), "Short text");
});

test("highlight parts split matches without HTML", () => {
    assert.deepEqual(highlightParts("A <b>Nice</b> nice", ["nice"]), [
        { text: "A <b>", match: false },
        { text: "Nice", match: true },
        { text: "</b> ", match: false },
        { text: "nice", match: true },
    ]);
    assert.deepEqual(highlightParts("a.b", ["."]), [
        { text: "a", match: false },
        { text: ".", match: true },
        { text: "b", match: false },
    ]);
});
