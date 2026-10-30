import { Prisma } from "../../generated/prisma/client";
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
 * What: How long, in milliseconds, the transaction that creates a new
 * account's workspace may wait to start (maxWait) and run (timeout). Each
 * step is a round trip to a remote database, so it can outlast Prisma's 5s
 * default on a slow connection.
 *
 * Used in:
 * - src/server/workspace.ts (ensureWorkspace)
 *
 * Effect: Raising them lets a first visit finish on slow connections.
 * Lowering them makes slow first visits fail sooner with an error. Saves
 * don't use it: each one is one or two statements (see applyChanges).
 */
const TRANSACTION_OPTIONS = { maxWait: 10_000, timeout: 30_000 };

/**
 * The user's workspace row, created on first visit with the default universal goals and no
 * documents: a new account starts with an empty library rather than with sample writing.
 */
export async function ensureWorkspace(userId: string) {
    const existing = await db.workspace.findUnique({ where: { userId } });
    if (existing) return existing;
    await db.$transaction(async (tx) => {
        // The library and its API calls can arrive together. Let PostgreSQL arbitrate
        // creation atomically; a read followed by create races across requests and instances.
        const inserted = await tx.workspace.createMany({
            data: [{ userId }],
            skipDuplicates: true,
        });
        if (!inserted.count) return;
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

/** Adds complete documents (a new piece or imported prototype writing). */
export function createDocuments(
    userId: string,
    docs: NonNullable<WorkspaceChangesInput["documents"]>,
) {
    return queueSave(userId, () => applyChanges(userId, { documents: docs }));
}

export function saveWorkspace(userId: string, changes: WorkspaceChangesInput) {
    return queueSave(userId, () => applyChanges(userId, changes));
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

// TIMESTAMP(3) columns hold UTC without a zone, as Prisma writes them.
const utc = (ms: number) => new Date(ms).toISOString().slice(0, -1);
const jsonb = (value: unknown) => Prisma.sql`${JSON.stringify(value)}::jsonb`;
const cte = (name: string, body: Prisma.Sql) =>
    Prisma.sql`${Prisma.raw(`"${name}"`)} AS (${body})`;

/**
 * Applies a save in as few round trips as possible, so autosave stays quick on a slow or distant
 * database: documents with their drafts, checks and cards, deletions, order, writing activity and
 * workspace settings go in one statement. Changed universal goals add a second, and both then run
 * in one transaction. A single statement is atomic on its own.
 *
 * Collections are replaced whole when sent (delete and insert in the same statement), and each
 * row's position is its index in the list, so card and draft order is kept.
 */
async function applyChanges(userId: string, changes: WorkspaceChangesInput) {
    const { documents = [], deleted = [], order, goals } = changes;
    const positions = new Map(order?.map((id, i) => [id, i]));
    const rows = documents.map((doc) => {
        const plainText = htmlToPlainText(doc.html);
        return {
            id: doc.id,
            title: doc.title,
            html: doc.html,
            plainText,
            wordCount: countWords(plainText),
            hidden: doc.hidden,
            session: doc.session ? JSON.stringify(doc.session) : null,
            universalProgress: doc.universalProgress ?? {},
            updated: utc(doc.updated),
            position: positions.get(doc.id) ?? null,
            drafts: doc.drafts?.map((draft) => ({
                ...draft,
                time: utc(draft.time),
            })),
            checks: doc.checks,
            cards: doc.cards,
        };
    });

    const steps: Prisma.Sql[] = [];
    if (deleted.length)
        steps.push(
            cte(
                "gone",
                Prisma.sql`DELETE FROM "Document" WHERE "userId" = ${userId}
                    AND "id" IN (SELECT jsonb_array_elements_text(${jsonb(deleted)}))`,
            ),
        );

    if (rows.length) {
        steps.push(
            cte(
                "input",
                Prisma.sql`SELECT d.value AS v, d.value->>'id' AS id
                    FROM jsonb_array_elements(${jsonb(rows)}) AS d(value)`,
            ),
            // Word counts before this save; the statement's snapshot doesn't see its own writes.
            cte(
                "old",
                Prisma.sql`SELECT "id", "wordCount" FROM "Document"
                    WHERE "userId" = ${userId} AND "id" IN (SELECT id FROM "input")`,
            ),
            cte(
                "up",
                Prisma.sql`INSERT INTO "Document" ("key", "id", "userId", "position", "title", "html",
                        "plainText", "wordCount", "hidden", "session", "universalProgress", "updated")
                    SELECT gen_random_uuid()::text, id, ${userId}, coalesce((v->>'position')::int, 0),
                        v->>'title', v->>'html', v->>'plainText', (v->>'wordCount')::int,
                        (v->>'hidden')::boolean, v->>'session', v->'universalProgress',
                        (v->>'updated')::timestamp(3)
                    FROM "input"
                    ON CONFLICT ("userId", "id") DO UPDATE SET
                        "title" = EXCLUDED."title",
                        "html" = EXCLUDED."html",
                        "plainText" = EXCLUDED."plainText",
                        "wordCount" = EXCLUDED."wordCount",
                        "hidden" = EXCLUDED."hidden",
                        "session" = EXCLUDED."session",
                        "universalProgress" = EXCLUDED."universalProgress",
                        "updated" = EXCLUDED."updated",
                        "position" = coalesce(
                            (SELECT (v->>'position')::int FROM "input" WHERE id = EXCLUDED."id"),
                            "Document"."position")
                    RETURNING "key", "id", "wordCount"`,
            ),
            cte(
                "saved",
                Prisma.sql`SELECT "up"."key", "input".v FROM "up" JOIN "input" ON "input".id = "up"."id"`,
            ),
        );
        // Replaces a collection of each saved document that sent one (drafts, checks or cards).
        const replace = (
            field: string,
            table: string,
            columns: string,
            values: Prisma.Sql,
        ) => {
            const key = Prisma.raw(`'${field}'`);
            const sent = Prisma.sql`jsonb_typeof(s.v->${key}) = 'array'`;
            steps.push(
                cte(
                    `${field}_gone`,
                    Prisma.sql`DELETE FROM ${Prisma.raw(`"${table}"`)} WHERE "documentKey" IN
                        (SELECT s."key" FROM "saved" s WHERE ${sent})`,
                ),
                cte(
                    `${field}_new`,
                    Prisma.sql`INSERT INTO ${Prisma.raw(`"${table}"`)}
                        ("key", "id", "documentKey", "position", ${Prisma.raw(columns)})
                        SELECT gen_random_uuid()::text, e.value->>'id', s."key", (e.ord - 1)::int, ${values}
                        FROM "saved" s
                        CROSS JOIN LATERAL jsonb_array_elements(s.v->${key}) WITH ORDINALITY AS e(value, ord)
                        WHERE ${sent}`,
                ),
            );
        };
        replace(
            "drafts",
            "Draft",
            `"name", "title", "html", "time", "goal", "baseline"`,
            Prisma.sql`e.value->>'name', e.value->>'title', e.value->>'html',
                (e.value->>'time')::timestamp(3), e.value->>'goal', e.value->>'baseline'`,
        );
        replace(
            "checks",
            "Check",
            `"text", "done", "sourceDefaultId"`,
            Prisma.sql`e.value->>'text', (e.value->>'done')::boolean, e.value->>'sourceDefaultId'`,
        );
        // A card's id has its own column; everything else about it is kept as one record.
        replace("cards", "Card", `"data"`, Prisma.sql`e.value - 'id'`);
    }

    if (order)
        // Documents saved above take their position in the upsert; a row may change once per statement.
        steps.push(
            cte(
                "ordered",
                Prisma.sql`UPDATE "Document" AS d SET "position" = (o.ord - 1)::int
                    FROM jsonb_array_elements_text(${jsonb(order)}) WITH ORDINALITY AS o(id, ord)
                    WHERE d."userId" = ${userId} AND d."id" = o.id
                    ${rows.length ? Prisma.sql`AND o.id NOT IN (SELECT id FROM "input")` : Prisma.empty}`,
            ),
        );

    // Words added across these documents, for the library's "Writing this week".
    if (changes.activityDay) {
        const words = rows.length
            ? Prisma.sql`(SELECT coalesce(sum(greatest(0, "up"."wordCount" - coalesce("old"."wordCount", 0))), 0)::int
                FROM "up" LEFT JOIN "old" ON "old"."id" = "up"."id")`
            : Prisma.sql`0`;
        steps.push(
            cte(
                "activity",
                Prisma.sql`INSERT INTO "WritingDay" ("userId", "day", "words")
                    VALUES (${userId}, ${changes.activityDay}, ${words})
                    ON CONFLICT ("userId", "day") DO UPDATE SET "words" = "WritingDay"."words" + EXCLUDED."words"`,
            ),
        );
    }

    const settings = [
        ...(changes.nextThoughtColour !== undefined
            ? [
                  [
                      "nextThoughtColour",
                      Prisma.sql`${changes.nextThoughtColour}::int`,
                  ] as const,
              ]
            : []),
        ...(changes.active !== undefined
            ? [["activeDocumentId", Prisma.sql`${changes.active}`] as const]
            : []),
    ];
    if (settings.length)
        steps.push(
            cte(
                "settings",
                Prisma.sql`INSERT INTO "Workspace" ("userId", ${Prisma.raw(settings.map(([column]) => `"${column}"`).join(", "))})
                    VALUES (${userId}, ${Prisma.join(settings.map(([, value]) => value))})
                    ON CONFLICT ("userId") DO UPDATE SET ${Prisma.raw(
                        settings
                            .map(
                                ([column]) =>
                                    `"${column}" = EXCLUDED."${column}"`,
                            )
                            .join(", "),
                    )}`,
            ),
        );

    const statements = steps.length
        ? [Prisma.sql`WITH ${Prisma.join(steps, ",\n")} SELECT 1`]
        : [];

    if (goals)
        // Runs after the documents, so a revision of a removed universal goal is closed even in a
        // document saved above (the editor holds one document; this reaches all of them).
        statements.push(Prisma.sql`WITH
            "kept" AS (SELECT 'universal:' || g AS "checkId" FROM jsonb_array_elements_text(${jsonb(goals.map((goal) => goal.id))}) AS g),
            "closed" AS (UPDATE "Document" SET "session" = NULL
                WHERE "userId" = ${userId} AND "session" IS NOT NULL
                AND ("session"::jsonb->>'checkId') LIKE 'universal:%'
                AND ("session"::jsonb->>'checkId') NOT IN (SELECT "checkId" FROM "kept")),
            "gone" AS (DELETE FROM "RevisionGoal" WHERE "userId" = ${userId}),
            "added" AS (INSERT INTO "RevisionGoal" ("key", "id", "userId", "text", "position")
                SELECT gen_random_uuid()::text, g.value->>'id', ${userId}, g.value->>'text', (g.ord - 1)::int
                FROM jsonb_array_elements(${jsonb(goals)}) WITH ORDINALITY AS g(value, ord))
            SELECT 1`);

    if (statements.length === 1) await db.$queryRaw(statements[0]!);
    else if (statements.length)
        await db.$transaction(
            statements.map((statement) => db.$queryRaw(statement)),
        );
}
