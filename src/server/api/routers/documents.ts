import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
    createTRPCRouter,
    protectedProcedure,
} from "~/server/api/trpc";
import { documentInput } from "~/server/api/routers/workspace";
import {
    deleteDocument,
    documentCounts,
    exportSource,
    listDocuments,
    recentDocuments,
    renameDocument,
    setArchived,
    setPinned,
} from "~/server/documents";
import { DOCUMENT_FILTERS } from "~/config/documents";
import { createDocuments } from "~/server/workspace";

const id = z.string().min(1).max(200);
const notFound = (found: boolean) => {
    if (!found) throw new TRPCError({ code: "NOT_FOUND" });
};

export const documentsRouter = createTRPCRouter({
    /** A page of the library, newest edit first: search and filter work together. */
    list: protectedProcedure
        .input(
            z.object({
                query: z.string().max(200).default(""),
                filter: z.enum(DOCUMENT_FILTERS).default("all"),
                cursor: z.number().int().min(0).nullish(),
                limit: z.number().int().min(1).max(60).default(30),
            }),
        )
        .query(({ ctx, input }) =>
            listDocuments(ctx.session.user.id, {
                ...input,
                offset: input.cursor ?? 0,
            }),
        ),

    /** Pinned and recent documents for the editor sidebar, optionally filtered by title. */
    recent: protectedProcedure
        .input(z.object({ query: z.string().max(200).default("") }))
        .query(({ ctx, input }) =>
            recentDocuments(ctx.session.user.id, input.query),
        ),

    /** Adds complete documents; used for new pieces, saved tutorial samples and old prototype data. */
    create: protectedProcedure
        .input(z.object({ documents: z.array(documentInput).min(1).max(100) }))
        .mutation(async ({ ctx, input }) => {
            await createDocuments(ctx.session.user.id, input.documents);
            return { ids: input.documents.map((doc) => doc.id) };
        }),

    /** How many documents each library filter shows. */
    counts: protectedProcedure.query(({ ctx }) =>
        documentCounts(ctx.session.user.id),
    ),

    archive: protectedProcedure
        .input(z.object({ id, archived: z.boolean() }))
        .mutation(async ({ ctx, input }) =>
            notFound(
                await setArchived(
                    ctx.session.user.id,
                    input.id,
                    input.archived,
                ),
            ),
        ),

    /** The latest saved state of an owned document, for Word and PDF export. */
    exportSource: protectedProcedure
        .input(z.object({ id }))
        .query(async ({ ctx, input }) => {
            const doc = await exportSource(ctx.session.user.id, input.id);
            if (!doc) throw new TRPCError({ code: "NOT_FOUND" });
            return doc;
        }),

    rename: protectedProcedure
        .input(z.object({ id, title: z.string().trim().min(1).max(120) }))
        .mutation(async ({ ctx, input }) =>
            notFound(
                await renameDocument(
                    ctx.session.user.id,
                    input.id,
                    input.title,
                ),
            ),
        ),

    pin: protectedProcedure
        .input(z.object({ id, pinned: z.boolean() }))
        .mutation(async ({ ctx, input }) =>
            notFound(
                await setPinned(ctx.session.user.id, input.id, input.pinned),
            ),
        ),

    delete: protectedProcedure
        .input(z.object({ id }))
        .mutation(async ({ ctx, input }) =>
            notFound(await deleteDocument(ctx.session.user.id, input.id)),
        ),
});
