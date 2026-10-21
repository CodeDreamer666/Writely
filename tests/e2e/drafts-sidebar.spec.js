import {
    test,
    expect,
    stored,
    openSample,
} from "./fixtures.js";
import { initial } from "../../src/lib/writely/model.ts";
import { LEGACY_STORAGE_KEY as KEY } from "../../src/config/storage.ts";

const title =
    "A very long saved draft title that should remain on one line while its complete title is available in a lightweight preview";
async function open(page) {
    const seed = initial();
    seed.docs[0].drafts[0].name = title;
    seed.docs[0].drafts[0].id = "long-draft";
    seed.docs[0].drafts.push({
        ...seed.docs[0].drafts[0],
        id: "short-draft",
        name: "Hi",
        time: Date.now(),
    });
    await page.addInitScript(
        ({ key, seed }) => {
            if (!localStorage.getItem(key))
                localStorage.setItem(key, JSON.stringify(seed));
        },
        { key: KEY, seed },
    );
    await openSample(page);
    const close = page.getByRole("button", {
        name: "Close document list",
        exact: true,
    });
    if (await close.isVisible()) await close.click();
    await page
        .getByRole("button", { name: "Saved drafts", exact: true })
        .click();
    await expect(page.locator(".drafts-panel")).toBeVisible();
    await expect(page.locator(".drafts-panel")).toHaveCSS(
        "transform",
        "matrix(1, 0, 0, 1, 0, 0)",
    );
}

test("draft menu deletes only the confirmed draft and persists its updated timeline", async ({
    page,
}) => {
    await open(page);
    const before = await stored(page);
    const panel = page.locator(".drafts-panel");
    const heading = await panel
        .getByRole("heading", { name: "Your drafts", exact: true })
        .boundingBox();
    const save = await panel
        .getByRole("button", { name: "Save named draft", exact: true })
        .boundingBox();
    expect(save.y - (heading.y + heading.height)).toBeGreaterThanOrEqual(16);
    expect(save.y - (heading.y + heading.height)).toBeLessThanOrEqual(20);
    await panel
        .getByRole("button", { name: "Draft actions: Hi", exact: true })
        .click();
    await expect(panel.getByRole("menuitem")).toHaveText([
        "Rename",
        "Restore",
        "Delete",
    ]);
    await panel.getByRole("menuitem", { name: "Delete", exact: true }).click();
    const dialog = page.getByRole("dialog", {
        name: "Delete “Hi”?",
        exact: true,
    });
    await expect(dialog).toContainText("permanently");
    await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(panel.locator(".draft-entry")).toHaveCount(2);
    await panel
        .getByRole("button", { name: "Draft actions: Hi", exact: true })
        .click();
    await panel.getByRole("menuitem", { name: "Delete", exact: true }).click();
    await dialog
        .getByRole("button", { name: "Delete draft", exact: true })
        .click();
    await expect(panel.locator(".draft-entry")).toHaveCount(1);
    await expect(panel.locator(".draft-entry.is-latest")).toContainText(title);
    await expect
        .poll(async () => (await stored(page)).docs[0].drafts.length)
        .toBe(1);
    const after = await stored(page);
    expect(after.docs[0].html).toBe(before.docs[0].html);
    expect(after.docs[0].cards).toEqual(before.docs[0].cards);
    expect(after.docs[0].drafts).toEqual(
        before.docs[0].drafts.filter((d) => d.id !== "short-draft"),
    );
    expect(after.docs.slice(1)).toEqual(before.docs.slice(1));
    await page.reload();
    await page
        .getByRole("button", { name: "Saved drafts", exact: true })
        .click();
    await expect(page.locator(".draft-entry")).toHaveCount(1);
});

test("truncated draft titles preview on hover and focus without changing card layout", async ({
    page,
}) => {
    await open(page);
    const heading = page.locator(".draft-title").filter({ hasText: title });
    const card = heading.locator("..").locator("..");
    const before = await card.boundingBox();
    await expect(heading).toHaveCSS("white-space", "nowrap");
    await expect(heading).toHaveCSS("text-overflow", "ellipsis");
    await heading.hover();
    await expect(
        page.getByRole("tooltip").filter({ hasText: title }),
    ).toBeVisible();
    expect(await card.boundingBox()).toEqual(before);
    await page
        .getByRole("heading", { name: "Your drafts", exact: true })
        .hover();
    await expect(page.locator(".draft-title-preview")).not.toBeVisible();
    await heading.focus();
    await expect(page.locator(".draft-title-preview")).toBeVisible();
    await heading.press("Escape");
    await expect(page.locator(".draft-title-preview")).not.toBeVisible();
    const short = page.locator(".draft-title").filter({ hasText: /^Hi$/ });
    await short.hover();
    await expect(short).not.toHaveAttribute("tabindex", "0");
    await expect(page.locator(".draft-title-preview")).not.toBeVisible();
    await heading.hover();
    await page.screenshot({ path: "evidence/draft-title-preview.png" });
});

test.describe("touch titles", () => {
    test.use({
        hasTouch: true,
        isMobile: true,
        viewport: { width: 390, height: 844 },
    });
    test("tap previews a truncated title and outside taps dismiss it", async ({
        page,
    }) => {
        await open(page);
        const heading = page.locator(".draft-title").filter({ hasText: title });
        await heading.tap();
        await expect(
            page.getByRole("dialog", { name: "Full draft title" }),
        ).toBeVisible();
        await expect(heading).toHaveAttribute("aria-expanded", "true");
        const rect = await page.locator(".draft-title-preview").boundingBox();
        expect(rect.x).toBeGreaterThanOrEqual(0);
        expect(rect.x + rect.width).toBeLessThanOrEqual(390);
        await page
            .getByRole("heading", { name: "Your drafts", exact: true })
            .tap();
        await expect(page.locator(".draft-title-preview")).not.toBeVisible();
    });
});
