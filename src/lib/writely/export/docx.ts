import {
    AlignmentType,
    BorderStyle,
    Document,
    ExternalHyperlink,
    HeadingLevel,
    LevelFormat,
    Packer,
    Paragraph,
    ShadingType,
    TextRun,
    type ParagraphChild,
} from "docx";
import { EXPORT_PAGE_SIZES } from "../../../config/preferences";
import type { ExportOptions } from "../preferences";
import {
    opensWithTitle,
    type Block,
    type Run,
} from "./blocks";

/**
 * What: The font for normal text, headings and the title in Word exports,
 * for each font family a writer can export with.
 *
 * Used in:
 * - src/lib/writely/export/docx.ts (toDocx)
 *
 * Effect: Changes the font of exported Word documents. The reader's computer
 * needs the font installed, or Word picks another, so these are fonts most
 * computers have.
 */
const BODY_FONTS = {
    sans: "Calibri",
    serif: "Georgia",
    mono: "Consolas",
} as const;
/**
 * What: The font for code in Word exports.
 *
 * Used in:
 * - src/lib/writely/export/docx.ts (textRuns, paragraphs)
 *
 * Effect: Changes the font of inline code and code blocks in Word exports.
 */
const CODE_FONT = "Consolas";
/**
 * What: How the editor's heading levels map to Word's built-in heading
 * styles.
 *
 * Used in:
 * - src/lib/writely/export/docx.ts (paragraphs)
 *
 * Effect: Changing a mapping makes that heading level use a different Word
 * style, which also changes Word's navigation pane.
 */
const HEADINGS = {
    1: HeadingLevel.HEADING_1,
    2: HeadingLevel.HEADING_2,
    3: HeadingLevel.HEADING_3,
} as const;

// Word list levels: a hanging indent per level, bullets cycling like Word's own.
const levels = (ordered: boolean) =>
    Array.from({ length: 9 }, (_, level) => ({
        level,
        format: ordered
            ? [
                  LevelFormat.DECIMAL,
                  LevelFormat.LOWER_LETTER,
                  LevelFormat.LOWER_ROMAN,
              ][level % 3]!
            : LevelFormat.BULLET,
        text: ordered ? `%${level + 1}.` : ["•", "◦", "▪"][level % 3]!,
        alignment: AlignmentType.LEFT,
        style: {
            paragraph: { indent: { left: 720 * (level + 1), hanging: 360 } },
        },
    }));

function textRuns(runs: Run[], extra: { italics?: boolean } = {}) {
    const children: ParagraphChild[] = [];
    for (const run of runs) {
        if (run.break) {
            children.push(new TextRun({ text: "", break: 1 }));
            continue;
        }
        const text = new TextRun({
            text: run.text,
            bold: run.bold,
            italics: run.italic || extra.italics,
            underline: run.underline || run.link ? {} : undefined,
            strike: run.strike,
            font: run.code ? CODE_FONT : undefined,
            color: run.link ? "1F5F8B" : undefined,
            shading: run.code
                ? { type: ShadingType.CLEAR, fill: "F1EFEA", color: "auto" }
                : undefined,
        });
        children.push(
            run.link
                ? new ExternalHyperlink({ link: run.link, children: [text] })
                : text,
        );
    }
    return children;
}

type Context = { indent: number; quote: boolean; nextList: () => number };

function paragraphs(blocks: Block[], context: Context): Paragraph[] {
    const out: Paragraph[] = [];
    const quoteStyle = context.quote
        ? {
              indent: { left: 720 + context.indent },
              border: {
                  left: {
                      style: BorderStyle.SINGLE,
                      size: 12,
                      color: "B8B2A7",
                      space: 12,
                  },
              },
          }
        : context.indent
          ? { indent: { left: context.indent } }
          : {};
    for (const block of blocks) {
        switch (block.type) {
            case "paragraph":
                out.push(
                    new Paragraph({
                        children: textRuns(block.runs, {
                            italics: context.quote,
                        }),
                        ...quoteStyle,
                    }),
                );
                break;
            case "heading":
                out.push(
                    new Paragraph({
                        heading: HEADINGS[block.level],
                        children: textRuns(block.runs),
                    }),
                );
                break;
            case "quote":
                out.push(
                    ...paragraphs(block.blocks, { ...context, quote: true }),
                );
                break;
            case "code":
                for (const line of block.lines)
                    out.push(
                        new Paragraph({
                            children: line.length
                                ? textRuns(line)
                                : [new TextRun({ text: "", font: CODE_FONT })],
                            spacing: { before: 0, after: 0 },
                            shading: {
                                type: ShadingType.CLEAR,
                                fill: "F1EFEA",
                                color: "auto",
                            },
                            indent: context.indent
                                ? { left: context.indent }
                                : undefined,
                        }),
                    );
                out.push(new Paragraph({ children: [] }));
                break;
            case "rule":
                out.push(
                    new Paragraph({
                        children: [],
                        border: {
                            bottom: {
                                style: BorderStyle.SINGLE,
                                size: 6,
                                color: "D8D3CA",
                                space: 1,
                            },
                        },
                    }),
                );
                break;
            case "list":
                out.push(...listParagraphs(block, 0, context));
                break;
        }
    }
    return out;
}

function listParagraphs(
    list: Extract<Block, { type: "list" }>,
    level: number,
    context: Context,
): Paragraph[] {
    const out: Paragraph[] = [];
    const instance = context.nextList();
    const task = list.items.some((item) => item.checked !== undefined);
    for (const item of list.items) {
        item.blocks.forEach((block, index) => {
            if (block.type === "list") {
                out.push(...listParagraphs(block, level + 1, context));
                return;
            }
            if (
                index === 0 &&
                (block.type === "paragraph" || block.type === "heading")
            ) {
                const box = task
                    ? [new TextRun({ text: item.checked ? "☒ " : "☐ " })]
                    : [];
                out.push(
                    new Paragraph({
                        children: [...box, ...textRuns(block.runs)],
                        ...(task
                            ? { indent: { left: 360 * (level + 1) } }
                            : {
                                  numbering: {
                                      reference: list.ordered
                                          ? "ordered"
                                          : "bullets",
                                      level,
                                      instance,
                                  },
                              }),
                    }),
                );
                return;
            }
            out.push(
                ...paragraphs([block], {
                    ...context,
                    indent: 720 * (level + 1),
                }),
            );
        });
    }
    return out;
}

/** A real Word document (Office Open XML), not renamed HTML. */
export async function toDocx(
    title: string,
    blocks: Block[],
    options: ExportOptions,
) {
    let lists = 0;
    const font = BODY_FONTS[options.font];
    const page = EXPORT_PAGE_SIZES[options.pageSize];
    // Word measures pages in twentieths of a point.
    const twips = (points: number) => Math.round(points * 20);
    const heading =
        options.title && !opensWithTitle(title, blocks)
            ? [
                  new Paragraph({
                      heading: HeadingLevel.TITLE,
                      children: [new TextRun({ text: title })],
                  }),
              ]
            : [];
    const doc = new Document({
        title,
        creator: "Writely",
        styles: {
            default: {
                document: {
                    run: { font, size: 24 },
                    paragraph: { spacing: { after: 160, line: 300 } },
                },
                title: {
                    run: { font, size: 52 },
                    paragraph: { spacing: { after: 320 } },
                },
                heading1: { run: { font, size: 40, bold: true } },
                heading2: { run: { font, size: 32, bold: true } },
                heading3: { run: { font, size: 26, bold: true } },
            },
        },
        numbering: {
            config: [
                { reference: "bullets", levels: levels(false) },
                { reference: "ordered", levels: levels(true) },
            ],
        },
        sections: [
            {
                properties: {
                    page: {
                        size: {
                            width: twips(page.width),
                            height: twips(page.height),
                        },
                    },
                },
                children: [
                    ...heading,
                    ...paragraphs(blocks, {
                        indent: 0,
                        quote: false,
                        nextList: () => ++lists,
                    }),
                ],
            },
        ],
    });
    return Packer.toBlob(doc);
}
