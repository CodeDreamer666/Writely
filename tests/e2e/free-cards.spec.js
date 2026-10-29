import {
    test,
    expect,
    stored,
    openSample,
} from "./fixtures.js";
import { initial } from "../../src/lib/writely/model.ts";
import { LEGACY_STORAGE_KEY as KEY } from "../../src/config/storage.ts";
import {
    CARD_MAX_WIDTH,
    CARD_MAX_HEIGHT,
} from "../../src/config/cards.ts";
const read = (page) => stored(page);
const current = (data) => data.docs.find((doc) => doc.id === data.active);
const long =
    "A thought that keeps going, the way thoughts do when nobody is counting. ".repeat(
        14,
    );
async function open(page, cards) {
    const seed = initial(),
        doc = current(seed);
    doc.cards = cards.map((card, i) => ({
        ...doc.cards[0],
        connectors: [],
        ...card,
    }));
    await page.addInitScript(
        ({ key, seed }) => {
            if (!localStorage.getItem(key))
                localStorage.setItem(key, JSON.stringify(seed));
        },
        { key: KEY, seed },
    );
    await openSample(page);
    await page
        .getByRole("button", { name: "Close document list", exact: true })
        .click();
    await page.waitForTimeout(300);
}
// Every sampled point of the text column (including a scrolling column) must fall inside the drawn outline.
const textInsideOutline = (card) =>
    card.evaluate((el) => {
        const text = el.querySelector(".cloud-text"),
            path = el.querySelector(".cloud-shape path"),
            matrix = el.querySelector(".cloud-shape").getScreenCTM().inverse(),
            r = text.getBoundingClientRect();
        const misses = [];
        for (let i = 0; i <= 4; i++)
            for (let j = 0; j <= 4; j++) {
                const p = new DOMPoint(
                    r.left + (r.width * i) / 4,
                    r.top + (r.height * j) / 4,
                ).matrixTransform(matrix);
                if (!path.isPointInFill(p)) misses.push([i, j]);
            }
        return misses;
    });
test("expanded cards move over the page while leaves stay in their margin, each remembering its own place", async ({
    page,
}) => {
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await open(page, [
        {
            id: "free",
            side: "left",
            placement: "margin",
            y: 160,
            connectors: [
                {
                    id: "link",
                    anchor: "right",
                    target: { kind: "word", from: 5, to: 8, quote: "bus" },
                },
            ],
        },
    ]);
    const card = page.locator('[data-card-id="free"]'),
        paper = await page.locator(".paper").boundingBox(),
        before = await card.boundingBox(),
        prose = () =>
            page
                .locator(".paper .ProseMirror p")
                .evaluateAll((ps) =>
                    ps.map((p) => [
                        p.textContent,
                        JSON.stringify(p.getBoundingClientRect()),
                    ]),
                ),
        layout = await prose();
    expect(before.x + before.width).toBeLessThanOrEqual(paper.x);
    const body = card.locator(".cloud-body"),
        b = await body.boundingBox();
    await page.mouse.move(b.x + 40, b.y + 30);
    await page.mouse.down();
    await page.mouse.move(paper.x + 200, b.y + 80, { steps: 12 });
    await page.mouse.up();
    const moved = await card.boundingBox();
    expect(moved.x).toBeGreaterThan(paper.x + 100);
    expect(Math.abs(moved.y - (before.y + 50))).toBeLessThan(2);
    // Overlapping the document changes nothing about its layout or text.
    expect(await prose()).toEqual(layout);
    await expect(page.locator(".annotation-connectors g>path")).toHaveCount(1);
    await expect(card.locator(".cloud-anchor")).toHaveCount(0);
    await expect
        .poll(async () => current(await read(page)).cards[0].placement)
        .toBe("free");
    await page.screenshot({ path: "evidence/free-card-over-page.png" });
    // Collapsing puts the leaf in the margin, never on the page.
    await page
        .getByRole("button", { name: "Collapse thought 1", exact: true })
        .click();
    const leaf = page.getByRole("button", {
        name: "Expand thought 1",
        exact: true,
    });
    let l = await leaf.boundingBox();
    expect(
        l.x + l.width <= paper.x - 12 || l.x >= paper.x + paper.width + 12,
    ).toBe(true);
    await page.mouse.move(l.x + 20, l.y + 20);
    await page.mouse.down();
    await page.mouse.move(paper.x + paper.width / 2, l.y + 80, { steps: 10 });
    await page.mouse.up();
    l = await leaf.boundingBox();
    expect(
        l.x + l.width <= paper.x - 12 || l.x >= paper.x + paper.width + 12,
    ).toBe(true);
    expect(l.y).toBeGreaterThan(0);
    // Expanding returns the card to where it was left; collapsing returns the leaf to its own spot.
    await leaf.click();
    await expect
        .poll(async () => (await card.boundingBox()).x)
        .toBeCloseTo(moved.x, 0);
    expect((await card.boundingBox()).y).toBeCloseTo(moved.y, 0);
    await page
        .getByRole("button", { name: "Collapse thought 1", exact: true })
        .click();
    await expect
        .poll(async () => (await leaf.boundingBox()).x)
        .toBeCloseTo(l.x, 0);
    expect((await leaf.boundingBox()).y).toBeCloseTo(l.y, 0);
    await page.reload();
    await page
        .getByRole("button", { name: "Close document list", exact: true })
        .click();
    await page.waitForTimeout(300);
    expect((await leaf.boundingBox()).x).toBeCloseTo(l.x, 0);
    await leaf.click();
    await expect
        .poll(async () => (await card.boundingBox()).x)
        .toBeCloseTo(moved.x, 0);
    // Keyboard movement is equally free for the expanded card.
    await card.locator(".cloud-body").focus();
    await page.keyboard.press("ArrowRight");
    await expect
        .poll(async () => (await card.boundingBox()).x)
        .toBeCloseTo(moved.x + 8, 0);
    expect(
        await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
        ),
    ).toBe(true);
    expect(errors).toEqual([]);
});
test("saved shapes render as rectangles, cap their size and scroll long thoughts", async ({
    page,
}) => {
    const shapes = ["rectangle", "rounded-square", "thought-cloud"],
        texts = [
            "Hm.",
            "Start with the woman on the bus? Let the image do the work.",
            long,
        ];
    await open(
        page,
        shapes.flatMap((shape, i) =>
            texts.map((text, j) => ({
                id: `${shape}-${j}`,
                shape,
                text,
                placement: "free",
                x: 0.02 + j * 0.36,
                y: 80 + i * 330,
                side: j ? "right" : "left",
            })),
        ),
    );
    for (const shape of shapes) {
        const boxes = [];
        for (let j = 0; j < 3; j++) {
            const card = page.locator(`[data-card-id="${shape}-${j}"]`);
            await expect(card).toBeVisible();
            boxes.push(await card.boundingBox());
            expect(await textInsideOutline(card)).toEqual([]);
        }
        // Cards grow in both directions, never becoming a narrow tower.
        expect(boxes[1].width).toBeGreaterThan(boxes[0].width);
        for (const box of boxes)
            expect(box.width / box.height).toBeGreaterThan(
                shape === "thought-cloud" ? 1.05 : 1.1,
            );
        expect(boxes[2].width).toBeLessThanOrEqual(CARD_MAX_WIDTH + 0.5);
        expect(boxes[2].height).toBeLessThanOrEqual(CARD_MAX_HEIGHT + 0.5);
        const text = page.locator(`[data-card-id="${shape}-2"] .cloud-text`);
        await expect(text).toHaveAttribute("data-scroll", "true");
        const scroll = await text.evaluate((el) => ({
            overflow: getComputedStyle(el).overflowY,
            more: el.scrollHeight > el.clientHeight + 20,
        }));
        expect(scroll).toEqual({ overflow: "auto", more: true });
        await text.hover();
        await page.mouse.wheel(0, 120);
        await expect
            .poll(() => text.evaluate((el) => el.scrollTop))
            .toBeGreaterThan(0);
    }
    await page.screenshot({ path: "evidence/card-shapes.png", fullPage: true });
});
test("inline thoughts keep their geometry during long edits and save on blur", async ({
    page,
}) => {
    await open(page, [
        {
            id: "only",
            side: "left",
            placement: "margin",
            y: 120,
            text: "Short.",
        },
    ]);
    const card = page.locator('[data-card-id="only"]');
    const before = await card.boundingBox();
    await card.locator(".cloud-text").dblclick();
    const input = page.getByRole("textbox", {
        name: "Thought 1 text",
        exact: true,
    });
    await expect(input).toBeFocused();
    expect(await card.boundingBox()).toEqual(before);
    const text = "x".repeat(80) + " " + long;
    await input.fill(text);
    expect(await card.boundingBox()).toEqual(before);
    await expect(card.locator(".cloud-text")).toHaveAttribute(
        "data-scroll",
        "true",
    );
    expect(
        await card
            .locator(".cloud-text")
            .evaluate((el) => el.scrollHeight > el.clientHeight),
    ).toBe(true);
    await page
        .getByRole("textbox", { name: "Document text", exact: true })
        .click();
    await expect
        .poll(async () => current(await read(page)).cards[0].text)
        .toBe(text);
    await expect
        .poll(async () => (await card.boundingBox()).height)
        .toBeGreaterThan(before.height);
    expect((await card.boundingBox()).height).toBeLessThanOrEqual(
        CARD_MAX_HEIGHT + 0.5,
    );
    await page.reload();
    await page
        .getByRole("button", { name: "Close document list", exact: true })
        .click();
    await expect(card.locator(".thought-inline-text")).toHaveText(text);
});

test("selected card text has a formatting toolbar and keeps formatting after saving", async ({
    page,
}) => {
    await open(page, [
        {
            id: "formatted",
            side: "left",
            placement: "margin",
            y: 120,
            text: "A small thought.",
        },
    ]);
    const card = page.locator('[data-card-id="formatted"]');
    await page
        .getByRole("button", { name: "Edit thought 1", exact: true })
        .click();
    const input = page.getByRole("textbox", {
        name: "Thought 1 text",
        exact: true,
    });
    const toolbar = page.getByRole("toolbar", {
        name: "Thought 1 text formatting",
    });
    await expect(toolbar).not.toBeVisible();
    await input.press("ControlOrMeta+a");
    await expect(toolbar).toBeVisible();
    await toolbar.getByRole("button", { name: "Bold", exact: true }).click();
    await expect(input.locator("strong")).toHaveText("A small thought.");
    await expect(
        toolbar.getByRole("button", { name: "Bold", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await input.press("ControlOrMeta+z");
    await expect(input.locator("strong")).toHaveCount(0);
    await input.press("ControlOrMeta+Shift+z");
    await expect(input.locator("strong")).toHaveText("A small thought.");
    await toolbar.getByRole("button", { name: "Italic", exact: true }).click();
    await toolbar
        .getByRole("button", { name: "Bullet List", exact: true })
        .click();
    await expect(input.locator("ul li strong em")).toHaveText(
        "A small thought.",
    );
    await toolbar
        .getByRole("button", { name: "Blockquote", exact: true })
        .click();
    await expect(input.locator("blockquote")).toContainText("A small thought.");
    await page.screenshot({ path: "evidence/card-text-toolbar.png" });
    await page
        .getByRole("textbox", { name: "Document text", exact: true })
        .click();
    await expect(toolbar).not.toBeVisible();
    await expect
        .poll(async () => current(await read(page)).cards[0].html)
        .toContain("<strong><em>");
    await page.reload();
    await page
        .getByRole("button", { name: "Close document list", exact: true })
        .click();
    await expect(card.locator("blockquote ul li strong em")).toHaveText(
        "A small thought.",
    );
    await page
        .getByRole("button", { name: "Edit thought 1", exact: true })
        .click();
    await input.fill("Cancelled change");
    await input.press("Escape");
    await expect(card.locator("strong em")).toHaveText("A small thought.");
});
test("cards settle instead of flickering between wraps", async ({ page }) => {
    await open(
        page,
        ["", "An unfinished thought that wraps", "Hm."].flatMap((text, i) =>
            ["thought-cloud", "rounded-square", "rectangle"].map(
                (shape, j) => ({
                    id: `${shape}-${i}`,
                    shape,
                    text,
                    placement: "free",
                    x: 0.05 + i * 0.3,
                    y: 60 + j * 240,
                }),
            ),
        ),
    );
    const sizes = () =>
        page
            .locator(".annotation-cloud")
            .evaluateAll((cards) =>
                cards
                    .map(
                        (card) =>
                            card.offsetWidth +
                            "x" +
                            card.offsetHeight +
                            ":" +
                            card.querySelector(".cloud-text").offsetHeight,
                    )
                    .join("|"),
            );
    const first = await sizes();
    const seen = new Set([first]);
    for (let i = 0; i < 20; i++) {
        await page.waitForTimeout(50);
        seen.add(await sizes());
    }
    expect([...seen]).toEqual([first]);
});
