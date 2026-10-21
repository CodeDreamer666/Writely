import {
    test,
    expect,
    stored,
    openSample,
} from "./fixtures.js";
import { initial } from "../../src/lib/writely/model.ts";
import { LEGACY_STORAGE_KEY as KEY } from "../../src/config/storage.ts";
const savedShapes = ["rectangle", "rounded-square", "thought-cloud"];
const read = (page) => stored(page);
const current = (data) => data.docs.find((doc) => doc.id === data.active);
async function fit(page) {
    await expect
        .poll(() =>
            page.locator(".annotation-cloud").evaluateAll(
                (cards) =>
                    cards
                        .flatMap((card) => {
                            const text = card.querySelector(".cloud-text"),
                                body = card.querySelector(".cloud-body"),
                                path = card.querySelector(".cloud-shape path"),
                                svg = card.querySelector(".cloud-shape"),
                                r = text.getBoundingClientRect(),
                                cr = card.getBoundingClientRect(),
                                matrix = svg.getScreenCTM().inverse();
                            const points = [];
                            for (const x of [
                                r.left,
                                r.left + r.width / 2,
                                r.right,
                            ])
                                for (const y of [
                                    r.top,
                                    r.top + r.height / 2,
                                    r.bottom,
                                ])
                                    points.push(
                                        new DOMPoint(x, y).matrixTransform(
                                            matrix,
                                        ),
                                    );
                            return [
                                r.bottom > cr.bottom + 0.5,
                                r.right > cr.right + 0.5,
                                !text.dataset.scroll &&
                                    text.scrollHeight > text.clientHeight + 1,
                                body.offsetHeight < card.offsetHeight - 1,
                                ...points.map(
                                    (point) => !path.isPointInFill(point),
                                ),
                            ];
                        })
                        .filter(Boolean).length,
            ),
        )
        .toBe(0);
}
test("rectangle cards contain expanding text and preserve old long notes", async ({
    page,
}) => {
    const seed = initial(),
        doc = current(seed);
    doc.cards = savedShapes.map((shape, i) => ({
        ...doc.cards[0],
        id: "shape-" + i,
        y: 40 + i * 240,
        shape,
        text:
            i === 0
                ? "Leaving ≠ becoming someone else. Stay with this feeling."
                : i === 1
                  ? "Start with the woman on the bus? Let the image do the work."
                  : "A thought with enough room to develop. "
                        .repeat(8)
                        .slice(0, 280),
        connectors: [],
    }));
    doc.cards.push({
        ...doc.cards[0],
        id: "legacy",
        y: 760,
        text: "Older note kept intact. ".repeat(30),
    });
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
    await expect(page.locator(".annotation-cloud")).toHaveCount(
        savedShapes.length + 1,
    );
    await fit(page);
    await page.screenshot({ path: "evidence/card-fitting.png" });
    await page
        .getByRole("button", { name: "Edit thought 1", exact: true })
        .click();
    let textarea = page.getByRole("textbox", {
        name: "Thought 1 text",
        exact: true,
    });
    await textarea.fill("x".repeat(600));
    await expect(textarea).toHaveText("x".repeat(600));
    await expect(page.locator("#card-character-count")).toHaveCount(0);
    await fit(page);
    await textarea.fill("👨‍👩‍👧‍👦".repeat(300));
    await expect(textarea).toHaveText("👨‍👩‍👧‍👦".repeat(300));
    await fit(page);
    await page.locator(".ProseMirror").click();
    await page
        .getByRole("button", {
            name: `Edit thought ${savedShapes.length + 1}`,
            exact: true,
        })
        .click();
    textarea = page.getByRole("textbox", {
        name: `Thought ${savedShapes.length + 1} text`,
        exact: true,
    });
    const legacy = doc.cards.at(-1).text;
    await expect(textarea).toHaveText(legacy);
    await textarea.fill(legacy + "More");
    await expect(textarea).toHaveText(legacy + "More");
    await textarea.fill(legacy.slice(0, -1));
    await expect(textarea).toHaveText(legacy.slice(0, -1));
    await fit(page);
    await page.locator(".ProseMirror").click();
    await page.setViewportSize({ width: 390, height: 844 });
    await fit(page);
    expect(
        await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
        ),
    ).toBe(true);
    await expect
        .poll(async () => current(await read(page)).cards.at(-1).text)
        .toBe(legacy.slice(0, -1));
    await page.reload();
    await fit(page);
    expect(current(await read(page)).cards.at(-1).text).toBe(
        legacy.slice(0, -1),
    );
    expect(errors).toEqual([]);
});
