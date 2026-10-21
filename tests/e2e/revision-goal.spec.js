import {
    test,
    expect,
    stored,
    openSample,
} from "./fixtures.js";
import {
    initial,
    startRevision,
} from "../../src/lib/writely/model.ts";
import { LEGACY_STORAGE_KEY as KEY } from "../../src/config/storage.ts";

async function open(page) {
    const seed = initial();
    const doc = seed.docs[0];
    doc.html = "<p>Alpha beta gamma.</p><p>A second paragraph.</p>";
    doc.checks = [{ id: "ending", text: "Find a quieter ending", done: false }];
    doc.cards = [
        {
            ...doc.cards[0],
            id: "attached",
            side: "left",
            y: 180,
            connectors: [
                {
                    id: "link",
                    target: { kind: "text", from: 1, to: 6, quote: "Alpha" },
                },
            ],
        },
    ];
    seed.docs[0] = startRevision(doc, doc.checks[0]);
    await page.addInitScript(
        ({ key, seed }) => {
            if (!localStorage.getItem(key))
                localStorage.setItem(key, JSON.stringify(seed));
        },
        { key: KEY, seed },
    );
    await openSample(page);
    await expect(
        page.getByRole("group", { name: "Revision actions", exact: true }),
    ).toBeVisible();
}
async function aligned(page) {
    const { main, actions, canvas, prose } = await page
        .locator(".main")
        .evaluate((main) => ({
            main: main.getBoundingClientRect().toJSON(),
            actions: main
                .querySelector(".revision-actions")
                .getBoundingClientRect()
                .toJSON(),
            canvas: main
                .querySelector(".workspace")
                .getBoundingClientRect()
                .toJSON(),
            prose: main
                .querySelector(".paper .tiptap > p")
                .getBoundingClientRect()
                .toJSON(),
        }));
    expect(actions.y - main.y).toBeGreaterThanOrEqual(24);
    expect(actions.y - main.y).toBeLessThanOrEqual(32);
    expect(main.right - actions.right).toBeGreaterThanOrEqual(24);
    expect(main.right - actions.right).toBeLessThanOrEqual(32);
    expect(actions.bottom).toBeLessThan(canvas.y);
    expect(prose.y - main.y).toBeLessThanOrEqual(88);
    await expect(page.locator(".revision-goal")).toHaveCount(0);
    await expect(page.getByRole("note", { name: "Revision goal" })).toHaveCount(
        0,
    );
    await expect(page.locator(".goal-bar")).toHaveCount(0);
}

test("revision actions stay stable without visible goal content and still save and finish revisions", async ({
    page,
}) => {
    await open(page);
    await expect
        .poll(async () => (await stored(page)).docs[0].session?.checkId)
        .toBeTruthy();
    const revisionCheckId = (await stored(page)).docs[0].session.checkId;
    await aligned(page);
    const actions = page.getByRole("group", {
        name: "Revision actions",
        exact: true,
    });
    const before = await actions.boundingBox();
    await page
        .getByRole("button", { name: "Close document list", exact: true })
        .click();
    await aligned(page);
    const after = await actions.boundingBox();
    expect(Math.abs(after.x - before.x)).toBeLessThan(1);
    expect(Math.abs(after.y - before.y)).toBeLessThan(1);
    await expect(
        page.locator('[data-connection-card="attached"] path'),
    ).toHaveCount(1);
    await expect
        .poll(async () =>
            page.evaluate(() => {
                const text = document
                    .querySelector(".paper .card-text-highlight")
                    .getBoundingClientRect();
                const dot = document
                    .querySelector('[data-connection-card="attached"] circle')
                    .getBoundingClientRect();
                return Math.abs(dot.y + dot.height / 2 - text.bottom - 3.5);
            }),
        )
        .toBeLessThan(1);
    await page.screenshot({ path: "evidence/revision-actions.png" });
    await actions
        .getByRole("button", { name: "Save draft", exact: true })
        .click();
    const dialog = page.getByRole("dialog");
    await dialog
        .getByLabel("Draft name", { exact: true })
        .fill("A quieter ending");
    await dialog
        .getByRole("button", { name: "Save draft", exact: true })
        .click();
    await expect(page.locator(".comparison")).toBeVisible();
    await expect(page.locator(".revision-goal")).toHaveCount(0);
    await expect
        .poll(async () => (await stored(page)).docs[0].session?.goal)
        .toBe("Find a quieter ending");
    await page
        .getByRole("button", { name: "Continue editing", exact: true })
        .click();
    await actions
        .getByRole("button", { name: "Finish revision", exact: true })
        .click();
    await expect(page.locator(".revision-goal")).toHaveCount(0);
    await expect(actions).toHaveCount(0);
    await expect
        .poll(async () => (await stored(page)).docs[0].session)
        .toBeNull();
    const saved = (await stored(page)).docs[0];
    expect(
        revisionCheckId.startsWith("universal:")
            ? saved.universalProgress[revisionCheckId.slice(10)]
            : saved.checks.find((c) => c.id === revisionCheckId)?.done,
    ).toBe(true);
    expect(saved.drafts.some((d) => d.name === "A quieter ending")).toBe(true);
    expect(saved.html).toContain("Alpha beta gamma.");
    expect(saved.cards[0].connectors[0].target.quote).toBe("Alpha");
});

test("revision actions clear text, cards and controls on small screens", async ({
    page,
}) => {
    await open(page);
    await page
        .getByRole("button", { name: "Close document list", exact: true })
        .click();
    for (const width of [760, 390, 320]) {
        await page.setViewportSize({ width, height: 844 });
        await aligned(page);
        await page
            .getByRole("button", { name: "Hide writing tools", exact: true })
            .click();
        const launcher = await page
            .getByRole("button", { name: "Show writing tools", exact: true })
            .boundingBox();
        const actions = await page.locator(".revision-actions").boundingBox();
        expect(launcher.x + launcher.width).toBeLessThan(actions.x);
        await page
            .getByRole("button", { name: "Show writing tools", exact: true })
            .click();
    }
    await page.screenshot({ path: "evidence/revision-actions-mobile.png" });
});
