import {
    test,
    expect,
    stored,
    openSample,
} from "./fixtures.js";

const errorsFor = (page) => {
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    return errors;
};
const preferences = (page) =>
    page.evaluate(async () => {
        const response = await fetch("/api/trpc/account.preferences");
        return (await response.json()).result.data.json;
    });
// Preference saves wait for the last change to settle before they are sent.
const settled = (page) =>
    page.waitForResponse(
        (response) =>
            response.url().includes("account.updatePreferences") &&
            response.ok(),
    );

test("settings header returns to the correct parent", async ({ page }) => {
    test.setTimeout(90_000);
    await openSample(page);
    for (const width of [1440, 768, 390]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto("/");
        await page.getByRole("link", { name: "Settings", exact: true }).click();
        const documents = page.getByRole("link", { name: "Back to Documents" });
        await expect(documents).toBeVisible();
        const bounds = await documents.boundingBox();
        expect(bounds.width).toBeGreaterThanOrEqual(44);
        expect(bounds.height).toBeGreaterThanOrEqual(44);
        for (const hash of [
            "appearance",
            "writing",
            "export",
            "checklist",
            "shortcuts",
            "account",
        ]) {
            await page.goto(`/settings#${hash}`);
            const back = page.getByRole("link", { name: "Back to Documents" });
            await expect(back).toBeVisible();
            await expect(
                page
                    .locator("main")
                    .getByRole("link", {
                        name: /Back to (Settings|Documents)/,
                    }),
            ).toHaveCount(0);
            await back.click();
            await expect(page).toHaveURL(/\/$/);
        }
    }
});

test("settings shows one section at a time from the sidebar and keeps writing and export choices", async ({
    page,
}) => {
    const errors = errorsFor(page);
    await openSample(page);
    await page.goto("/settings");
    await expect(
        page.getByRole("heading", { name: "Settings", level: 1 }),
    ).toBeVisible();
    const sections = page.getByRole("navigation", {
        name: "Settings sections",
    });
    await expect(page.getByRole("heading", { level: 2 })).toHaveText([
        "Appearance",
    ]);
    for (const name of [
        "Appearance",
        "Writing",
        "Document export",
        "Revision checklist",
        "Keyboard shortcuts",
        "Account",
    ]) {
        const button = sections.getByRole("button", { name, exact: true });
        await button.click();
        await expect(button).toHaveAttribute("aria-current", "page");
        await expect(page.getByRole("heading", { level: 2 })).toHaveText([
            name,
        ]);
    }
    await page.screenshot({
        path: "test-results/settings-desktop.png",
        fullPage: true,
    });
    await page.reload();
    await expect(page.getByRole("heading", { level: 2 })).toHaveText([
        "Account",
    ]);

    await sections
        .getByRole("button", { name: "Writing", exact: true })
        .click();

    // Paragraph highlighting starts on and typewriter scrolling off.
    await expect(
        page.getByRole("switch", { name: "Paragraph highlighting" }),
    ).toHaveAttribute("aria-checked", "true");
    await expect(
        page.getByRole("switch", { name: "Typewriter scrolling" }),
    ).toHaveAttribute("aria-checked", "false");
    await expect(page.getByRole("switch", { name: "Focus mode" })).toHaveCount(
        0,
    );
    await page.getByRole("switch", { name: "Paragraph highlighting" }).click();
    await page.getByRole("switch", { name: "Check spelling" }).click();
    await page.getByRole("switch", { name: "Smart punctuation" }).click();
    await page.getByRole("switch", { name: "Typewriter scrolling" }).click();
    await sections
        .getByRole("button", { name: "Appearance", exact: true })
        .click();
    await page
        .getByRole("radiogroup", { name: "Paragraph spacing" })
        .getByRole("radio", { name: /Airy/ })
        .click();
    await sections
        .getByRole("button", { name: "Document export", exact: true })
        .click();
    await page
        .getByRole("radiogroup", { name: "Paper size" })
        .getByRole("radio", { name: "US Letter" })
        .click();
    await page
        .getByRole("radiogroup", { name: "Font" })
        .last()
        .getByRole("radio", { name: "Match editor" })
        .click();
    await page.getByRole("switch", { name: "Start with the title" }).click();
    await settled(page);
    expect(await preferences(page)).toMatchObject({
        paragraphHighlight: false,
        spellcheck: false,
        smartPunctuation: false,
        typewriter: true,
        paragraphSpacing: "spacious",
        exportPageSize: "letter",
        exportFont: "editor",
        exportTitle: true,
    });

    await page.goto("/settings#writing");
    await expect(
        page.getByRole("switch", { name: "Paragraph highlighting" }),
    ).toHaveAttribute("aria-checked", "false");
    await expect(
        page.getByRole("switch", { name: "Typewriter scrolling" }),
    ).toHaveAttribute("aria-checked", "true");

    await page.setViewportSize({ width: 390, height: 844 });
    expect(
        await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
        ),
    ).toBe(true);
    await page.screenshot({
        path: "test-results/settings-mobile.png",
        fullPage: true,
    });
    expect(errors).toEqual([]);
});

test("universal goals can be added, edited and deleted, and are saved to the account", async ({
    page,
}) => {
    test.setTimeout(60_000);
    // A new account starts with the default universal goals.
    await page.goto("/settings#checklist");
    const goals = page.locator("[data-goal]");
    await expect(goals).toHaveCount(3);
    const texts = async () =>
        (await stored(page)).defaultRevisionGoals.map((goal) => goal.text);

    await page.getByRole("button", { name: "Add goal" }).click();
    await page.getByLabel("Goal", { exact: true }).fill("Read it out loud");
    await page
        .getByRole("dialog")
        .getByRole("button", { name: "Add goal" })
        .click();
    await expect(goals).toHaveCount(4);

    await page
        .getByRole("button", {
            name: "Edit universal goal: Find a quieter ending",
        })
        .click();
    await page.getByLabel("Goal", { exact: true }).fill("Find a softer ending");
    await page.getByRole("button", { name: "Save goal" }).click();

    await page
        .getByRole("button", {
            name: "Delete universal goal: Remove repeated ideas",
        })
        .click();
    const expected = [
        "Improve the introduction",
        "Find a softer ending",
        "Read it out loud",
    ];
    await expect.poll(texts, { timeout: 15_000 }).toEqual(expected);

    await page.reload();
    await expect(goals).toHaveText(expected.map((text) => new RegExp(text)));
});

test("focus mode, shortcuts, smart punctuation, the dock and card colours in the editor", async ({
    page,
}) => {
    const errors = errorsFor(page);
    await openSample(page);
    const editor = page.getByRole("textbox", { name: "Document text" });
    await editor.click();
    await editor.press("Control+End");

    // Smart punctuation is on by default.
    await page.keyboard.type(' "Quiet" -- then...');
    await expect(editor).toContainText("“Quiet” — then…");

    await page.keyboard.press("Control+Shift+F");
    await expect(page.locator(".app.focus-mode")).toHaveCount(1);
    await expect
        .poll(() =>
            page
                .locator(".tiptap > p:not(.has-focus)")
                .first()
                .evaluate((el) => Number(getComputedStyle(el).opacity)),
        )
        .toBeLessThan(0.5);
    await expect(page.locator(".tiptap > .has-focus").first()).toHaveCSS(
        "opacity",
        "1",
    );

    await page.keyboard.press("Escape");
    await expect(page.locator(".app.focus-mode")).toHaveCount(0);

    await page.keyboard.press("Control+/");
    const sheet = page.getByRole("dialog", { name: "Keyboard shortcuts" });
    await expect(sheet).toBeVisible();
    await expect(sheet).toContainText("Strikethrough");
    await page.keyboard.press("Escape");
    await expect(sheet).toHaveCount(0);

    await page.getByRole("button", { name: "Hide writing tools" }).click();
    await expect(
        page.getByRole("button", { name: "Show writing tools" }),
    ).toBeVisible();

    await expect
        .poll(async () => (await preferences(page)).toolsOpen)
        .toBe(false);
    await page.reload();
    await expect(
        page.getByRole("button", { name: "Show writing tools" }),
    ).toBeVisible();
    // Focus mode lasts for one visit; the reload brings the full editor back.
    await expect(page.locator(".app.focus-mode")).toHaveCount(0);
    await page.getByRole("button", { name: "Show writing tools" }).click();

    // Card colours: from the popover in the Thoughts drawer, which closes on a pick.
    await page.getByRole("button", { name: "Thoughts", exact: true }).click();
    await page
        .getByRole("button", { name: "Change colour of thought 1" })
        .click();
    await page
        .getByRole("radiogroup", { name: "Colour of thought 1" })
        .getByRole("radio", { name: "Soft Blush" })
        .click();
    await expect
        .poll(async () => {
            const data = await stored(page);
            return data.docs.find((doc) => doc.id === data.active).cards[0].bg;
        })
        .toBe("#F4DED8");
    await expect(
        page.getByRole("radiogroup", { name: "Colour of thought 1" }),
    ).toHaveCount(0);
    await page
        .getByRole("button", { name: "Change colour of thought 2" })
        .click();
    await page
        .getByRole("radiogroup", { name: "Colour of thought 2" })
        .getByRole("radio", { name: "Powder Blue" })
        .click();
    await expect
        .poll(async () => {
            const data = await stored(page);
            return data.docs.find((doc) => doc.id === data.active).cards[1].bg;
        })
        .toBe("#DBE8F4");
    await page.screenshot({ path: "test-results/editor-features.png" });
    expect(errors).toEqual([]);
});
