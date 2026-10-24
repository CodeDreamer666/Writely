import {
    test as base,
    expect,
} from "@playwright/test";
import { initial } from "../../src/lib/writely/model.ts";
import { migrateRevisions } from "../../src/lib/writely/revision-model.ts";

let accounts = 0;

/** Every test signs up a fresh account; `openSample` gives it the sample manuscripts. */
export const test = base.extend({
    account: async ({}, use, testInfo) => {
        await use({
            name: "Alex Morgan",
            email: `e2e-${Date.now()}-${testInfo.workerIndex}-${accounts++}@example.com`,
            password: "writely-e2e-password",
        });
    },
    page: async ({ page, baseURL, account }, use) => {
        const response = await page.request.post("/api/auth/sign-up/email", {
            data: account,
            headers: { origin: baseURL },
        });
        if (!response.ok())
            throw new Error(
                `Sign-up failed: ${response.status()} ${await response.text()}`,
            );
        await use(page);
    },
});

export { expect };

/** The workspace as it is saved on the server. */
export const stored = (page) =>
    page.evaluate(async () => {
        const response = await fetch("/api/trpc/workspace.get");
        return (await response.json()).result.data.json.workspace;
    });

const trpc = (page, path, input) =>
    page.evaluate(
        async ([path, input]) => {
            const response = await fetch(`/api/trpc/${path}`, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify(
                    input === undefined ? {} : { json: input },
                ),
            });
            if (!response.ok) throw new Error(`${path}: ${response.status}`);
            return (await response.json()).result.data?.json;
        },
        [path, input],
    );

/**
 * Seeds the sample manuscripts, skips the first-time welcome and opens "The things we carry" in
 * the editor. Returns the document id.
 */
export async function openSample(page) {
    await page.goto("/welcome");
    // The account's own universal goals, so sample checks become progress on them.
    const { defaultRevisionGoals } = await stored(page);
    const sample = migrateRevisions({ ...initial(), defaultRevisionGoals });
    await trpc(page, "documents.create", { documents: sample.docs });
    await trpc(page, "workspace.save", {
        active: sample.active,
        nextThoughtColour: 0,
    });
    await trpc(page, "account.markWelcomed");
    await page.goto(`/d/${sample.active}`);
    await page.getByRole("textbox", { name: "Document text" }).waitFor();
    return sample.active;
}

export { trpc };
