import type { Node as ProseMirrorNode } from "@tiptap/pm/model";

type WordTarget = {
    kind: "word";
    from: number;
    to: number;
    quote: string;
};
type WordLine = {
    x1: number;
    x2: number;
    y: number;
    point: { x: number; y: number };
};
type RectLike = Pick<
    DOMRect,
    "left" | "right" | "top" | "bottom" | "width" | "height"
>;
type WorkspaceLike = Pick<
    HTMLElement,
    | "offsetWidth"
    | "offsetHeight"
    | "scrollLeft"
    | "scrollTop"
    | "getBoundingClientRect"
>;

// Logical word ranges remain in document coordinates, never screen coordinates.
const segmenter =
    typeof Intl.Segmenter === "function"
        ? new Intl.Segmenter(undefined, { granularity: "word" })
        : null;

export function documentWords(doc: ProseMirrorNode) {
    const words: WordTarget[] = [];
    doc.descendants((block, pos) => {
        if (!block.isTextblock) return;
        let text = "";
        const positions: number[] = [];
        block.forEach((node, offset) => {
            if (node.isText) {
                for (let i = 0; i < node.text!.length; i++) {
                    text += node.text![i];
                    positions.push(pos + 1 + offset + i);
                }
            } else {
                text += "￼";
                positions.push(pos + 1 + offset);
            }
        });
        const segments = segmenter
            ? [...segmenter.segment(text)].filter((part) => part.isWordLike)
            : [
                  ...text.matchAll(
                      /[\p{L}\p{M}\p{N}_]+(?:['’][\p{L}\p{M}\p{N}_]+)*/gu,
                  ),
              ].map((match) => ({
                  index: match.index,
                  segment: match[0],
              }));
        for (const part of segments) {
            const from = positions[part.index]!,
                to = positions[part.index + part.segment.length - 1]! + 1;
            words.push({ kind: "word", from, to, quote: part.segment });
        }
        return false;
    });
    return words;
}

export function wordAtRange(words: WordTarget[], from: number, to: number) {
    return words.find((word) => word.from === from && word.to === to);
}

// A word can span multiple mark nodes. Merge its final rendered line fragments;
// if an exceptionally long word breaks across lines, anchor beneath its final line.
export function wordLineFromRects(
    rects: ArrayLike<RectLike>,
    workspace: WorkspaceLike,
): WordLine | null {
    const visible = Array.from(rects).filter(
        (rect) => rect.width > 0 && rect.height > 0,
    );
    const last = visible.at(-1);
    if (!last) return null;
    const line = visible.filter(
        (rect) => rect.top < last.bottom && rect.bottom > last.top,
    );
    const left = Math.min(...line.map((rect) => rect.left)),
        right = Math.max(...line.map((rect) => rect.right)),
        bottom = Math.max(...line.map((rect) => rect.bottom));
    const bounds = workspace.getBoundingClientRect(),
        scaleX = bounds.width / workspace.offsetWidth || 1,
        scaleY = bounds.height / workspace.offsetHeight || 1;
    const x1 = (left - bounds.left) / scaleX + workspace.scrollLeft,
        x2 = (right - bounds.left) / scaleX + workspace.scrollLeft,
        y = (bottom - bounds.top) / scaleY + workspace.scrollTop;
    return { x1, x2, y, point: { x: (x1 + x2) / 2, y } };
}
