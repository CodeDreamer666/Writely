import {
    test,
    expect,
    trpc,
} from "./fixtures.js";
import { makeDoc } from "../../src/lib/writely/model.ts";

const OLD = [
    "The bus was almost empty when I left the city. A woman in a green coat sat near the front. Outside, the streets were still wet from the morning rain.",
    "I had spent the weekend trying to explain why I wanted to leave.",
    "There is a particular kind of silence that follows you out of a familiar place.",
    "This paragraph will be cut from the draft entirely.",
];
const NEW = [
    "The bus was almost empty when I left the city. Nobody looked up when the doors closed behind me. Outside, the streets were still wet from the morning rain.",
    "I had spent the whole weekend trying to explain why I wanted to leave.",
    "There is a particular kind of silence that follows you out of a familiar place.",
    "A new ending arrives here, written after everything else.",
];
const html = (paragraphs) => paragraphs.map((p) => `<p>${p}</p>`).join("");

/** A document whose "Revised" draft rewrites a sentence, adds a word and replaces a paragraph. */
async function openComparison(page) {
    await page.goto("/welcome");
    const doc = {
        ...makeDoc("Comparison check", html(NEW)),
        drafts: [
            {
                id: "revised",
                name: "Revised",
                html: html(NEW),
                title: "Comparison check",
                time: Date.now(),
            },
            {
                id: "original",
                name: "Original",
                html: html(OLD),
                title: "Comparison check",
                time: Date.now() - 60_000,
            },
        ],
    };
    await trpc(page, "documents.create", { documents: [doc] });
    await trpc(page, "account.markWelcomed");
    await page.goto(`/d/${doc.id}`);
    await page.getByRole("textbox", { name: "Document text" }).waitFor();
    await page
        .getByRole("button", { name: "Saved drafts", exact: true })
        .click();
    await page
        .getByRole("button", { name: "Compare", exact: true })
        .first()
        .click();
    const compare = page.locator(".comparison");
    await expect(
        compare.getByText("Draft comparison", { exact: true }),
    ).toBeVisible();
    await compare.getByLabel("Baseline draft").selectOption("original");
    await compare.getByLabel("Revised draft").selectOption("revised");
    return compare;
}

test("side by side on wide screens, grouped changes, and stepping through them", async ({
    page,
}) => {
    await page.setViewportSize({ width: 1280, height: 860 });
    const compare = await openComparison(page);
    await expect(compare.locator(".compare-split")).toBeVisible();
    await expect(compare.locator(".compare-unified")).toBeHidden();
    await expect(compare.getByRole("status")).toHaveText("3 changes");

    // The rewritten sentence is one removal and one addition, not scattered words.
    const before = compare.locator("[data-side='before']"),
        after = compare.locator("[data-side='after']");
    await expect(before.locator("del").first()).toHaveText(
        "Removed: A woman in a green coat sat near the front.",
    );
    await expect(after.locator("ins").first()).toHaveText(
        "Added: Nobody looked up when the doors closed behind me.",
    );
    // The small edit marks only the added word.
    await expect(after.locator("ins").nth(1)).toHaveText("Added: whole");
    expect(await compare.locator(".compare-split :is(del, ins)").count()).toBe(
        3,
    );
    // Unchanged text isn't highlighted, and the two sides line up row by row.
    const same = OLD[2];
    const left = await before.getByText(same).boundingBox(),
        right = await after.getByText(same).boundingBox();
    expect(Math.abs(left.y - right.y)).toBeLessThan(1);

    // Added text isn't struck through; removed text is.
    const ins = after.locator("ins").first(),
        del = before.locator("del").first();
    expect(
        await ins.evaluate((el) => getComputedStyle(el).textDecorationLine),
    ).toBe("none");
    expect(
        await del.evaluate((el) => getComputedStyle(el).textDecorationLine),
    ).toContain("line-through");

    // Previous / Next change walk through the changes in order.
    const next = compare.getByRole("button", { name: "Next change" }),
        previous = compare.getByRole("button", { name: "Previous change" });
    await expect(previous).toBeDisabled();
    await next.click();
    await expect(compare.getByRole("status")).toHaveText("1 of 3");
    await next.click();
    await next.click();
    await expect(compare.getByRole("status")).toHaveText("3 of 3");
    await expect(next).toBeDisabled();
    const current = compare.locator(".compare-split [data-current]").first();
    await expect(current).toBeInViewport();
    await previous.click();
    await expect(compare.getByRole("status")).toHaveText("2 of 3");

    // Back returns to the editor.
    await compare.getByRole("button", { name: "Back to editing" }).click();
    await expect(
        page.getByRole("textbox", { name: "Document text" }),
    ).toBeVisible();
});

test("one readable text on phones, with removals right before their replacements", async ({
    page,
}) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const compare = await openComparison(page);
    const unified = compare.locator(".compare-unified");
    await expect(unified).toBeVisible();
    await expect(compare.locator(".compare-split")).toBeHidden();

    // Removed then added, in reading order, inside the same paragraph.
    const first = unified.locator("p").first();
    await expect(first.locator("del")).toHaveText(
        "Removed: A woman in a green coat sat near the front.",
    );
    expect(
        await first.evaluate((p) => {
            const del = p.querySelector("del");
            return del?.nextElementSibling?.tagName;
        }),
    ).toBe("INS");
    // A replaced paragraph: the old one, then the new one straight after it.
    const blocks = unified.locator("> div[data-change]");
    await expect(blocks).toHaveCount(2);
    await expect(blocks.nth(0)).toContainText(OLD[3]);
    await expect(blocks.nth(1)).toContainText(NEW[3]);

    // Nothing scrolls sideways, and the actions never cover the text.
    expect(
        await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
        ),
    ).toBe(true);
    const scroller = compare.locator(".comparison-scroll");
    await scroller.evaluate((el) => el.scrollTo(0, el.scrollHeight));
    const last = await blocks.nth(1).boundingBox(),
        bar = await compare.locator(".comparison-bottom").boundingBox();
    expect(last.y + last.height).toBeLessThanOrEqual(bar.y);

    // Next change brings each change into view.
    await scroller.evaluate((el) => el.scrollTo(0, 0));
    for (let i = 0; i < 3; i++)
        await compare.getByRole("button", { name: "Next change" }).click();
    await expect(compare.getByRole("status")).toHaveText("3 of 3");
    await expect(unified.locator("[data-current]").first()).toBeInViewport();
});

test("restoring from the comparison asks first and keeps the current text", async ({
    page,
}) => {
    await page.setViewportSize({ width: 1280, height: 860 });
    const compare = await openComparison(page);
    // Make the earlier draft the one on the right, then restore it.
    await compare.getByLabel("Revised draft").selectOption("original");
    await compare.getByRole("button", { name: "Restore this version" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText("Restore");
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(compare).toBeVisible();

    await compare.getByRole("button", { name: "Restore this version" }).click();
    await page.getByRole("button", { name: "Preserve & restore" }).click();
    const editor = page.getByRole("textbox", { name: "Document text" });
    await expect(editor).toContainText(OLD[3]);
});
