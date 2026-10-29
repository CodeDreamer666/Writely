import { feedbackSchema } from "~/lib/writely/feedback";
import {
    createTRPCRouter,
    protectedProcedure,
} from "~/server/api/trpc";
import { saveFeedback } from "~/server/feedback";

export const feedbackRouter = createTRPCRouter({
    /** Saves feedback from the signed-in writer. */
    submit: protectedProcedure
        .input(feedbackSchema)
        .mutation(({ ctx, input }) =>
            saveFeedback(
                ctx.session.user,
                input,
                ctx.headers.get("user-agent"),
            ),
        ),
});
