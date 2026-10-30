import { NextResponse } from "next/server";
import { auth } from "~/server/better-auth";
import { getSession } from "~/server/better-auth/server";

/** Only paths inside Writely, so the link can't send anyone elsewhere after signing in. */
const inside = (next: string | null) =>
    next?.startsWith("/") && !next.startsWith("//") ? next : "/";

/**
 * Every way into Writely: a signed-in writer goes straight to `next` (the library by default);
 * anyone else is sent to Google's sign-in page and comes back to `next` afterwards.
 */
export async function GET(request: Request) {
    const next = inside(new URL(request.url).searchParams.get("next"));
    if (await getSession())
        return NextResponse.redirect(new URL(next, request.url));
    const started = await auth.api.signInSocial({
        body: {
            provider: "google",
            callbackURL: next,
            errorCallbackURL: "/",
            disableRedirect: true,
        },
        headers: request.headers,
        asResponse: true,
    });
    const { url } = (await started.json()) as { url: string };
    const response = NextResponse.redirect(url);
    // The OAuth state cookie, checked when Google sends the writer back.
    for (const cookie of started.headers.getSetCookie())
        response.headers.append("set-cookie", cookie);
    return response;
}
