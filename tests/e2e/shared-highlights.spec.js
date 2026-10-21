import {
    test,
    expect,
    stored,
    openSample,
} from "./fixtures.js";
import { initial } from "../../src/lib/writely/model.ts";
import { LEGACY_STORAGE_KEY as KEY } from "../../src/config/storage.ts";
test("overlap is neutral and unnested; selection beats hover, shared indicator and independent leaf links persist", async ({
    page,
}) => {
    const seed = initial(),
        doc = seed.docs[0];
    doc.html = "<p>Alpha beta gamma delta.</p>";
    doc.cards = [
        {
            ...doc.cards[0],
            id: "a",
            side: "left",
            y: 100,
            connectors: [
                {
                    id: "a-link",
                    target: {
                        kind: "text",
                        from: 1,
                        to: 17,
                        quote: "Alpha beta gamma",
                    },
                },
            ],
        },
        {
            ...doc.cards[1],
            id: "b",
            side: "right",
            y: 300,
            connectors: [
                {
                    id: "b-link",
                    target: {
                        kind: "text",
                        from: 7,
                        to: 23,
                        quote: "beta gamma delta",
                    },
                },
            ],
        },
        {
            ...doc.cards[0],
            id: "c",
            side: "right",
            y: 550,
            collapsed: true,
            connectors: [
                {
                    id: "c-link",
                    target: {
                        kind: "text",
                        from: 7,
                        to: 23,
                        quote: "beta gamma delta",
                    },
                },
            ],
        },
    ];
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.addInitScript(
        ({ key, seed }) => {
            if (!localStorage.getItem(key))
                localStorage.setItem(key, JSON.stringify(seed));
        },
        { key: KEY, seed },
    );
    await openSample(page);
    await page
        .getByRole("button", { name: "Close document list", exact: true })
        .click();
    await page.waitForTimeout(300);
    const spans = page.locator(".card-text-highlight"),
        overlap = page.locator('[data-connected-count="3"]'),
        a = page.locator('[data-card-id="a"]'),
        b = page.locator('[data-card-id="b"]');
    await expect(spans).toHaveCount(3);
    await expect(
        page.locator(".card-text-highlight .card-text-highlight"),
    ).toHaveCount(0);
    await expect(overlap).toHaveText("beta gamma");
    expect(await overlap.getAttribute("style")).toMatch(
        /#C8C5BE|rgb\(200, 197, 190\)/,
    );
    const paths = page.locator(".annotation-connectors g>path");
    await expect(paths).toHaveCount(3);
    const colors = await paths.evaluateAll((nodes) =>
        nodes.map((el) => getComputedStyle(el).stroke),
    );
    expect(colors[0]).not.toBe(colors[1]);
    await overlap.hover();
    await expect(page.locator(".shared-thought-indicator")).toHaveText(
        "3 thoughts",
    );
    await a.hover();
    await expect(overlap).toHaveAttribute("data-highlight-state", "hovered");
    expect(await overlap.getAttribute("style")).toMatch(
        /#FCEFB5|rgb\(252, 239, 181\)/,
    );
    await expect(page.locator(".connector-active")).toHaveCount(1);
    await a.locator(".cloud-body").click();
    await b.hover();
    await expect(overlap).toHaveAttribute("data-highlight-state", "selected");
    expect(await overlap.getAttribute("style")).toMatch(
        /#FCEFB5|rgb\(252, 239, 181\)/,
    );
    expect(
        await paths.evaluateAll((nodes) =>
            nodes.map((el) => getComputedStyle(el).stroke),
        ),
    ).toEqual(colors);
    await expect(page.locator(".connector-active")).toHaveCount(1);
    await page.getByRole("textbox", { name: "Document text" }).click();
    await b.hover();
    await expect(overlap).toHaveAttribute("data-highlight-state", "hovered");
    expect(await overlap.getAttribute("style")).toMatch(
        /#DDEBDD|rgb\(221, 235, 221\)/,
    );
    await page.screenshot({ path: "evidence/shared-thought-highlights.png" });
    const editor = page.getByRole("textbox", { name: "Document text" });
    await editor.click();
    await editor.press("Control+Home");
    await page.keyboard.insertText("Before ");
    await expect(overlap).toHaveText("beta gamma");
    await editor.press("Control+z");
    await expect(editor).toHaveText("Alpha beta gamma delta.");
    await expect(overlap).toHaveText("beta gamma");
    await page
        .getByRole("button", { name: "Collapse thought 1", exact: true })
        .click();
    await expect(paths).toHaveCount(3);
    await expect(overlap).toHaveText("beta gamma");
    await overlap.hover();
    await expect(page.locator(".shared-thought-indicator")).toBeVisible();
    await page
        .getByRole("button", { name: "Hide all cards", exact: true })
        .click();
    await expect(
        page.locator(
            ".card-text-highlight,.annotation-connectors g,.shared-thought-indicator",
        ),
    ).toHaveCount(0);
    await page
        .getByRole("button", { name: "Show all cards", exact: true })
        .click();
    await expect(overlap).toHaveText("beta gamma");
    await expect
        .poll(() => stored(page).then((s) => s.docs[0].cards[0].collapsed))
        .toBe(true);
    await page.reload();
    await page
        .getByRole("button", { name: "Close document list", exact: true })
        .click();
    await page.waitForTimeout(300);
    await expect(overlap).toHaveText("beta gamma");
    await expect(paths).toHaveCount(3);
    expect(await stored(page).then((s) => s.docs[0].html)).not.toContain(
        "highlight",
    );
    expect(errors).toEqual([]);
});
