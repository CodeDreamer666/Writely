import assert from "node:assert/strict";
import { test } from "vitest";
import {
    initial,
    makeDoc,
} from "../../src/lib/writely/model";
import { migrateRevisions } from "../../src/lib/writely/revision-model";
import { workspaceChanges } from "../../src/lib/writely/sync";

test("autosave sends only what changed since the last save", () => {
    const saved = migrateRevisions(initial());
    assert.equal(workspaceChanges(saved, saved), null);

    const [first, ...rest] = saved.docs;
    const edited = {
        ...saved,
        docs: [{ ...first!, html: "<p>Changed</p>", updated: 1 }, ...rest],
    };
    const changes = workspaceChanges(saved, edited)!;
    assert.deepEqual(Object.keys(changes), ["documents"]);
    assert.equal(changes.documents!.length, 1);
    assert.equal(changes.documents![0]!.html, "<p>Changed</p>");
    // Unchanged collections are left out.
    assert.equal(changes.documents![0]!.drafts, undefined);
    assert.equal(changes.documents![0]!.cards, undefined);

    const created = makeDoc();
    const withNew = {
        ...saved,
        docs: [created, ...saved.docs.slice(1)],
        active: created.id,
    };
    const structural = workspaceChanges(saved, withNew)!;
    assert.equal(structural.active, created.id);
    assert.deepEqual(
        structural.order,
        withNew.docs.map((doc) => doc.id),
    );
    assert.deepEqual(structural.deleted, [first!.id]);
    assert.deepEqual(structural.documents![0]!.drafts, []);

    const goals = { ...saved, defaultRevisionGoals: [] };
    assert.deepEqual(workspaceChanges(saved, goals), { goals: [] });
});
