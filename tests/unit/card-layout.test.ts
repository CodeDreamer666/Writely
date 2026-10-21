import assert from "node:assert/strict";
import { test } from "vitest";
import {
    cardContentWidth,
    layoutCard,
} from "../../src/lib/writely/card-layout";
import {
    CARD_MAX_HEIGHT,
    CARD_MAX_WIDTH,
} from "../../src/config/cards";

test("cards grow proportionally, then cap and scroll", () => {
    const short = cardContentWidth("Hm."),
        medium = cardContentWidth(
            "Start with the woman on the bus? Let the image do the work.",
        ),
        long = cardContentWidth("word ".repeat(2000));
    assert(short <= medium && medium <= long);
    assert(long + 40 <= CARD_MAX_WIDTH);
    assert(
        cardContentWidth("word ".repeat(2000), 220) <
            cardContentWidth("word ".repeat(2000)),
    );
    const small = layoutCard({ contentWidth: medium, textHeight: 45 }),
        big = layoutCard({ contentWidth: long, textHeight: 5000 });
    // Text stays inside the card's outline and grows in both directions.
    for (const layout of [small, big]) {
        const c = layout.content;
        assert(
            c.left > 0 &&
                c.top > 0 &&
                c.left + c.width < layout.width &&
                c.top + c.height < layout.height,
        );
        assert(!layout.path.includes("NaN"));
        for (const point of Object.values(layout.anchors))
            assert(point.every((n) => Number.isFinite(n) && n >= 0 && n <= 1));
    }
    assert(big.width > small.width && big.height > small.height);
    assert(!small.scroll && big.scroll);
    // Past the maximum, the card stops growing and the text column scrolls.
    assert(big.width <= CARD_MAX_WIDTH && big.height <= CARD_MAX_HEIGHT + 0.5);
    assert.deepEqual(layoutCard({ contentWidth: long, textHeight: 9000 }), big);
    assert(small.width / small.height > 1 && big.width / big.height > 1);
});
