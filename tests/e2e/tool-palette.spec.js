import {
    test,
    expect,
    stored,
    openSample,
} from "./fixtures.js";
import { initial } from "../../src/lib/writely/model.ts";
import { LEGACY_STORAGE_KEY as KEY } from "../../src/config/storage.ts";
test("tools collapse, reopen above cards and preserve manuscript/card positions", async ({
    page,
}) => {
    const seed = initial();
    seed.docs[0].cards = [
        {
            ...seed.docs[0].cards[0],
            id: "right-card",
            placement: "free",
            side: "right",
            x: 1,
            y: 330,
        },
    ];
    await page.addInitScript(
        ({ key, seed }) => {
            if (!localStorage.getItem(key))
                localStorage.setItem(key, JSON.stringify(seed));
        },
        { key: KEY, seed },
    );
    await openSample(page);
    await page
        .getByRole("button", { name: "Close document list", exact: true })
        .click();
    await page.waitForTimeout(300);
    const card = page.locator('[data-card-id="right-card"]'),
        paper = page.locator(".paper");
    await expect(card).toBeVisible();
    const before = await card.boundingBox(),
        manuscript = await paper.boundingBox();
    expect(before.x + before.width).toBeGreaterThan(1390);
    await page
        .getByRole("button", { name: "Hide writing tools", exact: true })
        .click();
    await expect(page.locator(".workspace-tools")).toBeHidden();
    await expect(page.locator(".workspace-tools")).toHaveAttribute("inert", "");
    await expect(
        page.getByRole("button", { name: "Show writing tools", exact: true }),
    ).toHaveAttribute("aria-expanded", "false");
    const launcher = page.getByRole("button", {
        name: "Show writing tools",
        exact: true,
    });
    const launchRect = await launcher.boundingBox(),
        headerRect = await page.locator(".workspace").boundingBox();
    expect(launchRect.x + launchRect.width).toBeLessThanOrEqual(
        headerRect.x + headerRect.width,
    );
    expect(launchRect.y).toBeGreaterThanOrEqual(headerRect.y);
    expect(launchRect.y + launchRect.height).toBeLessThan(64);
    expect(await card.boundingBox()).toEqual(before);
    expect(await paper.boundingBox()).toEqual(manuscript);
    await page
        .getByRole("button", { name: "Show writing tools", exact: true })
        .click();
    await expect(
        page.getByRole("button", { name: "Add thought card", exact: true }),
    ).toBeVisible();
    expect(await card.boundingBox()).toEqual(before);
    const tool = await page.locator(".workspace-tools").boundingBox();
    expect(tool.x).toBeLessThan(before.x + before.width);
    expect(tool.y).toBeLessThan(before.y + before.height);
    await page
        .getByRole("button", { name: "Writing statistics", exact: true })
        .click();
    await expect(
        page.getByRole("dialog", { name: "Writing statistics" }),
    ).toBeVisible();
    await page
        .getByRole("button", { name: "Close dialog", exact: true })
        .click();
    await page
        .getByRole("button", { name: "Hide writing tools", exact: true })
        .click();
    await page.screenshot({ path: "evidence/tools-collapsed.png" });
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(
        page.getByRole("button", { name: "Show writing tools", exact: true }),
    ).toBeVisible();
    await page
        .getByRole("button", { name: "Show writing tools", exact: true })
        .click();
    expect(
        await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
        ),
    ).toBe(true);
});
