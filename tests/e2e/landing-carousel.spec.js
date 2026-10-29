import {
    test,
    expect,
} from "@playwright/test";

test("appearance previews can be dragged and remain interactive", async ({
    page,
}) => {
    await page.goto("/");
    const previews = page.getByRole("list", { name: "Appearance previews" });
    await previews.scrollIntoViewIfNeeded();
    const before = await previews.evaluate((el) => el.scrollLeft);
    const box = await previews.boundingBox();
    await page.mouse.move(box.x + box.width * 0.7, box.y + 30);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.3, box.y + 30, { steps: 8 });
    await page.mouse.up();
    await expect
        .poll(() => previews.evaluate((el) => el.scrollLeft))
        .toBeGreaterThan(before);
    await previews.getByRole("button", { name: "Wide" }).click();
    await expect(
        previews.getByRole("button", { name: "Wide" }),
    ).toHaveAttribute("aria-pressed", "true");
});
