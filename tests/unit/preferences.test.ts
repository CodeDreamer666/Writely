import assert from "node:assert/strict";
import { test } from "vitest";
import { readPreferences } from "../../src/lib/writely/preferences";
import { DEFAULT_PREFERENCES } from "../../src/config/preferences";
import {
    isWritingActivity,
    localDay,
} from "../../src/lib/writely/sync";
import { makeDoc } from "../../src/lib/writely/model";
import { flowAdjustment } from "../../src/lib/writely/editor/flow-anchor";

test("stored preferences fall back to defaults field by field", () => {
    assert.deepEqual(readPreferences(null), DEFAULT_PREFERENCES);
    assert.deepEqual(
        readPreferences({
            theme: "dark",
            fontSize: 99,
            libraryView: "list",
            extra: 1,
        }),
        { ...DEFAULT_PREFERENCES, theme: "dark", libraryView: "list" },
    );
});

test("only writing counts as activity", () => {
    const doc = makeDoc("A", "<p>One</p>");
    const base = { docs: [doc], active: doc.id, defaultRevisionGoals: [] };
    const moved = { ...base, docs: [{ ...doc, hidden: true }] };
    const edited = { ...base, docs: [{ ...doc, html: "<p>Two</p>" }] };
    const kept = {
        ...base,
        docs: [
            {
                ...doc,
                drafts: [{ id: "d", name: "v", html: "", title: "", time: 0 }],
            },
        ],
    };
    assert.equal(isWritingActivity(base, moved), false);
    assert.equal(isWritingActivity(base, edited), true);
    assert.equal(isWritingActivity(base, kept), true);
    assert.equal(localDay(new Date(2026, 0, 5, 23, 30)), "2026-01-05");
});

test("writing and export preferences keep valid values and drop the rest", () => {
    const stored = readPreferences({
        paragraphHighlight: false,
        typewriter: true,
        spellcheck: false,
        smartPunctuation: "yes",
        paragraphSpacing: "spacious",
        exportPageSize: "legal",
        exportFont: "editor",
        sidebarOpen: true,
    });
    assert.equal(stored.paragraphHighlight, false);
    assert.equal(stored.typewriter, true);
    assert.equal(stored.spellcheck, false);
    assert.equal(stored.smartPunctuation, DEFAULT_PREFERENCES.smartPunctuation);
    assert.equal(stored.paragraphSpacing, "spacious");
    assert.equal(stored.exportPageSize, DEFAULT_PREFERENCES.exportPageSize);
    assert.equal(stored.exportFont, "editor");
    assert.equal("sidebarOpen" in stored, false);
});

test("paragraph highlighting starts on, typewriter scrolling off, and old typewriter choices carry over", () => {
    assert.equal(DEFAULT_PREFERENCES.paragraphHighlight, true);
    assert.equal(DEFAULT_PREFERENCES.typewriter, false);
    assert.equal(readPreferences({ typewriter: "centred" }).typewriter, true);
    assert.equal(readPreferences({ typewriter: "gentle" }).typewriter, false);
    assert.equal(readPreferences({ typewriter: "off" }).typewriter, false);
    // Focus mode is no longer a saved preference.
    assert.equal("focusMode" in readPreferences({ focusMode: true }), false);
});

test("gentle typewriter scrolling only moves down; centred holds the caret mid-window", () => {
    // A 1000px window starting at the top of the screen, scrolled 500px into 2000px of overflow.
    const at = (caret: number, mode: "gentle" | "centred") =>
        flowAdjustment(caret, 0, 1000, 500, 2000, mode);
    assert.equal(at(500, "gentle"), 0);
    assert.equal(at(300, "gentle"), 0);
    assert.equal(at(700, "gentle"), 230);
    assert.equal(at(520, "centred"), 0);
    assert.equal(at(700, "centred"), 200);
    assert.equal(at(300, "centred"), -200);
    // Never past the top or the bottom of the page.
    assert.equal(flowAdjustment(100, 0, 1000, 50, 2000, "centred"), -50);
    assert.equal(flowAdjustment(900, 0, 1000, 1950, 2000, "centred"), 50);
});
