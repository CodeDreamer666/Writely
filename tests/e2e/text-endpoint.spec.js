import {
    test,
    expect,
    stored,
    openSample,
} from "./fixtures.js";
import { initial } from "../../src/lib/writely/model.ts";
import { LEGACY_STORAGE_KEY as KEY } from "../../src/config/storage.ts";

test("connector dots sit beneath the final highlighted line through reflow, zoom and collapse", async ({
    page,
}) => {
    const seed = initial(),
        doc = seed.docs[0];
    doc.html = "<p>Alpha <strong>remarkable</strong> ideas take shape.</p>";
    doc.cards = [
        {
            ...doc.cards[0],
            id: "left",
            side: "left",
            y: 100,
            connectors: [
                {
                    id: "a",
                    target: { kind: "word", from: 1, to: 6, quote: "Alpha" },
                },
            ],
        },
        {
            ...doc.cards[1],
            id: "right",
            side: "right",
            y: 350,
            connectors: [
                {
                    id: "b",
                    target: {
                        kind: "word",
                        from: 7,
                        to: 17,
                        quote: "remarkable",
                    },
                },
            ],
        },
    ];
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
    const check = async () => {
        await expect(
            page.locator(
                ".annotation-connectors marker,.annotation-connectors [marker-end]",
            ),
        ).toHaveCount(0);
        await expect(
            page.locator(".annotation-connectors g>circle"),
        ).toHaveCount(2);
        const errors = await page.evaluate(() => {
            const w = document.querySelector(".workspace"),
                wr = w.getBoundingClientRect(),
                sy = wr.height / w.offsetHeight;
            return ["left", "right"].map((id, i) => {
                const el = document.querySelector(
                        '[data-annotation-card="' + id + '"]',
                    ),
                    rects = Array.from(el.getClientRects()),
                    last = rects.at(-1),
                    line = rects.filter(
                        (r) => r.top < last.bottom && r.bottom > last.top,
                    ),
                    dot = document.querySelectorAll(
                        ".annotation-connectors g>circle",
                    )[i],
                    d = dot.getBoundingClientRect();
                return {
                    x: Math.abs(
                        d.x +
                            d.width / 2 -
                            (Math.min(...line.map((r) => r.left)) +
                                Math.max(...line.map((r) => r.right))) /
                                2,
                    ),
                    y: Math.abs(
                        d.y +
                            d.height / 2 -
                            Math.max(...line.map((r) => r.bottom)) -
                            3.5 * sy,
                    ),
                };
            });
        });
        for (const error of errors) {
            expect(error.x).toBeLessThan(1);
            expect(error.y).toBeLessThan(1);
        }
    };
    await check();
    await page.locator(".tiptap").evaluate((el) => {
        el.style.fontSize = "31px";
        el.style.width = "130px";
        el.style.overflowWrap = "anywhere";
    });
    await page.waitForTimeout(150);
    await check();
    await page.locator(".workspace").evaluate((el) => (el.style.zoom = "1.2"));
    await page.waitForTimeout(150);
    await check();
    await page.locator(".workspace").evaluate((el) => (el.style.zoom = ""));
    await page
        .getByRole("button", { name: "Collapse thought 2", exact: true })
        .click();
    await check();
    await page.screenshot({ path: "evidence/text-anchor-dots.png" });
    await expect
        .poll(() => stored(page).then((s) => s.docs[0].cards[1].collapsed))
        .toBe(true);
    await page.reload();
    await page
        .getByRole("button", { name: "Close document list", exact: true })
        .click();
    await page.waitForTimeout(300);
    await check();
    await page
        .getByRole("button", { name: "Hide all cards", exact: true })
        .click();
    await expect(
        page.locator(".annotation-connectors g,.card-text-highlight"),
    ).toHaveCount(0);
});
