import {
    test,
    expect,
} from "@playwright/test";

test("sign-in artwork stays fixed when the form changes height", async ({
    page,
}) => {
    await page.setViewportSize({ width: 1280, height: 665 });
    await page.goto("/sign-in");
    const artwork = page.getByText(
        "Begin anywhere. Every thought has somewhere to go.",
    );
    const before = await artwork.boundingBox();
    await page
        .getByRole("tab", { name: "Create account", exact: true })
        .click();
    await expect(page.getByLabel("Name", { exact: true })).toBeVisible();
    const after = await artwork.boundingBox();
    expect(Math.abs(after.y - before.y)).toBeLessThan(1);
    await page
        .getByRole("tab", { name: "Sign in", exact: true })
        .click();
    const restored = await artwork.boundingBox();
    expect(Math.abs(restored.y - before.y)).toBeLessThan(1);
});

