import { accountRouter } from "~/server/api/routers/account";
import { documentsRouter } from "~/server/api/routers/documents";
import { workspaceRouter } from "~/server/api/routers/workspace";
import {
    createCallerFactory,
    createTRPCRouter,
} from "~/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
    workspace: workspaceRouter,
    documents: documentsRouter,
    account: accountRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.workspace.get();
 */
export const createCaller = createCallerFactory(appRouter);
