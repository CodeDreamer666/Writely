/**
 * Thought cards: the notes that sit beside the manuscript, and the lines that connect them to
 * the text. Change sizes here to make every card larger or smaller at once.
 */

/**
 * What: The font a card's text is measured in, written as a CSS font
 * shorthand (size, then family).
 *
 * Used in:
 * - src/lib/writely/card-layout.ts (naturalTextLines)
 *
 * Effect: Card sizes are worked out by measuring text in this font, so it
 * must match the font cards are drawn with. If the two differ, cards come
 * out too wide or too narrow for their text.
 */
export const CARD_FONT = "15px 'Source Serif 4', Georgia, serif";

/**
 * What: The height of one line of card text, in pixels.
 *
 * Used in:
 * - src/lib/writely/card-layout.ts (cardContentWidth, layoutCard)
 *
 * Effect: A larger value makes cards taller for the same text and makes
 * the smallest card taller. It should match the line height cards are
 * drawn with, or text will overflow or leave empty space.
 */
export const CARD_LINE_HEIGHT = 22.5;

/**
 * What: The widest an open card can grow, in pixels.
 *
 * Used in:
 * - src/lib/writely/card-layout.ts (cardContentWidth, layoutCard)
 * - src/app/components/writely/annotations.tsx (Annotations)
 * - tests/unit/card-layout.test.ts, tests/e2e/free-cards.spec.js
 *
 * Effect: Raising it lets long thoughts spread wider before wrapping.
 * Lowering it keeps cards narrow, so long thoughts wrap onto more lines.
 */
export const CARD_MAX_WIDTH = 340;

/**
 * What: The tallest an open card can grow, in pixels. Longer thoughts
 * scroll inside the card instead.
 *
 * Used in:
 * - src/lib/writely/card-layout.ts (layoutCard)
 * - tests/unit/card-layout.test.ts, tests/e2e/free-cards.spec.js
 *
 * Effect: Raising it shows more of a long thought before it scrolls.
 * Lowering it keeps cards short and makes scrolling start sooner.
 */
export const CARD_MAX_HEIGHT = 300;

/**
 * What: The narrowest side margin, in pixels, that cards will sit in
 * beside the page.
 *
 * Used in:
 * - src/app/components/writely/annotations.tsx (Annotations)
 *
 * Effect: When the margins beside the page are narrower than this (on a
 * small window), cards move below the manuscript instead. Raising it moves
 * them below on wider windows too; lowering it squeezes them into thinner
 * margins.
 */
export const CARD_MIN_ROOM = 150;

/**
 * What: The colours a card can have: a name, a background colour and a
 * text colour.
 *
 * Used in:
 * - src/lib/writely/model.ts (initial, for the sample workspace's cards)
 * - src/lib/writely/thought-cards.ts (addThought)
 *
 * Effect: Changing a colour changes every new card that uses it. New
 * thoughts take these colours in turn, so adding or removing an entry
 * changes the rotation. Existing cards keep the colours they were saved with.
 */
export const CARD_COLOUR_PRESETS: [name: string, bg: string, fg: string][] = [
    ["Butter Yellow", "#FCEFB5", "#1F1D1A"],
    ["Sage Green", "#DDEBDD", "#1F1D1A"],
    ["Powder Blue", "#DBE8F4", "#1F1D1A"],
    ["Soft Blush", "#F4DED8", "#1F1D1A"],
];

/**
 * What: The gap, in pixels, between a word and the end of the line that
 * connects it to a card.
 *
 * Used in:
 * - src/lib/writely/text-connection-point.ts (textConnectionPoint)
 *
 * Effect: A larger value makes connector lines stop further below the
 * word. A smaller one makes them touch the text.
 */
export const TEXT_ANCHOR_GAP = 3.5;
