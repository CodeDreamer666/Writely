import type { Prisma } from "../../generated/prisma/client";
import { makeDoc } from "~/lib/writely/model";
import {
    countWords,
    htmlToPlainText,
} from "~/lib/writely/plain-text";
import { DEFAULT_GOAL_TEXTS } from "~/config/revisions";
import type {
    Card,
    RevisionSession,
    WorkspaceData,
    WritingDocument,
} from "~/lib/writely/types";
import type { WorkspaceChangesInput } from "~/server/api/routers/workspace";
import { db } from "~/server/db";

type Transaction = Prisma.TransactionClient;
const json = (value: unknown) => value as Prisma.InputJsonValue;

// Each user's saves run one after another, and loading waits for them, so a page reloaded during a
// save always sees it. Kept on globalThis so API routes and pages share it.
const globalForSaves = globalThis as unknown as {
    writelySaves?: Map<string, Promise<unknown>>;
};
const pendingSaves = (globalForSaves.writelySaves ??= new Map<
    string,
    Promise<unknown>
>());
export const settled = (userId: string) =>
    pendingSaves.get(userId)?.catch(() => undefined);

/**
 * Loads the user's workspace in the shape the editor works with, or null if it was never created.
 * With `documentId`, only that document is included (the editor opens one document at a time).
 */
export async function loadWorkspace(
    userId: string,
    documentId?: string,
): Promise<WorkspaceData | null> {
    const [workspace, goals, documents] = await Promise.all([
        db.workspace.findUnique({ where: { userId } }),
        db.revisionGoal.findMany({
            where: { userId },
            orderBy: { position: "asc" },
        }),
        db.document.findMany({
            where: {
                userId,
                ...(documentId !== undefined && { id: documentId }),
            },
            orderBy: [{ updated: "desc" }, { key: "asc" }],
            include: {
                drafts: { orderBy: { position: "asc" } },
                checks: { orderBy: { position: "asc" } },
                cards: { orderBy: { position: "asc" } },
            },
        }),
    ]);
    if (!workspace) return null;
    if (documentId !== undefined && !documents.length) return null;

    const docs: WritingDocument[] = documents.map((doc) => ({
        id: doc.id,
        title: doc.title,
        html: doc.html,
        updated: doc.updated.getTime(),
        hidden: doc.hidden,
        session: doc.session
            ? (JSON.parse(doc.session) as RevisionSession)
            : null,
        universalProgress: doc.universalProgress as Record<string, boolean>,
        checks: doc.checks.map((check) => ({
            id: check.id,
            text: check.text,
            done: check.done,
            ...(check.sourceDefaultId && {
                sourceDefaultId: check.sourceDefaultId,
            }),
        })),
        drafts: doc.drafts.map((draft) => ({
            id: draft.id,
            name: draft.name,
            html: draft.html,
            title: draft.title,
            time: draft.time.getTime(),
            ...(draft.goal != null && { goal: draft.goal }),
            ...(draft.baseline != null && { baseline: draft.baseline }),
        })),
        cards: doc.cards.map((card) => ({
            ...(card.data as Omit<Card, "id">),
            id: card.id,
        })),
    }));
    // A workspace always has something to write in.
    if (!docs.length) docs.push(makeDoc());

    return {
        docs,
        nextThoughtColour: workspace.nextThoughtColour,
        active: docs.some((doc) => doc.id === workspace.activeDocumentId)
            ? workspace.activeDocumentId!
            : docs[0]!.id,
        defaultRevisionGoals: goals.map((goal) => ({
            id: goal.id,
            text: goal.text,
        })),
        revisionSchemaVersion: 2,
    };
}

/**
 * What: How long, in milliseconds, database transactions may wait to start
 * (maxWait) and run (timeout). Each change is its own round trip to a
 * remote database, so a whole workspace can outlast Prisma's 5s default.
 *
 * Used in:
 * - src/server/workspace.ts (ensureWorkspace, createDocuments, saveWorkspace)
 *
 * Effect: Raising them lets very large saves finish on slow connections.
 * Lowering them makes slow saves fail sooner with an error.
 */
const TRANSACTION_OPTIONS = { maxWait: 10_000, timeout: 30_000 };

/**
 * The user's workspace row, created on first visit with the default universal goals and no
 * documents: a new account starts at the welcome screen rather than with sample writing.
 */
export async function ensureWorkspace(userId: string) {
    const existing = await db.workspace.findUnique({ where: { userId } });
    if (existing) return existing;
    await db.$transaction(async (tx) => {
        // A concurrent first visit may already have created it.
        if (await tx.workspace.findUnique({ where: { userId } })) return;
        await tx.workspace.create({ data: { userId } });
        await tx.revisionGoal.createMany({
            data: DEFAULT_GOAL_TEXTS.map((text, position) => ({
                id: crypto.randomUUID(),
                userId,
                text,
                position,
            })),
        });
    }, TRANSACTION_OPTIONS);
    return (await db.workspace.findUnique({ where: { userId } }))!;
}

/** The whole workspace (every document); used by tests and data checks, not the editor. */
export async function getOrCreateWorkspace(userId: string) {
    await settled(userId);
    await ensureWorkspace(userId);
    return { workspace: (await loadWorkspace(userId))! };
}

/** One document with the shared goals, for the editor; null if it isn't theirs. */
export async function loadDocumentWorkspace(
    userId: string,
    documentId: string,
) {
    await settled(userId);
    await ensureWorkspace(userId);
    const workspace = await loadWorkspace(userId, documentId);
    return workspace && { ...workspace, active: documentId };
}

/** Adds complete documents (a new piece, a saved tutorial sample or imported prototype writing). */
export function createDocuments(
    userId: string,
    docs: NonNullable<WorkspaceChangesInput["documents"]>,
) {
    return queueSave(userId, () =>
        db.$transaction(
            (tx) => applyChanges(tx, userId, { documents: docs }),
            TRANSACTION_OPTIONS,
        ),
    );
}

export function saveWorkspace(userId: string, changes: WorkspaceChangesInput) {
    return queueSave(userId, () =>
        db.$transaction(
            (tx) => applyChanges(tx, userId, changes),
            TRANSACTION_OPTIONS,
        ),
    );
}

/** Runs a write after the user's earlier saves, so loads and saves see a consistent order. */
export function queueSave<T>(userId: string, write: () => Promise<T>) {
    const save = Promise.resolve(settled(userId)).then(write);
    pendingSaves.set(userId, save);
    void save
        .finally(() => {
            if (pendingSaves.get(userId) === save) pendingSaves.delete(userId);
        })
        .catch(() => undefined);
    return save;
}

async function applyChanges(
    tx: Transaction,
    userId: string,
    changes: WorkspaceChangesInput,
) {
    const { documents = [], deleted = [], order } = changes;
    if (deleted.length)
        await tx.document.deleteMany({
            where: { userId, id: { in: deleted } },
        });

    const positions = new Map(order?.map((id, i) => [id, i]));
    // Words added across these documents, for the library's "Writing this week".
    const before = new Map(
        (
            await tx.document.findMany({
                where: { userId, id: { in: documents.map((doc) => doc.id) } },
                select: { id: true, wordCount: true },
            })
        ).map((doc) => [doc.id, doc.wordCount]),
    );
    let wordsAdded = 0;
    for (const doc of documents) {
        const plainText = htmlToPlainText(doc.html);
        wordsAdded += Math.max(
            0,
            countWords(plainText) - (before.get(doc.id) ?? 0),
        );
        const fields = {
            title: doc.title,
            html: doc.html,
            plainText,
            wordCount: countWords(plainText),
            hidden: doc.hidden,
            session: doc.session ? JSON.stringify(doc.session) : null,
            universalProgress: json(doc.universalProgress ?? {}),
            updated: new Date(doc.updated),
        };
        const { key: documentKey } = await tx.document.upsert({
            where: { userId_id: { userId, id: doc.id } },
            create: {
                id: doc.id,
                userId,
                position: positions.get(doc.id) ?? 0,
                ...fields,
            },
            update: fields,
            select: { key: true },
        });
        if (doc.drafts) {
            await tx.draft.deleteMany({ where: { documentKey } });
            await tx.draft.createMany({
                data: doc.drafts.map((draft, position) => ({
                    id: draft.id,
                    documentKey,
                    position,
                    name: draft.name,
                    title: draft.title,
                    html: draft.html,
                    time: new Date(draft.time),
                    goal: draft.goal ?? null,
                    baseline: draft.baseline ?? null,
                })),
            });
        }
        if (doc.checks) {
            await tx.check.deleteMany({ where: { documentKey } });
            await tx.check.createMany({
                data: doc.checks.map((check, position) => ({
                    id: check.id,
                    documentKey,
                    position,
                    text: check.text,
                    done: check.done,
                    sourceDefaultId: check.sourceDefaultId ?? null,
                })),
            });
        }
        if (doc.cards) {
            await tx.card.deleteMany({ where: { documentKey } });
            await tx.card.createMany({
                data: doc.cards.map(({ id, ...data }, position) => ({
                    id,
                    documentKey,
                    position,
                    data: json(data),
                })),
            });
        }
    }

    if (order) {
        for (const [position, id] of order.entries())
            await tx.document.updateMany({
                where: { userId, id },
                data: { position },
            });
    }

    if (changes.goals) {
        // The editor holds one document, so revisions in other documents that used a removed
        // universal goal are closed here.
        const kept = new Set(
            changes.goals.map((goal) => "universal:" + goal.id),
        );
        const open = await tx.document.findMany({
            where: { userId, session: { not: null } },
            select: { key: true, session: true },
        });
        for (const doc of open) {
            const { checkId } = JSON.parse(doc.session!) as RevisionSession;
            if (checkId.startsWith("universal:") && !kept.has(checkId))
                await tx.document.update({
                    where: { key: doc.key },
                    data: { session: null },
                });
        }
        await tx.revisionGoal.deleteMany({ where: { userId } });
        await tx.revisionGoal.createMany({
            data: changes.goals.map((goal, position) => ({
                id: goal.id,
                userId,
                text: goal.text,
                position,
            })),
        });
    }

    if (changes.activityDay)
        await tx.writingDay.upsert({
            where: { userId_day: { userId, day: changes.activityDay } },
            create: { userId, day: changes.activityDay, words: wordsAdded },
            update: { words: { increment: wordsAdded } },
        });

    if (
        changes.active !== undefined ||
        changes.nextThoughtColour !== undefined
    ) {
        const settings = {
            ...(changes.nextThoughtColour !== undefined && {
                nextThoughtColour: changes.nextThoughtColour,
            }),
            ...(changes.active !== undefined && {
                activeDocumentId: changes.active,
            }),
        };
        await tx.workspace.upsert({
            where: { userId },
            create: { userId, ...settings },
            update: settings,
        });
    }
}
