import {
    test,
    expect,
    stored,
    openSample,
} from "./fixtures.js";

test("checklist stays flat with full-width dividers and draft-specific add button", async ({
    page,
}) => {
    await openSample(page);
    await page
        .getByRole("button", { name: "Close document list", exact: true })
        .click();
    await page
        .getByRole("button", { name: "Revision checklist", exact: true })
        .click();
    const panel = page.locator(".utility-panel"),
        groups = panel.locator(".revision-group");
    await expect(panel).toHaveClass(/is-open/);
    await page.waitForTimeout(250);
    const panelTitle = await panel
        .getByRole("heading", { name: "Revision Checklist", exact: true })
        .boundingBox();
    const universalTitle = await panel
        .getByRole("heading", { name: "Universal goals", exact: true })
        .boundingBox();
    expect(
        universalTitle.y - panelTitle.y - panelTitle.height,
    ).toBeLessThanOrEqual(24);
    await expect(
        panel
            .locator(".panel-header")
            .getByRole("button", { name: "Add revision goal", exact: true }),
    ).toHaveCount(0);
    const draft = groups.filter({
        has: page.getByRole("heading", { name: "This draft", exact: true }),
    });
    await expect(draft).toContainText(
        "What would you like to improve in this draft?",
    );
    // While the draft has no goals, the empty row holds the only Add button.
    await expect(
        draft
            .locator(".revision-group-heading")
            .getByRole("button", { name: "Add revision goal", exact: true }),
    ).toHaveCount(0);
    await expect(
        draft
            .locator(".empty")
            .getByRole("button", { name: "Add revision goal", exact: true }),
    ).toHaveText("Add goal");
    const row = groups.first().locator(".check-row").first(),
        button = row.locator(".check-start");
    await expect(button.locator(":scope > svg")).toHaveCount(0);
    const before = await row.boundingBox();
    await button.hover();
    await expect(row).not.toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await page.screenshot({ path: "evidence/revision-checklist-hover.png" });
    expect(await row.boundingBox()).toEqual(before);
    expect(
        await button.evaluate((el) => getComputedStyle(el).backgroundColor),
    ).toBe("rgba(0, 0, 0, 0)");
    const border = await groups
        .first()
        .locator(".check-row")
        .nth(1)
        .evaluate((el) => ({
            width: el.getBoundingClientRect().width,
            parent: el.parentElement.getBoundingClientRect().width,
            top: getComputedStyle(el).borderTopWidth,
            radius: getComputedStyle(el).borderRadius,
        }));
    expect(border.width).toBe(border.parent);
    expect(border.top).toBe("1px");
    expect(border.radius).toBe("0px");
    await add.click();
    await page
        .getByLabel("Revision goal", { exact: true })
        .fill("Keep the ending clear");
    await page
        .getByRole("dialog")
        .getByRole("button", { name: "Add", exact: true })
        .click();
    await expect(draft.locator(".check-start")).toContainText(
        "Keep the ending clear",
    );
    await expect
        .poll(async () =>
            (await stored(page)).docs[0].checks.some(
                (check) => check.text === "Keep the ending clear",
            ),
        )
        .toBe(true);
    await page.screenshot({
        path: "evidence/revision-checklist.png",
        fullPage: true,
    });
    await draft.locator(".check-start").click();
    await expect(
        page.getByRole("group", { name: "Revision actions", exact: true }),
    ).toBeVisible();
    await expect
        .poll(async () => (await stored(page)).docs[0].session?.goal)
        .toBe("Keep the ending clear");
    await page
        .getByRole("button", { name: "Finish revision", exact: true })
        .click();
    await expect(draft.locator(".check-start.complete")).toContainText(
        "Keep the ending clear",
    );
    await expect
        .poll(
            async () =>
                (await stored(page)).docs[0].checks.find(
                    (check) => check.text === "Keep the ending clear",
                )?.done,
        )
        .toBe(true);
});
