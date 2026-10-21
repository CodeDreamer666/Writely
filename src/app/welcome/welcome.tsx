"use client";
import {
    ArrowRight,
    Feather,
    PenLine,
    Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    useEffect,
    useRef,
    useState,
} from "react";
import { makeDoc } from "~/lib/writely/model";
import { LEGACY_STORAGE_KEY } from "~/config/storage";
import { migrateRevisions } from "~/lib/writely/revision-model";
import type { UnmigratedWorkspace } from "~/lib/writely/types";
import { api } from "~/trpc/react";

/**
 * What: The look of the two large choice cards on the welcome screen
 * (start writing, or take the tutorial).
 *
 * Used in:
 * - src/app/welcome/welcome.tsx (Welcome)
 *
 * Effect: Changes the size, colour and hover lift of both choice cards.
 */
const CHOICE =
    "landing-field group flex min-h-[200px] w-full flex-col items-start justify-end gap-2 rounded-2xl border border-[color-mix(in_srgb,var(--field-text)_10%,transparent)] bg-[var(--field)] p-6 text-left text-[var(--field-text)] no-underline transition-[translate,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:[box-shadow:0_20px_36px_-24px_color-mix(in_srgb,#1F1D1A_50%,transparent)] focus-visible:outline-none focus-visible:[box-shadow:0_0_0_2px_var(--bg),0_0_0_4px_var(--hover)] disabled:opacity-60";

// Writing from the browser-only prototype moves into a new account once.
function readLegacyDocuments() {
    try {
        const stored = JSON.parse(
            localStorage.getItem(LEGACY_STORAGE_KEY) ?? "null",
        ) as UnmigratedWorkspace | null;
        if (
            stored?.docs?.length &&
            stored.docs.every(
                (d) =>
                    Array.isArray(d.cards) &&
                    Array.isArray(d.drafts) &&
                    Array.isArray(d.checks),
            )
        )
            return migrateRevisions(stored).docs;
    } catch {
        /* Unreadable prototype data stays where it is. */
    }
    return null;
}

/** First visit: one sentence about Writely and two ways in. Nothing is required. */
export default function Welcome({ name }: { name: string }) {
    const router = useRouter();
    const welcomed = api.account.markWelcomed.useMutation();
    const create = api.documents.create.useMutation();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [imported, setImported] = useState(0);
    const started = useRef(false);

    useEffect(() => {
        if (started.current) return;
        started.current = true;
        // Seen once is enough: later visits go straight to the library.
        welcomed.mutate();
        const legacy = readLegacyDocuments();
        if (legacy)
            create.mutate(
                {
                    documents: legacy.map((d) => ({
                        ...d,
                        updated: Date.now(),
                    })),
                },
                {
                    onSuccess: () => {
                        localStorage.removeItem(LEGACY_STORAGE_KEY);
                        setImported(legacy.length);
                    },
                },
            );
    }, [welcomed, create]);

    const startWriting = async () => {
        setBusy(true);
        setError("");
        const doc = makeDoc();
        try {
            await create.mutateAsync({ documents: [doc] });
            router.push(`/d/${doc.id}`);
        } catch {
            setBusy(false);
            setError(
                "Couldn’t create your first draft. Check your connection and try again.",
            );
        }
    };

    const first = name.trim().split(/\s+/)[0];
    return (
        <main className="bg-paper text-ink flex min-h-dvh items-center justify-center px-6 py-16">
            <div className="w-full max-w-[720px] [animation:appear_300ms_ease-out] motion-reduce:animate-none">
                <div className="text-accent mb-10 flex items-center gap-2.5">
                    <Feather size={22} strokeWidth={1.5} aria-hidden="true" />
                    <span className="text-ink text-[20px] font-semibold tracking-[-0.04em]">
                        Writely
                    </span>
                </div>
                <h1 className="font-serif text-[clamp(38px,6vw,64px)] leading-[1.02] font-normal tracking-[-0.035em] text-balance">
                    {first ? `Welcome, ${first}.` : "Welcome."}
                    <br />
                    <span className="text-muted">
                        A quiet place to write, rethink, and refine your work.
                    </span>
                </h1>
                <div className="mt-10 grid gap-3 sm:grid-cols-2">
                    <button
                        className={`${CHOICE} field-butter min-h-[200px]! items-start! justify-end! rounded-2xl! border! p-6! hover:bg-[var(--field)]!`}
                        onClick={() => void startWriting()}
                        disabled={busy}
                    >
                        <PenLine
                            size={20}
                            strokeWidth={1.5}
                            className="mb-auto"
                            aria-hidden="true"
                        />
                        <span className="font-serif text-[24px] tracking-[-0.02em]">
                            {busy ? "Opening a blank page…" : "Start writing"}
                        </span>
                        <span className="text-[13.5px] leading-relaxed text-[var(--field-soft)]">
                            Open a blank draft and begin.
                        </span>
                    </button>
                    <Link href="/tutorial" className={`${CHOICE} field-sky`}>
                        <Sparkles
                            size={20}
                            strokeWidth={1.5}
                            className="mb-auto"
                            aria-hidden="true"
                        />
                        <span className="font-serif text-[24px] tracking-[-0.02em]">
                            Explore with a sample
                        </span>
                        <span className="text-[13.5px] leading-relaxed text-[var(--field-soft)]">
                            Two minutes with a short paragraph and Writely’s
                            revision tools.
                        </span>
                    </Link>
                </div>
                {error && (
                    <p role="alert" className="text-danger mt-4 text-[13px]">
                        {error}
                    </p>
                )}
                {imported > 0 && (
                    <p role="status" className="text-muted mt-4 text-[13px]">
                        Your writing from this browser is in your documents.
                    </p>
                )}
                <Link
                    href="/"
                    className="text-muted hover:text-ink mt-8 inline-flex items-center gap-1.5 rounded-md py-2 text-[13px] no-underline"
                >
                    Go to my documents{" "}
                    <ArrowRight size={13} aria-hidden="true" />
                </Link>
            </div>
        </main>
    );
}
