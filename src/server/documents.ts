import { Prisma } from "../../generated/prisma/client";
import {
    excerpt,
    searchTerms,
} from "~/lib/writely/plain-text";
import {
    type DOCUMENT_FILTERS,
    RECENT_DAYS,
} from "~/config/documents";
import { db } from "~/server/db";
import { settled } from "~/server/workspace";

export type DocumentFilter = (typeof DOCUMENT_FILTERS)[number];

export type DocumentSummary = {
    id: string;
    title: string;
    excerpt: string;
    updated: Date;
    created: Date;
    pinned: boolean;
    archived: boolean;
    wordCount: number;
};

// LIKE treats % and _ as wildcards; a writer searching for "50%" means the character.
const likePattern = (term: string) =>
    "%" + term.replace(/[\\%_]/g, (c) => "\\" + c) + "%";

/**
 * One page of the user's documents. Every search term must appear in the title or the text
 * (case-insensitive); trigram indexes keep this fast for large libraries. Only a window of each
 * document's text is read, for its excerpt.
 */
export async function listDocuments(
    userId: string,
    {
        query = "",
        filter = "all",
        offset = 0,
        limit = 30,
        titleOnly = false,
    }: {
        query?: string;
        filter?: DocumentFilter;
        offset?: number;
        limit?: number;
        titleOnly?: boolean;
    },
) {
    await settled(userId);
    const terms = searchTerms(query);
    const conditions = [
        Prisma.sql`"userId" = ${userId}`,
        Prisma.sql`"archived" = ${filter === "archived"}`,
    ];
    if (filter === "pinned") conditions.push(Prisma.sql`"pinned" = true`);
    if (filter === "recent")
        conditions.push(
            Prisma.sql`"updated" >= ${new Date(Date.now() - RECENT_DAYS * 86_400_000)}`,
        );
    for (const term of terms)
        conditions.push(
            titleOnly
                ? Prisma.sql`"title" ILIKE ${likePattern(term)}`
                : Prisma.sql`("title" ILIKE ${likePattern(term)} OR "plainText" ILIKE ${likePattern(term)})`,
        );
    // Where the first term appears in the text, so the excerpt can show it in context.
    const first = terms[0] ?? "";
    const rows = await db.$queryRaw<
        (Omit<DocumentSummary, "excerpt"> & {
            window: string;
            windowStart: number;
            total: bigint;
        })[]
    >`
    WITH matches AS (
      SELECT "id", "title", "updated", "created", "pinned", "archived", "wordCount", "key", "plainText",
        CASE WHEN ${first} = '' THEN 0 ELSE strpos(lower("plainText"), ${first}) END AS "hit"
      FROM "Document"
      WHERE ${Prisma.join(conditions, " AND ")}
    )
    SELECT "id", "title", "updated", "created", "pinned", "archived", "wordCount",
      greatest(1, "hit" - 120)::int AS "windowStart",
      substr("plainText", greatest(1, "hit" - 120), 480) AS "window",
      count(*) OVER () AS "total"
    FROM matches
    ORDER BY "updated" DESC, "key" ASC
    LIMIT ${limit} OFFSET ${offset}
  `;
    const total = Number(rows[0]?.total ?? 0);
    return {
        total,
        nextOffset: offset + rows.length < total ? offset + rows.length : null,
        terms,
        items: rows.map(
            ({
                window,
                windowStart,
                total: _total,
                ...row
            }): DocumentSummary => {
                const text = excerpt(window, terms, 180);
                return {
                    ...row,
                    excerpt:
                        windowStart > 1 && !text.startsWith("…")
                            ? "…" + text
                            : text,
                };
            },
        ),
    };
}

/** How many documents each library filter shows, for the sidebar. */
export async function documentCounts(userId: string) {
    await settled(userId);
    const since = new Date(Date.now() - RECENT_DAYS * 86_400_000);
    const [row] = await db.$queryRaw<
        { all: bigint; recent: bigint; pinned: bigint; archived: bigint }[]
    >`
    SELECT
      count(*) FILTER (WHERE NOT "archived") AS "all",
      count(*) FILTER (WHERE NOT "archived" AND "updated" >= ${since}) AS "recent",
      count(*) FILTER (WHERE NOT "archived" AND "pinned") AS "pinned",
      count(*) FILTER (WHERE "archived") AS "archived"
    FROM "Document" WHERE "userId" = ${userId}
  `;
    return {
        all: Number(row?.all ?? 0),
        recent: Number(row?.recent ?? 0),
        pinned: Number(row?.pinned ?? 0),
        archived: Number(row?.archived ?? 0),
    } satisfies Record<DocumentFilter, number>;
}

/** Archiving moves a document out of All, Recent and Pinned without deleting anything. */
export async function setArchived(
    userId: string,
    id: string,
    archived: boolean,
) {
    await settled(userId);
    const { count } = await db.document.updateMany({
        where: { userId, id },
        data: { archived },
    });
    return count > 0;
}

/** Pinned documents first, then the most recently edited; for the editor's quick list. */
export async function recentDocuments(userId: string, query = "") {
    await settled(userId);
    const terms = searchTerms(query);
    return db.document.findMany({
        where: {
            userId,
            AND: terms.map((term) => ({
                title: { contains: term, mode: "insensitive" as const },
            })),
        },
        orderBy: [{ pinned: "desc" }, { updated: "desc" }, { key: "asc" }],
        take: terms.length ? 20 : 12,
        select: { id: true, title: true, pinned: true, updated: true },
    });
}

export async function renameDocument(
    userId: string,
    id: string,
    title: string,
) {
    await settled(userId);
    const { count } = await db.document.updateMany({
        where: { userId, id },
        data: { title },
    });
    return count > 0;
}

export async function setPinned(userId: string, id: string, pinned: boolean) {
    await settled(userId);
    const { count } = await db.document.updateMany({
        where: { userId, id },
        data: { pinned },
    });
    return count > 0;
}

export async function deleteDocument(userId: string, id: string) {
    await settled(userId);
    const { count } = await db.document.deleteMany({ where: { userId, id } });
    return count > 0;
}

/** The saved title and text of one of the user's own documents, for exporting; null if it isn't theirs. */
export async function exportSource(userId: string, id: string) {
    await settled(userId);
    return db.document.findFirst({
        where: { userId, id },
        select: { title: true, html: true, updated: true },
    });
}

/** The most recently edited document, for "continue where you left off". */
export function latestDocument(userId: string) {
    return db.document.findFirst({
        where: { userId },
        orderBy: { updated: "desc" },
        select: { id: true, title: true, updated: true },
    });
}
