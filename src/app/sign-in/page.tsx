import { type Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "~/server/better-auth/server";
import { googleEnabled } from "~/server/better-auth/config";
import Link from "next/link";
import {
    ArrowLeft,
    Feather,
} from "lucide-react";
import { AuthForm } from "./auth-form";

export const metadata: Metadata = { title: "Sign in · Writely" };

export default async function SignInPage(props: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const { next, mode } = await props.searchParams;
    if (await getSession())
        redirect(
            typeof next === "string" &&
                next.startsWith("/") &&
                !next.startsWith("//")
                ? next
                : "/",
        );
    return (
        <main className="auth-hero bg-paper text-ink grid min-h-dvh grid-cols-[minmax(0,1fr)_minmax(0,1fr)] max-[900px]:grid-cols-1">
            <aside
                aria-hidden="true"
                className="landing-field field-butter relative flex flex-col justify-between overflow-hidden bg-[var(--field)] px-12 py-10 text-[var(--field-text)] max-[900px]:hidden"
            >
                <span className="flex items-center gap-2.5">
                    <Feather size={20} strokeWidth={1.5} />
                    <span className="text-[20px] font-semibold tracking-[-0.04em]">
                        Writely
                    </span>
                </span>
                <div className="max-w-[520px]">
                    <p className="font-serif text-[clamp(36px,3.6vw,54px)] leading-[1.05] tracking-[-0.03em]">
                        Begin anywhere. Every thought has somewhere to go.
                    </p>
                    <div className="mt-10 w-[260px] translate-x-[18%] rounded-[10px] border border-[color-mix(in_srgb,#1F1D1A_10%,transparent)] bg-[#DDEBDD] p-4 text-[#1F1D1A] [box-shadow:0_18px_36px_-18px_color-mix(in_srgb,#1F1D1A_45%,transparent)]">
                        <p className="font-serif text-[15.5px] leading-[1.55]">
                            Leaving ≠ becoming someone else. Stay with this
                            feeling.
                        </p>
                    </div>
                </div>
                <span className="text-[13px] opacity-70">
                    Sample thought · your own writing stays private to your
                    account
                </span>
            </aside>
            {/* Phones get the full-screen layout from AuthForm; this frame is for wider screens only. */}
            <div className="flex min-h-dvh flex-col px-6 py-6 max-[900px]:p-0">
                <Link
                    href="/"
                    className="text-muted hover:text-ink inline-flex min-h-10 items-center gap-2 self-start rounded-md px-1 text-[13px] no-underline focus-visible:[box-shadow:0_0_0_2px_var(--hover)] focus-visible:outline-none max-[900px]:hidden"
                >
                    <ArrowLeft size={15} aria-hidden="true" />
                    Writely home
                </Link>
                <div className="flex flex-1 items-center justify-center py-10 max-[900px]:block max-[900px]:py-0">
                    <AuthForm
                        initialMode={mode === "sign-up" ? "sign-up" : "sign-in"}
                        googleEnabled={googleEnabled}
                    />
                </div>
            </div>
        </main>
    );
}
