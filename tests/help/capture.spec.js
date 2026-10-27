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
 * each mark's box, label and which side of the box its label sits on.
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
            side: mark.side ?? "below",
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

/** A Settings row by the id of its label: the label sits a few levels inside the row. */
const settingRow = (page, id, compact = false) =>
    page.locator(`#${id}`).locator(compact ? "xpath=.." : "xpath=../../..");

for (const theme of ["light", "dark"]) {
    test(`help screenshots (${theme})`, async ({ page }) => {
        page.setDefaultTimeout(10_000);
        await page.emulateMedia({
            colorScheme: theme,
            reducedMotion: "reduce",
        });
        // Hide the development build's badge.
        await page.addInitScript(() => {
            const add = () => {
                const style = document.createElement("style");
                style.textContent =
                    "nextjs-portal{display:none!important} *{caret-color:transparent!important}";
                document.head.append(style);
            };
            if (document.head) add();
            else document.addEventListener("DOMContentLoaded", add);
        });
        mkdirSync(OUT, { recursive: true });
        await page.setViewportSize(DESKTOP);
        const sample = await openSample(page);
        const shot = (id, options) => capture(page, theme, id, options);
        /** Opens the sample document fresh: scrolled to the top, nothing selected. */
        const openDoc = async () => {
            await page.goto(`/d/${sample}`);
            await page
                .getByRole("textbox", { name: "Document text" })
                .waitFor();
            await page.waitForTimeout(900);
        };

        // Getting started
        await page.setViewportSize(PHONE);
        await page.goto("/");
        await page.getByRole("heading", { name: "Documents" }).waitFor();
        await shot("start-phone", {
            marks: [
                {
                    target: page
                        .getByRole("button", { name: "New document" })
                        .last(),
                    label: "New document",
                    side: "above",
                },
            ],
        });
        await page.setViewportSize(DESKTOP);
        await page.goto("/");
        await page.getByRole("heading", { name: "Documents" }).waitFor();
        await shot("start-library", {
            marks: [
                {
                    target: page
                        .getByRole("button", { name: "New document" })
                        .first(),
                    label: "New document",
                    side: "right",
                },
            ],
        });
        await page
            .getByRole("button", { name: "New document" })
            .first()
            .click();
        await page.waitForURL(/\/d\//);
        await page.getByRole("textbox", { name: "Document text" }).waitFor();
        await page.waitForTimeout(800);
        await shot("start-new", {
            marks: [
                {
                    target: ".document-title",
                    label: "Document title",
                    side: "below",
                },
                {
                    target: page.getByRole("textbox", {
                        name: "Document text",
                    }),
                    label: "Your page: click here and type",
                    side: "below",
                    pad: 10,
                },
            ],
        });
        await page.locator(".document-title").click();
        await page
            .getByRole("textbox", { name: "Document title" })
            .fill("A letter to my sister");
        await shot("start-rename", {
            area: await around(
                page,
                page.getByRole("textbox", { name: "Document title" }),
                {
                    left: 260,
                    top: 20,
                    width: 780,
                    height: 200,
                },
            ),
            pad: 0,
            marks: [
                {
                    target: page.getByRole("textbox", {
                        name: "Document title",
                    }),
                    label: "Type a name, then press Enter",
                    side: "below",
                },
            ],
        });
        await page.keyboard.press("Enter");
        await page.getByRole("textbox", { name: "Document text" }).click();
        await page.keyboard.type(
            "Dear Ana, I keep starting this letter and stopping. Maybe this time I will finish it.",
        );
        await page.locator(".save-status", { hasText: "Saved" }).waitFor();
        await page.waitForTimeout(600);
        await shot("start-saved", {
            area: { x: 640, y: 0, width: 640, height: 200 },
            pad: 0,
            marks: [{ target: ".save-status", label: "Saved", side: "below" }],
        });
        await shot("start-back", {
            area: { x: 0, y: 0, width: 640, height: 200 },
            pad: 0,
            marks: [
                {
                    target: page.getByRole("button", { name: "Documents" }),
                    label: "Back to your documents",
                    side: "below",
                },
            ],
        });
        const tools = page.getByRole("navigation", { name: "Writing tools" });
        await shot("start-dock", {
            area: tools,
            pad: 64,
            marks: [
                {
                    target: dockButton(page, "Add thought card"),
                    label: "New card",
                    side: "above",
                },
                {
                    target: dockButton(page, "Thoughts"),
                    label: "Thoughts",
                    side: "below",
                },
                {
                    target: dockButton(page, "Revision checklist"),
                    label: "Checklist",
                    side: "above",
                },
                {
                    target: dockButton(page, "Saved drafts"),
                    label: "Drafts",
                    side: "below",
                },
                {
                    target: dockButton(page, "Writing statistics"),
                    label: "Word count",
                    side: "above",
                },
                {
                    target: dockButton(page, "Hide writing tools"),
                    label: "Hide",
                    side: "below",
                },
            ],
        });

        // Thought cards
        await openDoc();
        await shot("cards-add", {
            area: tools,
            pad: 56,
            marks: [
                {
                    target: dockButton(page, "Add thought card"),
                    label: "Add thought card",
                    side: "above",
                },
            ],
        });
        await dockButton(page, "Add thought card").click();
        await page.waitForTimeout(1200);
        const editing = page
            .locator(".annotation-cloud")
            .filter({ has: page.locator('[contenteditable="true"]') });
        const cardArea = async (target) =>
            around(page, target, {
                left: 40,
                top: 70,
                width: 720,
                height: 300,
            });
        await shot("cards-new", {
            area: await cardArea(editing),
            pad: 0,
            marks: [
                {
                    target: editing,
                    label: "New card: type here",
                    side: "below",
                },
            ],
        });
        await page.keyboard.type("Too vague?", { delay: 25 });
        await shot("cards-typed", {
            area: await cardArea(editing),
            pad: 0,
            marks: [
                {
                    target: editing,
                    label: "Click outside the card to save",
                    side: "below",
                },
            ],
        });
        await page.mouse.click(1250, 450);
        await page.waitForTimeout(600);
        const card = page
            .locator(".annotation-cloud")
            .filter({ hasText: "Too vague?" });
        await shot("cards-saved", {
            area: await cardArea(card),
            pad: 0,
            marks: [
                {
                    target: card.locator('[aria-label^="Edit thought"]'),
                    label: "Edit",
                    side: "above",
                    pad: 3,
                },
                {
                    target: card.locator('[aria-label^="Collapse thought"]'),
                    label: "Fold away",
                    side: "left",
                    pad: 3,
                },
                {
                    target: card.locator(".cloud-body"),
                    label: "Drag here to move the card",
                    side: "below",
                    pad: 2,
                },
            ],
        });
        await card.locator('[aria-label^="Collapse thought"]').click();
        await page.waitForTimeout(700);
        const folded = page.locator(".thought-paper-marker").first();
        await shot("cards-folded", {
            area: await around(page, folded, {
                left: 40,
                top: 70,
                width: 720,
                height: 240,
            }),
            pad: 0,
            marks: [
                {
                    target: folded,
                    label: "Folded card: click to open it",
                    side: "below",
                },
            ],
        });
        await folded.click();
        await page.waitForTimeout(700);
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
                    side: "below",
                },
                {
                    target: thoughts.getByRole("button", {
                        name: /all cards$/,
                    }),
                    label: "Show or hide all cards",
                    side: "left",
                },
                {
                    target: row.locator('[aria-label^="Change colour"]'),
                    label: "Colour",
                    side: "below",
                },
                {
                    target: row.locator('[aria-label^="Delete thought"]'),
                    label: "Delete",
                    side: "right",
                },
            ],
        });
        await row.locator('[aria-label^="Change colour"]').click();
        const colours = page.getByRole("radiogroup").last();
        await colours.waitFor();
        await shot("cards-colour", {
            area: [colours, row],
            pad: 16,
            marks: [
                {
                    target: colours,
                    label: "Pick a colour",
                    side: "below",
                    pad: 6,
                },
            ],
        });
        await page.keyboard.press("Escape");
        await page.keyboard.press("Escape");
        await page.waitForTimeout(400);

        // Linking cards to text
        await openDoc();
        await selectStart(page, 3, 28);
        const toolbar = page.locator(".floating-formatting-toolbar");
        const toolbarArea = await around(page, toolbar, {
            left: 40,
            top: 90,
            width: 900,
            height: 330,
        });
        await shot("link-select", {
            area: toolbarArea,
            pad: 0,
            marks: [
                {
                    target: await selectionBox(page),
                    label: "Selected words",
                    side: "below",
                    pad: 3,
                },
                {
                    target: toolbar,
                    label: "Appears while words are selected",
                    side: "above",
                    pad: 3,
                },
            ],
        });
        const more = toolbar.getByRole("button", { name: "More formatting" });
        await shot("link-more", {
            area: toolbarArea,
            pad: 0,
            marks: [{ target: more, label: "More (⋯)", side: "below" }],
        });
        await more.click();
        const connect = page.getByRole("menuitem", {
            name: "Connect to thought",
        });
        await connect.waitFor();
        await shot("link-menu", {
            area: [
                toolbar,
                connect,
                // Room on the right for the label.
                await around(page, connect, { left: 0, top: 0, width: 420 }),
            ],
            pad: 20,
            marks: [
                { target: connect, label: "Connect to thought", side: "right" },
            ],
        });
        await connect.click();
        await page.waitForTimeout(600);
        await shot("link-pick", {
            area: [".connection-hint", card],
            pad: 48,
            marks: [
                {
                    target: ".connection-hint",
                    label: "Waiting for you to pick a card",
                    side: "below",
                },
                {
                    target: card,
                    label: "Click the card",
                    side: "below",
                    pad: 8,
                },
            ],
        });
        await card.locator(".cloud-body").click();
        await page.waitForTimeout(900);
        await page.mouse.click(1250, 450);
        await page.waitForTimeout(500);
        await shot("link-done", {
            area: [page.locator(".card-text-highlight").first(), card],
            pad: 48,
            marks: [
                {
                    target: page.locator(".card-text-highlight").first(),
                    label: "Linked words are tinted",
                    side: "below",
                    pad: 3,
                },
                { target: card, label: "The card", side: "below", pad: 8 },
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
                    label: "Remove this link",
                    side: "below",
                    pad: 3,
                },
            ],
        });
        await page.mouse.click(1250, 450);
        await dockButton(page, "Thoughts").click();
        await thoughts.waitFor();
        await page.waitForTimeout(500);
        await shot("link-drawer", {
            area: thoughts,
            pad: 16,
            marks: [
                {
                    target: row.getByText(/^Connected to/),
                    label: "The linked words",
                    side: "below",
                    pad: 3,
                },
            ],
        });
        await page.keyboard.press("Escape");
        await page.waitForTimeout(400);

        // Linking on a phone
        await page.setViewportSize(PHONE);
        await openDoc();
        await dockButton(page, "Thoughts").click();
        const cardsPanel = page.getByRole("complementary", { name: "Cards" });
        await cardsPanel.waitFor();
        await page.waitForTimeout(600);
        await shot("cards-phone", {
            marks: [
                {
                    target: dockButton(page, "Thoughts"),
                    label: "Thoughts",
                    side: "above",
                },
                {
                    target: cardsPanel.getByRole("button", {
                        name: "New card",
                    }),
                    label: "New card",
                    side: "below",
                },
                {
                    target: cardsPanel
                        .locator('[aria-label^="Edit card"]')
                        .first(),
                    label: "Edit",
                    side: "left",
                },
                {
                    target: cardsPanel
                        .locator('[aria-label^="Delete card"]')
                        .first(),
                    label: "Delete",
                    side: "left",
                },
            ],
        });
        await page.keyboard.press("Escape");
        await page.waitForTimeout(500);
        await selectStart(page, 1, 20);
        const phoneMore = toolbar.getByRole("button", {
            name: "More formatting",
        });
        await shot("link-phone-select", {
            area: [
                toolbar,
                page
                    .getByRole("textbox", { name: "Document text" })
                    .locator("p")
                    .nth(1),
            ],
            pad: 12,
            marks: [
                {
                    target: await selectionBox(page),
                    label: "Selected words",
                    side: "above",
                    pad: 3,
                },
                { target: phoneMore, label: "More (⋯)", side: "below" },
            ],
        });
        await phoneMore.click();
        await connect.click();
        const attach = page.getByRole("complementary", {
            name: "Attach to a card",
        });
        await attach.waitFor();
        await page.waitForTimeout(600);
        await shot("link-phone-attach", {
            marks: [
                {
                    target: attach
                        .getByRole("button", { name: "Attach selected text" })
                        .first(),
                    label: "Attach to this card",
                    side: "below",
                },
                {
                    target: attach.getByRole("button", { name: "New card" }),
                    label: "Or make a new linked card",
                    side: "below",
                },
            ],
        });
        await attach
            .getByRole("button", { name: "Attach selected text" })
            .first()
            .click();
        await page.waitForTimeout(800);
        await shot("link-phone-done", {
            marks: [
                {
                    target: page.locator(".card-text-highlight").first(),
                    label: "Linked words are tinted",
                    side: "below",
                    pad: 3,
                },
            ],
        });
        await page.setViewportSize(DESKTOP);
        await openDoc();

        // Focus mode
        const options = page.getByRole("button", { name: "Document options" });
        await options.click();
        const focusItem = page.getByRole("menuitem", {
            name: "Turn on focus mode",
        });
        await focusItem.waitFor();
        await shot("focus-menu", {
            area: [options, page.getByRole("menu")],
            pad: 20,
            marks: [
                {
                    target: options,
                    label: "Document options (⋯)",
                    side: "left",
                },
                {
                    target: focusItem,
                    label: "Turn on focus mode",
                    side: "left",
                },
            ],
        });
        await focusItem.click();
        await page.waitForTimeout(500);
        const exit = page.getByRole("button", { name: "Exit focus mode" });
        await exit.waitFor();
        // Keep the pointer near the top so the exit button stays up.
        await page.mouse.move(640, 20);
        await page.waitForTimeout(300);
        await page.screenshot({ path: "/dev/null" }).catch(() => {});
        const view = page.viewportSize();
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
                            side: "below",
                        },
                    ],
                };
        }
        await page.mouse.move(640, 400);
        await page.waitForTimeout(600);
        await shot("focus-hidden", {
            marks: [
                {
                    target: { x: 0, y: 0, width: view.width, height: 64 },
                    label: "Point or tap here to show Exit",
                    side: "below",
                    pad: 0,
                },
            ],
        });
        await page.keyboard.press("Control+Shift+F");
        await openDoc();

        // Revision tools
        await shot("revise-open", {
            area: tools,
            pad: 56,
            marks: [
                {
                    target: dockButton(page, "Revision checklist"),
                    label: "Checklist",
                    side: "above",
                },
            ],
        });
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
                    side: "below",
                },
            ],
        });
        const addGoal = checklist.getByRole("button", {
            name: "Add revision goal",
        });
        await addGoal.scrollIntoViewIfNeeded();
        await shot("revise-this-draft", {
            area: checklist,
            pad: 16,
            marks: [
                {
                    target: addGoal,
                    label: "Add a goal for this draft",
                    side: "above",
                },
            ],
        });
        await addGoal.click();
        const goalDialog = page.getByRole("dialog", {
            name: "Add revision goal",
        });
        await goalDialog.waitFor();
        await goalDialog
            .getByRole("textbox")
            .fill("Cut the second paragraph in half");
        await page.waitForTimeout(600);
        await shot("revise-add-goal", {
            area: goalDialog,
            pad: 16,
            marks: [
                {
                    target: goalDialog.getByRole("textbox"),
                    label: "Type the goal",
                    side: "below",
                },
                {
                    target: goalDialog.getByRole("button", {
                        name: "Add",
                        exact: true,
                    }),
                    label: "Add",
                    side: "below",
                },
            ],
        });
        await goalDialog
            .getByRole("button", { name: "Add", exact: true })
            .click();
        await page.waitForTimeout(500);
        if (!(await checklist.isVisible()))
            await dockButton(page, "Revision checklist").click();
        await goal.click();
        await page.waitForTimeout(900);
        const revising = page.getByRole("group", { name: "Revision actions" });
        await shot("revise-started", {
            marks: [
                {
                    target: page
                        .getByRole("status")
                        .filter({ hasText: "Baseline preserved" }),
                    label: "A copy of the text was kept",
                    side: "below",
                },
                {
                    target: revising,
                    label: "Revising bar: names your goal",
                    side: "above",
                    pad: 3,
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
        const saveDraft = revising.getByRole("button", { name: "Save draft" });
        await shot("revise-save", {
            area: tools,
            pad: 56,
            marks: [{ target: saveDraft, label: "Save draft", side: "above" }],
        });
        await saveDraft.click();
        const keep = page.getByRole("dialog", { name: "Keep this version" });
        await keep.waitFor();
        await keep.getByRole("textbox").click();
        await page.waitForTimeout(600);
        await shot("revise-save-dialog", {
            area: [keep, keep.getByRole("button", { name: "Save draft" })],
            pad: 16,
            marks: [
                {
                    target: keep.getByRole("textbox"),
                    label: "Name (already filled in)",
                    side: "below",
                },
                {
                    target: keep.getByRole("button", { name: "Save draft" }),
                    label: "Save draft",
                    side: "below",
                },
            ],
        });
        await keep.getByRole("button", { name: "Save draft" }).click();
        await page.getByRole("heading", { name: "Draft comparison" }).waitFor();
        await page.waitForTimeout(900);
        const selects = page.locator(".comparison-scroll select, main select");
        await shot("revise-compare", {
            marks: [
                {
                    target: selects.nth(0),
                    label: "Older version",
                    side: "below",
                },
                {
                    target: selects.nth(1),
                    label: "Newer version",
                    side: "below",
                },
                {
                    target: page.getByRole("navigation", { name: "Changes" }),
                    label: "Jump between changes",
                    side: "left",
                },
                {
                    target: page.locator(".compare-split ins").first(),
                    label: "Added (green)",
                    side: "below",
                    pad: 3,
                },
                {
                    target: page.getByRole("button", {
                        name: "Restore this version",
                    }),
                    label: "Restore (asks first)",
                    side: "left",
                },
                {
                    target: page.getByRole("button", {
                        name: "Continue editing",
                    }),
                    label: "Back to writing",
                    side: "above",
                },
            ],
        });
        await page.setViewportSize(PHONE);
        // Let the "Named draft saved" message fade so it doesn't cover the header.
        await page
            .getByRole("status")
            .filter({ hasText: "Named draft saved" })
            .waitFor({ state: "hidden", timeout: 15_000 })
            .catch(() => {});
        await page.waitForTimeout(800);
        await shot("revise-compare-phone", {
            marks: [
                {
                    target: page.getByRole("navigation", { name: "Changes" }),
                    label: "Previous / Next change",
                    side: "below",
                },
                {
                    target: page.locator(".compare-unified ins").first(),
                    label: "Added (green)",
                    side: "below",
                    pad: 3,
                },
            ],
        });
        await page.setViewportSize(DESKTOP);
        await page.waitForTimeout(800);
        await page.getByRole("button", { name: "Continue editing" }).click();
        await page.waitForTimeout(800);
        const finish = revising.getByRole("button", {
            name: "Finish revision",
        });
        await shot("revise-finish", {
            area: tools,
            pad: 56,
            marks: [
                { target: finish, label: "Finish revision", side: "above" },
            ],
        });
        await finish.click();
        await page.waitForTimeout(900);
        if (!(await checklist.isVisible()))
            await dockButton(page, "Revision checklist").click();
        await page.waitForTimeout(300);
        if (!(await checklist.isVisible()))
            await dockButton(page, "Revision checklist").click();
        await checklist.waitFor();
        await page.waitForTimeout(400);
        await shot("revise-done", {
            area: checklist,
            pad: 16,
            marks: [
                {
                    target: goal.locator("xpath=ancestor::button[1]"),
                    label: "Ticked: this goal is done",
                    side: "below",
                },
            ],
        });
        await page.keyboard.press("Escape");
        await page.waitForTimeout(400);
        await dockButton(page, "Saved drafts").click();
        const drafts = page.getByRole("complementary", { name: "Your drafts" });
        await drafts.waitFor();
        await page.waitForTimeout(400);
        await shot("revise-drafts", {
            area: drafts,
            pad: 16,
            marks: [
                {
                    target: drafts.getByRole("button", {
                        name: "Save named draft",
                    }),
                    label: "Save a version any time",
                    side: "below",
                },
                {
                    target: drafts
                        .getByRole("button", { name: "Compare" })
                        .first(),
                    label: "Compare",
                    side: "left",
                },
            ],
        });
        await page.keyboard.press("Escape");
        await page.waitForTimeout(400);

        // Export
        await openDoc();
        await options.click();
        const word = page.getByRole("menuitem", {
            name: "Export as Word (.docx)",
        });
        await word.waitFor();
        await shot("export-menu", {
            area: [options, page.getByRole("menu")],
            pad: 20,
            marks: [
                {
                    target: options,
                    label: "Document options (⋯)",
                    side: "left",
                },
                { target: word, label: "Word", side: "left" },
                {
                    target: page.getByRole("menuitem", {
                        name: "Export as PDF (.pdf)",
                    }),
                    label: "PDF",
                    side: "left",
                },
            ],
        });
        await page.keyboard.press("Escape");

        // Settings
        await page.goto("/");
        await page.getByRole("heading", { name: "Documents" }).waitFor();
        await shot("settings-open", {
            area: { x: 760, y: 0, width: 520, height: 200 },
            pad: 0,
            marks: [
                {
                    target: page.getByRole("link", { name: "Settings" }),
                    label: "Settings",
                    side: "left",
                },
            ],
        });
        await page.goto("/settings");
        await page.locator("#setting-theme").waitFor();
        await page.waitForTimeout(500);
        await shot("settings-page", {
            marks: [
                {
                    target: page.getByRole("navigation", {
                        name: "Settings sections",
                    }),
                    label: "Sections",
                    side: "right",
                },
                {
                    target: settingRow(page, "setting-theme"),
                    label: "Each row is one setting",
                    side: "below",
                    pad: 2,
                },
            ],
        });
        await page.goto("/settings#writing");
        await page.locator("#setting-paragraph-highlight").waitFor();
        await page.waitForTimeout(500);
        await shot("settings-writing", {
            area: page.locator("main > div").last(),
            pad: 0,
            marks: [
                {
                    target: settingRow(
                        page,
                        "setting-paragraph-highlight",
                        true,
                    ),
                    label: "Fades the other paragraphs",
                    side: "below",
                    pad: 0,
                },
            ],
        });
        await page.goto("/settings#export");
        await page.locator("#setting-page-size").waitFor();
        await page.waitForTimeout(500);
        await shot("export-settings", {
            area: page.locator("main > div").last(),
            pad: 0,
            marks: [
                {
                    target: settingRow(page, "setting-page-size"),
                    label: "Paper size",
                    side: "below",
                    pad: 0,
                },
                {
                    target: settingRow(page, "setting-export-title", true),
                    label: "Put the title on top",
                    side: "below",
                    pad: 0,
                },
            ],
        });
        await page.goto("/settings#checklist");
        await page
            .getByRole("heading", { name: "Revision checklist" })
            .waitFor();
        await page.waitForTimeout(500);
        await shot("settings-goals", {
            area: page.locator("main > div").last(),
            pad: 0,
            marks: [
                {
                    target: page
                        .locator("main")
                        .getByRole("button", { name: "Add goal" }),
                    label: "Goal for every document",
                    side: "below",
                },
            ],
        });
        await page.setViewportSize(PHONE);
        await page.goto("/settings");
        await page
            .getByRole("button", { name: "Appearance", exact: true })
            .waitFor();
        await page.waitForTimeout(500);
        await shot("settings-phone", {
            marks: [
                {
                    target: page.getByRole("button", {
                        name: "Appearance",
                        exact: true,
                    }),
                    label: "Tap a section",
                    side: "below",
                    pad: 2,
                },
            ],
        });
        await page
            .getByRole("button", { name: "Appearance", exact: true })
            .click();
        await page.waitForTimeout(500);
        await shot("settings-phone-section", {
            marks: [
                {
                    target: page.getByRole("button", {
                        name: "Settings",
                        exact: true,
                    }),
                    label: "Back to the list",
                    side: "right",
                },
            ],
        });

        // The document menu on a phone holds the panels and export.
        await openDoc();
        await page.getByRole("button", { name: "Document options" }).click();
        await page.getByRole("menu").waitFor();
        await shot("export-phone", {
            marks: [
                {
                    target: page.getByRole("button", {
                        name: "Document options",
                    }),
                    label: "⋯",
                    side: "left",
                },
                {
                    target: page.getByRole("menuitem", {
                        name: "Export as Word (.docx)",
                    }),
                    label: "Export",
                    side: "left",
                },
            ],
        });

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
