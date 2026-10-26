import {
    makeDoc,
    uid,
} from "./model";
import type {
    WorkspaceData,
    WritingDocument,
} from "./types";

// The tutorial's sample lives here, as static data; it only becomes a document if the writer saves it.

/**
 * What: The title of the tutorial's sample document.
 *
 * Used in:
 * - src/lib/writely/tutorial.ts (makeTutorialWorkspace)
 *
 * Effect: Changes the title shown during the tutorial and saved with the sample.
 */
export const TUTORIAL_TITLE = "A Quiet Afternoon";
/**
 * What: The phrase in the sample text the tutorial connects to a card and
 * revises. It must appear in TUTORIAL_TEXT.
 *
 * Used in:
 * - src/app/tutorial/tutorial.tsx (findPhrase, SCENES)
 *
 * Effect: Changes which words the tutorial points at. If it no longer appears
 * in TUTORIAL_TEXT, the tutorial cannot find it.
 */
export const TUTORIAL_PHRASE = "a nice place with many nice books";
/**
 * What: The intention the tutorial writes on its thought card.
 *
 * Used in:
 * - src/app/tutorial/tutorial.tsx (SCENES)
 *
 * Effect: Changes the text typed onto the card while the tutorial plays.
 */
export const TUTORIAL_INTENTION = "Use more descriptive words";
/**
 * What: The words the tutorial types in place of TUTORIAL_PHRASE. It starts
 * with the phrase's first letter, which the tutorial keeps so the card stays
 * connected while it types.
 *
 * Used in:
 * - src/app/tutorial/tutorial.tsx (SCENES)
 *
 * Effect: Changes the revision shown in the editor and in the comparison.
 */
export const TUTORIAL_REVISION =
    "a hushed room that smelled of old paper, its shelves crowded with worn spines";
/**
 * What: The sample paragraph the tutorial starts with.
 *
 * Used in:
 * - src/lib/writely/tutorial.ts (makeTutorialWorkspace)
 *
 * Effect: Changes the text the writer practises on. It must still contain
 * TUTORIAL_PHRASE.
 */
export const TUTORIAL_TEXT =
    "I went to a small library on Saturday afternoon. It was a nice place with many nice books, and I liked how quiet it was. I walked around for a while because I wanted to find something interesting, but I did not know what to read. After looking at several books, I picked one and sat near a window. I started reading, and it was a good experience because I felt relaxed and forgot about everything else for a while.";

/**
 * What: The revision goal the tutorial adds after the card-guided rewrite, the
 * sentence it revises toward that goal, and what it types instead. The
 * sentence must appear in TUTORIAL_TEXT.
 *
 * Used in:
 * - src/app/tutorial/tutorial.tsx (SCENES)
 *
 * Effect: Changes the goal shown in the checklist and the second revision
 * shown in the editor and the comparison.
 */
export const TUTORIAL_GOAL = "Show the feeling instead of naming it";
export const TUTORIAL_GOAL_PHRASE =
    "it was a good experience because I felt relaxed and forgot about everything else for a while";
export const TUTORIAL_GOAL_REVISION =
    "the afternoon slipped away; when I finally looked up, the light through the window had turned gold";

export const tutorialStorageKey = (userId: string) =>
    `writely.tutorial.v1:${userId}`;

/** A sandbox workspace: the sample plus a saved "Original" so comparing has something to show. */
export function makeTutorialWorkspace(): WorkspaceData {
    const html = `<p>${TUTORIAL_TEXT}</p>`;
    const doc = makeDoc(TUTORIAL_TITLE, html);
    doc.drafts = [
        {
            id: uid(),
            name: "Original",
            html,
            title: TUTORIAL_TITLE,
            time: Date.now(),
        },
    ];
    return {
        docs: [doc],
        active: doc.id,
        defaultRevisionGoals: [],
        nextThoughtColour: 0,
        revisionSchemaVersion: 2,
    };
}

/** The edited sample as a normal document of the writer's own, with a fresh id. */
export function tutorialAsDocument(doc: WritingDocument): WritingDocument {
    return { ...doc, id: uid(), session: null, updated: Date.now() };
}
