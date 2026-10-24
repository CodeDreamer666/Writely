import {
    expect,
    stored,
    test,
    openSample,
} from "./fixtures.js";

const errorsFor = (page) => {
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    return errors;
};

test("signed-out visitors are sent to sign in and the API refuses them", async ({
    browser,
    baseURL,
}) => {
    const context = await browser.newContext({ baseURL });
    const page = await context.newPage();
    await openSample(page);
    await expect(page).toHaveURL(/\/sign-in$/);
    await expect(
        page.getByRole("heading", { name: "Welcome back" }),
    ).toBeVisible();
    expect((await page.request.get("/api/trpc/workspace.get")).status()).toBe(
        401,
    );
    await context.close();
});

test("a new account can be created from the sign-in page and starts with the samples", async ({
    browser,
    baseURL,
}) => {
    const context = await browser.newContext({ baseURL });
    const page = await context.newPage();
    const errors = errorsFor(page);
    await page.goto("/sign-in");
    await page.getByRole("tab", { name: "Create account" }).click();
    await page.getByLabel("Name").fill("Sam Writer");
    await page.getByLabel("Email").fill(`ui-${Date.now()}@example.com`);
    await page.getByLabel("Password").fill("a-long-password");
    await page
        .getByRole("button", { name: "Create account", exact: true })
        .click();
    await expect(
        page.getByRole("textbox", { name: "Document text" }),
    ).toContainText("The bus was almost empty");
    await expect(page.locator(".document-row")).toHaveCount(3);
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await expect(page.locator(".account-details")).toContainText("Sam Writer");
    expect(errors).toEqual([]);
    await context.close();
});

test("settings shows the account; logging out and back in keeps the writing", async ({
    page,
    account,
}) => {
    const errors = errorsFor(page);
    await openSample(page);
    const editor = page.getByRole("textbox", { name: "Document text" });
    await editor.click();
    await editor.press("Control+End");
    await page.keyboard.type(" Kept across sessions.");
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await expect(page.locator(".account-details")).toContainText(account.name);
    await expect(page.locator(".account-details")).toContainText(account.email);
    await page.getByRole("button", { name: "Log out", exact: true }).click();
    await expect(page).toHaveURL(/\/sign-in$/);
    await openSample(page);
    await expect(page).toHaveURL(/\/sign-in$/);
    await page.getByLabel("Email").fill(account.email);
    await page.getByLabel("Password").fill("wrong-password");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByRole("alert")).toBeVisible();
    await page.getByLabel("Password").fill(account.password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
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
}) => {
    await openSample(page);
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await page
        .getByRole("button", { name: "Delete account", exact: true })
        .click();
    const confirm = page
        .getByRole("dialog")
        .getByRole("button", { name: "Delete Account", exact: true });
    await expect(confirm).toBeDisabled();
    await page.getByLabel("Type delete to confirm").fill("delete");
    await confirm.click();
    await expect(page).toHaveURL(/\/sign-in$/);
    await page.getByLabel("Email").fill(account.email);
    await page.getByLabel("Password").fill(account.password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByRole("alert")).toBeVisible();
});
