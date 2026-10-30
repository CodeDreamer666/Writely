"use client";
import {
    ArrowLeft,
    Feather,
    Settings,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { authClient } from "~/server/better-auth/client";

export type AccountUser = { id: string; name: string; email: string };

export async function logOut() {
    await authClient.signOut();
    // A full load, so nothing from the signed-in session stays in memory.
    window.location.href = "/";
}

/**
 * The quiet top bar of the library and settings: brand, an optional search field in the middle,
 * and a settings link.
 */
export function AppHeader({
    search,
    back,
}: {
    search?: ReactNode;
    back?: { href: string; label: string; onClick?: () => void };
}) {
    return (
        <header
            className={
                search
                    ? "border-line grid h-[76px] grid-cols-[minmax(140px,1fr)_minmax(0,780px)_minmax(44px,1fr)] items-center gap-6 border-b px-8 max-xl:gap-4 max-xl:px-6 max-md:h-auto max-md:grid-cols-[1fr_auto] max-md:gap-x-3 max-md:gap-y-2 max-md:px-4 max-md:py-3 [&>.header-search]:max-md:col-span-2 [&>.header-search]:max-md:row-start-2"
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
                    href={back?.href ?? "/settings"}
                    aria-label={back?.label ?? "Settings"}
                    title={back?.label ?? "Settings"}
                    onNavigate={
                        back?.onClick
                            ? (event) => {
                                  event.preventDefault();
                                  back.onClick?.();
                              }
                            : undefined
                    }
                    className="text-muted hover:text-ink inline-flex size-11 items-center justify-center rounded-lg no-underline hover:bg-[var(--control-hover)] focus-visible:[box-shadow:0_0_0_2px_var(--control-ring)] focus-visible:outline-none"
                >
                    {back ? (
                        <ArrowLeft
                            size={18}
                            strokeWidth={1.6}
                            aria-hidden="true"
                        />
                    ) : (
                        <Settings
                            size={18}
                            strokeWidth={1.6}
                            aria-hidden="true"
                        />
                    )}
                </Link>
            </nav>
        </header>
    );
}
