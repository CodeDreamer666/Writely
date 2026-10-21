import type {
    Rect,
    XY,
} from "./annotation-model";
import type {
    Card,
    Side,
} from "./types";

/** Measured workspace geometry, in workspace coordinates. */
export type Geometry = {
    width: number;
    paperLeft: number;
    paperRight: number;
    paperBottom: number;
    viewportHeight: number;
    scrollTop: number;
};
type Zone = { side: Side; min: number; max: number };

/**
 * What: The SVG outline of a folded (collapsed) thought card: the small leaf
 * shape left in the margin when a card is closed.
 *
 * Used in:
 * - src/app/components/writely/annotations.tsx (Annotations)
 *
 * Effect: Changes the shape of every folded card. The outline is drawn in a
 * 44 × 48 box, so points outside it are cut off.
 */
export const FOLDED_THOUGHT_PATH =
    "M 8 41 C 4 29 9 12 23 7 Q 31 3 38 6 Q 42 19 33 29 Q 23 39 8 41 Z";
export const cardAccentVariant = (id: string) =>
    Array.from(String(id)).reduce(
        (sum, char) => sum + char.codePointAt(0)!,
        0,
    ) % 3;

export function collapsedCardRect(
    rect: Rect,
    geometry: Geometry,
    target?: XY | null,
): Rect {
    const width = 44,
        height = 48,
        leftRoom = geometry.paperLeft >= width + 16,
        rightRoom = geometry.width - geometry.paperRight - 12 >= width + 16;
    const preferLeft = rect.side
        ? rect.side === "left"
        : rect.x < geometry.paperLeft;
    const x =
        leftRoom && (preferLeft || !rightRoom)
            ? geometry.paperLeft - width - 12
            : rightRoom
              ? geometry.paperRight + 12
              : Math.max(8, (geometry.width - width) / 2);
    const y =
        leftRoom || rightRoom
            ? Math.max(8, (target?.y ?? rect.y) - height / 2)
            : geometry.paperBottom + 40;
    return { x, y, width, height };
}

export function cardZones(g: Geometry): Zone[] {
    const space = Math.max(
        0,
        Math.min(g.paperLeft - 28, g.width - g.paperRight - 28),
    );
    return [
        { side: "left", min: g.paperLeft - 16 - space, max: g.paperLeft - 16 },
        {
            side: "right",
            min: g.paperRight + 16,
            max: g.paperRight + 16 + space,
        },
    ];
}
export function constrainSideCard(
    rect: Rect,
    g: Geometry,
    side?: Side,
): Rect | null {
    const zones = cardZones(g).filter(
        (zone) => zone.max - zone.min >= rect.width,
    );
    const zone =
        zones.find(
            (zone) => rect.x >= zone.min && rect.x + rect.width <= zone.max,
        ) ??
        zones.find((zone) => zone.side === side) ??
        zones[0];
    if (!zone) return null;
    return {
        ...rect,
        x: Math.max(zone.min, Math.min(zone.max - rect.width, rect.x)),
        y: Math.max(8, rect.y),
        side: zone.side,
    };
}
// Expanded cards may be placed anywhere in the workspace, including over the
// document; only the folded leaf is held to the margins.
const paperCenter = (g: Geometry) => (g.paperLeft + g.paperRight) / 2;
export const cardSide = (rect: Rect, g: Geometry): Side =>
    rect.x + rect.width / 2 < paperCenter(g) ? "left" : "right";
export const cardMaxWidth = (g: Geometry) =>
    Math.max(0, ...cardZones(g).map((zone) => zone.max - zone.min));
export function constrainFreeCard(rect: Rect, g: Geometry): Rect {
    const x = Math.max(
            8,
            Math.min(Math.max(8, g.width - rect.width - 8), rect.x),
        ),
        next = { ...rect, x, y: Math.max(8, rect.y) };
    return { ...next, side: cardSide(next, g) };
}
// Stored relative to the page's centre so a card stays beside the same words when the window resizes.
export const expandedPosition = (rect: Rect, g: Geometry): Partial<Card> => ({
    placement: "free",
    side: rect.side,
    offset: rect.x - paperCenter(g),
    x: rect.x / Math.max(1, g.width - rect.width),
    y: rect.y,
});
export function placeSideCards(
    cards: Card[],
    g: Geometry,
    sizes: Record<string, { width: number; height: number }> = {},
    minWidth = 0,
) {
    const result: Record<string, Rect> = {},
        zones = cardZones(g);
    if (cardMaxWidth(g) < minWidth) {
        // With no side margins, keep thoughts reachable below the manuscript.
        let y = Math.max(8, g.paperBottom + 40);
        for (const card of cards) {
            const size = sizes[card.id] ?? { width: 200, height: 112 };
            result[card.id] = {
                ...size,
                x: Math.max(8, (g.width - size.width) / 2),
                y,
                side: card.side ?? "left",
            };
            y += (card.collapsed ? 48 : size.height) + 48;
        }
        return result;
    }
    cards.forEach((card, i) => {
        const size = sizes[card.id] ?? { width: 200, height: 112 },
            side: Side =
                card.side ??
                (card.x! > 0.5
                    ? "right"
                    : card.x! < 0.5
                      ? "left"
                      : i % 2
                        ? "right"
                        : "left");
        const zone = zones.find((zone) => zone.side === side)!,
            rect = {
                width: size.width,
                height: size.height,
                y: Math.max(8, card.y || 64),
            };
        if (card.placement === "free") {
            result[card.id] = constrainFreeCard(
                {
                    ...rect,
                    x: Number.isFinite(card.offset)
                        ? paperCenter(g) + card.offset!
                        : (card.x || 0) * Math.max(1, g.width - size.width),
                },
                g,
            );
            return;
        }
        // Margin cards sit against the page edge and never move onto the document on their own.
        result[card.id] = {
            ...rect,
            x:
                side === "left"
                    ? Math.max(8, zone.max - size.width)
                    : Math.min(zone.min, g.width - size.width - 8),
            side,
        };
    });
    return result;
}
