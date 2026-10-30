import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { Mapping } from "@tiptap/pm/transform";
import type {
    Anchor,
    Card,
    ConnectorTarget,
    Point,
    Side,
} from "./types";
import {
    documentWords,
    wordAtRange,
} from "./word-connections";

export type Rect = {
    x: number;
    y: number;
    width: number;
    height: number;
    side?: Side;
};
export type XY = { x: number; y: number };
type TargetMode =
    "selection" | "word" | "sentence" | "paragraph" | "essay";
export type SelectionSnapshot = { from: number; to: number; quote: string };

/** Selection connections retain the exact range, including partial words and block boundaries. */
export function selectionTarget(
    doc: ProseMirrorNode,
    selection: SelectionSnapshot | null,
): ConnectorTarget | null {
    if (
        !selection ||
        !Number.isInteger(selection.from) ||
        !Number.isInteger(selection.to) ||
        selection.from < 0 ||
        selection.to > doc.content.size ||
        selection.from >= selection.to
    )
        return null;
    const quote = doc.textBetween(selection.from, selection.to, " ");
    return quote.trim() && quote === selection.quote
        ? { kind: "text", from: selection.from, to: selection.to, quote }
        : null;
}

export function remapSelection(
    selection: SelectionSnapshot | null,
    mapping: Mapping,
    doc: ProseMirrorNode,
): SelectionSnapshot | null {
    if (!selection) return null;
    const from = mapping.mapResult(selection.from, 1),
        to = mapping.mapResult(selection.to, -1);
    if (
        from.pos >= to.pos ||
        (from.deletedAcross && to.deletedAcross) ||
        to.pos > doc.content.size
    )
        return null;
    const quote = doc.textBetween(from.pos, to.pos, " ");
    return quote.trim() ? { from: from.pos, to: to.pos, quote } : null;
}

export const cardArrowAnchor = (rect?: Rect | null): Anchor =>
    rect?.side === "right" ? "left" : "right";
export const cardArrowPoint = (
    rect: Rect,
    points?: Partial<Record<Anchor, Point>>,
) => anchorPoint(rect, cardArrowAnchor(rect), points);
const clamp = (n: number, min: number, max: number) =>
    Math.max(min, Math.min(max, n));

export function targetAtPosition(
    doc: ProseMirrorNode,
    position: number,
    mode: TargetMode = "selection",
    selection: SelectionSnapshot | null = null,
): ConnectorTarget | null {
    if (mode === "essay") return { kind: "essay", quote: "Whole essay" };
    if (
        mode === "selection" &&
        selection &&
        selection.to > selection.from &&
        selection.to <= doc.content.size &&
        doc.textBetween(selection.from, selection.to, " ") === selection.quote
    ) {
        return (
            wordAtRange(documentWords(doc), selection.from, selection.to) ?? {
                kind: "text",
                from: selection.from,
                to: selection.to,
                quote: selection.quote,
            }
        );
    }
    const pos = clamp(position, 0, doc.content.size),
        resolved = doc.resolve(pos);
    if (mode === "selection" || mode === "word")
        return (
            documentWords(doc).find(
                (word) => pos >= word.from && pos < word.to,
            ) ?? null
        );
    if (!resolved.parent.isTextblock) return null;
    const start = resolved.start(),
        text = resolved.parent.textContent;
    if (!text.trim()) return null;
    if (mode === "paragraph")
        return {
            kind: "paragraph",
            from: start,
            to: start + resolved.parent.content.size,
            quote: text,
        };
    const granularity = mode === "sentence" ? "sentence" : "word";
    const parts =
        typeof Intl.Segmenter === "function"
            ? [...new Intl.Segmenter(undefined, { granularity }).segment(text)]
            : [
                  ...text.matchAll(
                      granularity === "word" ? /\S+/g : /[^.!?]+[.!?]*/g,
                  ),
              ].map((m) => ({
                  segment: m[0],
                  index: m.index,
              }));
    const offset = clamp(
        resolved.parentOffset,
        0,
        Math.max(0, text.length - 1),
    );
    const part = parts.find(
        (p) =>
            offset >= p.index &&
            offset < p.index + p.segment.length &&
            /[\p{L}\p{N}]/u.test(p.segment),
    );
    if (!part) return null;
    // Segmenter uses text offsets; translate through inline nodes to ProseMirror positions.
    const positionFor = (offset: number) => {
        let consumed = 0,
            found = start;
        resolved.parent.forEach((node, nodeOffset) => {
            if (consumed <= offset) {
                if (node.isText) {
                    if (offset <= consumed + node.text!.length)
                        found = start + nodeOffset + offset - consumed;
                } else if (offset === consumed) found = start + nodeOffset;
            }
            consumed += node.textContent.length;
        });
        return found;
    };
    const from = positionFor(part.index),
        to = positionFor(part.index + part.segment.trimEnd().length);
    return to > from
        ? { kind: "text", from, to, quote: doc.textBetween(from, to, " ") }
        : null;
}

export function remapConnectors(
    cards: Card[],
    mapping: Mapping,
    doc: ProseMirrorNode,
): Card[] {
    const words = documentWords(doc);
    return cards.map((card) => {
        if (!card.connectors?.length) return card;
        return {
            ...card,
            connectors: card.connectors.map((link) => {
                const t = link.target;
                if (!t || t.kind === "essay" || t.orphaned) return link;
                const from = mapping.mapResult(t.from!, 1),
                    to = mapping.mapResult(t.to!, -1);
                if (
                    from.pos >= to.pos ||
                    (from.deletedAcross && to.deletedAcross) ||
                    to.pos > doc.content.size
                )
                    return { ...link, target: { ...t, orphaned: true } };
                if (t.kind === "word") {
                    const word = words.find(
                        (word) => word.from < to.pos && word.to > from.pos,
                    );
                    return {
                        ...link,
                        target: word
                            ? { ...t, ...word, orphaned: false }
                            : { ...t, orphaned: true },
                    };
                }
                const quote = doc.textBetween(from.pos, to.pos, " ");
                return {
                    ...link,
                    target: {
                        ...t,
                        from: from.pos,
                        to: to.pos,
                        quote,
                        orphaned: !quote.trim(),
                    },
                };
            }),
        };
    });
}

export function anchorPoint(
    rect: Rect,
    anchor: Anchor,
    points?: Partial<Record<Anchor, Point>>,
): XY {
    const point = points?.[anchor];
    if (point)
        return {
            x: rect.x + rect.width * point[0],
            y: rect.y + rect.height * point[1],
        };
    return anchor === "left"
        ? { x: rect.x, y: rect.y + rect.height / 2 }
        : anchor === "right"
          ? { x: rect.x + rect.width, y: rect.y + rect.height / 2 }
          : anchor === "top"
            ? { x: rect.x + rect.width / 2, y: rect.y }
            : { x: rect.x + rect.width / 2, y: rect.y + rect.height };
}

export function connectorPath(start: XY, end: XY, anchor: Anchor) {
    const bend = Math.max(28, Math.min(100, Math.abs(end.x - start.x) * 0.45));
    const control =
        anchor === "left"
            ? { x: start.x - bend, y: start.y }
            : anchor === "right"
              ? { x: start.x + bend, y: start.y }
              : anchor === "top"
                ? { x: start.x, y: start.y - bend }
                : { x: start.x, y: start.y + bend };
    const arrival = { x: end.x + (end.x > start.x ? -20 : 20), y: end.y };
    return `M ${start.x} ${start.y} C ${control.x} ${control.y}, ${arrival.x} ${arrival.y}, ${end.x} ${end.y}`;
}
