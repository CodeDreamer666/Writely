import {
    test,
    expect,
    openSample,
    trpc,
} from "./fixtures.js";

test("saved settings change the editor after a reload", async ({ page }) => {
    const id = await openSample(page);
    await trpc(page, "account.updatePreferences", {
        theme: "dark",
        editorWidth: "wide",
        fontSize: 20,
        fontFamily: "serif",
        lineSpacing: "spacious",
        paragraphHighlight: false,
        spellcheck: false,
        smartPunctuation: false,
    });
    await page.goto(`/d/${id}`);
    const editor = page.getByRole("textbox", { name: "Document text" });
    await editor.waitFor();

    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    const app = page.locator(".app");
    await expect(app).toHaveAttribute("spellcheck", "false");
    expect(
        await app.evaluate((el) => el.style.getPropertyValue("--editor-width")),
    ).toBe("900px");
    await expect(editor).toHaveCSS("font-size", "20px");
    await expect(editor).toHaveCSS("line-height", "40px");
    expect(
        await editor.evaluate((el) => getComputedStyle(el).fontFamily),
    ).toContain("Georgia");

    // Smart punctuation off keeps straight quotes.
    await editor.click();
    await editor.press("Control+End");
    await page.keyboard.type(' "Plain" -- ');
    await expect(editor).toContainText('"Plain" --');

    // Focus mode without paragraph highlighting leaves every paragraph bright.
    await page.keyboard.press("Control+Shift+F");
    await expect(app).toHaveClass(/focus-mode/);
    await expect(app).not.toHaveClass(/paragraph-highlight/);
});

test("library layout is saved to the account and sorting lives in the address", async ({
    page,
}) => {
    await openSample(page);
    await page.goto("/");
    await page
        .getByRole("radiogroup", { name: "Layout" })
        .getByRole("radio", { name: "List view", exact: true })
        .click();
    await expect
        .poll(() =>
            page.evaluate(async () => {
                const response = await fetch("/api/trpc/account.preferences");
                return (await response.json()).result.data.json;
            }),
        )
        .toMatchObject({ libraryView: "list" });

    await page.getByLabel("Sort by").selectOption("title-asc");
    await expect(page).toHaveURL(/sort=title-asc/);
    const actions = page.getByRole("button", { name: /^Document actions: / });
    await expect
        .poll(async () => {
            const shown = (
                await actions.evaluateAll((buttons) =>
                    buttons.map((b) => b.getAttribute("aria-label")),
                )
            ).map((label) => label.replace("Document actions: ", ""));
            return (
                shown.length > 1 &&
                shown.every(
                    (title, i) =>
                        !i ||
                        shown[i - 1].localeCompare(title, undefined, {
                            sensitivity: "base",
                        }) <= 0,
                )
            );
        })
        .toBe(true);

    await page.reload();
    await expect(page.getByLabel("Sort by")).toHaveValue("title-asc");
    await expect(
        page
            .getByRole("radiogroup", { name: "Layout" })
            .getByRole("radio", { name: "List view", exact: true }),
    ).toHaveAttribute("aria-checked", "true");
});
