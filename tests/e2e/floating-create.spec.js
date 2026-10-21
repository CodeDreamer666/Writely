import {
    test,
    expect,
    stored,
    openSample,
} from "./fixtures.js";
test("quiet plus creates a draft and save feedback never expands rows", async ({
    page,
}) => {
    await openSample(page);
    const plus = page.getByRole("button", {
        name: "Create draft",
        exact: true,
    });
    await expect(plus).toBeVisible();
    await expect(plus).toHaveText("");
    expect(
        await plus.evaluate((el) => getComputedStyle(el).backgroundColor),
    ).toBe("rgba(0, 0, 0, 0)");
    const box = await plus.boundingBox(),
        label = await page.locator(".rail-heading>span").boundingBox();
    expect(
        Math.abs(box.y + box.height / 2 - label.y - label.height / 2),
    ).toBeLessThan(1);
    expect(box.x).toBeGreaterThan(label.x + label.width);
    await plus.hover();
    await expect(
        page.getByRole("tooltip", { name: "Create draft", exact: true }),
    ).toBeVisible();
    const rows = page.locator(".document-row"),
        before = await rows.evaluateAll((nodes) =>
            nodes.map((el) => el.getBoundingClientRect().height),
        );
    expect(before.every((h) => h === 40)).toBe(true);
    const editor = page.getByRole("textbox", { name: "Document text" });
    await editor.click();
    await editor.press("Control+End");
    const typing = page.keyboard.type(" A thought saved quietly.", {
        delay: 50,
    });
    await expect(page.locator(".document-saving")).toBeVisible();
    expect(
        await rows.evaluateAll((nodes) =>
            nodes.map((el) => el.getBoundingClientRect().height),
        ),
    ).toEqual(before);
    await typing;
    await expect(page.locator(".document-saving")).toHaveCount(0);
    expect(
        await rows.evaluateAll((nodes) =>
            nodes.map((el) => el.getBoundingClientRect().height),
        ),
    ).toEqual(before);
    await page.screenshot({ path: "evidence/floating-create-sidebar.png" });
    await page
        .getByRole("button", { name: "Close document list", exact: true })
        .click();
    await page.waitForTimeout(300);
    await page
        .getByRole("button", { name: "Show documents", exact: true })
        .click();
    await plus.click();
    await expect(page.locator(".document-row.active")).toContainText(
        "A new piece",
    );
    await expect(editor).toHaveText("");
});
