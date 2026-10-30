import {
    expect,
    redirectOf,
    signIn,
    stored,
    test,
    openSample,
} from "./fixtures.js";

const errorsFor = (page) => {
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    return errors;
};

test("signed-out visitors are sent to Google and the API refuses them", async ({
    browser,
    baseURL,
}) => {
    const context = await browser.newContext({ baseURL });
    const page = await context.newPage();
    expect(await redirectOf(page, "/settings")).toBe(
        "/auth/google?next=/settings",
    );
    expect(await redirectOf(page, "/auth/google")).toMatch(
        /^https:\/\/accounts\.google\.com\//,
    );
    expect((await page.request.get("/sign-in")).status()).toBe(404);
    expect((await page.request.get("/api/trpc/workspace.get")).status()).toBe(
        401,
    );
    await context.close();
});

test("signed-in writers who follow a sign-in link go straight to the library", async ({
    page,
}) => {
    expect(await redirectOf(page, "/auth/google")).toMatch(/\/$/);
    expect(await redirectOf(page, "/auth/google?next=/settings")).toMatch(
        /\/settings$/,
    );
});

test("settings shows the account; logging out and back in keeps the writing", async ({
    page,
    account,
    baseURL,
}) => {
    const errors = errorsFor(page);
    await openSample(page);
    const editor = page.getByRole("textbox", { name: "Document text" });
    await editor.click();
    await editor.press("Control+End");
    await page.keyboard.type(" Kept across sessions.");
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await page.getByRole("button", { name: "Account", exact: true }).click();
    await expect(page.locator(".account-details")).toContainText(account.name);
    await expect(page.locator(".account-details")).toContainText(account.email);
    await page.getByRole("button", { name: "Log out", exact: true }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
    expect(
        await signIn(page, baseURL, { ...account, password: "wrong-password" }),
    ).toBe(false);
    expect(await signIn(page, baseURL, account)).toBe(true);
    await page.goto("/");
    await page.locator(".document-row").first().click();
    await expect(
        page.getByRole("textbox", { name: "Document text" }),
    ).toContainText("Kept across sessions.");
    expect(errors).toEqual([]);
});

test("each account only sees its own writing", async ({
    page,
    browser,
    baseURL,
}) => {
    const errors = errorsFor(page);
    await openSample(page);
    await page
        .getByRole("button", { name: "Create draft", exact: true })
        .click();
    await page
        .getByRole("textbox", { name: "Document text" })
        .fill("Private to the first account");
    await expect.poll(async () => (await stored(page)).docs.length).toBe(4);
    await page
        .getByRole("button", { name: "The things we carry", exact: true })
        .click();
    await expect(
        page.getByRole("textbox", { name: "Document text" }),
    ).toContainText("The bus was almost empty");
    await page
        .getByRole("button", { name: "A new piece", exact: true })
        .click();
    await expect(
        page.getByRole("textbox", { name: "Document text" }),
    ).toContainText("Private to the first account");

    const context = await browser.newContext({ baseURL });
    const other = await context.newPage();
    await other.request.post("/api/auth/sign-up/email", {
        data: {
            name: "Other Writer",
            email: `other-${Date.now()}@example.com`,
            password: "another-password",
        },
        headers: { origin: baseURL },
    });
    await other.goto("/");
    await expect(other.locator(".document-row")).toHaveCount(3);
    expect(JSON.stringify(await stored(other))).not.toContain(
        "Private to the first account",
    );
    await context.close();
    expect(errors).toEqual([]);
});

test("deleting the account needs confirmation and removes it", async ({
    page,
    account,
    baseURL,
}) => {
    await openSample(page);
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await page.getByRole("button", { name: "Account", exact: true }).click();
    await page
        .getByRole("button", { name: "Delete account", exact: true })
        .click();
    const confirm = page
        .getByRole("dialog")
        .getByRole("button", { name: "Delete Account", exact: true });
    await expect(confirm).toBeDisabled();
    await page.getByLabel("Type delete to confirm").fill("delete");
    await confirm.click();
    await expect(page).toHaveURL(/\/$/);
    expect(await signIn(page, baseURL, account)).toBe(false);
});
