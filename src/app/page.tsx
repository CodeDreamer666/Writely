import { type Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { readPreferences } from "~/lib/writely/preferences";
import { getSession } from "~/server/better-auth/server";
import { ensureWorkspace } from "~/server/workspace";
import Landing from "./components/landing/landing";
import Library from "./components/library/library";

export async function generateMetadata(): Promise<Metadata> {
    return (await getSession())
        ? { title: "Documents · Writely" }
        : {
              title: "Writely · A quiet place to write, and rewrite",
              description:
                  "Every good sentence was once unfinished. Leave notes for later, rewrite when the words come, and keep every version.",
          };
}

export default async function Home() {
    const session = await getSession();
    // Signed-out visitors get the front door; the library is for writers with an account.
    if (!session) return <Landing />;
    const workspace = await ensureWorkspace(session.user.id);
    if (!workspace.welcomedAt) redirect("/welcome");
    return (
        <Suspense>
            <Library
                user={{
                    id: session.user.id,
                    name: session.user.name,
                    email: session.user.email,
                }}
                initialPreferences={readPreferences(workspace.preferences)}
            />
        </Suspense>
    );
}
