import assert from "node:assert/strict";
import JSZip from "jszip";
import { test } from "vitest";
import type { Block } from "../../src/lib/writely/export/blocks";
import {
    exportFileName,
    opensWithTitle,
} from "../../src/lib/writely/export/blocks";
import { toDocx } from "../../src/lib/writely/export/docx";
import { toPdf } from "../../src/lib/writely/export/pdf";
import {
    exportOptions,
    readPreferences,
    type ExportOptions,
} from "../../src/lib/writely/preferences";
import {
    DEFAULT_PREFERENCES,
    EDITOR_DEFAULTS,
} from "../../src/config/preferences";

const options: ExportOptions = { pageSize: "a4", font: "sans", title: false };

const sample: Block[] = [
    { type: "heading", level: 1, runs: [{ text: "Finding the Right Words" }] },
    {
        type: "paragraph",
        runs: [
            { text: "Plain, " },
            { text: "bold", bold: true },
            { text: ", " },
            { text: "italic", italic: true },
            { text: ", " },
            { text: "struck", strike: true },
            { text: " and " },
            { text: "a link", link: "https://example.com" },
            { text: " — “quotes” café ñ" },
        ],
    },
    {
        type: "list",
        ordered: true,
        start: 1,
        items: [
            { blocks: [{ type: "paragraph", runs: [{ text: "First" }] }] },
            {
                blocks: [
                    { type: "paragraph", runs: [{ text: "Second" }] },
                    {
                        type: "list",
                        ordered: false,
                        start: 1,
                        items: [
                            {
                                blocks: [
                                    {
                                        type: "paragraph",
                                        runs: [{ text: "Nested" }],
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
        ],
    },
    {
        type: "list",
        ordered: false,
        start: 1,
        items: [
            {
                checked: true,
                blocks: [{ type: "paragraph", runs: [{ text: "Done" }] }],
            },
        ],
    },
    {
        type: "quote",
        blocks: [{ type: "paragraph", runs: [{ text: "Quoted" }] }],
    },
    { type: "code", lines: [[{ text: "let x = 1;", code: true }], []] },
    { type: "rule" },
    ...Array.from({ length: 80 }, (): Block => ({
        type: "paragraph",
        runs: [{ text: "A long paragraph that keeps going. ".repeat(12) }],
    })),
];

test("Word export is a real .docx with the writing and its formatting", async () => {
    const blob = await toDocx("Finding the Right Words", sample, options);
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const xml = await zip.file("word/document.xml")!.async("string");
    assert.ok(zip.file("[Content_Types].xml"));
    assert.match(xml, /Finding the Right Words/);
    assert.match(xml, /<w:pStyle w:val="Heading1"\/>/);
    assert.match(xml, /<w:b\/>/);
    assert.match(xml, /<w:i\/>/);
    assert.match(xml, /<w:strike\/>/);
    assert.match(xml, /<w:hyperlink/);
    assert.match(xml, /<w:numPr>/);
    assert.match(xml, /café ñ/);
    assert.match(xml, /☒ /);
});

test("PDF export paginates on A4 with embedded fonts", async () => {
    const blob = await toPdf("Finding the Right Words", sample, options);
    const text = Buffer.from(await blob.arrayBuffer()).toString("latin1");
    assert.ok(text.startsWith("%PDF-"));
    const pages = text.match(/\/Type \/Page\b/g)?.length ?? 0;
    assert.ok(pages >= 2, `expected several pages, got ${pages}`);
    // A4 is 595.28 × 841.89 points.
    assert.match(text, /\/MediaBox \[0 0 595\.28 841\.89\]/);
    assert.match(text, /\/FontFile2/);
});

test("exports follow the paper size, font and title options", async () => {
    const letter = { pageSize: "letter", font: "serif", title: true } as const;
    const body: Block[] = [
        { type: "paragraph", runs: [{ text: "“Curly” — and so on…" }] },
    ];
    const pdf = Buffer.from(
        await (await toPdf("A title", body, letter)).arrayBuffer(),
    ).toString("latin1");
    assert.match(pdf, /\/MediaBox \[0 0 612 792\]/);
    assert.match(pdf, /\/BaseFont \/Times-Roman/);
    // Text a standard font can't draw falls back to the embedded font.
    const greek = Buffer.from(
        await (
            await toPdf(
                "Τίτλος",
                [{ type: "paragraph", runs: [{ text: "Ελλάδα" }] }],
                letter,
            )
        ).arrayBuffer(),
    ).toString("latin1");
    assert.doesNotMatch(greek, /Times-Roman/);
    assert.match(greek, /\/FontFile2/);

    const zip = await JSZip.loadAsync(
        await (await toDocx("A title", body, letter)).arrayBuffer(),
    );
    const xml = await zip.file("word/document.xml")!.async("string");
    assert.match(xml, /<w:pgSz w:w="12240" w:h="15840"/);
    assert.match(xml, /<w:pStyle w:val="Title"\/>/);
    assert.match(xml, /A title/);
    const styles = await zip.file("word/styles.xml")!.async("string");
    assert.match(styles, /Georgia/);
});

test("the title is added only when the text doesn't already open with it", () => {
    const heading: Block = {
        type: "heading",
        level: 1,
        runs: [{ text: "Finding the  Right " }, { text: "Words", bold: true }],
    };
    assert.equal(opensWithTitle("finding the right words", [heading]), true);
    assert.equal(opensWithTitle("Another title", [heading]), false);
    assert.equal(
        opensWithTitle("Words", [
            { type: "paragraph", runs: [{ text: "Words" }] },
        ]),
        false,
    );
    assert.deepEqual(
        exportOptions({
            ...DEFAULT_PREFERENCES,
            fontFamily: "mono",
            exportFont: "editor",
        }),
        { pageSize: "a4", font: "mono", title: false },
    );
});

test("export file names are safe and never empty", () => {
    assert.equal(
        exportFileName('Notes: "draft" 1/2', "docx"),
        "Notes draft 1 2.docx",
    );
    assert.equal(exportFileName("   ", "pdf"), "Untitled document.pdf");
    assert.equal(exportFileName("..hidden..", "pdf"), "hidden.pdf");
});

test("appearance defaults and older saved values", () => {
    assert.deepEqual(EDITOR_DEFAULTS, {
        fontFamily: "sans",
        fontSize: 16,
        lineSpacing: "comfortable",
        paragraphSpacing: "comfortable",
        editorWidth: "standard",
    });
    assert.equal(
        readPreferences({ lineSpacing: "airy" }).lineSpacing,
        "spacious",
    );
    assert.equal(
        readPreferences({ lineSpacing: "standard" }).lineSpacing,
        "comfortable",
    );
    assert.equal(readPreferences({ fontSize: 12 }).fontSize, 12);
    assert.equal(
        readPreferences({ fontSize: 25 }).fontSize,
        DEFAULT_PREFERENCES.fontSize,
    );
    assert.equal(
        readPreferences({ fontSize: 16.5 }).fontSize,
        DEFAULT_PREFERENCES.fontSize,
    );
});
