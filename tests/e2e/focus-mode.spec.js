import {
    test,
    expect,
    stored,
    openSample,
    trpc,
} from "./fixtures.js";

// The dev server answers slowly while it compiles, and these tests type a lot.
test.describe.configure({ timeout: 90_000 });

const editorOf = (page) =>
    page.getByRole("textbox", { name: "Document text", exact: true });
const opacityOf = (locator) =>
    locator.evaluate((el) => Number(getComputedStyle(el).opacity));
// Everything around the text that focus mode puts away.
const chrome = (page) => [
    page.locator(".editor-header"),
    page.getByRole("navigation", { name: "Writing tools" }),
    page.getByRole("button", { name: "Undo (Ctrl+Z)" }),
    page.getByRole("button", { name: "Enter focus mode" }),
];

test("focus mode hides everything but the text and gives it all back", async ({
    page,
}) => {
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await openSample(page);
    const editor = editorOf(page);
    const cards = page.locator(".annotation-cloud");
    await expect(cards.first()).toBeVisible();
    const before = await stored(page);

    await editor.click();
    await page.keyboard.press("Control+End");
    const caret = await page.evaluate(
        () => getSelection().getRangeAt(0).getBoundingClientRect().top,
    );
    await page.keyboard.press("Control+Shift+F");
    await expect(page.locator(".app.focus-mode")).toHaveCount(1);
    for (const control of chrome(page)) await expect(control).toBeHidden();
    await expect(cards.first()).toBeHidden();
    await expect(page.locator(".annotation-connectors").first()).toBeHidden();
    await expect(editor).toBeVisible();
    await expect(editor).toBeFocused();
    // The caret stays where it was on screen, give or take a line.
    const after = await page.evaluate(
        () => getSelection().getRangeAt(0).getBoundingClientRect().top,
    );
    expect(Math.abs(after - caret)).toBeLessThan(40);

    // The column stays centred at the chosen width.
    const box = await page.locator("article.paper").boundingBox();
    const width = page.viewportSize().width;
    expect(Math.abs(box.x + box.width / 2 - width / 2)).toBeLessThan(2);
    expect(box.width).toBeLessThanOrEqual(720);

    // Hidden cards take no clicks.
    const hit = await page.evaluate(() => {
        const card = document.querySelector(".annotation-cloud");
        const r = card.getBoundingClientRect();
        return document
            .elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
            ?.closest(".annotation-cloud");
    });
    expect(hit).toBeFalsy();

    // Typing, undo and autosave carry on.
    await page.keyboard.type(" Still writing.");
    await expect(editor).toContainText("Still writing.");
    await page.keyboard.press("Control+z");
    await expect(editor).not.toContainText("Still writing.");
    await page.keyboard.type(" Kept.");
    await expect
        .poll(
            async () => {
                const data = await stored(page);
                return data.docs.find((d) => d.id === data.active).html;
            },
            { timeout: 15_000 },
        )
        .toContain("Kept.");

    await page.keyboard.press("Escape");
    await expect(page.locator(".app.focus-mode")).toHaveCount(0);
    for (const control of chrome(page)) await expect(control).toBeVisible();
    await expect(cards.first()).toBeVisible();
    await expect(editor).toBeFocused();
    // The caret is still at the end of the text, and the cards kept their connections.
    await page.keyboard.type(" End.");
    await expect(editor).toContainText("Kept. End.");
    const data = await stored(page);
    const doc = data.docs.find((d) => d.id === data.active);
    const original = before.docs.find((d) => d.id === before.active);
    expect(doc.cards.map((c) => c.connectors?.length ?? 0)).toEqual(
        original.cards.map((c) => c.connectors?.length ?? 0),
    );
    expect(errors).toEqual([]);
});

test("toggling focus mode alone changes and saves nothing", async ({
    page,
}) => {
    await openSample(page);
    await editorOf(page).click();
    await page.waitForTimeout(1500);
    const before = await stored(page);
    const saves = [];
    page.on("request", (request) => {
        if (request.method() === "POST" && request.url().includes("/api/trpc/"))
            saves.push(request.url());
    });
    await page.keyboard.press("Control+Shift+F");
    await page.keyboard.press("Escape");
    await page.keyboard.press("Control+Shift+F");
    await page.keyboard.press("Control+Shift+F");
    await page.waitForTimeout(1500);
    expect(saves).toEqual([]);
    expect((await stored(page)).docs).toEqual(before.docs);
});

test("paragraph highlighting follows the caret and selection, and can be turned off", async ({
    page,
}) => {
    await openSample(page);
    const editor = editorOf(page);
    await editor.click();
    await page.keyboard.press("Control+Home");
    await page.keyboard.press("Control+Shift+F");
    const blocks = page.locator(".tiptap > *");
    await expect.poll(() => opacityOf(blocks.nth(0))).toBe(1);
    await expect.poll(() => opacityOf(blocks.nth(1))).toBeLessThan(0.5);

    // Keyboard movement and a new, empty paragraph move the highlight along.
    await page.keyboard.press("Control+ArrowDown");
    await page.keyboard.press("End");
    await page.keyboard.press("Enter");
    const fresh = page.locator(".tiptap > .has-focus");
    await expect(fresh).toHaveCount(1);
    await expect.poll(() => opacityOf(fresh)).toBe(1);
    await expect.poll(() => opacityOf(blocks.nth(0))).toBeLessThan(0.5);
    await page.keyboard.press("Backspace");

    // A selection across paragraphs keeps all of them bright.
    await page.keyboard.press("Control+Home");
    await page.keyboard.press("Control+Shift+ArrowDown");
    await page.keyboard.press("Control+Shift+ArrowDown");
    await page.keyboard.press("Control+Shift+ArrowDown");
    expect(await page.locator(".tiptap > .has-focus").count()).toBeGreaterThan(
        1,
    );
    for (const el of await page.locator(".tiptap > .has-focus").all())
        await expect.poll(() => opacityOf(el)).toBe(1);

    // A click elsewhere moves it too.
    await blocks.nth(2).click();
    await expect(blocks.nth(2)).toHaveClass(/has-focus/);
    await expect.poll(() => opacityOf(blocks.nth(2))).toBe(1);

    // Faded text is faded, never blurred.
    expect(
        await blocks.nth(0).evaluate((el) => getComputedStyle(el).filter),
    ).toBe("none");

    // Off: every paragraph looks normal, in focus mode or not.
    await trpc(page, "account.updatePreferences", {
        paragraphHighlight: false,
    });
    await page.reload();
    await editorOf(page).click();
    await page.keyboard.press("Control+Shift+F");
    await expect(page.locator(".app.focus-mode")).toHaveCount(1);
    await expect(page.locator(".app.paragraph-highlight")).toHaveCount(0);
    for (const el of await blocks.all())
        await expect.poll(() => opacityOf(el)).toBe(1);
});

test("the exit control appears near the top edge and works by keyboard", async ({
    page,
}) => {
    await openSample(page);
    await editorOf(page).click();
    await page.keyboard.press("Control+Shift+F");
    const exit = page.getByRole("button", { name: /Exit focus mode/ });
    await expect(exit).toHaveAttribute("aria-keyshortcuts", "Escape");

    await page.mouse.move(700, 600);
    await expect.poll(() => opacityOf(exit)).toBe(0);
    // Hidden, it lets clicks through to the page.
    expect(
        await exit.evaluate((el) => getComputedStyle(el).pointerEvents),
    ).toBe("none");
    await page.mouse.move(700, 20);
    await expect.poll(() => opacityOf(exit)).toBe(1);
    await page.mouse.move(700, 600);
    await expect.poll(() => opacityOf(exit)).toBe(0);

    // Keyboard: Shift+Tab from the text reaches it, and it shows while focused.
    await editorOf(page).focus();
    await page.keyboard.press("Shift+Tab");
    await expect(exit).toBeFocused();
    await expect.poll(() => opacityOf(exit)).toBe(1);
    await page.keyboard.press("Enter");
    await expect(page.locator(".app.focus-mode")).toHaveCount(0);
    await expect(editorOf(page)).toBeFocused();

    // The ⋯ menu turns it on too, and writing carries on without another click.
    await page.getByRole("button", { name: "Enter focus mode" }).click();
    await expect(page.locator(".app.focus-mode")).toHaveCount(1);
    await expect(editorOf(page)).toBeFocused();
});

test("typewriter scrolling keeps the line being typed near the middle", async ({
    page,
}) => {
    await openSample(page);
    await trpc(page, "account.updatePreferences", { typewriter: true });
    await page.reload();
    const editor = editorOf(page);
    await editor.click();
    await page.keyboard.press("Control+End");
    const workspace = page.locator("main.workspace");
    for (let i = 0; i < 10; i++) {
        await page.keyboard.press("Enter");
        await page.keyboard.type("Steady writing.");
    }
    await page.waitForTimeout(700);
    const { caret, top, height } = await page.evaluate(() => {
        const r = getSelection().getRangeAt(0).getBoundingClientRect();
        const w = document
            .querySelector("main.workspace")
            .getBoundingClientRect();
        return { caret: (r.top + r.bottom) / 2, top: w.top, height: w.height };
    });
    expect(Math.abs(caret - (top + height / 2))).toBeLessThan(height * 0.12);

    // Scrolling by hand is left alone while the writer reads back.
    await workspace.evaluate((el) => (el.scrollTop = 0));
    await page.mouse.wheel(0, 1);
    await page.waitForTimeout(600);
    expect(await workspace.evaluate((el) => el.scrollTop)).toBeLessThan(40);
});

test("typewriter scrolling jumps instead of gliding with reduced motion", async ({
    page,
}) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openSample(page);
    await trpc(page, "account.updatePreferences", { typewriter: true });
    await page.reload();
    await editorOf(page).click();
    await page.keyboard.press("Control+End");
    const positions = [];
    await page.exposeFunction("record", (y) => positions.push(y));
    await page.evaluate(() =>
        document
            .querySelector("main.workspace")
            .addEventListener("scroll", (e) =>
                window.record(e.currentTarget.scrollTop),
            ),
    );
    for (let i = 0; i < 6; i++) {
        await page.keyboard.press("Enter");
        await page.keyboard.type("Line.");
    }
    await page.waitForTimeout(700);
    // Each adjustment lands in one step rather than an animated run of scroll events.
    expect(positions.length).toBeLessThanOrEqual(6);
});

for (const [name, size] of [
    ["tablet", { width: 820, height: 1180 }],
    ["mobile", { width: 390, height: 844 }],
])
    test(`focus mode fits a ${name} screen`, async ({ page }) => {
        await page.setViewportSize(size);
        await openSample(page);
        await editorOf(page).click();
        await page.keyboard.press("Control+Shift+F");
        await expect(page.locator(".editor-header")).toBeHidden();
        const box = await page.locator("article.paper").boundingBox();
        expect(box.x).toBeGreaterThanOrEqual(16);
        expect(box.x + box.width).toBeLessThanOrEqual(size.width - 16);
        expect(
            await page.evaluate(
                () => document.documentElement.scrollWidth <= innerWidth,
            ),
        ).toBe(true);
        await page.screenshot({ path: `test-results/focus-${name}.png` });
    });

test("selected text can be formatted in focus mode", async ({ page }) => {
    await openSample(page);
    const editor = editorOf(page);
    await editor.click();
    await page.keyboard.press("Control+Shift+F");
    await page.keyboard.press("Control+Home");
    await page.keyboard.press("Control+Shift+ArrowRight");
    const toolbar = page.getByRole("toolbar", {
        name: "Text formatting",
        exact: true,
    });
    await expect(toolbar).toBeVisible();
    await toolbar.getByRole("button", { name: "Bold", exact: true }).click();
    await expect(editor.locator("strong").first()).toBeVisible();
    await expect(page.locator(".app.focus-mode")).toHaveCount(1);
});
