import {
    test,
    expect,
    openSample,
    redirectOf,
    signIn,
    stored,
} from "./fixtures.js";

test.setTimeout(90_000);

const text = (page) =>
    page.getByRole("textbox", { name: "Document text", exact: true });

async function cardsMenu(page) {
    await page.getByRole("button", { name: "Thoughts", exact: true }).click();
}

async function selectWords(page, words) {
    await text(page).evaluate((element, words) => {
        element.focus();
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
        let node;
        while ((node = walker.nextNode())) {
            const index = node.textContent.indexOf(words);
            if (index < 0) continue;
            const range = document.createRange();
            range.setStart(node, index);
            range.setEnd(node, index + words.length);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
            document.dispatchEvent(new Event("selectionchange"));
            return;
        }
        throw new Error(`Missing selection: ${words}`);
    }, words);
}

test.describe("phone and iPad cards", () => {
    test.use({ hasTouch: true });
    for (const viewport of [
        { width: 320, height: 740 },
        { width: 390, height: 844 },
        { width: 768, height: 1024 },
        { width: 1366, height: 1024 },
    ]) {
        test(`cards attach, highlight, and persist at ${viewport.width}px`, async ({
            page,
        }, testInfo) => {
            await page.setViewportSize(viewport);
            const id = await openSample(page);
            await text(page).fill("Words to remember. More writing below.");
            await expect(page.locator(".annotation-layer")).toHaveCount(0);
            await cardsMenu(page);
            await page
                .getByRole("button", { name: "New card", exact: true })
                .click();
            await page
                .getByRole("textbox", { name: "Card text", exact: true })
                .fill("A thought kept across devices");
            // Done returns straight to the document.
            await page
                .getByRole("button", { name: "Done", exact: true })
                .click();
            await expect(page.locator(".card-screen")).toHaveCount(0);
            await selectWords(page, "Words to remember");
            await page
                .getByRole("button", { name: "More formatting", exact: true })
                .click();
            await page
                .getByRole("menuitem", {
                    name: "Connect to thought",
                    exact: true,
                })
                .click();
            await page
                .locator("#compact-cards")
                .getByRole("button", { name: /A thought kept across devices/ })
                .click();
            await expect(
                page.locator(
                    '.card-text-highlight[data-highlight-state="selected"]',
                ),
            ).toHaveText("Words to remember");
            await expect(page.locator("#compact-cards")).toBeHidden();
            await expect(
                page.locator(".annotation-cloud, .compact-card-preview"),
            ).toHaveCount(0);
            await expect
                .poll(
                    async () =>
                        (await stored(page)).docs
                            .find((doc) => doc.id === id)
                            ?.cards.find(
                                (card) =>
                                    card.text ===
                                    "A thought kept across devices",
                            )?.connectors?.[0]?.target.quote,
                    { timeout: 20_000 },
                )
                .toBe("Words to remember");
            await page.evaluate(() => localStorage.clear());
            await page.reload();
            await text(page).waitFor();
            await cardsMenu(page);
            await page
                .locator("#compact-cards")
                .getByRole("button", { name: /A thought kept across devices/ })
                .click();
            await expect(page.locator(".card-text-highlight")).toHaveText(
                "Words to remember",
            );
            await expect(page.locator("#compact-cards")).toBeHidden();
            await expect(page.locator(".annotation-layer")).toHaveCount(0);
            const overflow = await page.evaluate(
                () => document.documentElement.scrollWidth > innerWidth,
            );
            expect(overflow).toBe(false);
            await page.screenshot({
                path: testInfo.outputPath(`editor-${viewport.width}.png`),
            });
            await page.goto("/");
            await page
                .getByRole("radio", { name: "Card view", exact: true })
                .click();
            await expect(
                page.getByRole("button", { name: "New document", exact: true }),
            ).toBeInViewport();
            expect(
                await page.evaluate(
                    () => document.documentElement.scrollWidth > innerWidth,
                ),
            ).toBe(false);
            await page.screenshot({
                path: testInfo.outputPath(`library-${viewport.width}.png`),
            });
            await page.goto(`/d/${id}`);
            await cardsMenu(page);
            await page
                .getByRole("button", { name: /^Edit card / })
                .last()
                .click();
            await expect(
                page.getByRole("textbox", { name: "Card text", exact: true }),
            ).toContainText("A thought kept across devices");
        });
    }
});

test("autosave retries offline edits and login restores the database copy in a fresh browser", async ({
    page,
    browser,
    baseURL,
    account,
}) => {
    const id = await openSample(page);
    await text(page).fill("Saved before going offline.");
    await expect
        .poll(
            async () =>
                (await stored(page)).docs.find((doc) => doc.id === id)?.html,
            { timeout: 20_000 },
        )
        .toContain("Saved before going offline.");
    await expect(page.locator(".save-status")).toHaveAttribute(
        "title",
        "Saved",
    );
    await page.context().setOffline(true);
    await text(page).fill("Recovered after losing the connection.");
    await expect(page.locator(".save-status")).toHaveAttribute(
        "title",
        "Not saved",
    );
    expect(
        await page.evaluate(
            () =>
                Object.keys(localStorage).filter((key) =>
                    key.startsWith("writely.unsaved.v2:"),
                ).length,
        ),
    ).toBeGreaterThan(0);
    await page.context().setOffline(false);
    await expect
        .poll(
            async () =>
                (await stored(page)).docs.find((doc) => doc.id === id)?.html,
            { timeout: 20_000 },
        )
        .toContain("Recovered after losing the connection.");
    await expect(page.locator(".save-status")).toHaveAttribute(
        "title",
        "Saved",
    );
    const otherContext = await browser.newContext({ baseURL });
    try {
        const other = await otherContext.newPage();
        expect(await redirectOf(other, `/d/${id}`)).toBe(
            `/auth/google?next=${encodeURIComponent(`/d/${id}`)}`,
        );
        expect(
            await signIn(other, baseURL, {
                ...account,
                password: "wrong-password",
            }),
        ).toBe(false);
        expect(await signIn(other, baseURL, account)).toBe(true);
        await other.goto(`/d/${id}`);
        await expect(text(other)).toContainText(
            "Recovered after losing the connection.",
        );
        await other.goto("/settings#account");
        await other
            .getByRole("button", { name: "Log out", exact: true })
            .click();
        await expect(other).toHaveURL(/\/$/);
        expect(await redirectOf(other, `/d/${id}`)).toMatch(/^\/auth\/google/);
    } finally {
        await otherContext.close();
    }
});

test("concurrent first visits initialize one workspace and another account cannot access its writing", async ({
    page,
    browser,
    baseURL,
}) => {
    const firstVisits = await Promise.all(
        Array.from({ length: 4 }, () =>
            page.request.get("/api/trpc/workspace.get"),
        ),
    );
    for (const response of firstVisits) expect(response.status()).toBe(200);
    const snapshots = await Promise.all(
        firstVisits.map((response) => response.json()),
    );
    const goalIds = snapshots.map((snapshot) =>
        snapshot.result.data.json.workspace.defaultRevisionGoals.map(
            (goal) => goal.id,
        ),
    );
    for (const ids of goalIds) expect(ids).toEqual(goalIds[0]);
    const id = await openSample(page);
    await text(page).fill("Only the owner may read this document.");
    await expect
        .poll(
            async () =>
                (await stored(page)).docs.find((doc) => doc.id === id)?.html,
            { timeout: 20_000 },
        )
        .toContain("Only the owner");
    const context = await browser.newContext({ baseURL });
    try {
        const other = await context.newPage();
        const signup = await other.request.post("/api/auth/sign-up/email", {
            data: {
                name: "Other writer",
                email: `isolated-${Date.now()}@example.com`,
                password: "another-test-password",
            },
            headers: { origin: baseURL },
        });
        expect(signup.ok()).toBe(true);
        const source = await other.request.get(
            `/api/trpc/documents.exportSource?input=${encodeURIComponent(JSON.stringify({ json: { id } }))}`,
        );
        expect(source.status()).toBe(404);
        expect(await source.text()).not.toContain("Only the owner");
        const result = await other.goto(`/d/${id}`);
        expect(result.status()).toBe(404);
    } finally {
        await context.close();
    }
});

test("laptop retains spatial cards", async ({ page }) => {
    await openSample(page);
    await expect(page.locator(".annotation-layer")).toBeVisible();
    await expect(page.locator(".annotation-cloud").first()).toBeVisible();
    await expect(
        page.getByRole("button", { name: "Document options", exact: true }),
    ).toHaveCount(0);
});
