"use client";
import {
    EditorContent,
    useEditor,
} from "@tiptap/react";
import {
    Pencil,
    Plus,
    StickyNote,
    Trash2,
    Unlink,
    X,
} from "lucide-react";
import { useEffect } from "react";
import type { Card } from "~/lib/writely/types";
import { documentExtensions } from "~/lib/writely/editor/document-extensions";
import { PRIMARY_BUTTON } from "~/config/ui";
import { EmptyState } from "../empty-state";
import { Button } from "../ui";
import { Drawer } from "./dock";

function CardEditor({
    card,
    onPatch,
    smartPunctuation,
}: {
    card: Card;
    onPatch: (id: string, patch: Partial<Card>) => void;
    smartPunctuation: boolean;
}) {
    const editor = useEditor(
        {
            immediatelyRender: false,
            extensions: documentExtensions({
                trailingNode: false,
                smartPunctuation,
            }),
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
                    class: "compact-card-editor min-h-32 rounded-xl border border-line bg-paper p-4 font-serif text-[17px] leading-relaxed outline-none focus:border-[var(--control-focus)] [overflow-wrap:anywhere]",
                },
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
    return <EditorContent editor={editor} />;
}

/** Compact screens keep cards in a sheet; only their text highlights belong on the page. */
export function CompactCards({
    open,
    onClose,
    cards,
    editing,
    onEdit,
    onPatch,
    onDelete,
    onAdd,
    onReveal,
    connecting,
    onAttach,
    onCancelConnection,
    smartPunctuation,
}: {
    open: boolean;
    onClose: () => void;
    cards: Card[];
    editing: string | null;
    onEdit: (id: string | null) => void;
    onPatch: (id: string, patch: Partial<Card>) => void;
    onDelete: (id: string) => void;
    onAdd: () => void;
    onReveal: (card: Card) => void;
    connecting: boolean;
    onAttach: (card: Card) => void;
    onCancelConnection: () => void;
    smartPunctuation: boolean;
}) {
    const current = cards.find((card) => card.id === editing);
    return (
        <>
            <Drawer
                open={open}
                title={
                    current
                        ? "Edit card"
                        : connecting
                          ? "Attach to a card"
                          : "Cards"
                }
                onClose={onClose}
                id="compact-cards"
            >
                {connecting && (
                    <div className="text-muted mb-4 flex items-center gap-2 text-sm">
                        <span className="flex-1">
                            Choose a card or create one for the selected words.
                        </span>
                        <Button
                            icon={X}
                            label="Cancel attachment"
                            onClick={onCancelConnection}
                        />
                    </div>
                )}
                {current ? (
                    <div className="space-y-4">
                        <CardEditor
                            key={current.id}
                            card={current}
                            onPatch={onPatch}
                            smartPunctuation={smartPunctuation}
                        />
                        <p className="text-muted text-xs">
                            Changes save automatically.
                        </p>
                        <button
                            className={`${PRIMARY_BUTTON} w-full!`}
                            onClick={() => onEdit(null)}
                        >
                            Done
                        </button>
                    </div>
                ) : (
                    <>
                        <button
                            data-autofocus
                            className={`${PRIMARY_BUTTON} w-full! gap-2! text-[13px]! font-medium`}
                            onClick={onAdd}
                        >
                            <Plus size={16} aria-hidden="true" />
                            New card
                        </button>
                        {!cards.length && (
                            <EmptyState
                                compact
                                inlineHeader
                                className="mt-5"
                                icon={StickyNote}
                                title="No cards yet"
                                body="Keep a thought here. Select words in your document and choose “Connect to thought” to attach it."
                            />
                        )}
                        <ul className="m-0 mt-4 grid list-none gap-3 p-0 empty:hidden">
                            {cards.map((card, index) => {
                                const target = card.connectors?.[0]?.target;
                                return (
                                    <li
                                        key={card.id}
                                        className="border-line overflow-hidden rounded-xl border"
                                        style={{
                                            borderLeft: `4px solid ${card.bg}`,
                                        }}
                                    >
                                        <button
                                            className="h-auto! w-full! flex-col! items-start! gap-2! rounded-none! p-4! text-left! whitespace-normal!"
                                            onClick={() =>
                                                connecting
                                                    ? onAttach(card)
                                                    : target && !target.orphaned
                                                      ? onReveal(card)
                                                      : onEdit(card.id)
                                            }
                                        >
                                            <span className="font-serif text-[17px] leading-relaxed [overflow-wrap:anywhere]">
                                                {card.text ||
                                                    "An unfinished thought…"}
                                            </span>
                                            <span className="text-muted text-xs leading-relaxed [overflow-wrap:anywhere]">
                                                {target
                                                    ? target.orphaned
                                                        ? "Linked text was removed. Select words to reconnect."
                                                        : target.kind ===
                                                            "essay"
                                                          ? "Whole document"
                                                          : `“${target.quote}”`
                                                    : "Not attached to text"}
                                            </span>
                                            <span className="text-accent text-xs">
                                                {connecting
                                                    ? "Attach selected text"
                                                    : target && !target.orphaned
                                                      ? "Show highlighted text"
                                                      : "View card"}
                                            </span>
                                        </button>
                                        <div className="border-line flex justify-end border-t px-2 py-1">
                                            <Button
                                                icon={Pencil}
                                                label={`Edit card ${index + 1}`}
                                                onClick={() => onEdit(card.id)}
                                            />
                                            {target && (
                                                <Button
                                                    icon={Unlink}
                                                    label={`Detach card ${index + 1}`}
                                                    onClick={() =>
                                                        onPatch(card.id, {
                                                            connectors: [],
                                                        })
                                                    }
                                                />
                                            )}
                                            <Button
                                                icon={Trash2}
                                                label={`Delete card ${index + 1}`}
                                                onClick={() =>
                                                    onDelete(card.id)
                                                }
                                            />
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </>
                )}
            </Drawer>
        </>
    );
}
