import {
    test,
    expect,
    stored,
    openSample,
} from "./fixtures.js";
import { initial } from "../../src/lib/writely/model.ts";
import { LEGACY_STORAGE_KEY as KEY } from "../../src/config/storage.ts";

const current = (data) => data.docs.find((d) => d.id === data.active);
const manuscript = (page) =>
    page.getByRole("textbox", { name: "Document text", exact: true });
const toolbar = (page) =>
    page.getByRole("toolbar", { name: "Text formatting", exact: true });

async function open(page) {
    const seed = initial();
    seed.docs[0].html = "<p>Alpha beta gamma.</p><p>A second paragraph.</p>";
    seed.docs[0].cards = [
        {
            ...seed.docs[0].cards[0],
            id: "note",
            side: "left",
            y: 180,
            connectors: [],
        },
    ];
    await page.addInitScript(
        ({ seed, key }) => localStorage.setItem(key, JSON.stringify(seed)),
        { seed, key: KEY },
    );
    await openSample(page);
    const close = page.getByRole("button", {
        name: "Close document list",
        exact: true,
    });
    if (await close.isVisible()) await close.click();
}
async function select(page, text) {
    await manuscript(page).evaluate((el, text) => {
        el.focus();
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        let node;
        while ((node = walker.nextNode())) {
            const offset = node.textContent.indexOf(text);
            if (offset < 0) continue;
            const range = document.createRange();
            range.setStart(node, offset);
            range.setEnd(node, offset + text.length);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
            document.dispatchEvent(new Event("selectionchange"));
            return;
        }
        throw new Error("Text not found");
    }, text);
    await expect(toolbar(page)).toBeVisible();
}

test("formatting floats only over selected text, keeps selections, and persists headings and marks", async ({
    page,
}) => {
    await open(page);
    await expect(toolbar(page)).not.toBeVisible();
    await manuscript(page).click();
    await expect(toolbar(page)).not.toBeVisible();
    await select(page, "Alpha");
    expect(
        await toolbar(page)
            .locator("select,button")
            .evaluateAll((controls) =>
                controls.map((el) => el.getAttribute("aria-label")),
            ),
    ).toEqual([
        "Paragraph",
        "Bold",
        "Italic",
        "Insert/Edit Link",
        "Bullet List",
        "Numbered List",
        "Blockquote",
        "Horizontal Divider",
        "More formatting",
    ]);
    await toolbar(page)
        .getByRole("button", { name: "Bold", exact: true })
        .click();
    await expect(manuscript(page).locator("strong")).toHaveText("Alpha");
    await manuscript(page).press("ControlOrMeta+i");
    await expect(manuscript(page).locator("strong em")).toHaveText("Alpha");
    await toolbar(page)
        .getByRole("combobox", { name: "Paragraph" })
        .selectOption("1");
    await expect(manuscript(page).locator("h1")).toHaveText(
        "Alpha beta gamma.",
    );
    await expect(toolbar(page).getByRole("combobox")).toHaveValue("1");
    await manuscript(page).press("ControlOrMeta+z");
    await expect(manuscript(page).locator("h1")).toHaveCount(0);
    await manuscript(page).press("ControlOrMeta+Shift+z");
    await expect(manuscript(page).locator("h1")).toHaveCount(1);
    await page.screenshot({ path: "evidence/document-selection-toolbar.png" });
    await expect
        .poll(async () => current(await stored(page)).html)
        .toContain("<h1>");
    await page.reload();
    await expect(manuscript(page).locator("h1 strong em")).toHaveText("Alpha");
});

test("links support keyboard insertion, editing, opening, validation, removal, and undo", async ({
    page,
}) => {
    await open(page);
    await select(page, "beta");
    await manuscript(page).press("ControlOrMeta+k");
    const dialog = page.getByRole("dialog", { name: "Edit link", exact: true });
    await expect(dialog).toBeVisible();
    await dialog.getByLabel("URL", { exact: true }).fill("javascript:alert(1)");
    await dialog.getByRole("button", { name: "Apply" }).click();
    await expect(dialog.getByRole("alert")).toBeVisible();
    await dialog.getByLabel("URL", { exact: true }).fill("example.com");
    await dialog.getByRole("button", { name: "Apply" }).click();
    await expect(manuscript(page).locator("a")).toHaveText("beta");
    await expect(manuscript(page).locator("a")).toHaveAttribute(
        "href",
        "https://example.com/",
    );
    await select(page, "beta");
    await toolbar(page)
        .getByRole("button", { name: "Insert/Edit Link" })
        .click();
    await dialog
        .getByLabel("URL", { exact: true })
        .fill("https://example.com/edited");
    await expect(
        dialog.getByRole("link", { name: "Open link" }),
    ).toHaveAttribute("href", "https://example.com/edited");
    await dialog.getByRole("button", { name: "Apply" }).click();
    await expect
        .poll(async () => current(await stored(page)).html)
        .toContain("https://example.com/edited");
    await select(page, "beta");
    await manuscript(page).press("ControlOrMeta+k");
    await dialog.getByRole("button", { name: "Remove link" }).click();
    await expect(manuscript(page).locator("a")).toHaveCount(0);
    await manuscript(page).press("ControlOrMeta+z");
    await expect(manuscript(page).locator("a")).toHaveAttribute(
        "href",
        "https://example.com/edited",
    );
});

test("list editing and secondary formats use editable persistent blocks", async ({
    page,
}) => {
    await open(page);
    await select(page, "Alpha");
    await toolbar(page).getByRole("button", { name: "Numbered List" }).click();
    await expect(manuscript(page).locator("ol li")).toHaveCount(1);
    await manuscript(page).press("ArrowRight");
    await manuscript(page).press("End");
    await manuscript(page).press("Enter");
    await page.keyboard.type("Next item");
    await expect(manuscript(page).locator("ol li")).toHaveCount(2);
    await manuscript(page).press("Tab");
    await expect(manuscript(page).locator("ol li ol li")).toHaveCount(1);
    await manuscript(page).press("Shift+Tab");
    await expect(manuscript(page).locator("ol > li")).toHaveCount(2);
    await manuscript(page).press("Enter");
    await manuscript(page).press("Enter");
    await expect(manuscript(page).locator(":scope > p")).toHaveCount(2);
    await select(page, "second");
    for (const name of ["Strikethrough", "Inline Code"]) {
        await toolbar(page)
            .getByRole("button", { name: "More formatting" })
            .click();
        await page.getByRole("menuitemcheckbox", { name, exact: true }).click();
    }
    await expect(manuscript(page).locator("code")).toHaveText("second");
    await select(page, "Alpha");
    await toolbar(page)
        .getByRole("button", { name: "More formatting" })
        .click();
    await page
        .getByRole("menuitemcheckbox", { name: "Checklist", exact: true })
        .click();
    await expect(
        manuscript(page).locator('[data-type="taskList"]'),
    ).toBeVisible();
    await manuscript(page).getByRole("checkbox").first().check();
    await expect
        .poll(async () => current(await stored(page)).html)
        .toContain('data-checked="true"');
    await select(page, "second");
    await toolbar(page)
        .getByRole("button", { name: "More formatting" })
        .click();
    await page
        .getByRole("menuitemcheckbox", { name: "Code Block", exact: true })
        .click();
    await expect(manuscript(page).locator("pre code")).toContainText(
        "A second paragraph.",
    );
    await manuscript(page).press("ArrowRight");
    await manuscript(page).press("End");
    await manuscript(page).press("Enter");
    await page.keyboard.type("editable code");
    await expect(manuscript(page).locator("pre code")).toContainText(
        "editable code",
    );
});

test("card attachments remain aligned across block formatting, undo, redo and reload", async ({
    page,
}) => {
    await open(page);
    await select(page, "Alpha beta");
    await page
        .getByRole("button", { name: "Connect to thought", exact: true })
        .click();
    await page.locator('[data-card-id="note"] .cloud-body').click();
    const target = async () =>
        current(await stored(page)).cards[0].connectors[0]?.target;
    await expect.poll(async () => (await target())?.quote).toBe("Alpha beta");
    for (const format of ["heading", "Bullet List", "Blockquote"]) {
        await select(page, "Alpha beta");
        if (format === "heading")
            await toolbar(page).getByRole("combobox").selectOption("2");
        else
            await toolbar(page)
                .getByRole("button", { name: format, exact: true })
                .click();
        await expect
            .poll(async () => (await target())?.orphaned ?? false)
            .toBe(false);
        await expect
            .poll(async () => (await target())?.quote)
            .toBe("Alpha beta");
        await expect(
            page.locator('[data-connection-card="note"] path'),
        ).toHaveCount(1);
        await expect(page.locator(".paper .card-text-highlight")).toContainText(
            "Alpha beta",
        );
    }
    await manuscript(page).press("ControlOrMeta+z");
    await manuscript(page).press("ControlOrMeta+y");
    await expect.poll(async () => (await target())?.quote).toBe("Alpha beta");
    await page.reload();
    await page
        .getByRole("button", { name: "Close document list", exact: true })
        .click();
    await expect(
        page.locator('[data-connection-card="note"] path'),
    ).toHaveCount(1);
    await expect(page.locator(".paper .card-text-highlight")).toContainText(
        "Alpha beta",
    );
});

test("the selection toolbar fits a small screen and dividers persist through undo and redo", async ({
    page,
}) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page);
    await select(page, "second");
    const bubble = await page
        .locator(".floating-formatting-toolbar")
        .boundingBox();
    expect(bubble.x).toBeGreaterThanOrEqual(0);
    expect(bubble.x + bubble.width).toBeLessThanOrEqual(390);
    for (const level of [1, 2, 3, 0]) {
        await toolbar(page).getByRole("combobox").selectOption(String(level));
        await expect(toolbar(page).getByRole("combobox")).toHaveValue(
            String(level),
        );
    }
    await toolbar(page)
        .getByRole("button", { name: "Horizontal Divider" })
        .click();
    await expect(manuscript(page).locator("hr")).toHaveCount(1);
    await manuscript(page).press("ControlOrMeta+z");
    await expect(manuscript(page).locator("hr")).toHaveCount(0);
    await manuscript(page).press("ControlOrMeta+y");
    await expect(manuscript(page).locator("hr")).toHaveCount(1);
    await expect
        .poll(async () => current(await stored(page)).html)
        .toContain("<hr>");
    await page.reload();
    await expect(manuscript(page).locator("hr")).toHaveCount(1);
});
