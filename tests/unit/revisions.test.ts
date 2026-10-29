import assert from "node:assert/strict";
import { test } from "vitest";
import {
    completeRevision,
    migrateRevisions,
    universalChecks,
} from "../../src/lib/writely/revision-model";
import type { UnmigratedWorkspace } from "../../src/lib/writely/types";
import {
    makeDoc,
    startRevision,
    restoreDraft,
} from "../../src/lib/writely/model";

// Saved data from older versions is often incomplete, so fixtures are cast rather than fully typed.
const legacy = (data: object) => data as UnmigratedWorkspace;

test("starting preserves a draft and finishing completes the goal without another snapshot", () => {
    const original = makeDoc("My document", "<p>Before revision.</p>");
    const goal = {
        id: "clarity",
        text: "Make the opening clearer",
        done: false,
    };
    original.checks = [goal];
    const started = startRevision(original, goal);
    assert.equal(original.drafts.length, 0);
    assert.equal(started.drafts.length, 1);
    assert.equal(started.drafts[0]!.html, original.html);
    assert.equal(
        started.drafts[0]!.name,
        "Before revision: Make the opening clearer",
    );
    assert.equal(started.drafts[0]!.goal, goal.text);
    assert.equal(started.session!.baseline, started.drafts[0]!.id);
    const edited = { ...started, html: "<p>After revision.</p>" };
    const finished = completeRevision(edited);
    assert.equal(finished.html, edited.html);
    assert.equal(finished.session, null);
    assert.equal(finished.checks[0]!.done, true);
    assert.equal(finished.drafts, started.drafts);
    const restored = restoreDraft(finished, finished.drafts[0]!);
    assert.equal(restored.html, original.html);
    assert.equal(restored.drafts.length, 2);
    assert.equal(restored.drafts[1]!.html, edited.html);
    assert.match(restored.drafts[1]!.name, /^Before restoring /);
});

test("migration turns copied default checks into universal progress", () => {
    const migrated = migrateRevisions(
        legacy({
            docs: [
                {
                    id: "one",
                    checks: [
                        {
                            id: "seed",
                            text: "Improve the introduction",
                            done: false,
                        },
                        {
                            id: "progress",
                            text: "Remove repeated ideas",
                            done: true,
                        },
                        {
                            id: "custom",
                            text: "Fix the final scene",
                            done: false,
                        },
                    ],
                    session: null,
                },
                {
                    id: "two",
                    checks: [
                        {
                            id: "active",
                            text: "Find a quieter ending",
                            done: false,
                        },
                    ],
                    session: { checkId: "active" },
                },
            ],
        }),
    );
    assert.equal(migrated.defaultRevisionGoals.length, 3);
    assert.deepEqual(
        migrated.docs[0]!.checks.map((g) => g.id),
        ["custom"],
    );
    assert(universalChecks(migrated, migrated.docs[0]!)[1]!.done);
    assert.equal(
        migrated.docs[1]!.session!.checkId,
        "universal:" + migrated.defaultRevisionGoals[2]!.id,
    );
    assert.equal(migrateRevisions(migrated), migrated);
});

test("universal goals propagate edits while completion stays with each document", () => {
    const data = migrateRevisions(
        legacy({
            docs: [
                {
                    id: "a",
                    checks: [
                        {
                            id: "seed",
                            text: "Improve the introduction",
                            done: true,
                        },
                    ],
                    cards: [{ id: "card" }],
                    session: null,
                },
                { id: "b", checks: [], cards: [], session: null },
            ],
        }),
    );
    assert.equal(data.revisionSchemaVersion, 2);
    assert.equal(migrateRevisions(data), data);
    const a = universalChecks(data, data.docs[0]!),
        b = universalChecks(data, data.docs[1]!);
    assert(a[0]!.done);
    assert(!b[0]!.done);
    const done = completeRevision({
        ...data.docs[1]!,
        session: {
            checkId: b[1]!.id,
            goal: "",
            baseline: "",
            workingId: "",
            started: 0,
        },
    });
    assert(universalChecks(data, done)[1]!.done);
    assert(!universalChecks(data, data.docs[0]!)[1]!.done);
    data.defaultRevisionGoals[1]!.text = "Edited everywhere";
    assert.equal(universalChecks(data, done)[1]!.text, "Edited everywhere");
});

test("schema-1 copies of default goals stay independent draft intentions", () => {
    const migrated = migrateRevisions(
        legacy({
            revisionSchemaVersion: 1,
            defaultRevisionGoals: [{ id: "global", text: "Global" }],
            docs: [
                {
                    checks: [
                        {
                            id: "copy",
                            sourceDefaultId: "global",
                            text: "Old copy",
                            done: true,
                        },
                    ],
                    cards: [],
                    session: { checkId: "copy" },
                },
            ],
        }),
    );
    assert.equal(migrated.docs[0]!.checks[0]!.text, "Old copy");
    assert(completeRevision(migrated.docs[0]!).checks[0]!.done);
});
