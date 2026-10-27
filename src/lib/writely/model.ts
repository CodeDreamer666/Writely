import type {
    Check,
    Draft,
    UnmigratedWorkspace,
    WritingDocument,
} from "./types";
import { CARD_COLOUR_PRESETS } from "../../config/cards";

export const uid = () => crypto.randomUUID();

const [butterYellow, sageGreen] = CARD_COLOUR_PRESETS as [
    (typeof CARD_COLOUR_PRESETS)[number],
    (typeof CARD_COLOUR_PRESETS)[number],
];

const prose =
    "<p>The bus was almost empty when I left the city. A woman in a green coat sat near the front, holding a paper bag as carefully as if it contained something alive. Outside, the streets were still wet from the morning rain.</p><p>I had spent the weekend trying to explain why I wanted to leave. At dinner, I made it sound like a practical decision: the smaller flat, the shorter commute, the possibility of a garden. All of these things were true. None of them was the reason.</p><p>There is a particular kind of silence that follows you out of a familiar place. Not the absence of sound, but the absence of being expected. For the first time in years, nobody knew which stop I would get off at.</p><p>As the buildings thinned out, I found myself watching the windows of the houses we passed. A lamp still on. A curtain pulled halfway back. The ordinary evidence of lives continuing without me.</p><p>I thought leaving would feel like a clean line drawn between one life and another. Instead, it felt like carrying a room with me. The same old questions, only a different view.</p><p>The woman in the green coat stood up two stops before mine. She left the paper bag on the seat. I almost called after her, then saw that it was folded flat, empty. Something she no longer needed to carry.</p><p>I am not sure yet what to make of that. Maybe it belongs at the beginning. Maybe it is enough, for now, to remember it.</p>";

export function makeDoc(
    title = "A new piece",
    html = "<p></p>",
): WritingDocument {
    return {
        id: uid(),
        title,
        html,
        updated: Date.now(),
        cards: [],
        hidden: false,
        checks: [],
        drafts: [],
        session: null,
    };
}

/** The sample manuscripts every new workspace starts with; `migrateRevisions` adds the default goals. */
export function initial(): UnmigratedWorkspace {
    const d = makeDoc("The things we carry", prose);
    d.cards = [
        {
            id: uid(),
            text: "Start with the woman on the bus? Let the image do the work.",
            x: 0.98,
            y: 176,
            opacity: 1,
            bg: butterYellow[1],
            fg: butterYellow[2],
        },
        {
            id: uid(),
            text: "Leaving ≠ becoming someone else. Stay with this feeling.",
            x: 0.01,
            y: 448,
            opacity: 0.85,
            bg: sageGreen[1],
            fg: sageGreen[2],
        },
    ];
    d.drafts = [
        {
            id: uid(),
            name: "First thoughts",
            html: prose.replace(
                "The bus was almost empty when I left the city.",
                "It was a very long and slow journey out of the city.",
            ),
            title: d.title,
            time: Date.now() - 86400000,
        },
    ];
    return {
        docs: [
            d,
            makeDoc(
                "A small observance",
                "<p>Every morning, the neighbour opens her window before she turns on the kettle. Even in winter. I have started to think of it as a way of letting the day in.</p>",
            ),
            makeDoc(
                "Notes on staying",
                "<p>What if staying is not the opposite of leaving, but another kind of movement?</p>",
            ),
        ],
        active: d.id,
    };
}

export function snapshot(
    doc: WritingDocument,
    name: string,
    extra: Partial<Pick<Draft, "goal" | "baseline">> = {},
): Draft {
    return {
        id: uid(),
        name,
        html: doc.html,
        title: doc.title,
        time: Date.now(),
        ...extra,
    };
}

export function startRevision(
    doc: WritingDocument,
    check: Check,
): WritingDocument {
    const base = snapshot(doc, `Before: ${check.text}`);
    return {
        ...doc,
        drafts: [...doc.drafts, base],
        session: {
            checkId: check.id,
            goal: check.text,
            baseline: base.id,
            workingId: uid(),
            started: Date.now(),
        },
    };
}

export function restoreDraft(
    doc: WritingDocument,
    draft: Draft,
): WritingDocument {
    return {
        ...doc,
        drafts: [
            ...doc.drafts,
            snapshot(doc, "Before restoring " + draft.name),
        ],
        html: draft.html,
        title: draft.title || doc.title,
        cards: doc.cards.map((card) => ({
            ...card,
            connectors: (card.connectors ?? []).map((link) =>
                link.target.kind === "essay"
                    ? link
                    : { ...link, target: { ...link.target, orphaned: true } },
            ),
        })),
    };
}

export function plain(html: string) {
    return html
        .replace(/<\/p>|<\/h[1-6]>|<\/li>/g, "\n\n")
        .replace(/<[^>]*>/g, "")
        .replace(/&amp;/g, "&")
        .replace(/&nbsp;/g, " ")
        .trim();
}

export type DiffChunk = {
    value: string;
    type: "same" | "add" | "remove";
    added: boolean;
    removed: boolean;
};
