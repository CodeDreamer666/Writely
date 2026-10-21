import { type Metadata } from "next";
import { redirect } from "next/navigation";
import { readPreferences } from "~/lib/writely/preferences";
import { getSession } from "~/server/better-auth/server";
import { db } from "~/server/db";
import {
    ensureWorkspace,
    settled,
} from "~/server/workspace";
import SettingsPage from "../components/writely/settings-page";

export const metadata: Metadata = { title: "Settings · Writely" };

export default async function Settings() {
    const session = await getSession();
    if (!session) redirect("/sign-in?next=/settings");
    const userId = session.user.id;
    await settled(userId);
    const workspace = await ensureWorkspace(userId);
    const goals = await db.revisionGoal.findMany({
        where: { userId },
        orderBy: { position: "asc" },
        select: { id: true, text: true },
    });
    return (
        <SettingsPage
            user={{
                id: userId,
                name: session.user.name,
                email: session.user.email,
            }}
            initialPreferences={readPreferences(workspace.preferences)}
            initialGoals={goals}
        />
    );
}
