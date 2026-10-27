import {
    test,
    expect,
    stored,
    trpc,
} from "./fixtures.js";
import { makeDoc } from "../../src/lib/writely/model.ts";

// One small document keeps the seeding save quick even on a slow database link.
test.setTimeout(180_000);

const current = (data) => data.docs.find((doc) => doc.id === data.active);

test("thought cards and drafts keep every field, including position, after a reload", async ({
    page,
}) => {
    await page.goto("/welcome");
    const doc = {
        ...makeDoc(),
        title: "Persistence check",
        html: "<p>The bus came late and the morning went quiet.</p>",
        cards: [
            {
                id: "kept",
                text: "Why was it late?",
                html: "<p>Why was it <strong>late</strong>?</p>",
                placement: "margin",
                side: "right",
                x: 0,
                y: 120,
                opacity: 1,
                bg: "#DBE8F4",
                fg: "#1F2933",
                collapsed: false,
                leafPosition: { side: "left", x: 0.5, y: 300 },
                connectors: [
                    {
                        id: "link",
                        anchor: "left",
                        target: { kind: "word", from: 5, to: 8, quote: "bus" },
                    },
                ],
            },
        ],
    };
    await trpc(page, "documents.create", { documents: [doc] });
    await trpc(page, "account.markWelcomed");
    await page.goto(`/d/${doc.id}`);
    const editor = page.getByRole("textbox", { name: "Document text" });
    await editor.waitFor();

    // Everything seeded comes back from the server unchanged.
    const seeded = current(await stored(page)).cards[0];
    expect(seeded).toMatchObject(doc.cards[0]);

    // Drag the card; its new position is saved.
    const card = page.locator('[data-card-id="kept"]');
    await expect(card).toBeVisible();
    const body = await card.locator(".cloud-body").boundingBox();
    await page.mouse.move(body.x + 30, body.y + 20);
    await page.mouse.down();
    await page.mouse.move(body.x + 30, body.y + 140, { steps: 10 });
    await page.mouse.up();
    const moved = await card.boundingBox();
    await expect
        .poll(async () => current(await stored(page)).cards[0].y, {
            timeout: 60_000,
        })
        .not.toBe(120);
    const savedCard = current(await stored(page)).cards[0];
    // Moving changes only the position; text, colour and connection stay.
    expect(savedCard).toMatchObject({
        text: doc.cards[0].text,
        html: doc.cards[0].html,
        bg: doc.cards[0].bg,
        connectors: doc.cards[0].connectors,
        leafPosition: doc.cards[0].leafPosition,
    });

    // Save a named draft.
    await editor.click();
    await page.keyboard.press("Control+S");
    await page.getByLabel(/name/i).first().fill("First pass");
    await page.getByRole("button", { name: "Save draft" }).click();
    await expect
        .poll(
            async () =>
                current(await stored(page)).drafts.map((draft) => ({
                    name: draft.name,
                    html: draft.html,
                    title: draft.title,
                })),
            { timeout: 60_000 },
        )
        .toEqual([
            {
                name: "First pass",
                html: doc.html,
                title: doc.title,
            },
        ]);

    // After a reload the card is drawn where it was left and the draft is still listed.
    await page.reload();
    await editor.waitFor();
    await expect
        .poll(async () => (await card.boundingBox())?.y)
        .toBeCloseTo(moved.y, 0);
    expect((await card.boundingBox()).x).toBeCloseTo(moved.x, 0);
    expect(current(await stored(page)).cards[0]).toEqual(savedCard);
    expect(current(await stored(page)).drafts[0].name).toBe("First pass");
});
