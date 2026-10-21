import { type Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "~/server/better-auth/server";
import Welcome from "./welcome";

export const metadata: Metadata = { title: "Welcome · Writely" };

export default async function WelcomePage() {
    const session = await getSession();
    if (!session) redirect("/sign-in");
    return <Welcome name={session.user.name} />;
}
