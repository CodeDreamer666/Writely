import { doc } from "prettier";
import { printers as builtInPrinters } from "prettier/plugins/estree";

/**
 * House import style on top of Prettier's own printer:
 * - "use client" and every import sit together with no blank lines between them.
 * - An import naming two or more bindings puts each one on its own line.
 */

const estree = builtInPrinters.estree;

/** @param {any} node */
function isHeaderNode(node) {
    return (
        node.type === "ImportDeclaration" ||
        node.type === "Directive" ||
        (node.type === "ExpressionStatement" && node.directive !== undefined)
    );
}

// Prettier keeps a blank line wherever the source had one, so hide the blank lines between the
// header nodes from it. Each newline becomes a space, which keeps every source position intact.
/**
 * @param {any} ast
 * @param {any} options
 */
function closeHeaderGaps(ast, options) {
    const program = ast.type === "File" ? ast.program : ast;
    const header = [...(program.directives ?? []), ...program.body].sort(
        (/** @type {any} */ a, /** @type {any} */ b) =>
            options.locStart(a) - options.locStart(b),
    );
    let text = options.originalText;
    for (let index = 1; index < header.length; index++) {
        const previous = header[index - 1];
        const node = header[index];
        if (!isHeaderNode(previous) || node.type !== "ImportDeclaration") break;
        // A directive's range can stop short of its semicolon.
        const gapStart =
            options.locEnd(previous) +
            (text[options.locEnd(previous)] === ";" ? 1 : 0);
        const gapEnd = options.locStart(node);
        const gap = text.slice(gapStart, gapEnd);
        if (gap.trim() !== "") continue;
        const firstNewline = gap.indexOf("\n");
        const closed =
            gap.slice(0, firstNewline + 1) +
            gap.slice(firstNewline + 1).replace(/[\r\n]/g, " ");
        text = text.slice(0, gapStart) + closed + text.slice(gapEnd);
    }
    options.originalText = text;
    return ast;
}

/** @param {any} node */
function namedSpecifierCount(node) {
    return (node.specifiers ?? []).filter(
        (/** @type {any} */ specifier) => specifier.type === "ImportSpecifier",
    ).length;
}

/** @type {Record<string, import("prettier").Printer>} */
export const printers = {
    estree: {
        ...estree,
        preprocess(ast, options) {
            const processed = estree.preprocess
                ? estree.preprocess(ast, options)
                : ast;
            return closeHeaderGaps(processed, options);
        },
        print(path, options, print, args) {
            const printed = estree.print(path, options, print, args);
            const node = path.node;
            if (
                node.type !== "ImportDeclaration" ||
                namedSpecifierCount(node) < 2
            )
                return printed;
            return doc.utils.mapDoc(printed, (/** @type {any} */ part) =>
                part.type === "group" ? { ...part, break: true } : part,
            );
        },
    },
};
