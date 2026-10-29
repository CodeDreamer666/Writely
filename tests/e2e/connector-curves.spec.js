import {
    test,
    expect,
    trpc,
} from "./fixtures.js";
import { initial } from "../../src/lib/writely/model.ts";

test("curved connectors follow the card and leaf without markers", async ({
    page,
}) => {
    test.setTimeout(90_000);
    await page.goto("/welcome");
    const seed = initial();
    const doc = seed.docs[0];
    doc.html = "<p>Alpha beta gamma delta.</p><p>Another line of writing.</p>";
    doc.cards = [
        {
            ...doc.cards[0],
            id: "test-card",
            side: "left",
            y: 100,
            connectors: [
                {
                    id: "link",
                    target: { kind: "word", from: 1, to: 6, quote: "Alpha" },
                },
            ],
        },
    ];
    await trpc(page, "documents.create", { documents: [doc] });
    await trpc(page, "workspace.save", { active: doc.id });
    await trpc(page, "account.markWelcomed");
    await page.goto(`/d/${doc.id}`);
    const path = page.locator('[data-connection-card="test-card"] path');
    await expect(path).toBeVisible();
    await expect(
        page.locator(".cloud-anchor, .annotation-connectors circle"),
    ).toHaveCount(0);
    const original = await path.getAttribute("d");
    expect(original).toMatch(/[CQ]/);
    const card = page.locator('[data-card-id="test-card"] .cloud-body');
    const box = await card.boundingBox();
    await page.mouse.move(box.x + 30, box.y + 20);
    await page.mouse.down();
    await page.mouse.move(box.x + 90, box.y + 80, { steps: 8 });
    await page.mouse.up();
    await expect.poll(() => path.getAttribute("d")).not.toBe(original);
    await page.getByRole("button", { name: "Collapse thought 1" }).click();
    await expect(
        page.getByRole("button", { name: "Expand thought 1" }),
    ).toBeVisible();
    await expect(path).toBeVisible();
    expect(await path.getAttribute("d")).toMatch(/[CQ]/);
    await page.setViewportSize({ width: 1100, height: 900 });
    await expect(path).toBeVisible();
});
