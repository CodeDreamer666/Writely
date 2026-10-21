import { z } from "zod";
import { preferencesSchema } from "~/lib/writely/preferences";
import {
    createTRPCRouter,
    protectedProcedure,
} from "~/server/api/trpc";
import {
    getHomeState,
    getPreferences,
    markWelcomeBack,
    markWelcomed,
    updatePreferences,
} from "~/server/account";

export const accountRouter = createTRPCRouter({
    preferences: protectedProcedure.query(({ ctx }) =>
        getPreferences(ctx.session.user.id),
    ),

    /** Merges the given preferences into the stored ones. */
    updatePreferences: protectedProcedure
        .input(preferencesSchema.partial())
        .mutation(({ ctx, input }) =>
            updatePreferences(ctx.session.user.id, input),
        ),

    markWelcomed: protectedProcedure.mutation(({ ctx }) =>
        markWelcomed(ctx.session.user.id),
    ),

    /** Activity since the given local day, and what's needed for a welcome-back message. */
    home: protectedProcedure
        .input(z.object({ since: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }))
        .query(({ ctx, input }) =>
            getHomeState(ctx.session.user.id, input.since),
        ),

    markWelcomeBack: protectedProcedure.mutation(({ ctx }) =>
        markWelcomeBack(ctx.session.user.id),
    ),
});
