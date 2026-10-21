"use client";
import {
    EditorContent,
    useEditor,
} from "@tiptap/react";
import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useRef,
} from "react";
import type { CardLayout } from "~/lib/writely/card-layout";
import { documentExtensions } from "~/lib/writely/editor/document-extensions";
import EditorToolbar from "./editor-toolbar";

type Point = { x: number; y: number };

export default function InlineThoughtText({
    layout,
    text,
    html,
    editing,
    label,
    point,
    onCommit,
    onCancel,
    smartPunctuation,
}: {
    layout: CardLayout;
    text: string;
    html?: string;
    editing: boolean;
    label: string;
    point?: Point | null;
    onCommit: (text: string, html: string) => void;
    onCancel: () => void;
    smartPunctuation: boolean;
}) {
    const column = useRef<HTMLDivElement>(null);
    const toolbar = useRef<HTMLDivElement>(null);
    const active = useRef(false);
    const callbacks = useRef({ onCommit, onCancel });
    callbacks.current = { onCommit, onCancel };
    const editor = useEditor(
        {
            immediatelyRender: false,
            extensions: documentExtensions({
                trailingNode: false,
                smartPunctuation,
            }),
            editable: false,
            editorProps: {
                attributes: {
                    class: "thought-inline-text block [min-height:1.5em] [font:inherit] [color:inherit] whitespace-pre-wrap [overflow-wrap:anywhere] [&[contenteditable='true']]:[box-shadow:none] [&[contenteditable='true']]:cursor-text [&[contenteditable='true']]:select-text [&[contenteditable='true']]:touch-pan-y [&[contenteditable='true']]:[outline:none]! tiptap [font-family:'Source_Serif_4',_serif] [font-size:18px] [line-height:1.7] [min-height:320px] [color:var(--text)] [caret-color:var(--accent)] [outline:none]! [&_p]:[margin:0_0_24px] [&_p]:[transition:opacity_200ms_ease-out] [&_h2]:[font-size:28px] [&_h2]:[margin:32px_0_16px] [&_h2]:[font-weight:600] [&_h3]:[font-size:22px] [&_h3]:[margin:24px_0_12px] [&_ul]:[padding-left:24px] [&_ol]:[padding-left:24px] [&_blockquote]:[border-left-width:1px] [&_blockquote]:[border-left-style:solid] [&_blockquote]:[border-left-color:var(--accent)] [&_blockquote]:[padding-left:24px] [&_blockquote]:[margin:24px_0] [&_blockquote]:[font-style:italic] [&_a]:[color:var(--accent)] [&.tiptap:focus-visible]:[box-shadow:none] [&.tiptap:focus-visible]:[border:0] [&.tiptap:focus-visible]:[outline:none]! [:is(.paper,_.cloud-text)_&_h1]:[margin:32px_0_18px] [:is(.paper,_.cloud-text)_&_h1]:[font:600_34px/1.25_'Source_Serif_4',_serif] [:is(.paper,_.cloud-text)_&_li_>_p]:[margin-bottom:4px] [:is(.paper,_.cloud-text)_&_ul]:[list-style-type:disc] [:is(.paper,_.cloud-text)_&_ol]:[list-style-type:decimal] [:is(.paper,_.cloud-text)_&_ul_ul]:[list-style-type:circle] [:is(.paper,_.cloud-text)_&_hr]:[border-width:1px_0px_0px] [:is(.paper,_.cloud-text)_&_hr]:[border-style:solid_none_none] [:is(.paper,_.cloud-text)_&_hr]:[border-right-color:currentcolor] [:is(.paper,_.cloud-text)_&_hr]:[border-bottom-color:currentcolor] [:is(.paper,_.cloud-text)_&_hr]:[border-left-color:currentcolor] [:is(.paper,_.cloud-text)_&_hr]:[border-image:none] [:is(.paper,_.cloud-text)_&_hr]:[border-top-color:var(--border)] [:is(.paper,_.cloud-text)_&_hr]:[margin:32px_0] [:is(.paper,_.cloud-text)_&_code]:[font:0.85em/1.6_ui-monospace,_monospace] [:is(.paper,_.cloud-text)_&_code]:[background:var(--tint)] [:is(.paper,_.cloud-text)_&_code]:[border-radius:3px] [:is(.paper,_.cloud-text)_&_code]:[padding:1px_4px] [:is(.paper,_.cloud-text)_&_pre]:whitespace-pre-wrap [:is(.paper,_.cloud-text)_&_pre]:[overflow-wrap:anywhere] [:is(.paper,_.cloud-text)_&_pre]:[margin:20px_0] [:is(.paper,_.cloud-text)_&_pre]:[padding:16px] [:is(.paper,_.cloud-text)_&_pre]:[border-radius:6px] [:is(.paper,_.cloud-text)_&_pre]:[background:var(--tint)] [:is(.paper,_.cloud-text)_&_pre]:[font:14px/1.6_ui-monospace,_monospace] [:is(.paper,_.cloud-text)_&_pre_code]:[padding:0] [:is(.paper,_.cloud-text)_&_pre_code]:[background:transparent] [:is(.paper,_.cloud-text)_&_pre_code]:[font:inherit] [:is(.paper,_.cloud-text)_&_ul[data-type='taskList']]:[list-style:none] [:is(.paper,_.cloud-text)_&_ul[data-type='taskList']]:[padding-left:0] [:is(.paper,_.cloud-text)_&_li[data-type='taskItem']]:flex [:is(.paper,_.cloud-text)_&_li[data-type='taskItem']]:items-start [:is(.paper,_.cloud-text)_&_li[data-type='taskItem']]:[gap:10px] [:is(.paper,_.cloud-text)_&_li[data-type='taskItem']_>_label]:[flex:0_0_auto] [:is(.paper,_.cloud-text)_&_li[data-type='taskItem']_>_label]:[padding-top:4px] [:is(.paper,_.cloud-text)_&_li[data-type='taskItem']_>_label]:select-none [:is(.paper,_.cloud-text)_&_li[data-type='taskItem']_input]:[width:15px] [:is(.paper,_.cloud-text)_&_li[data-type='taskItem']_input]:[height:15px] [:is(.paper,_.cloud-text)_&_li[data-type='taskItem']_input]:[min-height:0] [:is(.paper,_.cloud-text)_&_li[data-type='taskItem']_input]:[margin:0] [:is(.paper,_.cloud-text)_&_li[data-type='taskItem']_input]:[accent-color:var(--accent)] [:is(.paper,_.cloud-text)_&_li[data-type='taskItem']_input]:cursor-pointer [:is(.paper,_.cloud-text)_&_li[data-type='taskItem']_>_div]:[flex:1] [:is(.paper,_.cloud-text)_&_li[data-type='taskItem']_>_div]:[min-width:0] [:is(.paper,_.cloud-text)_&_li[data-type='taskItem'][data-checked='true']_>_div_>_p]:[text-decoration:line-through] [:is(.paper,_.cloud-text)_&_li[data-type='taskItem'][data-checked='true']_>_div_>_p]:[color:var(--muted)] [&.tiptap:focus]:[box-shadow:none] [&.tiptap:focus]:[border:0] [&.tiptap:focus]:[outline:none]! [.cloud-text_&]:[min-height:1.5em] [.cloud-text_&]:[font:inherit] [.cloud-text_&]:[color:inherit] [.cloud-text_&_p]:[margin:0] [.cloud-text_&.tiptap_h1]:[margin:8px_0] [.cloud-text_&.tiptap_h1]:[line-height:1.4] [.cloud-text_&.tiptap_h1]:[font-size:20px] [.cloud-text_&_h2]:[margin:8px_0] [.cloud-text_&_h2]:[line-height:1.4] [.cloud-text_&_h2]:[font-size:18px] [.cloud-text_&_h3]:[margin:8px_0] [.cloud-text_&_h3]:[line-height:1.4] [.cloud-text_&_h3]:[font-size:16px] [.cloud-text_&_ul]:[margin:0] [.cloud-text_&_ul]:[padding-left:20px] [.cloud-text_&_ol]:[margin:0] [.cloud-text_&_ol]:[padding-left:20px] [.cloud-text_&_blockquote]:[margin:0] [.cloud-text_&_blockquote]:[padding-left:12px] [.cloud-text_&_blockquote]:[border-color:currentColor]",
                },
            },
        },
        [smartPunctuation],
    );
    const finish = useCallback(
        (cancel = false) => {
            if (!active.current || !editor) return;
            active.current = false;
            if (cancel) callbacks.current.onCancel();
            else
                callbacks.current.onCommit(
                    editor.getText({ blockSeparator: "\n" }),
                    editor.getHTML(),
                );
        },
        [editor],
    );

    useLayoutEffect(() => {
        if (!editor) return;
        active.current = editing;
        // Parse through the editor schema, including legacy cards with plain text only.
        editor
            .chain()
            .setMeta("addToHistory", false)
            .setContent(
                (text || editing ? html : undefined) ?? {
                    type: "doc",
                    content: (text || (editing ? "" : "An unfinished thought…"))
                        .split("\n")
                        .map((line) => ({
                            type: "paragraph",
                            content: line ? [{ type: "text", text: line }] : [],
                        })),
                },
                {
                    emitUpdate: false,
                    parseOptions: { preserveWhitespace: "full" },
                },
            )
            .run();
        editor.setEditable(editing);
        editor.view.dom.setAttribute("aria-label", label);
        if (editing) {
            editor.view.dom.setAttribute("role", "textbox");
            editor.view.dom.setAttribute("aria-multiline", "true");
        } else {
            editor.view.dom.removeAttribute("role");
            editor.view.dom.removeAttribute("aria-multiline");
        }
        if (!editing) return;
        const scroll = column.current!.scrollTop;
        editor.commands.focus("end", { scrollIntoView: false });
        if (point) {
            const hit = editor.view.posAtCoords({
                left: point.x,
                top: point.y,
            });
            if (hit) editor.commands.setTextSelection(hit.pos);
        }
        column.current!.scrollTop = scroll;
        // A session initializes once; typing and formatting stay in the editor until commit.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editor, editing, text, html]);

    useEffect(() => {
        if (!editing) return;
        const outside = (event: PointerEvent) => {
            const target = event.target as Node;
            const card = column.current?.closest("[data-card-id]");
            if (!card?.contains(target) && !toolbar.current?.contains(target))
                finish();
        };
        document.addEventListener("pointerdown", outside, true);
        return () => document.removeEventListener("pointerdown", outside, true);
    }, [editing, finish]);

    const { left, top, width, height } = layout.content;
    // Text starts beside the corner buttons, so the first lines wrap around them.
    const room = top < 34 ? Math.max(0, left + width - (layout.width - 70)) : 0;
    return (
        <>
            <div
                ref={column}
                className={
                    "cloud-text pointer-events-auto touch-pan-y [overflow-wrap:anywhere] whitespace-pre-wrap [&:not([data-scroll])]:touch-none [&[data-scroll]]:pointer-events-auto [&[data-scroll]]:[scrollbar-width:none] [&[data-scroll]]:overflow-y-auto [&[data-scroll]]:[overscroll-behavior:contain] [&[data-scroll]::-webkit-scrollbar]:hidden [.is-connecting_&]:cursor-pointer"
                }
                data-scroll={layout.scroll || editing || undefined}
                style={{
                    position: "absolute",
                    left,
                    top,
                    width,
                    height: layout.scroll || editing ? height : undefined,
                }}
            >
                {room > 0 && (
                    <span
                        className={
                            "cloud-text-controls-room [float:right] block"
                        }
                        style={{ width: room, height: 34 - top }}
                        aria-hidden="true"
                    />
                )}
                <EditorContent
                    editor={editor}
                    onBlur={(event) => {
                        if (!toolbar.current?.contains(event.relatedTarget))
                            finish();
                    }}
                    onPointerDown={(event) => {
                        if (editing) event.stopPropagation();
                    }}
                    onKeyDown={(event) => {
                        if (
                            editing &&
                            event.key === "Escape" &&
                            !event.nativeEvent.isComposing
                        ) {
                            event.stopPropagation();
                            event.preventDefault();
                            finish(true);
                        }
                    }}
                />
            </div>
            {editor && editing && (
                <EditorToolbar
                    editor={editor}
                    label={`${label} formatting`}
                    containerRef={toolbar}
                    onBlurOutside={finish}
                />
            )}
        </>
    );
}
