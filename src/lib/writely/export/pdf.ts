import type {
    Content,
    ContentStack,
    ContentText,
    TDocumentDefinitions,
} from "pdfmake/interfaces";
import { EXPORT_PAGE_SIZES } from "../../../config/preferences";
import type { ExportOptions } from "../preferences";
import {
    opensWithTitle,
    runsText,
    type Block,
    type Run,
} from "./blocks";

// A print layout of its own: the chosen paper size, fixed margins, a light page and readable type,
// whatever the writer's on-screen width, theme or text size.
/**
 * What: The margin on every side of an exported PDF page, in points
 * (72 points = 1 inch). The bottom margin is 8 points larger.
 *
 * Used in:
 * - src/lib/writely/export/pdf.ts (toPdf)
 *
 * Effect: A larger value gives wider margins and a narrower text column.
 */
const PAGE_MARGIN = 64;
/**
 * What: The PDF font for each font family a writer can export with. Roboto
 * is embedded and covers most alphabets; Times and Courier are the PDF
 * standard fonts, which every reader has but which only cover Western
 * European characters.
 *
 * Used in:
 * - src/lib/writely/export/pdf.ts (toPdf)
 *
 * Effect: Changes the font of exported PDFs for that family. Writing with
 * characters a standard font lacks is exported in Roboto instead.
 */
const PDF_FONTS = {
    sans: "Roboto",
    serif: "Times",
    mono: "Courier",
} as const;
/**
 * What: The text size, in points, of the title that can open an exported
 * PDF.
 *
 * Used in:
 * - src/lib/writely/export/pdf.ts (toPdf)
 *
 * Effect: A larger number makes the exported title bigger.
 */
const TITLE_SIZE = 26;
/**
 * What: The main text colour in PDF exports.
 *
 * Used in:
 * - src/lib/writely/export/pdf.ts (toPdf)
 *
 * Effect: Changes the colour of body text and headings in exported PDFs.
 */
const INK = "#1F1D1A";
/**
 * What: The softer text colour in PDF exports, used for quotes and the
 * checked items of checklists.
 *
 * Used in:
 * - src/lib/writely/export/pdf.ts (content, toPdf)
 *
 * Effect: Changes the colour of that secondary text in exported PDFs.
 */
const MUTED = "#6B665E";
/**
 * What: The colour of lines in PDF exports: the bar beside quotes and
 * horizontal dividers.
 *
 * Used in:
 * - src/lib/writely/export/pdf.ts (content)
 *
 * Effect: Changes the colour of those lines in exported PDFs.
 */
const LINE = "#D8D3CA";
/**
 * What: The background colour behind code in PDF exports.
 *
 * Used in:
 * - src/lib/writely/export/pdf.ts (text, content)
 *
 * Effect: Changes the shading behind inline code and code blocks.
 */
const CODE_FILL = "#F1EFEA";
/**
 * What: The text size, in points, of each heading level in PDF exports.
 *
 * Used in:
 * - src/lib/writely/export/pdf.ts (content)
 *
 * Effect: A larger number makes that heading level bigger in exported PDFs.
 */
const HEADING_SIZES = { 1: 22, 2: 17, 3: 14 } as const;

function text(runs: Run[], italic = false): ContentText["text"] {
    if (!runs.length) return " ";
    return runs.map((run) =>
        run.break
            ? { text: "\n" }
            : {
                  text: run.text,
                  bold: run.bold,
                  italics: run.italic || italic,
                  decoration:
                      run.underline || run.link
                          ? ("underline" as const)
                          : run.strike
                            ? ("lineThrough" as const)
                            : undefined,
                  link: run.link,
                  color: run.link ? "#1F5F8B" : undefined,
                  background: run.code ? CODE_FILL : undefined,
                  preserveLeadingSpaces: run.code,
              },
    );
}

// Characters the standard PDF fonts can draw: Latin-1 and the extra punctuation of Windows-1252.
const STANDARD_TEXT = /^[\n\x20-\x7e\xa0-\xff€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ]*$/;
function* blockTexts(blocks: Block[]): Generator<string> {
    for (const block of blocks) {
        if (block.type === "paragraph" || block.type === "heading")
            yield runsText(block.runs);
        else if (block.type === "quote") yield* blockTexts(block.blocks);
        else if (block.type === "code")
            for (const line of block.lines) yield runsText(line);
        else if (block.type === "list")
            for (const item of block.items) yield* blockTexts(item.blocks);
    }
}

function content(blocks: Block[], width: number, italic = false): Content[] {
    return blocks.map<Content>((block) => {
        switch (block.type) {
            case "paragraph":
                return {
                    text: text(block.runs, italic),
                    margin: [0, 0, 0, 8],
                };
            case "heading":
                return {
                    text: text(block.runs),
                    fontSize: HEADING_SIZES[block.level],
                    bold: true,
                    lineHeight: 1.2,
                    margin: [0, block.level === 1 ? 10 : 8, 0, 6],
                    headlineLevel: block.level,
                };
            case "quote":
                return {
                    table: {
                        widths: ["*"],
                        body: [
                            [
                                {
                                    stack: content(block.blocks, width, true),
                                    color: MUTED,
                                },
                            ],
                        ],
                    },
                    layout: {
                        hLineWidth: () => 0,
                        vLineWidth: (i) => (i === 0 ? 1.5 : 0),
                        vLineColor: () => LINE,
                        paddingLeft: () => 14,
                        paddingRight: () => 0,
                        paddingTop: () => 0,
                        paddingBottom: () => 0,
                    },
                    margin: [0, 2, 0, 10],
                };
            case "code":
                return {
                    table: {
                        widths: ["*"],
                        body: [
                            [
                                {
                                    stack: block.lines.map((line) => ({
                                        text: text(line),
                                        preserveLeadingSpaces: true,
                                    })),
                                    fontSize: 9.5,
                                },
                            ],
                        ],
                    },
                    layout: {
                        hLineWidth: () => 0,
                        vLineWidth: () => 0,
                        fillColor: () => CODE_FILL,
                        paddingLeft: () => 10,
                        paddingRight: () => 10,
                        paddingTop: () => 8,
                        paddingBottom: () => 8,
                    },
                    margin: [0, 2, 0, 10],
                };
            case "rule":
                return {
                    canvas: [
                        {
                            type: "line",
                            x1: 0,
                            y1: 0,
                            x2: width,
                            y2: 0,
                            lineWidth: 0.6,
                            lineColor: LINE,
                        },
                    ],
                    margin: [0, 8, 0, 14],
                };
            case "list": {
                const task = block.items.some(
                    (item) => item.checked !== undefined,
                );
                const items: ContentStack[] = block.items.map((item) => {
                    const stack = content(item.blocks, width, italic).map(
                        (part, i): Content => {
                            if (typeof part !== "object" || !("text" in part))
                                return part;
                            const box =
                                task && i === 0
                                    ? [
                                          {
                                              text: item.checked
                                                  ? "[x] "
                                                  : "[ ] ",
                                              color: MUTED,
                                          },
                                      ]
                                    : [];
                            // Paragraphs inside list items don't need the space between paragraphs.
                            return {
                                ...part,
                                text: box.length
                                    ? [...box, ...[part.text].flat()]
                                    : part.text,
                                margin: [0, 0, 0, 3],
                            } as ContentText;
                        },
                    );
                    return { stack };
                });
                if (task)
                    return { ul: items, type: "none", margin: [0, 0, 0, 8] };
                return block.ordered
                    ? { ol: items, start: block.start, margin: [0, 0, 0, 8] }
                    : { ul: items, margin: [0, 0, 0, 8] };
            }
        }
    });
}

/** A paginated PDF built from the document's structure (not a screenshot of the editor). */
export async function toPdf(
    title: string,
    blocks: Block[],
    options: ExportOptions,
) {
    const titled = options.title && !opensWithTitle(title, blocks);
    const font =
        PDF_FONTS[options.font] !== "Roboto" &&
        [...blockTexts(blocks), titled ? title : ""].every((text) =>
            STANDARD_TEXT.test(text),
        )
            ? PDF_FONTS[options.font]
            : "Roboto";
    const [{ default: pdfMake }, { default: vfs }, standard] =
        await Promise.all([
            import("pdfmake/build/pdfmake"),
            import("pdfmake/build/vfs_fonts"),
            font === "Times"
                ? import("pdfmake/build/standard-fonts/Times")
                : font === "Courier"
                  ? import("pdfmake/build/standard-fonts/Courier")
                  : null,
        ]);
    pdfMake.addVirtualFileSystem(vfs);
    // A standard font container registers the font family under its own name (Times, Courier).
    if (standard) pdfMake.addFontContainer(standard.default);
    const page = EXPORT_PAGE_SIZES[options.pageSize];
    const width = page.width - PAGE_MARGIN * 2;
    const definition: TDocumentDefinitions = {
        info: { title, creator: "Writely" },
        pageSize: { width: page.width, height: page.height },
        pageMargins: [PAGE_MARGIN, PAGE_MARGIN, PAGE_MARGIN, PAGE_MARGIN + 8],
        defaultStyle: {
            font,
            fontSize: 11,
            lineHeight: 1.4,
            color: INK,
        },
        content: [
            ...(titled
                ? [
                      {
                          text: title,
                          fontSize: TITLE_SIZE,
                          lineHeight: 1.15,
                          margin: [0, 0, 0, 18],
                      } satisfies Content,
                  ]
                : []),
            ...content(blocks, width),
        ],
        // Keep a heading with the text after it instead of stranding it at the foot of a page.
        pageBreakBefore: (node, following) =>
            !!node.headlineLevel &&
            following.getFollowingNodesOnPage().length === 0,
        footer: (page, pages) =>
            pages > 1
                ? {
                      text: `${page} / ${pages}`,
                      alignment: "center",
                      fontSize: 8.5,
                      color: MUTED,
                      margin: [0, 24, 0, 0],
                  }
                : null,
    };
    return pdfMake.createPdf(definition).getBlob();
}
