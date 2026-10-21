import { CARD_COLOUR_PRESETS } from "../../config/cards";
import type {
    Card,
    WorkspaceData,
} from "./types";

/**
 * What: The order new thought cards take colours in, as positions in
 * CARD_COLOUR_PRESETS: yellow, blue, green, pink. Presets not listed follow
 * in their own order.
 *
 * Used in:
 * - src/lib/writely/thought-cards.ts (THOUGHT_COLOURS)
 *
 * Effect: Changing the order changes which colour each new card gets.
 */
const COLOUR_ORDER = [0, 2, 1, 3];
const THOUGHT_COLOURS = [
    ...COLOUR_ORDER,
    ...CARD_COLOUR_PRESETS.map((_, i) => i).filter(
        (i) => !COLOUR_ORDER.includes(i),
    ),
]
    .filter((i) => i < CARD_COLOUR_PRESETS.length)
    .map((i) => CARD_COLOUR_PRESETS[i]!);

export function addThought(
    data: WorkspaceData,
    id: string,
    y: number,
): WorkspaceData {
    const index = data.nextThoughtColour ?? 0;
    const [, bg, fg] = THOUGHT_COLOURS[index % THOUGHT_COLOURS.length]!;
    return {
        ...data,
        nextThoughtColour: (index + 1) % THOUGHT_COLOURS.length,
        docs: data.docs.map((doc) => {
            if (doc.id !== data.active) return doc;
            const card: Card = {
                id,
                text: "",
                placement: "margin",
                side: doc.cards.length % 2 ? "right" : "left",
                y,
                opacity: 1,
                bg,
                fg,
                connectors: [],
            };
            return {
                ...doc,
                cards: [...doc.cards, card],
                hidden: false,
                updated: Date.now(),
            };
        }),
    };
}
