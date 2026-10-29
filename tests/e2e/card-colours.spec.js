import {
    test,
    expect,
    openSample,
    stored,
} from "./fixtures.js";

for (const theme of ["light", "dark"]) {
    test(`thought colours work by keyboard in ${theme} mode`, async ({
        page,
    }) => {
        await page.emulateMedia({ colorScheme: theme });
        const errors = [];
        page.on("pageerror", (error) => errors.push(error.message));
        await openSample(page);
        await page
            .getByRole("button", { name: "Thoughts", exact: true })
            .click();
        const trigger = page.getByRole("button", {
            name: "Change colour of thought 1",
        });
        await trigger.click();
        const group = page.getByRole("radiogroup", {
            name: "Colour of thought 1",
        });
        const initial = group.getByRole("radio", { checked: true });
        await expect(initial).toBeFocused();
        const rect = await initial.boundingBox();
        expect(rect.width).toBeGreaterThanOrEqual(44);
        expect(rect.height).toBeGreaterThanOrEqual(44);
        await page.keyboard.press("ArrowRight");
        const next = group.getByRole("radio", { checked: true });
        await expect(next).toBeFocused();
        const name = await next.getAttribute("aria-label");
        const preview = await next
            .locator("span")
            .evaluate((el) => getComputedStyle(el).backgroundColor);
        expect(preview).not.toBe("rgba(0, 0, 0, 0)");
        await page.keyboard.press("Space");
        await expect(trigger).toBeFocused();
        await trigger.click();
        await expect(
            group.getByRole("radio", { name, checked: true }),
        ).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(trigger).toBeFocused();
        const colours = {
            "Butter Yellow": "#FCEFB5",
            "Sage Green": "#DDEBDD",
            "Powder Blue": "#DBE8F4",
            "Soft Blush": "#F4DED8",
        };
        await expect
            .poll(async () => {
                const data = await stored(page);
                return data.docs.find((doc) => doc.id === data.active).cards[0]
                    .bg;
            })
            .toBe(colours[name]);
        expect(errors).toEqual([]);
    });
}

test("compact cards offer an accessible colour picker", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openSample(page);
    await page.getByRole("button", { name: "Thoughts", exact: true }).click();
    const trigger = page.getByRole("button", {
        name: "Change colour of card 1",
    });
    await trigger.click();
    const group = page.getByRole("radiogroup", { name: "Colour of card 1" });
    const swatch = group.getByRole("radio", { name: "Soft Blush" });
    await expect(swatch).toBeVisible();
    const box = await group.boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(390);
    await swatch.click();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect
        .poll(async () => {
            const data = await stored(page);
            return data.docs.find((doc) => doc.id === data.active).cards[0].bg;
        })
        .toBe("#F4DED8");
});
