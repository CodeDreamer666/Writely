/**
 * The saved document HTML as a small, renderer-neutral tree. Word and PDF exports both read this,
 * so they agree on what the writing is: only the text and its formatting, never Writely's cards,
 * connectors, checklists or other interface.
 */

export type Run = {
    text: string;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    strike?: boolean;
    code?: boolean;
    link?: string;
    /** A line break inside the paragraph. */
    break?: boolean;
};

export type Block =
    | { type: "paragraph"; runs: Run[] }
    | { type: "heading"; level: 1 | 2 | 3; runs: Run[] }
    | { type: "list"; ordered: boolean; start: number; items: ListItem[] }
    | { type: "quote"; blocks: Block[] }
    | { type: "code"; lines: Run[][] }
    | { type: "rule" };

type ListItem = { blocks: Block[]; checked?: boolean };

type Marks = Omit<Run, "text" | "break">;

/**
 * What: Which HTML tags count as bold, italic, underline, strikethrough or
 * code when a document is exported.
 *
 * Used in:
 * - src/lib/writely/export/blocks.ts (inline)
 *
 * Effect: Adding a tag makes it keep its style in Word and PDF exports.
 * Removing one makes that text export as plain text.
 */
const MARKS: Record<string, keyof Marks> = {
    STRONG: "bold",
    B: "bold",
    EM: "italic",
    I: "italic",
    U: "underline",
    S: "strike",
    DEL: "strike",
    STRIKE: "strike",
    CODE: "code",
};

/**
 * What: The kinds of link kept in exported files: web links, email links
 * and phone links.
 *
 * Used in:
 * - src/lib/writely/export/blocks.ts (inline)
 *
 * Effect: Links that do not match are exported as plain text. Loosening it
 * could let unsafe links (such as javascript:) into exported files.
 */
const SAFE_LINK = /^(https?:|mailto:|tel:)/i;

function inline(node: Node, marks: Marks, out: Run[]) {
    node.childNodes.forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
            const text = child.textContent ?? "";
            if (text) out.push({ text, ...marks });
            return;
        }
        if (!(child instanceof Element)) return;
        if (child.tagName === "BR") {
            out.push({ text: "", break: true });
            return;
        }
        // Task-list checkboxes are rendered by the list itself.
        if (child.tagName === "LABEL" || child.tagName === "INPUT") return;
        const next = { ...marks };
        const mark = MARKS[child.tagName];
        if (mark) (next as Record<string, unknown>)[mark] = true;
        if (child.tagName === "A") {
            const href = child.getAttribute("href") ?? "";
            if (SAFE_LINK.test(href)) next.link = href;
        }
        inline(child, next, out);
    });
}

function runsOf(element: Element) {
    const runs: Run[] = [];
    inline(element, {}, runs);
    return runs;
}

function children(parent: Element): Block[] {
    const blocks: Block[] = [];
    for (const element of Array.from(parent.children)) {
        switch (element.tagName) {
            case "P":
                blocks.push({ type: "paragraph", runs: runsOf(element) });
                break;
            case "H1":
            case "H2":
            case "H3":
                blocks.push({
                    type: "heading",
                    level: Number(element.tagName[1]) as 1 | 2 | 3,
                    runs: runsOf(element),
                });
                break;
            case "UL":
            case "OL": {
                const task = element.getAttribute("data-type") === "taskList";
                blocks.push({
                    type: "list",
                    ordered: element.tagName === "OL",
                    start: Number(element.getAttribute("start") ?? 1) || 1,
                    items: Array.from(element.children)
                        .filter((li) => li.tagName === "LI")
                        .map((li) => {
                            // Task items wrap their content in a <div> beside the checkbox label.
                            const body =
                                task && li.querySelector(":scope > div")
                                    ? li.querySelector(":scope > div")!
                                    : li;
                            return {
                                blocks: children(body),
                                checked: task
                                    ? li.getAttribute("data-checked") === "true"
                                    : undefined,
                            };
                        }),
                });
                break;
            }
            case "BLOCKQUOTE":
                blocks.push({ type: "quote", blocks: children(element) });
                break;
            case "PRE": {
                const lines: Run[][] = [[]];
                const runs: Run[] = [];
                inline(element, { code: true }, runs);
                for (const run of runs) {
                    const parts = run.text.split("\n");
                    parts.forEach((part, i) => {
                        if (i) lines.push([]);
                        if (part) lines.at(-1)!.push({ ...run, text: part });
                    });
                }
                blocks.push({ type: "code", lines });
                break;
            }
            case "HR":
                blocks.push({ type: "rule" });
                break;
            default:
                // Anything unexpected keeps its text as a paragraph rather than disappearing.
                if (element.textContent?.trim())
                    blocks.push({ type: "paragraph", runs: runsOf(element) });
        }
    }
    return blocks;
}

/** Parses saved document HTML in the browser. Scripts never run: DOMParser documents are inert. */
export function parseDocument(html: string): Block[] {
    const doc = new DOMParser().parseFromString(
        `<body>${html}</body>`,
        "text/html",
    );
    return children(doc.body);
}

/** The plain text of some runs, as a reader would see it. */
export const runsText = (runs: Run[]) =>
    runs.map((run) => (run.break ? " " : run.text)).join("");

/** Whether the writing already opens with its title as a heading, so exports don't repeat it. */
export function opensWithTitle(title: string, blocks: Block[]) {
    const first = blocks[0];
    const normal = (text: string) =>
        text.trim().replace(/\s+/g, " ").toLowerCase();
    return (
        first?.type === "heading" &&
        normal(runsText(first.runs)) === normal(title)
    );
}

/** A file name from the document title: no characters that file systems reject, never empty. */
export function exportFileName(title: string, extension: "docx" | "pdf") {
    const base =
        title
            .normalize("NFC")
            .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, " ")
            .replace(/\s+/g, " ")
            .replace(/^[\s.]+|[\s.]+$/g, "")
            .slice(0, 100)
            .trim() || "Untitled document";
    return `${base}.${extension}`;
}
