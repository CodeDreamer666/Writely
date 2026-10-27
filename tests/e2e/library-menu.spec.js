import {
    test,
    expect,
    openSample,
} from "./fixtures.js";

for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 768, height: 1024 },
    { width: 1024, height: 1366 },
    { width: 1180, height: 820 },
    { width: 390, height: 844 },
    { width: 320, height: 740 },
]) {
    test(`list document menu opens and selects actions at ${viewport.width}px`, async ({
        page,
    }) => {
        test.setTimeout(60_000);
        await page.setViewportSize(viewport);
        await page.emulateMedia({
            colorScheme: viewport.width === 1024 ? "dark" : "light",
        });
        await openSample(page);
        await page.goto("/");
        await page
            .getByRole("radio", { name: "List view", exact: true })
            .click();

        const triggers = page.getByRole("button", {
            name: /^Document actions:/,
        });
        await expect(triggers.first()).toBeVisible({ timeout: 15_000 });
        await expect
            .poll(() =>
                page.evaluate(
                    () =>
                        document.documentElement.scrollWidth <=
                        window.innerWidth,
                ),
            )
            .toBe(true);
        if (viewport.width < 1280) {
            await page.evaluate(() => window.scrollTo(0, 0));
            if (viewport.width < 640) {
                const create = await page
                    .getByRole("button", { name: "New document", exact: true })
                    .boundingBox();
                expect(create.width).toBeLessThan(viewport.width);
                expect(create.height).toBeGreaterThanOrEqual(44);
            }
            for (const name of [
                "All documents",
                "Recent",
                "Pinned",
                "Archived",
            ]) {
                const filter = page
                    .getByRole("navigation", {
                        name: "Library",
                        exact: true,
                    })
                    .getByRole("button", { name: new RegExp(`^${name}`) });
                await filter.scrollIntoViewIfNeeded();
                await expect(filter).toBeInViewport();
            }
            const trigger = await triggers.first().boundingBox();
            expect(trigger.width).toBeGreaterThanOrEqual(44);
            expect(trigger.height).toBeGreaterThanOrEqual(44);
        }
        if (viewport.width >= 768) {
            const brand = await page
                .getByRole("link", { name: "Writely", exact: true })
                .boundingBox();
            const search = await page
                .getByRole("searchbox", { name: "Search documents" })
                .boundingBox();
            const settings = await page
                .getByRole("link", { name: "Settings", exact: true })
                .boundingBox();
            expect(brand.x + brand.width).toBeLessThanOrEqual(search.x);
            expect(search.x + search.width).toBeLessThanOrEqual(settings.x);
        }
        await page.screenshot({
            path: `test-results/library-list-${viewport.width}.png`,
            fullPage: true,
        });
        // Include the last row, where the rounded list can clip a misplaced menu.
        for (const trigger of [triggers.first(), triggers.last()]) {
            await trigger.click();
            await expect(trigger).toHaveAttribute("aria-expanded", "true");
            await expect(
                page.getByRole("menuitem", { name: "Open", exact: true }),
            ).toHaveCount(0);
            await page
                .getByRole("menuitem", { name: "Rename", exact: true })
                .click();
            const dialog = page.getByRole("dialog", {
                name: "Rename document",
            });
            await expect(dialog).toBeVisible();
            await dialog
                .getByRole("button", { name: "Cancel", exact: true })
                .click();
            await expect(page).toHaveURL(/\/$/);
        }
        await page
            .getByRole("radio", { name: "Card view", exact: true })
            .click();
        if (viewport.width >= 640 && viewport.width < 1280) {
            const cards = page
                .getByRole("list", { name: "Documents", exact: true })
                .getByRole("listitem");
            const first = await cards.nth(0).boundingBox();
            const second = await cards.nth(1).boundingBox();
            expect(first.y).toBe(second.y);
            expect(first.width).toBeGreaterThan(180);
            expect(first.x + first.width).toBeLessThanOrEqual(second.x);
        }
        await expect
            .poll(() =>
                page.evaluate(
                    () =>
                        document.documentElement.scrollWidth <=
                        window.innerWidth,
                ),
            )
            .toBe(true);
        await page.screenshot({
            path: `test-results/library-cards-${viewport.width}.png`,
            fullPage: true,
        });
    });
}
