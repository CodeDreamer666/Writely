import { type Metadata } from "next";
import { redirect } from "next/navigation";
import { readPreferences } from "~/lib/writely/preferences";
import { getSession } from "~/server/better-auth/server";
import { ensureWorkspace } from "~/server/workspace";
import { TutorialLoader } from "./tutorial-loader";

export const metadata: Metadata = { title: "How Writely works · Writely" };

export default async function TutorialPage() {
    const session = await getSession();
    if (!session) redirect("/sign-in?next=/tutorial");
    const workspace = await ensureWorkspace(session.user.id);
    return (
        <TutorialLoader
            preferences={readPreferences(workspace.preferences)}
            user={{
                id: session.user.id,
                name: session.user.name,
                email: session.user.email,
            }}
        />
    );
}
