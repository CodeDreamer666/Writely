import {
    test,
    expect,
    openSample,
    stored,
} from "./fixtures.js";

test.setTimeout(90_000);

const cardsMenu = async (page) => {
    await page.getByRole("button", { name: "Thoughts", exact: true }).click();
};
const screen = (page) => page.getByRole("dialog", { name: /card$/ });
const cardText = (page) =>
    page.getByRole("textbox", { name: "Card text", exact: true });
const cardsOf = async (page, id) =>
    (await stored(page)).docs.find((doc) => doc.id === id)?.cards ?? [];

/** Whether the caret sits inside the visible part of the card's text area. */
const caretVisible = (page) =>
    page.evaluate(() => {
        const range = getSelection()?.getRangeAt(0);
        const area =
            document.querySelector(".card-screen-text")?.parentElement
                ?.parentElement;
        if (!range || !area) return false;
        const caret =
            range.getClientRects()[0] ?? range.getBoundingClientRect();
        const box = area.getBoundingClientRect();
        return caret.top >= box.top - 1 && caret.bottom <= box.bottom + 1;
    });

test.describe("phone card editor", () => {
    test.use({ hasTouch: true });

    test("a new card opens full screen, saves as you type, and Done returns to the same place", async ({
        page,
    }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        const id = await openSample(page);
        const workspace = page.locator("main.workspace");
        await workspace.evaluate((el) => el.scrollTo(0, 300));
        const scrolled = await workspace.evaluate((el) => el.scrollTop);
        const url = page.url();

        await cardsMenu(page);
        await page
            .getByRole("button", { name: "New card", exact: true })
            .click();
        const editor = screen(page);
        await expect(editor).toBeVisible();
        await expect(editor.getByRole("heading")).toHaveText("New card");
        // Full screen, with the sheet out of the way and the caret in the text.
        const box = await editor.boundingBox();
        expect(box).toMatchObject({ x: 0, y: 0, width: 390, height: 844 });
        await expect(page.locator("#compact-cards")).toBeHidden();
        await expect(cardText(page)).toBeFocused();
        await expect(
            editor.getByText("Changes save automatically"),
        ).toHaveCount(0);

        await page.keyboard.type("A thought written on the bus");
        await expect
            .poll(async () => (await cardsOf(page, id)).map((c) => c.text), {
                timeout: 20_000,
            })
            .toContain("A thought written on the bus");

        await editor.getByRole("button", { name: "Done", exact: true }).click();
        await expect(page.locator(".card-screen")).toHaveCount(0);
        await expect(page.locator("#compact-cards")).toBeHidden();
        expect(page.url()).toBe(url);
        expect(await workspace.evaluate((el) => el.scrollTop)).toBe(scrolled);
    });

    test("long cards scroll on their own, keep the caret in view above the keyboard, and Back keeps the text", async ({
        page,
    }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        const id = await openSample(page);
        await cardsMenu(page);
        await page
            .getByRole("button", { name: /^Edit card / })
            .first()
            .click();
        const editor = screen(page);
        await expect(editor.getByRole("heading")).toHaveText("Edit card");
        await expect(cardText(page)).toBeFocused();

        // A long card: more lines than fit.
        await page.keyboard.press("Control+End");
        for (let i = 1; i <= 30; i++) {
            await page.keyboard.press("Enter");
            await page.keyboard.type(`Line ${i} of a long thought`);
        }
        const area = page.locator(".card-screen-text").locator("xpath=../..");
        const { scrollHeight, clientHeight } = await area.evaluate((el) => ({
            scrollHeight: el.scrollHeight,
            clientHeight: el.clientHeight,
        }));
        expect(scrollHeight).toBeGreaterThan(clientHeight);
        expect(await caretVisible(page)).toBe(true);

        // The keyboard opens: the visible area shrinks; the editor follows it, header and caret
        // stay in view, and the page itself doesn't scroll.
        await page.setViewportSize({ width: 390, height: 420 });
        await expect
            .poll(async () => (await editor.boundingBox())?.height)
            .toBeLessThanOrEqual(420);
        await expect(
            editor.getByRole("button", { name: "Done", exact: true }),
        ).toBeInViewport();
        await expect.poll(() => caretVisible(page)).toBe(true);
        await page.keyboard.press("Control+Home");
        await expect.poll(() => caretVisible(page)).toBe(true);
        await page.keyboard.press("Control+End");
        await page.keyboard.type(" — the end");
        await expect.poll(() => caretVisible(page)).toBe(true);
        expect(await page.evaluate(() => window.scrollY)).toBe(0);
        // The text scrolls by hand too.
        await area.evaluate((el) => el.scrollTo(0, 0));
        expect(await area.evaluate((el) => el.scrollTop)).toBe(0);
        await page.setViewportSize({ width: 390, height: 844 });

        // The browser's back button closes the editor and stays on the document.
        const url = page.url();
        await page.goBack();
        await expect(page.locator(".card-screen")).toHaveCount(0);
        expect(page.url()).toBe(url);
        await expect(
            page.getByRole("textbox", { name: "Document text", exact: true }),
        ).toBeVisible();
        await expect
            .poll(
                async () =>
                    (await cardsOf(page, id)).some((c) =>
                        c.text.includes("Line 30 of a long thought — the end"),
                    ),
                { timeout: 20_000 },
            )
            .toBe(true);
    });

    test("the back arrow closes the editor and the card keeps its colour and links", async ({
        page,
    }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        const id = await openSample(page);
        const before = (await cardsOf(page, id))[0];
        await cardsMenu(page);
        await page
            .getByRole("button", { name: /^Edit card / })
            .first()
            .click();
        await page.keyboard.type(" More.");
        await screen(page)
            .getByRole("button", { name: "Back to the document" })
            .click();
        await expect(page.locator(".card-screen")).toHaveCount(0);
        await expect
            .poll(async () => (await cardsOf(page, id))[0]?.text, {
                timeout: 20_000,
            })
            .toBe(`${before.text} More.`);
        const after = (await cardsOf(page, id))[0];
        expect(after.bg).toBe(before.bg);
        expect(after.connectors ?? []).toEqual(before.connectors ?? []);
    });
});

test("desktop keeps editing cards in place", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 860 });
    await openSample(page);
    await page
        .getByRole("button", { name: "Add thought card", exact: true })
        .click();
    await expect(
        page.locator(".annotation-cloud [contenteditable='true']"),
    ).toBeVisible();
    await expect(page.locator(".card-screen")).toHaveCount(0);
});
