"use client";
import {
    Feather,
    Settings,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { authClient } from "~/server/better-auth/client";
import { ActionMenu } from "./ui";

export type AccountUser = { id: string; name: string; email: string };

export async function logOut() {
    await authClient.signOut();
    // A full load, so nothing from the signed-in session stays in memory.
    window.location.href = "/sign-in";
}

/**
 * The quiet top bar of the library and settings: brand, an optional search field in the middle,
 * settings and the account menu.
 */
export function AppHeader({
    user,
    search,
}: {
    user: AccountUser;
    search?: ReactNode;
}) {
    const router = useRouter();
    const initial = (user.name || user.email).trim().charAt(0).toUpperCase();
    return (
        <header
            className={
                search
                    ? "border-line grid h-[76px] grid-cols-[minmax(0,1fr)_minmax(0,780px)_minmax(0,1fr)] items-center gap-6 border-b px-8 max-md:h-auto max-md:grid-cols-[1fr_auto] max-md:gap-x-3 max-md:gap-y-2 max-md:px-4 max-md:py-3 [&>.header-search]:max-md:col-span-2 [&>.header-search]:max-md:row-start-2"
                    : "flex h-16 items-center gap-3 px-6 max-sm:px-4"
            }
        >
            <Link
                href="/"
                className="text-accent flex items-center gap-2.5 justify-self-start rounded-md px-1 no-underline focus-visible:[box-shadow:0_0_0_2px_var(--control-ring)] focus-visible:outline-none"
            >
                <Feather size={20} strokeWidth={1.5} aria-hidden="true" />
                <span className="text-ink text-[20px] font-semibold tracking-[-0.04em]">
                    Writely
                </span>
            </Link>
            {search && <div className="header-search min-w-0">{search}</div>}
            <nav
                aria-label="Account"
                className="ml-auto flex items-center gap-1 justify-self-end"
            >
                <Link
                    href="/settings"
                    aria-label="Settings"
                    title="Settings"
                    className="text-muted hover:text-ink inline-flex size-11 items-center justify-center rounded-lg no-underline hover:bg-[var(--control-hover)] focus-visible:[box-shadow:0_0_0_2px_var(--control-ring)] focus-visible:outline-none"
                >
                    <Settings size={18} strokeWidth={1.6} />
                </Link>
                <div className="account-menu [&_.document-menu-trigger]:pointer-events-auto! [&_.document-menu-trigger]:size-11! [&_.document-menu-trigger]:opacity-100!">
                    <ActionMenu
                        label={`Account: ${user.name || user.email}`}
                        menuLabel="Account"
                        trigger={
                            <span
                                aria-hidden="true"
                                className="bg-tint text-accent flex size-7 items-center justify-center rounded-full text-[12px] font-semibold"
                            >
                                {initial}
                            </span>
                        }
                        items={[
                            {
                                label: "Settings",
                                onSelect: () => router.push("/settings"),
                            },
                            { label: "Log out", onSelect: () => void logOut() },
                        ]}
                    />
                </div>
            </nav>
        </header>
    );
}
