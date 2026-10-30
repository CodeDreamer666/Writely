"use client";
import {
    Palette,
    Pencil,
    Plus,
    StickyNote,
    Trash2,
    Unlink,
    X,
} from "lucide-react";
import { useState } from "react";
import type { Card } from "~/lib/writely/types";
import { PRIMARY_BUTTON } from "~/config/ui";
import { EmptyState } from "../empty-state";
import { Button } from "../ui";
import {
    CardScreen,
    primeKeyboard,
} from "./card-screen";
import { Drawer } from "./dock";
import { CardColourPopover } from "./card-colours";

/**
 * Compact screens keep cards in a sheet for reading them; only their text highlights belong on
 * the page. Writing or editing a card opens a full screen of its own (CardScreen), which closes back
 * to the document.
 */
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
    const [colouring, setColouring] = useState<{
        id: string;
        anchor: HTMLElement;
    } | null>(null);
    return (
        <>
            <Drawer
                open={open && !current}
                title={connecting ? "Attach to a card" : "Cards"}
                onClose={onClose}
                id="compact-cards"
                className="max-lg:w-full max-lg:max-w-[640px]"
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
                {!current && (
                    <>
                        <button
                            data-autofocus
                            className={`${PRIMARY_BUTTON} w-full! gap-2! text-[13px]! font-medium`}
                            onClick={() => {
                                primeKeyboard();
                                onAdd();
                            }}
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
                                                      : (primeKeyboard(),
                                                        onEdit(card.id))
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
                                                      : "Edit card"}
                                            </span>
                                        </button>
                                        <div className="border-line flex justify-end border-t px-2 py-1">
                                            <Button
                                                icon={Palette}
                                                label={`Change colour of card ${index + 1}`}
                                                aria-haspopup="dialog"
                                                aria-expanded={
                                                    colouring?.id === card.id
                                                }
                                                onClick={(event) =>
                                                    setColouring({
                                                        id: card.id,
                                                        anchor: event.currentTarget,
                                                    })
                                                }
                                            />
                                            {colouring?.id === card.id && (
                                                <CardColourPopover
                                                    anchor={colouring.anchor}
                                                    label={`Colour of card ${index + 1}`}
                                                    value={card.bg}
                                                    onChange={(bg, fg) =>
                                                        onPatch(card.id, {
                                                            bg,
                                                            fg,
                                                        })
                                                    }
                                                    onClose={() =>
                                                        setColouring(null)
                                                    }
                                                />
                                            )}
                                            <Button
                                                icon={Pencil}
                                                label={`Edit card ${index + 1}`}
                                                onClick={() => {
                                                    primeKeyboard();
                                                    onEdit(card.id);
                                                }}
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
            {current && (
                <CardScreen
                    key={current.id}
                    card={current}
                    onPatch={onPatch}
                    onClose={onClose}
                    smartPunctuation={smartPunctuation}
                />
            )}
        </>
    );
}
