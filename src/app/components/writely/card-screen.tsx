"use client";
import {
    EditorContent,
    useEditor,
} from "@tiptap/react";
import { Placeholder } from "@tiptap/extensions";
import { ArrowLeft } from "lucide-react";
import {
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
} from "react";
import { createPortal } from "react-dom";
import type { Card } from "~/lib/writely/types";
import { documentExtensions } from "~/lib/writely/editor/document-extensions";

/**
 * iOS only opens the keyboard for focus given during a tap. The editor mounts a moment after the
 * tap, so the tap focuses this hidden field first; focus then moves to the editor and the keyboard
 * stays up. Call it from the click that opens the card editor.
 */
export function primeKeyboard() {
    let field = document.getElementById("card-keyboard-primer");
    if (!field) {
        field = document.createElement("textarea");
        field.id = "card-keyboard-primer";
        field.setAttribute("aria-hidden", "true");
        field.tabIndex = -1;
        // 16px stops iOS zooming in; off-screen and transparent so it's never seen.
        field.style.cssText =
            "position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;font-size:16px;border:0;padding:0;pointer-events:none";
        document.body.append(field);
    }
    field.focus({ preventScroll: true });
}

/** Whether the current history entry is the one the card editor added. */
const inEditorStep = () =>
    !!(window.history.state as { cardEditor?: boolean } | null)?.cardEditor;

/**
 * Keeps an element exactly over the visible part of the page: above the keyboard, and following
 * iOS Safari when it pans the page under an open keyboard. Falls back to the full window.
 */
function useVisibleViewport() {
    const [box, setBox] = useState<{ top: number; height: number } | null>(
        null,
    );
    useLayoutEffect(() => {
        const viewport = window.visualViewport;
        const sync = () =>
            setBox(
                viewport
                    ? { top: viewport.offsetTop, height: viewport.height }
                    : { top: 0, height: window.innerHeight },
            );
        sync();
        viewport?.addEventListener("resize", sync);
        viewport?.addEventListener("scroll", sync);
        window.addEventListener("resize", sync);
        return () => {
            viewport?.removeEventListener("resize", sync);
            viewport?.removeEventListener("scroll", sync);
            window.removeEventListener("resize", sync);
        };
    }, []);
    return box;
}

/**
 * The phone card editor: a full screen of its own with a back arrow, the title and Done, and the
 * rest given to the text. Every keystroke saves, as on the page; Back, Done, Escape and the browser's
 * back button all close it and return to the document where it was.
 */
export function CardScreen({
    card,
    onPatch,
    onClose,
    smartPunctuation,
}: {
    card: Card;
    onPatch: (id: string, patch: Partial<Card>) => void;
    onClose: () => void;
    smartPunctuation: boolean;
}) {
    // A card that starts empty is being written for the first time.
    const [fresh] = useState(() => !card.text.trim());
    const box = useVisibleViewport();
    const scroller = useRef<HTMLDivElement>(null);
    const editor = useEditor(
        {
            immediatelyRender: false,
            extensions: [
                ...documentExtensions({
                    trailingNode: false,
                    smartPunctuation,
                }),
                Placeholder.configure({ placeholder: "Write your thought…" }),
            ],
            content: card.html ?? {
                type: "doc",
                content: [
                    {
                        type: "paragraph",
                        content: card.text
                            ? [{ type: "text", text: card.text }]
                            : [],
                    },
                ],
            },
            editorProps: {
                attributes: {
                    role: "textbox",
                    "aria-label": "Card text",
                    "aria-multiline": "true",
                    class: "card-screen-text min-h-full px-5 pt-3 pb-[max(24px,env(safe-area-inset-bottom))] font-serif text-[18px] leading-[1.6] outline-none [overflow-wrap:anywhere]",
                },
                // Keep the caret clear of the edges while typing near them.
                scrollMargin: 32,
                scrollThreshold: 32,
            },
            onUpdate: ({ editor }) =>
                onPatch(card.id, {
                    text: editor.getText(),
                    html: editor.getHTML(),
                }),
        },
        [card.id, smartPunctuation],
    );
    useEffect(() => {
        editor?.commands.focus("end");
    }, [editor]);
    // When the keyboard opens or closes the space changes; bring the caret back into view.
    useEffect(() => {
        if (editor?.isFocused) editor.commands.scrollIntoView();
    }, [box?.height, editor]);

    // The editor takes one step in the browser's history, so the back button (or gesture) closes it
    // instead of leaving the document. Done and the arrow step back through that same entry.
    const close = useRef(onClose);
    close.current = onClose;
    useEffect(() => {
        const scrollY = window.scrollY;
        // Mounting twice in development must not add two steps.
        if (!inEditorStep())
            window.history.pushState(
                {
                    ...(window.history.state as object | null),
                    cardEditor: true,
                },
                "",
            );
        const back = () => {
            if (!inEditorStep()) close.current();
        };
        window.addEventListener("popstate", back);
        return () => {
            window.removeEventListener("popstate", back);
            // Focusing the editor can scroll the page on iOS; put it back.
            window.scrollTo(0, scrollY);
        };
    }, []);

    const done = () => {
        editor?.commands.blur();
        if (inEditorStep()) window.history.back();
        else onClose();
    };

    return createPortal(
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="card-screen-title"
            className="card-screen bg-paper text-ink fixed inset-x-0 top-0 z-[60] flex flex-col overscroll-none"
            style={{
                top: box?.top ?? 0,
                height: box ? box.height : "100dvh",
            }}
            onKeyDown={(e) => {
                if (e.key === "Escape") {
                    e.stopPropagation();
                    done();
                }
            }}
        >
            <header className="border-line grid h-[52px] shrink-0 grid-cols-[48px_minmax(0,1fr)_auto] items-center border-b px-2 pr-[max(8px,env(safe-area-inset-right))] pl-[max(8px,env(safe-area-inset-left))]">
                <button
                    aria-label="Back to the document"
                    onClick={done}
                    className="text-muted! hover:text-ink! size-11! min-h-11! min-w-11! rounded-lg! border-0! bg-transparent! p-0!"
                >
                    <ArrowLeft size={20} strokeWidth={1.6} aria-hidden="true" />
                </button>
                <h2
                    id="card-screen-title"
                    className="m-0 flex min-w-0 items-center justify-center gap-2 text-[15px] font-semibold"
                >
                    <span
                        aria-hidden="true"
                        className="border-line size-2.5 shrink-0 rounded-full border"
                        style={{ background: card.bg }}
                    />
                    <span className="truncate">
                        {fresh ? "New card" : "Edit card"}
                    </span>
                </h2>
                <button
                    onClick={done}
                    className="text-accent! h-11! min-h-11! rounded-lg! border-0! bg-transparent! px-3! text-[15px]! font-semibold!"
                >
                    Done
                </button>
            </header>
            <div
                ref={scroller}
                className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)] [-webkit-overflow-scrolling:touch] [&_.ProseMirror]:min-h-full [&>div]:h-full"
                onClick={(e) => {
                    // A tap on the empty space below the text puts the caret at the end.
                    if (e.target === scroller.current)
                        editor?.commands.focus("end");
                }}
            >
                <EditorContent editor={editor} />
            </div>
        </div>,
        document.body,
    );
}
