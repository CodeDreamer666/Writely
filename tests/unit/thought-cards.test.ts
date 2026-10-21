import assert from "node:assert/strict";
import { test } from "vitest";
import { initial } from "../../src/lib/writely/model";
import { migrateRevisions } from "../../src/lib/writely/revision-model";
import { addThought } from "../../src/lib/writely/thought-cards";
import { workspaceChanges } from "../../src/lib/writely/sync";

test("creation cycles exact pastels independently of deletion, order, reload, and manuscripts", () => {
    let data = migrateRevisions(initial());
    const oldCards = data.docs[0]!.cards;
    const expected = ["#FCEFB5", "#DBE8F4", "#DDEBDD", "#F4DED8", "#FCEFB5"];
    for (let i = 0; i < expected.length; i++) {
        const previous = data;
        data = addThought(data, `new-${i}`, 96);
        const created = data.docs
            .find((doc) => doc.id === data.active)!
            .cards.at(-1)!;
        assert.equal(created.bg, expected[i]);
        assert.equal(
            workspaceChanges(previous, data)!.nextThoughtColour,
            (i + 1) % 4,
        );
        if (i === 0) {
            data = {
                ...data,
                docs: data.docs.map((doc) => ({
                    ...doc,
                    cards: doc.cards
                        .filter((card) => card.id !== "new-0")
                        .reverse(),
                })),
            };
        }
        if (i === 1) data = { ...data, active: data.docs[1]!.id };
        data = JSON.parse(JSON.stringify(data)) as typeof data;
    }
    for (const card of oldCards) {
        assert.equal(
            data.docs[0]!.cards.find((item) => item.id === card.id)!.bg,
            card.bg,
        );
    }
});
