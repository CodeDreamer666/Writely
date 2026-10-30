import { type Metadata } from "next";
import {
    notFound,
    redirect,
} from "next/navigation";
import { readPreferences } from "~/lib/writely/preferences";
import { getSession } from "~/server/better-auth/server";
import {
    ensureWorkspace,
    loadDocumentWorkspace,
} from "~/server/workspace";
import { WritelyLoader } from "../../components/writely/writely-loader";

export const metadata: Metadata = { title: "Writely" };

export default async function DocumentPage(props: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await props.params;
    const session = await getSession();
    if (!session)
        redirect(`/auth/google?next=${encodeURIComponent(`/d/${id}`)}`);
    const [workspace, data] = await Promise.all([
        ensureWorkspace(session.user.id),
        loadDocumentWorkspace(session.user.id, id),
    ]);
    // Unknown ids and other people's documents look the same.
    if (!data) notFound();
    return (
        <WritelyLoader
            key={id}
            initialWorkspace={data}
            preferences={readPreferences(workspace.preferences)}
            user={{
                id: session.user.id,
                name: session.user.name,
                email: session.user.email,
            }}
        />
    );
}
