import {
    test,
    expect,
    trpc,
    stored,
} from "./fixtures.js";
import { makeDoc } from "../../src/lib/writely/model.ts";

test.setTimeout(90_000);
const editor = (page) =>
    page.getByRole("textbox", { name: "Document text", exact: true });

async function seed(page, overrides = {}) {
    await page.goto("/");
    const doc = {
        ...makeDoc(
            "A quieter beginning",
            "<p>The street was quiet. I walked home.</p>",
        ),
        ...overrides,
    };
    await trpc(page, "documents.create", { documents: [doc] });
    await trpc(page, "account.markWelcomed");
    await page.goto(`/d/${doc.id}`);
    await editor(page).waitFor();
    return doc;
}

test("revision actions explain snapshots, save stays in the editor, and finish adds no draft", async ({
    page,
}) => {
    const doc = await seed(page, {
        checks: [
            { id: "opening", text: "Make the opening clearer", done: false },
        ],
    });
    const saved = async () =>
        (await stored(page)).docs.find((d) => d.id === doc.id);
    await page
        .getByRole("button", { name: "Revision checklist", exact: true })
        .click();
    await expect(
        page.getByText(
            "Starting a revision saves your current text as a draft.",
            { exact: false },
        ),
    ).toBeVisible();
    await page
        .getByRole("button", {
            name: /Make the opening clearer.*Start revision/,
        })
        .click();
    await expect(page.locator(".toast")).toContainText(
        "Your starting text is kept in Drafts",
    );
    await expect(
        page
            .locator(".revision-actions")
            .getByRole("button", { name: "Save draft", exact: true }),
    ).toHaveCount(0);
    await expect
        .poll(async () => (await saved()).drafts.length, { timeout: 20_000 })
        .toBe(1);
    expect((await saved()).drafts[0].html).toBe(doc.html);
    await editor(page).fill("The street held its breath as I walked home.");
    await editor(page).press("Control+s");
    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText("stay in the editor");
    await expect(dialog).toContainText("without ending your revision");
    await page
        .getByLabel("Draft name", { exact: true })
        .fill("A clearer opening");
    await dialog
        .getByRole("button", { name: "Save draft", exact: true })
        .click();
    await expect(editor(page)).toBeVisible();
    await expect(page.locator(".comparison")).toHaveCount(0);
    await expect
        .poll(async () => (await saved()).drafts.length, { timeout: 20_000 })
        .toBe(2);
    await page
        .getByRole("button", { name: "Finish revision", exact: true })
        .click();
    await expect(page.locator(".toast")).toContainText("no new draft created");
    await expect(editor(page)).toBeVisible();
    await expect
        .poll(async () => (await saved()).session, { timeout: 20_000 })
        .toBe(null);
    expect((await saved()).drafts).toHaveLength(2);
    expect((await saved()).checks[0].done).toBe(true);
    await page.reload();
    await expect(editor(page)).toContainText("The street held its breath");
    await page
        .getByRole("button", { name: "Saved drafts", exact: true })
        .click();
    await expect(
        page.getByText("Revision starting point · saved automatically"),
    ).toBeVisible();
    const first = page.locator(".draft-entry").first();
    await first.getByRole("button", { name: /^Draft actions:/ }).click();
    const menu = page.getByRole("menu", {
        name: "Actions for A clearer opening",
    });
    await expect(menu).toBeInViewport();
    expect(
        await menu.evaluate((el) => el.parentElement === document.body),
    ).toBe(true);
    await menu.getByRole("menuitem", { name: "Rename", exact: true }).click();
    await page
        .getByRole("dialog")
        .getByRole("button", { name: "Cancel", exact: true })
        .click();
    await page
        .locator(".draft-entry")
        .last()
        .getByRole("button", { name: "Compare", exact: true })
        .click();
    await expect(page.getByLabel("Revised draft")).toHaveValue("working");
    await page
        .getByRole("button", { name: "Restore this version", exact: true })
        .click();
    await expect(page.getByRole("dialog")).toContainText(
        "restore backup first",
    );
    await page
        .getByRole("button", { name: "Preserve & restore", exact: true })
        .click();
    await expect(editor(page)).toContainText("The street was quiet.");
    await expect
        .poll(async () => (await saved()).drafts.length, { timeout: 20_000 })
        .toBe(3);
    expect((await saved()).drafts.at(-1).html).toContain(
        "The street held its breath",
    );
});

for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 768, height: 1024 },
    { width: 390, height: 844 },
]) {
    test(`comparison has a clear empty state and readable removed paragraphs at ${viewport.width}px`, async ({
        page,
    }, testInfo) => {
        await page.setViewportSize(viewport);
        const paragraphs = Array.from(
            { length: 4 },
            (_, i) =>
                `<p>${i + 1}. Life is a journey through familiar streets. We return to these places to understand what changed, and what we carry with us.</p>`,
        ).join("");
        const doc = await seed(page, {
            html: "<p></p>",
            drafts: [
                {
                    id: "full",
                    name: "Draft 1",
                    html: paragraphs,
                    title: "A quieter beginning",
                    time: Date.now() - 60_000,
                },
            ],
        });
        await page
            .getByRole("button", { name: "Saved drafts", exact: true })
            .click();
        await page
            .getByRole("button", { name: "Compare", exact: true })
            .click();
        await expect(page.getByLabel("Baseline draft")).toHaveValue("full");
        await expect(page.getByLabel("Revised draft")).toHaveValue("working");
        await expect(page.locator(".comparison")).toContainText("empty");
        if (viewport.width > 760) {
            await expect(
                page.getByText("This version is empty", { exact: true }),
            ).toBeVisible();
            expect(
                await page
                    .locator('.compare-split [data-side="before"] > div')
                    .first()
                    .evaluate(
                        (el) =>
                            getComputedStyle(el.querySelector("p"))
                                .textDecorationLine,
                    ),
            ).toBe("none");
        }
        expect(
            await page.evaluate(
                () => document.documentElement.scrollWidth > innerWidth,
            ),
        ).toBe(false);
        await expect(
            page.locator('.drawer[aria-label="Your drafts"]'),
        ).toBeHidden();
        await page.screenshot({
            path: testInfo.outputPath(`comparison-${viewport.width}.png`),
        });
        await page.getByLabel("Baseline draft").selectOption("working");
        await expect(
            page.locator(".comparison").getByRole("status"),
        ).toHaveText("No changes");
        await expect(
            page.getByRole("button", { name: "Next change" }),
        ).toBeDisabled();
        await page
            .getByRole("button", { name: "Continue editing", exact: true })
            .click();
        await expect(editor(page)).toBeVisible();
        expect(page.url()).toContain(`/d/${doc.id}`);
    });
}
