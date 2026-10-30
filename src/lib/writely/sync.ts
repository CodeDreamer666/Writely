import type {
    RevisionGoal,
    WorkspaceData,
    WritingDocument,
} from "./types";

/** A changed document; its collections are included only when they changed. */
type DocumentChanges = Omit<
    WritingDocument,
    "drafts" | "checks" | "cards"
> &
    Partial<Pick<WritingDocument, "drafts" | "checks" | "cards">>;

/** What autosave sends: only the parts of the workspace that differ from the last saved state. */
export type WorkspaceChanges = {
    nextThoughtColour?: number;
    active?: string;
    goals?: RevisionGoal[];
    /** Every document id, in display order; sent when documents are added, removed or reordered. */
    order?: string[];
    documents?: DocumentChanges[];
    deleted?: string[];
    /** Local day of meaningful writing, recorded for the weekly activity view. */
    activityDay?: string;
};

/** Whether a set of changes is real writing: text edits, saved versions or a finished revision. */
export function isWritingActivity(prev: WorkspaceData, next: WorkspaceData) {
    const previous = new Map(prev.docs.map((doc) => [doc.id, doc]));
    return next.docs.some((doc) => {
        const old = previous.get(doc.id);
        if (!old || old === doc) return false;
        return (
            old.html !== doc.html ||
            old.drafts.length < doc.drafts.length ||
            (!!old.session && !doc.session)
        );
    });
}

/** YYYY-MM-DD in the browser's time zone. */
export function localDay(date = new Date()) {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// Workspace state is updated immutably, so an unchanged reference means unchanged content.
export function workspaceChanges(
    prev: WorkspaceData,
    next: WorkspaceData,
): WorkspaceChanges | null {
    const changes: WorkspaceChanges = {};
    if (prev.nextThoughtColour !== next.nextThoughtColour)
        changes.nextThoughtColour = next.nextThoughtColour ?? 0;
    if (prev.active !== next.active) changes.active = next.active;
    if (prev.defaultRevisionGoals !== next.defaultRevisionGoals)
        changes.goals = next.defaultRevisionGoals;

    const ids = next.docs.map((doc) => doc.id);
    if (
        ids.length !== prev.docs.length ||
        ids.some((id, i) => prev.docs[i]!.id !== id)
    )
        changes.order = ids;

    const previous = new Map(prev.docs.map((doc) => [doc.id, doc]));
    const documents = next.docs.flatMap((doc): DocumentChanges[] => {
        const old = previous.get(doc.id);
        if (old === doc) return [];
        const { drafts, checks, cards, ...fields } = doc;
        return [
            {
                ...fields,
                ...(old?.drafts !== drafts && { drafts }),
                ...(old?.checks !== checks && { checks }),
                ...(old?.cards !== cards && { cards }),
            },
        ];
    });
    if (documents.length) changes.documents = documents;

    const remaining = new Set(ids);
    const deleted = prev.docs
        .filter((doc) => !remaining.has(doc.id))
        .map((doc) => doc.id);
    if (deleted.length) changes.deleted = deleted;

    return Object.keys(changes).length ? changes : null;
}
