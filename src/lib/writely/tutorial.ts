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
 * What: The phrase in the sample text the tutorial asks the writer to
 * select and revise. It must appear in TUTORIAL_TEXT.
 *
 * Used in:
 * - src/app/tutorial/tutorial.tsx (findPhrase, progress, Coach)
 *
 * Effect: Changes which words the tutorial points at. If it no longer appears
 * in TUTORIAL_TEXT, the tutorial cannot find it.
 */
export const TUTORIAL_PHRASE = "a nice place with many nice books";
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
