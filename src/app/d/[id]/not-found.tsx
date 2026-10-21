import Link from "next/link";

export default function DocumentNotFound() {
    return (
        <main className="bg-paper text-ink flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
            <h1 className="font-serif text-[24px] font-semibold">
                This document isn’t here
            </h1>
            <p className="text-muted max-w-[380px] text-[14px] leading-relaxed">
                It may have been deleted, or the link may be mistyped.
            </p>
            <Link
                href="/"
                className="text-accent mt-3 rounded-lg px-4 py-2.5 text-[14px] no-underline hover:bg-[var(--control-hover)]"
            >
                Back to your documents
            </Link>
        </main>
    );
}
