import {
    test,
    expect,
} from "@playwright/test";

for (const width of [390, 768, 1024, 1440, 1920]) {
    test(`closing CTA is aligned and clear at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto("/");
        const heading = page.getByRole("heading", { name: /Begin anywhere/ });
        const cta = page.getByRole("link", { name: "Start your first piece" });
        await cta.scrollIntoViewIfNeeded();
        const h = await heading.boundingBox();
        const b = await cta.boundingBox();
        expect(b.y - (h.y + h.height)).toBeGreaterThanOrEqual(23);
        expect(b.y - (h.y + h.height)).toBeLessThanOrEqual(33);
        expect(
            Math.abs(width >= 1024 ? b.x + b.width - h.x - h.width : b.x - h.x),
        ).toBeLessThan(2);
        for (const label of [
            "Leave a thought",
            "Keep every draft",
            "Polish one goal at a time",
        ]) {
            const rect = await page
                .getByText(label, { exact: true })
                .boundingBox();
            const overlaps = (a, c) =>
                a.x < c.x + c.width &&
                a.x + a.width > c.x &&
                a.y < c.y + c.height &&
                a.y + a.height > c.y;
            expect(overlaps(rect, h)).toBe(false);
            expect(overlaps(rect, b)).toBe(false);
        }
        expect(
            await page.evaluate(
                () => document.documentElement.scrollWidth <= innerWidth,
            ),
        ).toBe(true);
    });
}
