import Code from "@tiptap/extension-code";
import CodeBlock from "@tiptap/extension-code-block";
import {
    ListItem,
    TaskItem,
    TaskList,
} from "@tiptap/extension-list";
import Typography from "@tiptap/extension-typography";
import StarterKit from "@tiptap/starter-kit";

/**
 * What: What a list or checklist item may contain, in Tiptap's schema
 * language: a paragraph or code block first, then any blocks. This lets
 * formats stack instead of replacing each other.
 *
 * Used in:
 * - src/lib/writely/editor/document-extensions.ts (documentExtensions)
 *
 * Effect: Changing it changes which content list items accept. Documents
 * saved with content the new rule rejects may lose that content when
 * opened.
 */
const ITEM_CONTENT = "(paragraph | codeBlock) block*";

/**
 * What: What smart punctuation changes as the writer types: straight quotes
 * become curly ones, "--" becomes an em dash and "..." an ellipsis. Every
 * other Typography replacement (arrows, fractions, symbols) is off.
 *
 * Used in:
 * - src/lib/writely/editor/document-extensions.ts (documentExtensions)
 *
 * Effect: Setting a rule to false stops that replacement; removing a false
 * turns that replacement on. Exports read curly quotes, dashes and ellipses
 * in every font, but some symbols only in sans-serif PDFs.
 */
const SMART_PUNCTUATION = {
    leftArrow: false,
    rightArrow: false,
    copyright: false,
    trademark: false,
    servicemark: false,
    registeredTrademark: false,
    oneHalf: false,
    plusMinus: false,
    notEqual: false,
    laquo: false,
    raquo: false,
    multiplication: false,
    superscriptTwo: false,
    superscriptThree: false,
    oneQuarter: false,
    threeQuarters: false,
} as const;

/** Share the manuscript schema with tests; all changes use ordinary Tiptap transactions. */
export const documentExtensions = ({
    trailingNode = true,
    smartPunctuation = false,
}: { trailingNode?: boolean; smartPunctuation?: boolean } = {}) => [
    ...(smartPunctuation ? [Typography.configure(SMART_PUNCTUATION)] : []),
    StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        trailingNode: trailingNode ? {} : false,
        code: false,
        codeBlock: false,
        listItem: false,
        link: {
            openOnClick: false,
            HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
        },
    }),
    Code.extend({ excludes: "" }),
    CodeBlock.extend({
        marks: "_",
        // Above list items, so Enter in a listed code block adds a line instead of a new item.
        priority: 101,
        addKeyboardShortcuts() {
            const parent = this.parent?.() ?? {};
            return {
                ...parent,
                Enter: (props) =>
                    !!parent.Enter?.(props) ||
                    (this.editor.isActive(this.name) &&
                        this.editor.commands.newlineInCode()),
            };
        },
    }),
    ListItem.extend({ content: ITEM_CONTENT }),
    TaskList,
    TaskItem.extend({ content: ITEM_CONTENT }).configure({
        nested: true,
        // The checkbox node view skips the data-type that the checklist styles target.
        HTMLAttributes: { "data-type": "taskItem" },
    }),
];
