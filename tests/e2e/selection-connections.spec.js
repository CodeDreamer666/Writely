import {
    test,
    expect,
    stored,
    openSample,
} from "./fixtures.js";
import { initial } from "../../src/lib/writely/model.ts";
import { LEGACY_STORAGE_KEY as KEY } from "../../src/config/storage.ts";
const current = (data) => data.docs.find((doc) => doc.id === data.active);
async function open(page, html) {
    const seed = initial(),
        doc = current(seed);
    doc.html =
        html ??
        "<p>Alpha beta gamma delta.</p><p>A second paragraph with several words.</p><p>A final paragraph for longer selections.</p>";
    doc.cards = [
        {
            ...doc.cards[0],
            id: "a",
            side: "left",
            y: 100,
            text: "First thought",
            connectors: [],
        },
        {
            ...doc.cards[1],
            id: "b",
            side: "right",
            y: 260,
            text: "Second thought",
            connectors: [],
        },
    ];
    await page.addInitScript(
        ({ key, seed }) => {
            if (!localStorage.getItem(key))
                localStorage.setItem(key, JSON.stringify(seed));
        },
        { key: KEY, seed },
    );
    await openSample(page);
    const close = page.getByRole("button", {
        name: "Close document list",
        exact: true,
    });
    if (page.viewportSize().width > 760 || (await close.isVisible()))
        await close.click();
    await expect(page.locator('[data-card-id="a"]')).toBeVisible();
}

async function expectTextClearance(page, id) {
    await expect(
        page.locator(`[data-connection-card="${id}"] path`),
    ).toHaveCount(1);
    const collisions = await page.evaluate((id) => {
        const prose = document.querySelector('[aria-label="Document text"]');
        const walker = document.createTreeWalker(prose, NodeFilter.SHOW_TEXT);
        const range = document.createRange(),
            rects = [];
        let node;
        while ((node = walker.nextNode())) {
            for (const match of node.textContent.matchAll(/\S+/gu)) {
                range.setStart(node, match.index);
                range.setEnd(node, match.index + match[0].length);
                rects.push(...range.getClientRects());
            }
        }
        const path = document.querySelector(
            `[data-connection-card="${id}"] path`,
        );
        const matrix = path.getScreenCTM();
        let collisions = 0;
        for (let t = 0; t <= path.getTotalLength(); t += 0.5) {
            const p = path.getPointAtLength(t).matrixTransform(matrix);
            if (
                rects.some(
                    (r) =>
                        p.x > r.left - 1 &&
                        p.x < r.right + 1 &&
                        p.y > r.top - 1 &&
                        p.y < r.bottom + 1,
                )
            )
                collisions++;
        }
        return collisions;
    }, id);
    expect(collisions).toBe(0);
}

test("curved routes avoid rendered words while dragging below wrapped selections", async ({
    page,
}) => {
    const paragraph =
        "Rendered words must remain unobstructed as the thought moves around this long paragraph. ".repeat(
            7,
        );
    await open(page, `<p>${paragraph}</p><p>${paragraph}</p>`);
    await select(page, 0, 0, 0, 130);
    await attach(page, "a");
    await checkEndpoint(page, "a");
    await expectTextClearance(page, "a");
    const paper = await page.locator(".paper").boundingBox();
    for (const [x, y] of [
        [paper.x + 150, paper.y + 240],
        [paper.x + 330, paper.y + 400],
        [paper.x - 150, paper.y + 500],
    ]) {
        const card = await page
            .locator('[data-card-id="a"] .cloud-body')
            .boundingBox();
        await page.mouse.move(card.x + 20, card.y + 20);
        await page.mouse.down();
        await page.mouse.move(x + 20, y + 20, { steps: 12 });
        // Check before release too: routing must follow the live drag.
        await expectTextClearance(page, "a");
        await page.mouse.up();
        await expectTextClearance(page, "a");
    }
    await page.setViewportSize({ width: 1100, height: 850 });
    await checkEndpoint(page, "a");
    await expectTextClearance(page, "a");
    await page.locator(".workspace").evaluate((el) => {
        el.scrollTop = 180;
    });
    await checkEndpoint(page, "a");
    await expectTextClearance(page, "a");
    await expect(page.locator(".annotation-connectors")).toHaveCSS(
        "pointer-events",
        "none",
    );
});
async function select(page, block, start, endBlock, end) {
    await page
        .getByRole("textbox", { name: "Document text", exact: true })
        .evaluate(
            (el, args) => {
                const [block, start, endBlock, end] = args;
                const locate = (index, offset) => {
                    const p = el.querySelectorAll("p")[index],
                        walker = document.createTreeWalker(
                            p,
                            NodeFilter.SHOW_TEXT,
                        );
                    let node;
                    while ((node = walker.nextNode())) {
                        if (offset <= node.textContent.length)
                            return [node, offset];
                        offset -= node.textContent.length;
                    }
                    throw new Error("Selection outside text");
                };
                el.focus();
                const [from, a] = locate(block, start),
                    [to, b] = locate(endBlock, end);
                const range = document.createRange();
                range.setStart(from, a);
                range.setEnd(to, b);
                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(range);
                document.dispatchEvent(new Event("selectionchange"));
            },
            [block, start, endBlock, end],
        );
    await expect(
        page.getByRole("button", { name: "Connect to thought", exact: true }),
    ).toBeVisible();
}
async function begin(page) {
    await page
        .getByRole("button", { name: "Connect to thought", exact: true })
        .click();
    await expect(
        page
            .getByRole("status")
            .filter({ hasText: "Select a thought card to connect" }),
    ).toBeVisible();
    await expect(page.locator(".annotation-link-toolbar")).toHaveCount(0);
}
async function attach(page, id) {
    await begin(page);
    await page.locator(`[data-card-id="${id}"] .cloud-body`).click();
    await expect(page.locator(".connection-hint")).toHaveCount(0);
    await expect
        .poll(
            async () =>
                current(await stored(page)).cards.find((c) => c.id === id)
                    .connectors.length,
        )
        .toBe(1);
}
async function checkEndpoint(page, id, expectedText) {
    const arrow = page.locator(`[data-connection-card="${id}"]`);
    await expect(arrow.locator("path")).toHaveCount(1);
    const diff = await page.evaluate((id) => {
        const dot = document
            .querySelector(`[data-connection-card="${id}"] circle`)
            .getBoundingClientRect();
        const rects = [...document.querySelectorAll(`[data-annotation-cards]`)]
            .filter((el) => JSON.parse(el.dataset.annotationCards).includes(id))
            .flatMap((el) => [...el.getClientRects()]);
        const last = rects.at(-1);
        const line = rects.filter(
            (r) => r.top < last.bottom && r.bottom > last.top,
        );
        return {
            x: Math.abs(
                dot.x +
                    dot.width / 2 -
                    (Math.min(...line.map((r) => r.left)) +
                        Math.max(...line.map((r) => r.right))) /
                        2,
            ),
            y: Math.abs(
                dot.y +
                    dot.height / 2 -
                    Math.max(...line.map((r) => r.bottom)) -
                    3.5,
            ),
        };
    }, id);
    expect(diff.x).toBeLessThan(1.5);
    expect(diff.y).toBeLessThan(1.5);
    if (expectedText)
        await expect(page.locator(".card-text-highlight")).toContainText([
            expectedText,
        ]);
}

test("exact partial words, shared highlights, replacement, and visible arrows survive edits and reopen", async ({
    page,
}) => {
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await open(page);
    await select(page, 0, 2, 0, 5);
    await attach(page, "a");
    let data = current(await stored(page));
    expect(data.cards[0].connectors[0].target).toMatchObject({
        kind: "text",
        from: 3,
        to: 6,
        quote: "pha",
    });
    await checkEndpoint(page, "a", "pha");
    await select(page, 0, 2, 0, 5);
    await attach(page, "b");
    await expect(page.locator('[data-connected-count="2"]')).toHaveText("pha");
    await expect(page.locator(".annotation-connectors g>path")).toHaveCount(2);
    await select(page, 0, 6, 2, 17);
    await attach(page, "a");
    await expect(page.locator('[data-connected-count="2"]')).toHaveCount(0);
    await expect
        .poll(
            async () =>
                current(await stored(page)).cards[0].connectors[0].target.quote,
        )
        .toContain("A second paragraph");
    data = current(await stored(page));
    expect(data.cards[0].connectors).toHaveLength(1);
    expect(data.cards[0].connectors[0].target.quote).toContain(
        "A second paragraph",
    );
    expect(data.cards[1].connectors[0].target.quote).toBe("pha");
    await expect(page.locator(".annotation-connectors g>path")).toHaveCount(2);
    const prose = page.getByRole("textbox", {
        name: "Document text",
        exact: true,
    });
    await prose.click();
    await prose.press("Control+Home");
    await page.keyboard.insertText("Before ");
    await expect
        .poll(
            async () =>
                current(await stored(page)).cards[1].connectors[0].target.from,
        )
        .toBe(10);
    await checkEndpoint(page, "b");
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.waitForTimeout(300);
    await checkEndpoint(page, "b");
    await page.locator(".workspace").evaluate((el) => {
        el.scrollTop = 100;
    });
    await page.waitForTimeout(100);
    await checkEndpoint(page, "b");
    await page.reload();
    await page
        .getByRole("button", { name: "Close document list", exact: true })
        .click();
    await expect(page.locator(".annotation-connectors g>path")).toHaveCount(2);
    expect(
        current(await stored(page)).cards[1].connectors[0].target.quote,
    ).toBe("pha");
    expect(errors).toEqual([]);
});

test("connection mode cancels without changes, accepts keyboard targets, and drops deleted text anchors", async ({
    page,
}) => {
    await open(page);
    await select(page, 0, 0, 0, 5);
    await begin(page);
    await page.keyboard.press("Escape");
    await expect(page.locator(".connection-hint")).toHaveCount(0);
    expect(
        current(await stored(page)).cards.every(
            (card) => card.connectors.length === 0,
        ),
    ).toBe(true);
    await select(page, 0, 0, 0, 5);
    await begin(page);
    await page
        .getByRole("textbox", { name: "Document text", exact: true })
        .click();
    await expect(page.locator(".connection-hint")).toHaveCount(0);
    await select(page, 0, 6, 0, 10);
    const action = page.getByRole("button", {
        name: "Connect to thought",
        exact: true,
    });
    await action.focus();
    await action.press("Enter");
    const target = page.locator('[data-card-id="a"] .cloud-body');
    await expect(target).toBeFocused();
    await target.press("Enter");
    await expect(page.locator(".annotation-connectors g>path")).toHaveCount(1);
    await expect(
        page.locator('[contenteditable="plaintext-only"]'),
    ).toHaveCount(0);
    await expect
        .poll(
            async () =>
                current(await stored(page)).cards[0].connectors[0]?.target
                    .quote,
        )
        .toBe("beta");
    await select(page, 0, 6, 0, 10);
    await page.keyboard.press("Backspace");
    await expect(page.locator(".annotation-connectors g>path")).toHaveCount(0);
    await expect(page.locator(".card-text-highlight")).toHaveCount(0);
    await expect
        .poll(
            async () =>
                current(await stored(page)).cards[0].connectors[0].target
                    .orphaned,
        )
        .toBe(true);
});

test.describe("touch connection", () => {
    test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });
    test("selection action connects to a card with a tap", async ({ page }) => {
        await open(page);
        await select(page, 0, 0, 1, 18);
        await page
            .getByRole("button", { name: "Connect to thought", exact: true })
            .tap();
        await page.locator('[data-card-id="a"] .cloud-body').tap();
        await expect(page.locator(".annotation-connectors g>path")).toHaveCount(
            1,
        );
        await expect(
            page.locator('[contenteditable="plaintext-only"]'),
        ).toHaveCount(0);
        await expect
            .poll(
                async () =>
                    current(await stored(page)).cards[0].connectors.length,
                { timeout: 15000 },
            )
            .toBe(1);
    });
});
