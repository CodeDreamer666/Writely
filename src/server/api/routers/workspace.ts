import { z } from "zod";
import { CARD_COLOUR_PRESETS } from "~/config/cards";
import {
    createTRPCRouter,
    protectedProcedure,
} from "~/server/api/trpc";
import {
    getOrCreateWorkspace,
    saveWorkspace,
} from "~/server/workspace";

const id = z.string().min(1).max(200);
const text = z.string().max(5_000_000);

const connector = z
    .object({
        id,
        anchor: z.enum(["top", "right", "bottom", "left"]).optional(),
        target: z
            .object({
                kind: z.enum(["essay", "word", "text", "paragraph"]),
                from: z.number().int().optional(),
                to: z.number().int().optional(),
                quote: text,
                orphaned: z.boolean().optional(),
            })
            .passthrough(),
    })
    .passthrough();

// Cards carry placement fields that vary by version, so unknown fields are kept as they are.
const card = z
    .object({
        id,
        text,
        html: text.optional(),
        placement: z.enum(["margin", "free"]).optional(),
        side: z.enum(["left", "right"]).optional(),
        x: z.number().optional(),
        y: z.number().optional(),
        offset: z.number().optional(),
        opacity: z.number(),
        bg: z.string(),
        fg: z.string(),
        connectors: z.array(connector).max(10_000).optional(),
        collapsed: z.boolean().optional(),
        leafPosition: z
            .object({
                side: z.enum(["left", "right"]).optional(),
                x: z.number(),
                y: z.number(),
            })
            .optional(),
    })
    .passthrough();

const draft = z.object({
    id,
    name: z.string().max(1000),
    html: text,
    title: z.string().max(1000),
    time: z.number(),
    goal: z.string().max(1000).optional(),
    baseline: id.optional(),
});

const check = z.object({
    id,
    text: z.string().max(1000),
    done: z.boolean(),
    sourceDefaultId: id.optional(),
});

export const documentInput = z.object({
    id,
    title: z.string().max(1000),
    html: text,
    updated: z.number(),
    hidden: z.boolean(),
    session: z
        .object({
            checkId: z.string(),
            goal: z.string().max(1000),
            baseline: z.string(),
            workingId: z.string(),
            started: z.number(),
        })
        .partial({ goal: true, baseline: true, workingId: true, started: true })
        .nullable(),
    universalProgress: z.record(z.string(), z.boolean()).optional(),
    drafts: z.array(draft).max(10_000).optional(),
    checks: z.array(check).max(10_000).optional(),
    cards: z.array(card).max(10_000).optional(),
});

const workspaceChangesInput = z.object({
    // New cards cycle through every preset, so the next colour is always one of them.
    nextThoughtColour: z
        .number()
        .int()
        .min(0)
        .max(CARD_COLOUR_PRESETS.length - 1)
        .optional(),
    active: id.optional(),
    goals: z
        .array(z.object({ id, text: z.string().max(1000) }))
        .max(10_000)
        .optional(),
    order: z.array(id).max(10_000).optional(),
    documents: z.array(documentInput).max(10_000).optional(),
    deleted: z.array(id).max(10_000).optional(),
    /** The writer's local calendar day, sent with saves that change writing or finish a revision. */
    activityDay: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional(),
});

export type WorkspaceChangesInput = z.infer<typeof workspaceChangesInput>;

export const workspaceRouter = createTRPCRouter({
    /** The signed-in user's manuscripts, drafts, cards and goals (all of them). */
    get: protectedProcedure.query(({ ctx }) =>
        getOrCreateWorkspace(ctx.session.user.id),
    ),

    /** Autosave: applies only what changed since the last successful save. */
    save: protectedProcedure
        .input(workspaceChangesInput)
        .mutation(async ({ ctx, input }) => {
            await saveWorkspace(ctx.session.user.id, input);
        }),
});
