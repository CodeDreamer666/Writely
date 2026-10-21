/**
 * What: The revision goals every new account starts with, in order.
 *
 * Used in:
 * - src/server/workspace.ts (ensureWorkspace, when a new account is set up)
 * - src/lib/writely/revision-model.ts (migrateRevisions, for older saved data)
 * - src/app/components/landing/landing.tsx (GoalDemo on the home page)
 *
 * Effect: Changing the list changes the goals new writers see first and the
 * goals shown in the home page demo. Writers who already have an account
 * keep their own goals.
 */
export const DEFAULT_GOAL_TEXTS = [
    "Improve the introduction",
    "Remove repeated ideas",
    "Find a quieter ending",
];
