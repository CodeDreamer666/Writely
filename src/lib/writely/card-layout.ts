import type {
    Anchor,
    Point,
} from "./types";
import {
    CARD_FONT,
    CARD_LINE_HEIGHT,
    CARD_MAX_HEIGHT,
    CARD_MAX_WIDTH,
} from "../../config/cards";

type CardContent = {
    left: number;
    top: number;
    width: number;
    height: number;
};
export type CardLayout = {
    path: string;
    width: number;
    height: number;
    anchors: Record<Anchor, Point>;
    scroll: boolean;
    content: CardContent;
};

/**
 * What: The proportions of a card: the width-to-height ratio it aims for as
 * its text grows (ratio), the narrowest text column (minContent), and the
 * smallest card (minWidth, minHeight), in pixels.
 *
 * Used in:
 * - src/lib/writely/card-layout.ts (cardContentWidth, layoutCard)
 *
 * Effect: A larger ratio makes cards wider and flatter; a smaller one makes
 * them narrower and taller. Raising the minimums makes short thoughts sit in
 * bigger cards.
 */
const DESIGN = { ratio: 2.1, minContent: 96, minWidth: 150, minHeight: 60 };

let measureContext: CanvasRenderingContext2D | null = null;
const textWidths = new Map<string, number[]>();
if (typeof document !== "undefined")
    document.fonts?.addEventListener?.("loadingdone", () => textWidths.clear());

// Width of each authored line laid out on a single row, used to choose a column width.
function naturalTextLines(text?: string | null) {
    const source = String(text || "An unfinished thought…");
    const cached = textWidths.get(source);
    if (cached) return cached;
    if (!measureContext && typeof document !== "undefined") {
        measureContext = document.createElement("canvas").getContext("2d");
    }
    if (measureContext) measureContext.font = CARD_FONT;
    const lines = source
        .split("\n")
        .map((line) =>
            measureContext
                ? measureContext.measureText(line).width
                : [...line].length * 7.4,
        );
    if (textWidths.size > 500) textWidths.clear();
    textWidths.set(source, lines);
    return lines;
}

// Choose a text column whose wrapped block keeps the card's preferred aspect ratio.
export function cardContentWidth(
    text: string | null | undefined,
    maxWidth = CARD_MAX_WIDTH,
) {
    const lines = naturalTextLines(text),
        limit = Math.max(
            60,
            Math.min(CARD_MAX_WIDTH, maxWidth || CARD_MAX_WIDTH) - PAD_X * 2,
        );
    const longest = Math.max(...lines),
        area =
            lines.reduce((sum, width) => sum + Math.max(width, 24), 0) *
            CARD_LINE_HEIGHT;
    const ideal = Math.sqrt(area * DESIGN.ratio);
    return Math.floor(
        Math.max(
            Math.min(DESIGN.minContent, limit),
            Math.min(
                limit,
                longest + 6,
                Math.max(ideal, Math.min(longest + 6, DESIGN.minContent * 1.6)),
            ),
        ),
    );
}

/**
 * What: The space, in pixels, between the text and the left and right edges
 * of a card.
 *
 * Used in:
 * - src/lib/writely/card-layout.ts (cardContentWidth, layoutCard)
 *
 * Effect: A larger value gives cards wider side margins.
 */
const PAD_X = 20;
/**
 * What: The space, in pixels, between the text and the top and bottom edges
 * of a card.
 *
 * Used in:
 * - src/lib/writely/card-layout.ts (layoutCard)
 *
 * Effect: A larger value makes cards taller around their text.
 */
const PAD_Y = 16;
/**
 * What: How rounded a card's corners are, in pixels.
 *
 * Used in:
 * - src/lib/writely/card-layout.ts (layoutCard)
 *
 * Effect: A larger value gives softer corners; 0 gives sharp ones.
 */
const RADIUS = 10;

const round = (n: number) => Math.round(n * 100) / 100;
const rectPath = (x: number, y: number, w: number, h: number, r: number) =>
    `M ${round(x + r)} ${round(y)} H ${round(x + w - r)} A ${r} ${r} 0 0 1 ${round(x + w)} ${round(y + r)} V ${round(y + h - r)} A ${r} ${r} 0 0 1 ${round(x + w - r)} ${round(y + h)} H ${round(x + r)} A ${r} ${r} 0 0 1 ${round(x)} ${round(y + h - r)} V ${round(y + r)} A ${r} ${r} 0 0 1 ${round(x + r)} ${round(y)} Z`;
const edgeAnchors: Record<Anchor, Point> = {
    top: [0.5, 0],
    right: [1, 0.5],
    bottom: [0.5, 1],
    left: [0, 0.5],
};

// Fit the card around a text column; past the maximum height the text scrolls instead.
export function layoutCard({
    contentWidth,
    textHeight = 0,
    maxHeight = CARD_MAX_HEIGHT,
}: {
    contentWidth: number;
    textHeight?: number;
    maxHeight?: number;
}): CardLayout {
    const width = Math.max(DESIGN.minWidth, contentWidth + PAD_X * 2);
    const naturalHeight = Math.max(CARD_LINE_HEIGHT, Math.ceil(textHeight));
    const contentHeight = Math.min(
        naturalHeight,
        Math.max(CARD_LINE_HEIGHT * 2, maxHeight - PAD_Y * 2),
    );
    const height = Math.max(DESIGN.minHeight, contentHeight + PAD_Y * 2);
    return {
        path: rectPath(0.5, 0.5, width - 1, height - 1, RADIUS),
        width,
        height,
        anchors: edgeAnchors,
        scroll: contentHeight < naturalHeight - 0.5,
        content: {
            left: (width - contentWidth) / 2,
            top: (height - contentHeight) / 2,
            width: contentWidth,
            height: contentHeight,
        },
    };
}
