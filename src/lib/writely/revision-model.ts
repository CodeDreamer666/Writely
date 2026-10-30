import type {
    Check,
    UnmigratedWorkspace,
    WorkspaceData,
    WritingDocument,
} from "./types";
import { DEFAULT_GOAL_TEXTS } from "../../config/revisions";

type UniversalCheck = Check & { universalId: string };

export function migrateRevisions(data: UnmigratedWorkspace): WorkspaceData {
    if (data.revisionSchemaVersion === 2) return data as WorkspaceData;
    const goals =
        data.defaultRevisionGoals ??
        DEFAULT_GOAL_TEXTS.map((text) => ({ id: crypto.randomUUID(), text }));
    return {
        ...data,
        revisionSchemaVersion: 2,
        defaultRevisionGoals: goals,
        docs: data.docs.map((doc) => {
            const progress = { ...doc.universalProgress };
            let session = doc.session;
            const checks = (doc.checks ?? []).filter((check) => {
                // Previously copied defaults remain independent draft intentions.
                if (data.revisionSchemaVersion === 1 || check.sourceDefaultId)
                    return true;
                const goal = goals.find((g) => g.text === check.text);
                if (!goal) return true;
                if (check.done) progress[goal.id] = true;
                if (session?.checkId === check.id)
                    session = { ...session, checkId: "universal:" + goal.id };
                return false;
            });
            return {
                ...doc,
                checks,
                session,
                universalProgress: progress,
                cards: doc.cards ?? [],
            };
        }),
    };
}

export function universalChecks(
    data: WorkspaceData,
    doc: WritingDocument,
): UniversalCheck[] {
    return data.defaultRevisionGoals.map((goal) => ({
        ...goal,
        id: "universal:" + goal.id,
        universalId: goal.id,
        done: !!doc.universalProgress?.[goal.id],
    }));
}

export function completeRevision(doc: WritingDocument): WritingDocument {
    if (!doc.session) return doc;
    const id = doc.session.checkId;
    return {
        ...doc,
        session: null,
        ...(id.startsWith("universal:")
            ? {
                  universalProgress: {
                      ...doc.universalProgress,
                      [id.slice(10)]: true,
                  },
              }
            : {
                  checks: doc.checks.map((c) =>
                      c.id === id ? { ...c, done: true } : c,
                  ),
              }),
    };
}
