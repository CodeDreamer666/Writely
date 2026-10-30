import Link from "next/link";
import type { ReactNode } from "react";

export const CONTACT_EMAIL = "code.dreamer666@gmail.com";

export function LegalPage({
    title,
    updated,
    children,
}: {
    title: string;
    updated: string;
    children: ReactNode;
}) {
    return (
        <main className="bg-paper text-ink min-h-dvh px-6 py-12 max-md:px-4 max-md:py-8">
            <article className="mx-auto w-full max-w-[680px]">
                <Link
                    href="/"
                    className="text-accent text-[14px] no-underline hover:underline"
                >
                    ← Writely
                </Link>
                <h1 className="mt-6 mb-2 font-serif text-[40px] leading-[1.1] font-normal tracking-[-0.03em] max-md:text-[32px]">
                    {title}
                </h1>
                <p className="text-muted m-0 mb-8 text-[14px]">
                    Last updated {updated}
                </p>
                <div className="text-[16px] leading-[1.7] [&_h2]:mt-9 [&_h2]:mb-2 [&_h2]:text-[20px] [&_h2]:font-semibold [&_li]:mb-1.5 [&_p]:my-3 [&_ul]:my-3 [&_ul]:pl-5">
                    {children}
                </div>
            </article>
        </main>
    );
}
