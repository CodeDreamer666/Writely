import {
    test,
    expect,
    stored,
    openSample,
} from "./fixtures.js";
import { initial } from "../../src/lib/writely/model.ts";
import { LEGACY_STORAGE_KEY as KEY } from "../../src/config/storage.ts";

const current = (data) => data.docs.find((doc) => doc.id === data.active);
async function open(page, customize) {
    if (customize) {
        const seed = initial();
        customize(seed, current(seed));
        await page.addInitScript(
            ({ key, seed }) => {
                if (!localStorage.getItem(key))
                    localStorage.setItem(key, JSON.stringify(seed));
            },
            { key: KEY, seed },
        );
    }
    await openSample(page);
    await page
        .getByRole("button", { name: "Close document list", exact: true })
        .click();
    await expect(page.locator(".annotation-cloud").first()).toBeVisible();
}

test("new cards edit immediately, cycle exact colors, and keep the cycle after deletion and reload", async ({
    page,
}) => {
    await open(page);
    const colors = ["#FCEFB5", "#DBE8F4", "#DDEBDD", "#F4DED8", "#FCEFB5"];
    for (let i = 0; i < colors.length; i++) {
        await page
            .getByRole("button", { name: "Add thought card", exact: true })
            .click();
        const input = page.locator('[contenteditable="plaintext-only"]');
        await expect(input).toBeFocused();
        await expect(page.getByRole("dialog")).toHaveCount(0);
        const card = page.locator(".annotation-cloud").filter({ has: input });
        expect(
            await card.evaluate((el) =>
                el.style.getPropertyValue("--cloud-fill"),
            ),
        ).toBe(colors[i]);
        await input.fill(`Created ${i}`);
        await page
            .getByRole("textbox", { name: "Document text", exact: true })
            .click();
        await expect
            .poll(async () => current(await stored(page)).cards.at(-1).text)
            .toBe(`Created ${i}`);
    }
    await page.getByRole("button", { name: "Thoughts", exact: true }).click();
    await page.getByRole("button", { name: "Delete thought 7" }).click();
    await page.keyboard.press("Escape");
    await expect
        .poll(async () => current(await stored(page)).cards.length)
        .toBe(6);
    const before = (await stored(page)).docs
        .flatMap((doc) => doc.cards)
        .map((card) => [card.id, card.bg]);
    await page.reload();
    await page
        .getByRole("button", { name: "Close document list", exact: true })
        .click();
    await page
        .getByRole("button", { name: "Add thought card", exact: true })
        .click();
    await page
        .locator('[contenteditable="plaintext-only"]')
        .fill("After reload");
    await page
        .getByRole("textbox", { name: "Document text", exact: true })
        .click();
    await expect
        .poll(async () => current(await stored(page)).cards.at(-1).bg)
        .toBe("#DBE8F4");
    const after = (await stored(page)).docs.flatMap((doc) => doc.cards);
    for (const [id, color] of before)
        expect(after.find((card) => card.id === id).bg).toBe(color);
});

test("double click edits in place, Escape cancels, blur saves, and long thoughts scroll without moving", async ({
    page,
}) => {
    await open(page, (_, doc) => {
        doc.cards = [
            {
                ...doc.cards[0],
                id: "edit",
                text: "A short thought.",
                side: "left",
                y: 120,
            },
        ];
    });
    const card = page.locator('[data-card-id="edit"]');
    await page.waitForTimeout(300);
    const before = await card.boundingBox();
    const style = await card.locator(".cloud-body").evaluate((el) => {
        const s = getComputedStyle(el);
        return [s.fontFamily, s.fontSize, s.lineHeight, s.padding];
    });
    await card
        .locator(".thought-inline-text")
        .dblclick({ position: { x: 15, y: 10 } });
    const input = page.getByRole("textbox", {
        name: "Thought 1 text",
        exact: true,
    });
    await expect(input).toBeFocused();
    expect(await card.boundingBox()).toEqual(before);
    expect(
        await input.evaluate(() => window.getSelection().anchorOffset),
    ).toBeLessThan(8);
    await input.fill("Do not save this.");
    await input.press("Escape");
    await expect(card.locator(".thought-inline-text")).toHaveText(
        "A short thought.",
    );
    expect(current(await stored(page)).cards[0].text).toBe("A short thought.");
    await card
        .getByRole("button", { name: "Edit thought 1", exact: true })
        .click();
    const long =
        "A very long thought with some words. ".repeat(500) + "\nLast line.";
    await input.fill(long);
    expect(await card.boundingBox()).toEqual(before);
    expect(
        await card.locator(".cloud-body").evaluate((el) => {
            const s = getComputedStyle(el);
            return [s.fontFamily, s.fontSize, s.lineHeight, s.padding];
        }),
    ).toEqual(style);
    expect(
        await card
            .locator(".cloud-text")
            .evaluate((el) => el.scrollHeight > el.clientHeight),
    ).toBe(true);
    await page
        .getByRole("textbox", { name: "Document text", exact: true })
        .click();
    await expect
        .poll(async () => current(await stored(page)).cards[0].text)
        .toBe(long);
    await expect
        .poll(async () => (await card.boundingBox()).height)
        .toBeGreaterThan(before.height);
    expect((await card.boundingBox()).height).toBeLessThanOrEqual(300.5);
    await page.reload();
    await page
        .getByRole("button", { name: "Close document list", exact: true })
        .click();
    await expect(card.locator(".thought-inline-text")).toHaveText(long);
});

test.describe("touch thought editing", () => {
    test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });
    test("pencil edits on touch without double clicking", async ({ page }) => {
        await openSample(page);
        const close = page.getByRole("button", {
            name: "Close document list",
            exact: true,
        });
        if (await close.isVisible()) await close.click();
        await page
            .getByRole("button", { name: "Add thought card", exact: true })
            .tap();
        const input = page.locator('[contenteditable="plaintext-only"]');
        await expect(input).toBeFocused();
        await input.fill("A touch thought");
        await page
            .getByRole("textbox", { name: "Document text", exact: true })
            .tap();
        await expect
            .poll(async () => current(await stored(page)).cards.at(-1).text)
            .toBe("A touch thought");
        await page
            .getByRole("button", { name: "Edit thought 3", exact: true })
            .tap();
        await expect(input).toBeFocused();
        await input.fill("Edited with a tap");
        await input.press("Tab");
        await expect
            .poll(async () => current(await stored(page)).cards.at(-1).text)
            .toBe("Edited with a tap");
    });
    test("long card text scrolls with touch without dragging the card", async ({
        page,
    }) => {
        await openSample(page);
        await page
            .getByRole("button", { name: "Add thought card", exact: true })
            .tap();
        const input = page.locator('[contenteditable="plaintext-only"]');
        const text = "A thought that keeps going and wraps naturally. ".repeat(
            150,
        );
        await input.fill(text);
        await input.press("Tab");
        await expect
            .poll(async () => current(await stored(page)).cards.at(-1).text)
            .toBe(text);
        const column = page
            .locator(".annotation-cloud")
            .last()
            .locator(".cloud-text");
        await column.scrollIntoViewIfNeeded();
        await column.evaluate((el) => {
            el.scrollTop = 0;
        });
        const card = page.locator(".annotation-cloud").last();
        const before = await card.boundingBox(),
            bounds = await column.boundingBox();
        const session = await page.context().newCDPSession(page);
        const x = bounds.x + bounds.width / 2,
            y = bounds.y + bounds.height - 18;
        await session.send("Input.dispatchTouchEvent", {
            type: "touchStart",
            touchPoints: [{ x, y }],
        });
        for (let i = 1; i <= 8; i++) {
            await session.send("Input.dispatchTouchEvent", {
                type: "touchMove",
                touchPoints: [{ x, y: y - i * 15 }],
            });
        }
        await session.send("Input.dispatchTouchEvent", {
            type: "touchEnd",
            touchPoints: [],
        });
        await expect
            .poll(() => column.evaluate((el) => el.scrollTop))
            .toBeGreaterThan(0);
        expect(await card.boundingBox()).toEqual(before);
    });
});
