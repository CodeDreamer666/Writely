import { Extension } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";
import {
    Decoration,
    DecorationSet,
} from "@tiptap/pm/view";
import { EMPTY_DRAFT_PLACEHOLDER } from "../../../config/editor";

/** A decoration only: the prompt never becomes manuscript content or saved HTML. */
export const EmptyDraftPlaceholder = Extension.create({
    name: "emptyDraftPlaceholder",
    addProseMirrorPlugins() {
        return [
            new Plugin({
                props: {
                    decorations({ doc }) {
                        if (doc.textContent.length) return DecorationSet.empty;
                        let first: Decoration | null = null;
                        doc.descendants((node, pos) => {
                            if (first) return false;
                            if (node.isTextblock) {
                                first = Decoration.node(
                                    pos,
                                    pos + node.nodeSize,
                                    {
                                        class: "empty-draft-line [.tiptap_&::before]:[content:attr(data-placeholder)] [.tiptap_&::before]:[float:left] [.tiptap_&::before]:[height:0] [.tiptap_&::before]:[width:100%] [.tiptap_&::before]:pointer-events-none [.tiptap_&::before]:[color:color-mix(in_srgb,_var(--muted)_72%,_var(--bg))] [.tiptap_&::before]:[font-family:inherit] [.tiptap_&::before]:[font-size:inherit] [.tiptap_&::before]:[line-height:inherit] [.tiptap_&::before]:[font-weight:inherit] [.tiptap_&::before]:[font-style:inherit]",
                                        "data-placeholder":
                                            EMPTY_DRAFT_PLACEHOLDER,
                                    },
                                );
                                return false;
                            }
                            return true;
                        });
                        return first
                            ? DecorationSet.create(doc, [first])
                            : DecorationSet.empty;
                    },
                },
            }),
        ];
    },
});
