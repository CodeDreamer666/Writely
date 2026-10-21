import { Extension } from "@tiptap/core";
import type { Node } from "@tiptap/pm/model";
import { Plugin } from "@tiptap/pm/state";
import {
    Decoration,
    DecorationSet,
} from "@tiptap/pm/view";

/** The top-level blocks, as [start, end) positions, that hold the caret or any part of the selection. */
export function activeBlockRanges(doc: Node, from: number, to: number) {
    const ranges: [number, number][] = [];
    doc.forEach((node, start) => {
        const end = start + node.nodeSize;
        const active =
            from === to
                ? from >= start && from < end
                : start < to && end > from;
        if (active) ranges.push([start, end]);
    });
    return ranges;
}

/**
 * Marks the top-level blocks holding the caret or selection with .has-focus while the editor is
 * focused, which paragraph highlighting keeps bright. A decoration only: nothing is saved.
 */
export const ActiveBlocks = Extension.create({
    name: "activeBlocks",
    addProseMirrorPlugins() {
        return [
            new Plugin({
                props: {
                    decorations: ({ doc, selection }) => {
                        if (!this.editor.isEditable || !this.editor.isFocused)
                            return DecorationSet.empty;
                        return DecorationSet.create(
                            doc,
                            activeBlockRanges(
                                doc,
                                selection.from,
                                selection.to,
                            ).map(([start, end]) =>
                                Decoration.node(start, end, {
                                    class: "has-focus",
                                }),
                            ),
                        );
                    },
                },
            }),
        ];
    },
});
