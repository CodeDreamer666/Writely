import {
    mkdirSync,
    writeFileSync,
} from "node:fs";
import {
    openSample,
    test,
} from "../e2e/fixtures.js";

/**
 * Captures every screenshot the Help centre's guides show, in the light and dark themes, from the
 * running app: `npm run help:screenshots`. Each shot also records where its marked controls sit,
 * as fractions of the image, in src/app/help/shots.json; the guides draw their rings and labels
 * from that, so markers always line up with a fresh capture.
 */

const OUT = "public/help";
const MANIFEST = "src/app/help/shots.json";
const DESKTOP = { width: 1280, height: 900 };
const PHONE = { width: 390, height: 780 };

const shots = {};

/** A box on screen for a selector, a locator or a ready-made box. */
async function boxOf(page, target) {
    if (typeof target === "string") target = page.locator(target).first();
    if (typeof target.boundingBox !== "function") return target;
    await target.waitFor({ state: "visible" });
    const box = await target.boundingBox();
    if (!box) throw new Error(`No box for ${target}`);
    return box;
}

/** The box around the current text selection. */
const selectionBox = (page) =>
    page.evaluate(() => {
        const r = getSelection().getRangeAt(0).getBoundingClientRect();
        return { x: r.x, y: r.y, width: r.width, height: r.height };
    });

const round = (n) => Math.round(n * 10000) / 10000;

/** A box reaching `left`/`top` before a target and `width`/`height` in all, for roomier crops. */
async function around(page, target, { left = 24, top = 24, width, height }) {
    const b = await boxOf(page, target);
    return {
        x: b.x - left,
        y: b.y - top,
        width: width ?? b.width + 2 * left,
        height: height ?? b.height + 2 * top,
    };
}

/**
 * Screenshots `area` (one or more targets, padded; the whole window when left out) and records
 * each mark's box and label.
 */
async function capture(page, theme, id, { area, pad = 24, marks = [] } = {}) {
    const view = page.viewportSize();
    // Park the pointer in the left margin, away from tooltips and focus mode's top edge.
    await page.mouse.move(1, Math.round(view.height * 0.55));
    await page.waitForTimeout(350);
    let clip = { x: 0, y: 0, width: view.width, height: view.height };
    if (area) {
        const boxes = [];
        for (const target of [area].flat())
            boxes.push(await boxOf(page, target));
        const left = Math.max(0, Math.min(...boxes.map((b) => b.x)) - pad);
        const top = Math.max(0, Math.min(...boxes.map((b) => b.y)) - pad);
        const right = Math.min(
            view.width,
            Math.max(...boxes.map((b) => b.x + b.width)) + pad,
        );
        const bottom = Math.min(
            view.height,
            Math.max(...boxes.map((b) => b.y + b.height)) + pad,
        );
        clip = {
            x: Math.floor(left),
            y: Math.floor(top),
            width: Math.ceil(right - left),
            height: Math.ceil(bottom - top),
        };
    }
    const recorded = [];
    for (const mark of marks) {
        const b = await boxOf(page, mark.target);
        const inset = mark.pad ?? 5;
        const x = Math.max(clip.x, b.x - inset),
            y = Math.max(clip.y, b.y - inset);
        const right = Math.min(clip.x + clip.width, b.x + b.width + inset),
            bottom = Math.min(clip.y + clip.height, b.y + b.height + inset);
        recorded.push({
            x: round((x - clip.x) / clip.width),
            y: round((y - clip.y) / clip.height),
            w: round((right - x) / clip.width),
            h: round((bottom - y) / clip.height),
            label: mark.label,
        });
    }
    await page.screenshot({
        path: `${OUT}/${id}-${theme}.jpg`,
        clip,
        type: "jpeg",
        quality: 82,
    });
    if (theme === "light")
        shots[id] = { width: clip.width, height: clip.height, marks: recorded };
}

/** Selects the first `count` characters of the `index`th paragraph, as a writer would with the keyboard. */
async function selectStart(page, index, count) {
    const paragraph = page
        .getByRole("textbox", { name: "Document text" })
        .locator("p")
        .nth(index);
    await paragraph.scrollIntoViewIfNeeded();
    const box = await paragraph.boundingBox();
    await page.mouse.click(box.x + 2, box.y + 10);
    await page.keyboard.press("Home");
    for (let i = 0; i < count; i++)
        await page.keyboard.press("Shift+ArrowRight");
    await page.waitForTimeout(500);
}

const dockButton = (page, name) =>
    page
        .getByRole("navigation", { name: "Writing tools" })
        .getByRole("button", { name, exact: true });

/** Hides the development build's badge and the caret, on every page a context opens. */
const quiet = () => {
    const add = () => {
        const style = document.createElement("style");
        style.textContent =
            "nextjs-portal{display:none!important} *{caret-color:transparent!important}";
        document.head.append(style);
    };
    if (document.head) add();
    else document.addEventListener("DOMContentLoaded", add);
};

/** Waits until the editor reports everything saved, so another browser sees the same document. */
async function settle(page) {
    await page.waitForTimeout(1500);
    await page
        .locator(".save-status", { hasText: "Saving" })
        .waitFor({ state: "hidden" });
}

for (const theme of ["light", "dark"]) {
    test(`help screenshots (${theme})`, async ({ page, browser }) => {
        page.setDefaultTimeout(10_000);
        await page.emulateMedia({
            colorScheme: theme,
            reducedMotion: "reduce",
        });
        await page.addInitScript(quiet);
        mkdirSync(OUT, { recursive: true });
        await page.setViewportSize(DESKTOP);
        const sample = await openSample(page);
        const shot = (id, options) => capture(page, theme, id, options);
        /** Opens the sample document fresh: scrolled to the top, nothing selected. */
        const openDoc = async (on = page) => {
            await on.goto(`/d/${sample}`);
            await on.getByRole("textbox", { name: "Document text" }).waitFor();
            await on.waitForTimeout(900);
        };
        const view = page.viewportSize();

        // Getting started
        const tools = page.getByRole("navigation", { name: "Writing tools" });
        await shot("start-dock", {
            area: tools,
            pad: 64,
            marks: [
                {
                    target: dockButton(page, "Add thought card"),
                    label: "New card",
                },
                {
                    target: dockButton(page, "Thoughts"),
                    label: "Thoughts",
                },
                {
                    target: dockButton(page, "Revision checklist"),
                    label: "Checklist",
                },
                {
                    target: dockButton(page, "Saved drafts"),
                    label: "Drafts",
                },
                {
                    target: dockButton(page, "Writing statistics"),
                    label: "Word count",
                },
                {
                    target: dockButton(page, "Hide writing tools"),
                    label: "Hide",
                },
            ],
        });
        await shot("focus-button", {
            area: { x: 640, y: 0, width: 640, height: 160 },
            pad: 0,
            marks: [
                {
                    target: page.getByRole("button", {
                        name: "Enter focus mode",
                    }),
                    label: "Enter focus mode",
                },
            ],
        });

        // Thought cards
        await dockButton(page, "Add thought card").click();
        await page.waitForTimeout(1200);
        await page.keyboard.type("Too vague?", { delay: 25 });
        await page.mouse.click(1250, 450);
        await page.waitForTimeout(600);
        const card = page
            .locator(".annotation-cloud")
            .filter({ hasText: "Too vague?" });
        // Cropped close, so the card's small buttons stay big enough to point at on a phone.
        await shot("cards-saved", {
            area: await around(page, card, {
                left: 24,
                top: 40,
                width: 330,
                height: 210,
            }),
            pad: 0,
            marks: [
                {
                    target: card.locator('[aria-label^="Edit thought"]'),
                    label: "Edit",
                    pad: 3,
                },
                {
                    target: card.locator('[aria-label^="Collapse thought"]'),
                    label: "Fold away",
                    pad: 3,
                },
                {
                    target: card.locator(".cloud-body"),
                    label: "Drag here to move the card",
                    pad: 2,
                },
            ],
        });
        await dockButton(page, "Thoughts").click();
        const thoughts = page.getByRole("complementary", { name: "Thoughts" });
        await thoughts.waitFor();
        await page.waitForTimeout(500);
        const row = thoughts.locator("li").filter({ hasText: "Too vague?" });
        await shot("cards-drawer", {
            area: thoughts,
            pad: 16,
            marks: [
                {
                    target: thoughts.getByRole("button", {
                        name: "New thought",
                    }),
                    label: "New card",
                },
                {
                    target: thoughts.getByRole("button", {
                        name: /all cards$/,
                    }),
                    label: "Show or hide all cards",
                },
                {
                    target: row.locator('[aria-label^="Change colour"]'),
                    label: "Colour",
                },
                {
                    target: row.locator('[aria-label^="Delete thought"]'),
                    label: "Delete",
                },
            ],
        });
        await page.keyboard.press("Escape");
        await page.waitForTimeout(400);

        // Connecting a card to text
        await openDoc();
        await selectStart(page, 3, 28);
        const toolbar = page.locator(".floating-formatting-toolbar");
        const more = toolbar.getByRole("button", { name: "More formatting" });
        await more.click();
        const connect = page.getByRole("menuitem", {
            name: "Connect to thought",
        });
        await connect.waitFor();
        await shot("link-menu", {
            area: [
                await selectionBox(page),
                toolbar,
                connect,
                // Room on the right for the label.
                await around(page, connect, { left: 0, top: 0, width: 420 }),
            ],
            pad: 20,
            marks: [
                { target: more, label: "More (⋯)" },
                { target: connect, label: "Connect to thought" },
            ],
        });
        await connect.click();
        await page.waitForTimeout(600);
        await card.locator(".cloud-body").click();
        await page.waitForTimeout(900);
        await page.mouse.click(1250, 450);
        await page.waitForTimeout(500);
        const tinted = page.locator(".card-text-highlight").first();
        await shot("link-done", {
            area: [tinted, card],
            pad: 48,
            marks: [
                {
                    target: tinted,
                    label: "Connected words are tinted",
                    pad: 3,
                },
                { target: card, label: "The card", pad: 8 },
            ],
        });
        await card.locator(".cloud-body").click();
        await page.waitForTimeout(500);
        const remove = card
            .locator('[aria-label^="Remove connection"]')
            .first();
        await shot("link-remove", {
            area: [card, remove],
            pad: 40,
            marks: [
                {
                    target: remove,
                    label: "Remove the connection",
                    pad: 3,
                },
            ],
        });
        await page.mouse.click(1250, 450);
        await settle(page);

        // Focus mode
        await openDoc();
        await page.getByRole("button", { name: "Enter focus mode" }).click();
        const exit = page.getByRole("button", { name: "Exit focus mode" });
        await exit.waitFor();
        // Keep the pointer near the top so the exit button stays up.
        await page.mouse.move(640, 20);
        await page.waitForTimeout(400);
        {
            // Capture without moving the pointer away, so the button stays shown.
            const exitBox = await exit.boundingBox();
            const clip = { x: 0, y: 0, width: view.width, height: view.height };
            await page.screenshot({
                path: `${OUT}/focus-on-${theme}.jpg`,
                clip,
                type: "jpeg",
                quality: 82,
            });
            if (theme === "light")
                shots["focus-on"] = {
                    width: clip.width,
                    height: clip.height,
                    marks: [
                        {
                            x: round((exitBox.x - 5) / clip.width),
                            y: round((exitBox.y - 5) / clip.height),
                            w: round((exitBox.width + 10) / clip.width),
                            h: round((exitBox.height + 10) / clip.height),
                            label: "Exit focus mode",
                        },
                    ],
                };
        }
        await page.keyboard.press("Escape");
        await openDoc();

        // Revision tools
        await dockButton(page, "Revision checklist").click();
        const checklist = page.getByRole("complementary", {
            name: "Revision Checklist",
        });
        await checklist.waitFor();
        await page.waitForTimeout(400);
        const goal = checklist.getByText("Improve the introduction");
        await shot("revise-checklist", {
            area: checklist,
            pad: 16,
            marks: [
                {
                    target: goal.locator("xpath=ancestor::button[1]"),
                    label: "Click a goal to start revising",
                },
            ],
        });
        await goal.click();
        await page.waitForTimeout(900);
        const revising = page.getByRole("group", { name: "Revision actions" });
        await shot("revise-started", {
            area: tools,
            pad: 56,
            marks: [
                {
                    target: revising.getByRole("button", {
                        name: "Finish revision",
                    }),
                    label: "Finish revision",
                },
            ],
        });
        const editor = page.getByRole("textbox", { name: "Document text" });
        await editor.locator("p").first().scrollIntoViewIfNeeded();
        const start = await editor.locator("p").first().boundingBox();
        await page.mouse.click(start.x + 2, start.y + 10);
        await page.keyboard.press("Home");
        await page.keyboard.type("On the last morning of March, ");
        await page.waitForTimeout(500);
        await dockButton(page, "Saved drafts").click();
        const drafts = page.getByRole("complementary", { name: "Your drafts" });
        await drafts.waitFor();
        await drafts
            .locator("li")
            .filter({ hasText: "Before revision" })
            .first()
            .getByRole("button", { name: "Compare", exact: true })
            .click();
        const comparison = page.locator('[aria-label="Draft comparison"]');
        await comparison.waitFor();
        await page.waitForTimeout(900);
        const selects = comparison.locator("select");
        await shot("revise-compare", {
            marks: [
                { target: selects.nth(0), label: "Version" },
                {
                    target: selects.nth(1),
                    label: "Compare with",
                },
                {
                    target: page.getByRole("navigation", { name: "Changes" }),
                    label: "Previous / next change",
                },
                {
                    target: page.getByRole("button", {
                        name: "Restore this version",
                    }),
                    label: "Restore (asks first)",
                },
            ],
        });
        await page.getByRole("button", { name: "Continue editing" }).click();
        await page.waitForTimeout(600);
        await revising.getByRole("button", { name: "Finish revision" }).click();
        await settle(page);

        // Export
        await page.goto("/");
        await page.getByRole("heading", { name: "Documents" }).waitFor();
        await page
            .getByRole("button", { name: /^Document actions:/ })
            .first()
            .click();
        const word = page.getByRole("menuitem", {
            name: "Export as Word (.docx)",
        });
        await word.waitFor();
        await page.waitForTimeout(300);
        await shot("export-library", {
            area: [
                page.getByRole("menu"),
                await around(page, word, { left: 200, top: 0, height: 40 }),
            ],
            pad: 24,
            marks: [
                { target: word, label: "Word" },
                {
                    target: page.getByRole("menuitem", {
                        name: "Export as PDF (.pdf)",
                    }),
                    label: "PDF",
                },
            ],
        });
        await page.keyboard.press("Escape");

        // Phones and tablets: a touch screen, where one bar above the keyboard holds every tool.
        const phone = await browser.newContext({
            storageState: await page.context().storageState(),
            viewport: PHONE,
            deviceScaleFactor: 1.5,
            isMobile: true,
            hasTouch: true,
            colorScheme: theme,
            reducedMotion: "reduce",
        });
        const touch = await phone.newPage();
        touch.setDefaultTimeout(10_000);
        await touch.addInitScript(quiet);
        const phoneShot = (id, options) => capture(touch, theme, id, options);
        const bar = touch.locator(".mobile-formatting-toolbar");

        await openDoc(touch);
        await bar.getByRole("button", { name: "Show formatting" }).click();
        await bar.getByRole("toolbar", { name: "Text formatting" }).waitFor();
        await touch.waitForTimeout(500);
        const shell = await bar.locator(".editor-toolbar-shell").boundingBox();
        await phoneShot("start-phone-bar", {
            area: {
                x: 0,
                y: PHONE.height - 300,
                width: PHONE.width,
                height: 300,
            },
            pad: 0,
            marks: [
                {
                    target: bar.getByRole("button", {
                        name: "Show document tools",
                    }),
                    label: "Switch tools",
                    pad: 2,
                },
                {
                    target: {
                        x: shell.x + shell.width - 96,
                        y: shell.y,
                        width: 96,
                        height: shell.height,
                    },
                    label: "Swipe for more",
                    pad: 0,
                },
            ],
        });

        await openDoc(touch);
        await bar
            .getByRole("toolbar", { name: "Writing tools" })
            .getByRole("button", { name: "Thoughts" })
            .click();
        const cardsPanel = touch.getByRole("complementary", { name: "Cards" });
        await cardsPanel.waitFor();
        await touch.waitForTimeout(600);
        const phoneCard = cardsPanel
            .locator("li")
            .filter({ hasText: "Too vague?" });
        await phoneCard.scrollIntoViewIfNeeded();
        await touch.waitForTimeout(300);
        await phoneShot("cards-phone", {
            marks: [
                {
                    target: cardsPanel.getByRole("button", {
                        name: "New card",
                    }),
                    label: "New card",
                },
                {
                    target: phoneCard.locator('[aria-label^="Edit card"]'),
                    label: "Edit",
                },
                {
                    target: phoneCard.locator('[aria-label^="Detach card"]'),
                    label: "Detach",
                },
                {
                    target: phoneCard.locator('[aria-label^="Delete card"]'),
                    label: "Delete",
                },
            ],
        });

        await openDoc(touch);
        await selectStart(touch, 1, 20);
        const phoneConnect = bar.getByRole("button", {
            name: "Connect to thought",
        });
        await phoneConnect.scrollIntoViewIfNeeded();
        await phoneConnect.click();
        const attach = touch.getByRole("complementary", {
            name: "Attach to a card",
        });
        await attach.waitFor();
        await touch.waitForTimeout(600);
        await phoneShot("link-phone-attach", {
            marks: [
                {
                    target: attach
                        .getByRole("button", { name: "Attach selected text" })
                        .first(),
                    label: "Attach to this card",
                },
                {
                    target: attach.getByRole("button", { name: "New card" }),
                    label: "Or make a new connected card",
                },
            ],
        });
        await phone.close();

        if (theme === "light") {
            const sorted = Object.fromEntries(
                Object.keys(shots)
                    .sort()
                    .map((key) => [key, shots[key]]),
            );
            writeFileSync(MANIFEST, JSON.stringify(sorted, null, 4) + "\n");
        }
    });
}
