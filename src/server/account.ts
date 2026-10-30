import {
    readPreferences,
    type Preferences,
} from "~/lib/writely/preferences";
import { db } from "~/server/db";
import { ensureWorkspace } from "~/server/workspace";

export async function getPreferences(userId: string) {
    const workspace = await ensureWorkspace(userId);
    return readPreferences(workspace.preferences);
}

export async function updatePreferences(
    userId: string,
    changes: Partial<Preferences>,
) {
    const current = await getPreferences(userId);
    const next = readPreferences({ ...current, ...changes });
    await db.workspace.update({
        where: { userId },
        data: { preferences: next },
    });
    return next;
}

/** Sets welcomedAt; nothing in the app reads it any more. */
export async function markWelcomed(userId: string) {
    await ensureWorkspace(userId);
    await db.workspace.updateMany({
        where: { userId, welcomedAt: null },
        data: { welcomedAt: new Date() },
    });
}

/**
 * What the library needs to decide on a welcome-back message and the week of writing activity.
 * Days are the writer's local calendar days, so the browser does the date arithmetic.
 */
export async function getHomeState(userId: string, since: string) {
    const workspace = await ensureWorkspace(userId);
    const [days, latestDay, latest] = await Promise.all([
        db.writingDay.findMany({
            where: { userId, day: { gte: since } },
            select: { day: true, words: true },
            orderBy: { day: "asc" },
        }),
        db.writingDay.findFirst({
            where: { userId },
            orderBy: { day: "desc" },
            select: { day: true },
        }),
        db.document.findFirst({
            where: { userId },
            orderBy: { updated: "desc" },
            select: { id: true, title: true, updated: true },
        }),
    ]);
    return {
        activeDays: days.map((d) => d.day),
        /** Words added on each of those days (0 for days recorded before word counts were kept). */
        wordsByDay: Object.fromEntries(days.map((d) => [d.day, d.words])),
        /** The last local day with writing, if activity has been recorded. */
        lastWritingDay: latestDay?.day ?? null,
        /** Fallback for writing from before activity was recorded. */
        latestDocument: latest,
        welcomeBackAt: workspace.welcomeBackAt,
    };
}

export async function markWelcomeBack(userId: string) {
    await db.workspace.update({
        where: { userId },
        data: { welcomeBackAt: new Date() },
    });
}
