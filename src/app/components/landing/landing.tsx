"use client";
import {
    ArrowRight,
    Check,
    ChevronDown,
    Clock,
    CloudCheck,
    Feather,
    FileDown,
    FileText,
    FolderOpen,
    GraduationCap,
    History,
    Lock,
    Monitor,
    Moon,
    NotebookPen,
    PenLine,
    Pin,
    Plus,
    Search,
    Sparkles,
    StickyNote,
    Briefcase,
    BookOpen,
    Microscope,
    Undo2,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import DiffText from "../writely/diff-text";
import { diffWords } from "~/lib/writely/model";

/**
 * The signed-out front door: what Writely is, how it works and what it's for, with real product
 * pieces drawn in HTML. Every passage of prose here is illustrative sample writing; there are no
 * prices, ratings or quotes, because Writely has none to show.
 */

/**
 * What: The link that opens the sign-in page already switched to
 * "create an account".
 *
 * Used in:
 * - src/app/components/landing/landing.tsx (Landing, Hero, FinalCta)
 *
 * Effect: Changes where every sign-up button on the home page goes.
 */
const SIGN_UP = "/sign-in?mode=sign-up";
/**
 * What: The look of the home page's main call-to-action links.
 *
 * Used in:
 * - src/app/components/landing/landing.tsx (Landing, Hero, FinalCta)
 *
 * Effect: Changes the colour, size and hover style of the home page's main
 * buttons.
 */
const PRIMARY =
    "inline-flex min-h-12 items-center justify-center gap-2 rounded-[10px] bg-accent px-6 text-[15px] font-medium text-[var(--on-accent)] no-underline [box-shadow:0_10px_24px_-14px_color-mix(in_srgb,var(--accent)_90%,transparent)] transition-[background-color,translate] duration-150 hover:bg-[var(--hover)] active:translate-y-px focus-visible:outline-none focus-visible:[box-shadow:0_0_0_2px_var(--bg),0_0_0_4px_var(--hover)]";
/**
 * What: The look of the home page's outlined secondary buttons
 * (such as "See how it works").
 *
 * Used in:
 * - src/app/components/landing/landing.tsx (Hero, FinalCta)
 *
 * Effect: Changes the size and hover style of the home page's secondary
 * buttons.
 */
const SECONDARY =
    "inline-flex min-h-12 items-center justify-center gap-2 rounded-[10px] border border-line bg-surface px-6 text-[15px] font-medium text-ink no-underline transition-colors duration-150 hover:border-[var(--control-focus)] focus-visible:outline-none focus-visible:[box-shadow:0_0_0_2px_var(--hover)]";
/**
 * What: The look of the small rounded label above each section title
 * (such as "KEY FEATURES").
 *
 * Used in:
 * - src/app/components/landing/landing.tsx (Eyebrow)
 *
 * Effect: Changes every section label on the home page.
 */
const EYEBROW =
    "inline-flex items-center rounded-full bg-tint px-3 py-1 text-[11px] font-semibold tracking-[0.12em] text-accent uppercase";
/**
 * What: The look of the white panels that hold product drawings and cards.
 *
 * Used in:
 * - src/app/components/landing/landing.tsx (most sections)
 *
 * Effect: Changes the border, corners and shadow of every panel.
 */
const PANEL =
    "rounded-2xl border border-line bg-surface [box-shadow:0_1px_2px_color-mix(in_srgb,var(--shadow)_4%,transparent)]";
const WIDTH = "mx-auto w-full max-w-[1200px] px-6 max-sm:px-4";

/**
 * What: The sections listed in the header and footer, as the anchor and label.
 *
 * Used in:
 * - src/app/components/landing/landing.tsx (Landing)
 *
 * Effect: Changes the page's navigation links. Each anchor must match a
 * section id below.
 */
const NAV = [
    ["features", "Features"],
    ["how-it-works", "How it works"],
    ["customize", "Customize"],
    ["faq", "FAQ"],
] as const;

function Wordmark() {
    return (
        <span className="text-accent flex items-center gap-2.5">
            <Feather size={22} strokeWidth={1.5} aria-hidden="true" />
            <span className="text-ink text-[20px] font-semibold tracking-[-0.04em]">
                Writely
            </span>
        </span>
    );
}

function Eyebrow({ children }: { children: ReactNode }) {
    return <p className={EYEBROW}>{children}</p>;
}

function SectionTitle({
    id,
    eyebrow,
    title,
    body,
}: {
    id: string;
    eyebrow: string;
    title: ReactNode;
    body?: ReactNode;
}) {
    return (
        <div className="mx-auto mb-12 flex max-w-[640px] flex-col items-center text-center max-sm:mb-8">
            <Eyebrow>{eyebrow}</Eyebrow>
            <h2
                id={id}
                className="mt-4 font-serif text-[clamp(30px,3.6vw,44px)] leading-[1.12] font-normal tracking-[-0.025em] text-balance"
            >
                {title}
            </h2>
            {body && (
                <p className="text-muted mt-4 text-[16px] leading-[1.65] text-balance">
                    {body}
                </p>
            )}
        </div>
    );
}

export default function Landing() {
    const [scrolled, setScrolled] = useState(false);
    useEffect(() => {
        const sync = () => setScrolled(window.scrollY > 8);
        sync();
        window.addEventListener("scroll", sync, { passive: true });
        return () => window.removeEventListener("scroll", sync);
    }, []);
    return (
        <div className="landing bg-paper text-ink min-h-dvh overflow-x-clip scroll-smooth">
            <a
                href="#main"
                className="bg-surface text-ink sr-only z-50 rounded-lg px-4 py-2 focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
            >
                Skip to content
            </a>
            <header
                className={`sticky top-0 z-40 transition-[background-color,box-shadow,border-color] duration-200 ${scrolled ? "border-line border-b bg-[color-mix(in_srgb,var(--bg)_88%,transparent)] backdrop-blur-md" : "border-b border-transparent"}`}
            >
                <div className={`${WIDTH} flex h-[72px] items-center gap-8`}>
                    <Link
                        href="/"
                        aria-label="Writely home"
                        className="rounded-md no-underline focus-visible:[box-shadow:0_0_0_2px_var(--hover)] focus-visible:outline-none"
                    >
                        <Wordmark />
                    </Link>
                    <nav
                        aria-label="Sections"
                        className="flex items-center gap-1 max-md:hidden"
                    >
                        {NAV.map(([id, label]) => (
                            <a
                                key={id}
                                href={`#${id}`}
                                className="text-muted hover:text-ink rounded-lg px-3 py-2 text-[14px] no-underline focus-visible:[box-shadow:0_0_0_2px_var(--hover)] focus-visible:outline-none"
                            >
                                {label}
                            </a>
                        ))}
                    </nav>
                    <nav
                        aria-label="Account"
                        className="ml-auto flex items-center gap-2"
                    >
                        <Link
                            href="/sign-in"
                            className="text-ink hover:bg-surface rounded-lg px-3 py-2 text-[14px] font-medium no-underline focus-visible:[box-shadow:0_0_0_2px_var(--hover)] focus-visible:outline-none"
                        >
                            Sign in
                        </Link>
                        <Link
                            href={SIGN_UP}
                            className={`${PRIMARY} min-h-10 px-4 text-[14px] max-[380px]:hidden`}
                        >
                            Get started
                        </Link>
                    </nav>
                </div>
            </header>

            <main id="main">
                <Hero />
                <Writers />
                <Features />
                <HowItWorks />
                <Showcase />
                <Customize />
                <Trust />
                <Faq />
                <FinalCta />
            </main>

            <footer className="border-line border-t">
                <div
                    className={`${WIDTH} text-muted flex flex-wrap items-center gap-x-8 gap-y-4 py-10 text-[13.5px]`}
                >
                    <Wordmark />
                    <span>A quieter place to write, rethink, and refine.</span>
                    <nav
                        aria-label="Footer"
                        className="ml-auto flex flex-wrap gap-x-6 gap-y-2"
                    >
                        {NAV.map(([id, label]) => (
                            <a
                                key={id}
                                href={`#${id}`}
                                className="text-muted hover:text-ink no-underline underline-offset-4 hover:underline"
                            >
                                {label}
                            </a>
                        ))}
                        <Link
                            href="/sign-in"
                            className="text-muted hover:text-ink no-underline underline-offset-4 hover:underline"
                        >
                            Sign in
                        </Link>
                    </nav>
                    <span className="w-full text-[12.5px]">
                        © {new Date().getFullYear()} Writely
                    </span>
                </div>
            </footer>
        </div>
    );
}

/* ——— Product drawing: a calm Writely window with thoughts beside the text ——— */

/**
 * What: The thought cards drawn in the product pictures, as the colour of
 * their dot, their title and their note.
 *
 * Used in:
 * - src/app/components/landing/landing.tsx (AppWindow)
 *
 * Effect: Changes the sample thoughts beside the sample text.
 */
const SAMPLE_THOUGHTS = [
    ["#d0566b", "Use more descriptive words", "Make the setting feel real and vivid."],
    ["#d9a03a", "Simplify this sentence", "It runs on; try two shorter ones."],
    ["#5f8f6b", "Add a stronger ending", "Leave a lasting impression."],
] as const;

function AppWindow({ sidebar = true }: { sidebar?: boolean }) {
    return (
        <div
            role="img"
            aria-label="Writely's editor: a document called A Quiet Afternoon, with highlighted phrases connected to revision thoughts in the margin."
            className={`${PANEL} overflow-hidden rounded-[18px] [box-shadow:0_40px_80px_-40px_color-mix(in_srgb,var(--shadow)_35%,transparent),0_2px_6px_color-mix(in_srgb,var(--shadow)_5%,transparent)]`}
        >
            <div className="border-line flex h-12 items-center gap-3 border-b px-4">
                <span className="text-accent flex items-center gap-2 text-[13px] font-semibold">
                    <Feather size={15} strokeWidth={1.6} aria-hidden="true" />
                    <span className="text-ink">Writely</span>
                </span>
                <span className="text-muted ml-3 flex items-center gap-1 text-[11.5px] max-sm:hidden">
                    <Check size={12} aria-hidden="true" />
                    Saved
                </span>
                <span className="text-muted ml-auto flex items-center gap-3">
                    <Undo2 size={14} aria-hidden="true" />
                    <span className="bg-accent rounded-md px-2.5 py-1 text-[11px] font-medium text-[var(--on-accent)]">
                        Finish revision
                    </span>
                </span>
            </div>
            <div
                className={`grid ${sidebar ? "grid-cols-[150px_minmax(0,1fr)_210px] max-[900px]:grid-cols-[minmax(0,1fr)_190px]" : "grid-cols-[minmax(0,1fr)_210px]"} max-[560px]:grid-cols-1`}
            >
                {sidebar && (
                    <div className="border-line bg-paper border-r p-3 max-[900px]:hidden">
                        <span className="border-line bg-surface text-muted flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-[10.5px]">
                            <Search size={11} aria-hidden="true" />
                            Search
                        </span>
                        <span className="text-muted mt-3 flex items-center gap-1.5 px-1 text-[11px]">
                            <Plus size={11} aria-hidden="true" />
                            New document
                        </span>
                        {[
                            "A Quiet Afternoon",
                            "Essay ideas",
                            "Chapter one",
                            "Research notes",
                            "Journal",
                        ].map((title, i) => (
                            <span
                                key={title}
                                className={`mt-1 block truncate rounded-md px-2 py-1.5 text-[11px] ${i === 0 ? "bg-tint text-accent font-medium" : "text-muted"}`}
                            >
                                {title}
                            </span>
                        ))}
                    </div>
                )}
                <div className="min-w-0 px-7 pt-7 pb-8 max-sm:px-5">
                    <p className="font-serif text-[22px] leading-tight tracking-[-0.01em]">
                        A Quiet Afternoon
                    </p>
                    <div className="mt-4 flex flex-col gap-3 font-serif text-[13.5px] leading-[1.75] text-[color-mix(in_srgb,var(--text)_85%,var(--surface))]">
                        <p>
                            I went to a small library on Saturday afternoon.{" "}
                            <mark className="rounded-[2px] bg-[color-mix(in_srgb,#d0566b_16%,var(--surface))] text-inherit">
                                It was a nice place with many nice books
                            </mark>
                            , and I liked how quiet it was.
                        </p>
                        <p>
                            <mark className="rounded-[2px] bg-[color-mix(in_srgb,#d9a03a_20%,var(--surface))] text-inherit">
                                I walked around for a while because I wanted to
                                find something interesting, but I did not know
                                what to read.
                            </mark>
                        </p>
                        <p className="text-[color-mix(in_srgb,var(--text)_55%,var(--surface))]">
                            After looking at several books, I picked one and sat
                            near a window…
                        </p>
                    </div>
                </div>
                <div className="border-line bg-paper flex flex-col gap-2.5 border-l p-3 max-[560px]:border-t max-[560px]:border-l-0">
                    <span className="text-muted px-1 text-[10.5px] font-semibold tracking-[0.06em] uppercase">
                        Thoughts
                    </span>
                    {SAMPLE_THOUGHTS.map(([colour, title, note]) => (
                        <span
                            key={title}
                            className="border-line bg-surface block rounded-[10px] border p-2.5 [box-shadow:0_6px_14px_-12px_color-mix(in_srgb,var(--shadow)_50%,transparent)]"
                        >
                            <span className="flex items-center gap-1.5 text-[11px] font-medium">
                                <span
                                    className="size-2 shrink-0 rounded-full"
                                    style={{ background: colour }}
                                />
                                {title}
                            </span>
                            <span className="text-muted mt-1 block text-[10px] leading-[1.45]">
                                {note}
                            </span>
                        </span>
                    ))}
                    <span className="text-muted flex items-center gap-1.5 px-1 text-[10.5px]">
                        <Plus size={11} aria-hidden="true" />
                        Add thought
                    </span>
                </div>
            </div>
        </div>
    );
}

/* ——— Hero ——— */

function Hero() {
    return (
        <section
            aria-labelledby="hero-title"
            className="relative isolate overflow-hidden"
        >
            <div
                aria-hidden="true"
                className="absolute inset-0 -z-10 bg-[radial-gradient(60%_55%_at_78%_35%,color-mix(in_srgb,var(--tint)_75%,transparent),transparent_70%),radial-gradient(40%_40%_at_10%_90%,color-mix(in_srgb,#fbefb5_35%,transparent),transparent_70%)]"
            />
            <div
                className={`${WIDTH} grid grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] items-center gap-14 pt-16 pb-24 max-[1000px]:grid-cols-1 max-sm:gap-10 max-sm:pt-8 max-sm:pb-16`}
            >
                <div className="max-w-[560px]">
                    <Eyebrow>A quieter way to write</Eyebrow>
                    <h1
                        id="hero-title"
                        className="mt-6 font-serif text-[clamp(44px,5.6vw,72px)] leading-[1.02] font-normal tracking-[-0.035em] text-balance"
                    >
                        A quieter place to write, rethink, and refine.
                    </h1>
                    <p className="text-muted mt-6 max-w-[32em] text-[18px] leading-[1.65] max-sm:text-[16.5px]">
                        Writely is a clean, text-focused writing app with
                        thoughtful revision tools. Write freely, keep your
                        thoughts beside the page, and make your words better —
                        one goal at a time.
                    </p>
                    <div className="mt-9 flex flex-wrap items-center gap-3">
                        <Link href={SIGN_UP} className={PRIMARY}>
                            Get started
                            <ArrowRight size={17} aria-hidden="true" />
                        </Link>
                        <a href="#how-it-works" className={SECONDARY}>
                            See how it works
                        </a>
                    </div>
                    <ul className="text-muted m-0 mt-8 flex list-none flex-wrap gap-x-6 gap-y-2 p-0 text-[14px]">
                        {[
                            "Distraction-free editor",
                            "Revision tools built in",
                            "Works in your browser",
                        ].map((item) => (
                            <li key={item} className="flex items-center gap-2">
                                <Check
                                    size={15}
                                    strokeWidth={2.2}
                                    className="text-accent"
                                    aria-hidden="true"
                                />
                                {item}
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="relative">
                    <p
                        aria-hidden="true"
                        className="text-muted absolute -top-10 right-6 rotate-[-4deg] font-serif text-[15px] italic max-sm:hidden"
                    >
                        Your ideas, more clearly.
                    </p>
                    <AppWindow />
                </div>
            </div>
        </section>
    );
}

/* ——— Who it's for (no counts or ratings: just the kinds of writing it suits) ——— */

function Writers() {
    return (
        <section aria-labelledby="writers-title" className="py-16 max-sm:py-12">
            <div className={WIDTH}>
                <div className={`${PANEL} px-8 py-10 text-center max-sm:px-5`}>
                    <Eyebrow>For every kind of writer</Eyebrow>
                    <h2
                        id="writers-title"
                        className="mt-4 font-serif text-[clamp(26px,3vw,36px)] leading-tight font-normal tracking-[-0.02em]"
                    >
                        Whether it’s a paper or a novel, there’s room to think.
                    </h2>
                    <ul className="text-muted m-0 mt-8 grid list-none grid-cols-5 gap-4 p-0 text-[14.5px] max-md:grid-cols-3 max-sm:grid-cols-2">
                        {(
                            [
                                [GraduationCap, "Students"],
                                [Microscope, "Researchers"],
                                [Briefcase, "Professionals"],
                                [BookOpen, "Authors"],
                                [NotebookPen, "Journalers"],
                            ] as const
                        ).map(([Icon, label]) => (
                            <li
                                key={label}
                                className="flex items-center justify-center gap-2.5"
                            >
                                <Icon
                                    size={20}
                                    strokeWidth={1.5}
                                    aria-hidden="true"
                                />
                                {label}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </section>
    );
}

/* ——— Features ——— */

function Features() {
    return (
        <section
            id="features"
            aria-labelledby="features-title"
            className="scroll-mt-20 py-20 max-sm:py-14"
        >
            <div className={WIDTH}>
                <SectionTitle
                    id="features-title"
                    eyebrow="Key features"
                    title="Simple to write. Powerful to improve."
                    body="Everything you need for focused writing, with a few unique tools that help you make it better."
                />
                <ul className="m-0 grid list-none grid-cols-4 gap-5 p-0 max-[1000px]:grid-cols-2 max-sm:grid-cols-1">
                    {(
                        [
                            [
                                PenLine,
                                "A clean writing space",
                                "A calm page, with every tool tucked into one slim dock beneath it.",
                            ],
                            [
                                StickyNote,
                                "Thought cards",
                                "Note what you want to improve and connect it to the exact words it’s about.",
                            ],
                            [
                                History,
                                "Compare and restore",
                                "Name drafts, see every change word by word, and go back whenever you like.",
                            ],
                            [
                                FolderOpen,
                                "Organize with ease",
                                "Search titles and text, pin what matters, and archive what’s done.",
                            ],
                        ] as const
                    ).map(([Icon, title, body]) => (
                        <li
                            key={title}
                            className={`${PANEL} p-7 transition-[translate,box-shadow] duration-200 hover:-translate-y-0.5 hover:[box-shadow:0_20px_36px_-24px_color-mix(in_srgb,var(--shadow)_35%,transparent)] motion-reduce:hover:translate-y-0`}
                        >
                            <span
                                aria-hidden="true"
                                className="bg-tint text-accent flex size-11 items-center justify-center rounded-xl"
                            >
                                <Icon size={20} strokeWidth={1.6} />
                            </span>
                            <h3 className="mt-5 text-[16.5px] font-semibold">
                                {title}
                            </h3>
                            <p className="text-muted mt-2 text-[14.5px] leading-[1.6]">
                                {body}
                            </p>
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
}

/* ——— How it works: four small product moments ——— */

function HowItWorks() {
    const steps: [string, string, ReactNode][] = [
        [
            "Write",
            "Start with a clean, focused page. Notes, essays, stories — whatever you’re working on.",
            <div key="write" className="px-4 pt-4">
                <p className="font-serif text-[15px]">A new piece</p>
                <p className="text-muted mt-2 font-serif text-[12px] italic">
                    Begin anywhere…
                </p>
                <span className="bg-accent mt-1 block h-4 w-px animate-pulse motion-reduce:animate-none" />
            </div>,
        ],
        [
            "Add thoughts",
            "Select a phrase and connect a thought to it: what to improve, and why.",
            <div key="thought" className="px-4 pt-4 font-serif text-[12px] leading-[1.6]">
                <span className="bg-tint rounded-[2px]">
                    Start writing your story
                </span>{" "}
                and keep going.
                <span className="border-line bg-surface mt-3 ml-6 flex w-max items-center gap-1.5 rounded-lg border px-2.5 py-1.5 font-sans text-[11px] [box-shadow:0_8px_16px_-12px_color-mix(in_srgb,var(--shadow)_50%,transparent)]">
                    <span className="size-2 rounded-full bg-[#5b7fd0]" />
                    Make the opening vivid
                </span>
            </div>,
        ],
        [
            "Revise with a goal",
            "Pick one goal from your checklist. Writely keeps the text from before you start.",
            <div key="goal" className="flex flex-col gap-1.5 px-4 pt-4 text-[11.5px]">
                {[
                    ["Improve the introduction", true],
                    ["Strengthen the argument", false],
                    ["Tighten the ending", false],
                ].map(([goal, done], i) => (
                    <span
                        key={goal as string}
                        className={`flex items-center gap-2 rounded-md px-2 py-1.5 ${i === 1 ? "bg-tint text-accent font-medium" : ""}`}
                    >
                        <span
                            className={`flex size-3.5 items-center justify-center rounded-[4px] border ${done ? "border-success bg-success text-[var(--on-accent)]" : i === 1 ? "border-accent" : "border-line"}`}
                        >
                            {done && <Check size={10} strokeWidth={3} />}
                        </span>
                        {goal}
                    </span>
                ))}
            </div>,
        ],
        [
            "Compare and refine",
            "Save a draft and see exactly what changed. Keep what works and keep improving.",
            <div key="compare" className="grid grid-cols-2 gap-3 px-4 pt-4 font-serif text-[11.5px] leading-[1.55]">
                <span>
                    <span className="text-muted block font-sans text-[10px] font-semibold">
                        Before
                    </span>
                    It was a{" "}
                    <s className="text-danger decoration-[1.5px]">very long</s>{" "}
                    journey.
                </span>
                <span>
                    <span className="text-muted block font-sans text-[10px] font-semibold">
                        After
                    </span>
                    It was a{" "}
                    <u className="text-success decoration-[1.5px]">quiet</u>{" "}
                    journey.
                </span>
            </div>,
        ],
    ];
    return (
        <section
            id="how-it-works"
            aria-labelledby="how-title"
            className="scroll-mt-20 bg-[color-mix(in_srgb,var(--tint)_45%,var(--bg))] py-20 max-sm:py-14"
        >
            <div className={WIDTH}>
                <SectionTitle
                    id="how-title"
                    eyebrow="From first draft to final version"
                    title="A simple way to write and improve."
                />
                <ol className="m-0 grid list-none grid-cols-4 gap-5 p-0 max-[1000px]:grid-cols-2 max-sm:grid-cols-1">
                    {steps.map(([title, body, picture], i) => (
                        <li key={title} className="flex flex-col">
                            <div
                                aria-hidden="true"
                                className={`${PANEL} h-[150px] overflow-hidden`}
                            >
                                {picture}
                            </div>
                            <h3 className="mt-5 flex items-center gap-2.5 text-[16.5px] font-semibold">
                                <span className="bg-accent flex size-6 items-center justify-center rounded-full text-[12px] text-[var(--on-accent)]">
                                    {i + 1}
                                </span>
                                {title}
                            </h3>
                            <p className="text-muted mt-2 text-[14.5px] leading-[1.6]">
                                {body}
                            </p>
                        </li>
                    ))}
                </ol>
            </div>
        </section>
    );
}

/* ——— Showcase: the real word-by-word comparison, to try ——— */

/**
 * What: The sample drafts compared word by word in the showcase, in order.
 *
 * Used in:
 * - src/app/components/landing/landing.tsx (Showcase)
 *
 * Effect: Changes the text and draft names the showcase compares. Each draft
 * is compared with the one after it.
 */
const VERSIONS = [
    {
        id: "first",
        name: "First thoughts",
        text: "I went to a small library on Saturday afternoon. It was a nice place with many nice books, and I liked how quiet it was.",
    },
    {
        id: "draft",
        name: "Draft 2",
        text: "On Saturday afternoon I found a small library. Its shelves were crowded with worn paperbacks, and the quiet felt almost solid.",
    },
    {
        id: "final",
        name: "Final",
        text: "On Saturday afternoon I found a small library, its shelves crowded with worn paperbacks. The quiet felt almost solid.",
    },
] as const;

function Showcase() {
    const [before, setBefore] = useState(0);
    const after = Math.min(before + 1, VERSIONS.length - 1);
    const parts = diffWords(VERSIONS[before]!.text, VERSIONS[after]!.text);
    return (
        <section aria-labelledby="showcase-title" className="py-24 max-sm:py-16">
            <div
                className={`${WIDTH} grid grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] items-center gap-14 max-[1000px]:grid-cols-1 max-sm:gap-10`}
            >
                <div className={`${PANEL} overflow-hidden rounded-[18px]`}>
                    <div
                        role="radiogroup"
                        aria-label="Versions to compare"
                        className="border-line bg-paper flex flex-wrap items-center gap-1 border-b p-2"
                    >
                        {VERSIONS.slice(0, -1).map((v, i) => (
                            <button
                                key={v.id}
                                role="radio"
                                aria-checked={before === i}
                                onClick={() => setBefore(i)}
                                className={`h-10! min-h-10! gap-2! rounded-lg! px-3! text-[13px]! ${before === i ? "bg-surface! text-ink! font-medium [box-shadow:0_1px_3px_color-mix(in_srgb,var(--shadow)_12%,transparent)]" : "text-muted"}`}
                            >
                                {v.name}
                                <ArrowRight size={13} aria-hidden="true" />
                                {VERSIONS[i + 1]!.name}
                            </button>
                        ))}
                    </div>
                    <div className="grid grid-cols-2 max-[640px]:grid-cols-1">
                        {(
                            [
                                [
                                    "Before",
                                    VERSIONS[before]!.name,
                                    parts.filter((p) => !p.added),
                                ],
                                [
                                    "After",
                                    VERSIONS[after]!.name,
                                    parts.filter((p) => !p.removed),
                                ],
                            ] as const
                        ).map(([label, name, chunks], i) => (
                            <div
                                key={label}
                                className={`min-w-0 px-8 pt-6 pb-9 max-sm:px-5 ${i ? "border-line border-l max-[640px]:border-t max-[640px]:border-l-0" : ""}`}
                            >
                                <p className="text-muted mb-4 flex items-baseline justify-between gap-2 text-[12px]">
                                    <span className="font-semibold">{label}</span>
                                    <span className="truncate">{name}</span>
                                </p>
                                <div className="landing-diff font-serif text-[17px] leading-[1.7] [overflow-wrap:anywhere] max-sm:text-[16px]">
                                    <DiffText chunks={chunks} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div>
                    <Eyebrow>A closer look</Eyebrow>
                    <h2
                        id="showcase-title"
                        className="mt-4 font-serif text-[clamp(30px,3.6vw,44px)] leading-[1.12] font-normal tracking-[-0.025em]"
                    >
                        Write and revise in one place.
                    </h2>
                    <p className="text-muted mt-4 text-[16px] leading-[1.65]">
                        Name a draft whenever it matters, then compare any two
                        versions word by word. Try it: pick the drafts to
                        compare.
                    </p>
                    <ul className="m-0 mt-7 flex list-none flex-col gap-3.5 p-0 text-[15px]">
                        {[
                            "Connect thoughts directly to your words",
                            "Keep revisions organized by goal",
                            "Compare versions side by side",
                            "Restoring an old draft saves your current text first",
                        ].map((item) => (
                            <li key={item} className="flex items-start gap-3">
                                <span className="bg-tint text-accent mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full">
                                    <Check
                                        size={12}
                                        strokeWidth={2.6}
                                        aria-hidden="true"
                                    />
                                </span>
                                {item}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </section>
    );
}

/* ——— Customize: the same sample page in light and dark ——— */

function SamplePage({ dark }: { dark: boolean }) {
    return (
        <div
            className="flex-1 px-8 pt-7 pb-9 max-sm:px-5"
            style={
                dark
                    ? { background: "#22211e", color: "#e8e4dc" }
                    : { background: "#ffffff", color: "#1f1d1a" }
            }
        >
            <p className="text-[20px] font-semibold tracking-[-0.01em]">
                Finding the Right Words
            </p>
            <p className="mt-3 text-[14.5px] leading-[1.75] opacity-85">
                Writing is often a process of discovering what we really want to
                say. Sometimes the first draft is only the beginning.
            </p>
        </div>
    );
}

function Customize() {
    return (
        <section
            id="customize"
            aria-labelledby="customize-title"
            className="scroll-mt-20 bg-[color-mix(in_srgb,var(--surface)_55%,var(--bg))] py-24 max-sm:py-16"
        >
            <div
                className={`${WIDTH} grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] items-center gap-14 max-[1000px]:grid-cols-1 max-sm:gap-10`}
            >
                <div>
                    <Eyebrow>Make it yours</Eyebrow>
                    <h2
                        id="customize-title"
                        className="mt-4 font-serif text-[clamp(30px,3.6vw,44px)] leading-[1.12] font-normal tracking-[-0.025em]"
                    >
                        A writing space that feels like yours.
                    </h2>
                    <p className="text-muted mt-4 text-[16px] leading-[1.65]">
                        Choose light or dark, a sans-serif, serif or monospace
                        font, your text size, line spacing and how wide the page
                        is. Changes show instantly and follow you to every
                        device you sign in on.
                    </p>
                    <ul className="m-0 mt-7 grid list-none grid-cols-2 gap-3 p-0 text-[14.5px] max-sm:grid-cols-1">
                        {(
                            [
                                [Moon, "Light, dark or system"],
                                [PenLine, "Three font styles"],
                                [Sparkles, "Text size and spacing"],
                                [Monitor, "Narrow to wide pages"],
                            ] as const
                        ).map(([Icon, label]) => (
                            <li key={label} className="flex items-center gap-2.5">
                                <Icon
                                    size={17}
                                    strokeWidth={1.6}
                                    className="text-accent"
                                    aria-hidden="true"
                                />
                                {label}
                            </li>
                        ))}
                    </ul>
                </div>
                <div
                    role="img"
                    aria-label="The same page shown in the light theme with a sans-serif font and in the dark theme."
                    className="border-line flex overflow-hidden rounded-[18px] border [box-shadow:0_30px_60px_-36px_color-mix(in_srgb,var(--shadow)_40%,transparent)] max-sm:flex-col"
                >
                    <div className="flex flex-1 flex-col">
                        <span className="border-b border-[#e7e2da] bg-[#faf8f5] px-4 py-2 text-[11.5px] font-medium text-[#6b665f]">
                            Light
                        </span>
                        <SamplePage dark={false} />
                    </div>
                    <div className="flex flex-1 flex-col border-l border-[#36332e] max-sm:border-t max-sm:border-l-0">
                        <span className="border-b border-[#36332e] bg-[#1a1917] px-4 py-2 text-[11.5px] font-medium text-[#a39d93]">
                            Dark
                        </span>
                        <SamplePage dark />
                    </div>
                </div>
            </div>
        </section>
    );
}

/* ——— Trust: plain facts about where the writing lives, in place of testimonials ——— */

function Trust() {
    return (
        <section aria-labelledby="trust-title" className="py-24 max-sm:py-16">
            <div className={WIDTH}>
                <SectionTitle
                    id="trust-title"
                    eyebrow="Your writing, your way"
                    title="Calm about the things that matter."
                    body="A writing tool should be the last thing you worry about. Here’s what Writely does with your work."
                />
                <ul className="m-0 grid list-none grid-cols-3 gap-5 p-0 max-[1000px]:grid-cols-1">
                    {(
                        [
                            [
                                CloudCheck,
                                "Saved as you type",
                                "Every change saves to your account. If the connection drops, unsaved text stays in your browser and is sent when you’re back.",
                            ],
                            [
                                FileDown,
                                "Take it with you",
                                "Export any document as a Microsoft Word (.docx) file or a print-ready PDF — just your writing, none of the tools.",
                            ],
                            [
                                Lock,
                                "Private to your account",
                                "Your documents, thoughts and drafts are only visible when you’re signed in. Nothing is published or shared.",
                            ],
                        ] as const
                    ).map(([Icon, title, body]) => (
                        <li key={title} className={`${PANEL} p-7`}>
                            <Icon
                                size={22}
                                strokeWidth={1.6}
                                className="text-accent"
                                aria-hidden="true"
                            />
                            <h3 className="mt-4 text-[16.5px] font-semibold">
                                {title}
                            </h3>
                            <p className="text-muted mt-2 text-[14.5px] leading-[1.6]">
                                {body}
                            </p>
                        </li>
                    ))}
                </ul>
                <div
                    aria-hidden="true"
                    className="mt-10 flex flex-wrap items-center justify-center gap-3 text-[13px]"
                >
                    {[
                        [FileText, "Microsoft Word (.docx)"],
                        [FileDown, "PDF (.pdf)"],
                        [Pin, "Pinned & archived"],
                        [Clock, "Every named draft"],
                    ].map(([Icon, label]) => {
                        const I = Icon as typeof FileText;
                        return (
                            <span
                                key={label as string}
                                className="border-line bg-surface text-muted flex items-center gap-2 rounded-full border px-3.5 py-1.5"
                            >
                                <I size={14} strokeWidth={1.6} />
                                {label as string}
                            </span>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}

/* ——— FAQ ——— */

/**
 * What: The home page's questions and answers. Answers describe only what
 * Writely really does today.
 *
 * Used in:
 * - src/app/components/landing/landing.tsx (Faq)
 *
 * Effect: Changes the FAQ list.
 */
const QUESTIONS = [
    [
        "What is Writely?",
        "A clean, text-focused writing app with revision tools. You write on a calm page, keep thoughts beside your text, revise toward one goal at a time, and compare the drafts you name.",
    ],
    [
        "What makes it different from a regular document editor?",
        "Writely is built around revising. Thought cards hold what you want to improve and connect to the exact words; a checklist keeps you on one goal at a time; and named drafts can be compared word by word and restored safely.",
    ],
    [
        "Is my writing private?",
        "Yes. Your documents belong to your account and are only shown to you when you’re signed in. Writely doesn’t publish or share anything.",
    ],
    [
        "Can I export my documents?",
        "Yes — any document can be exported as a Microsoft Word (.docx) file or a PDF, from Settings or from the document’s ⋯ menu. Exports contain only your writing, never the thought cards or checklists.",
    ],
    [
        "Can I use Writely on multiple devices?",
        "Writely runs in any modern web browser on a computer, tablet or phone. Sign in and your documents and appearance settings are there.",
    ],
    [
        "What happens if I lose my connection?",
        "Changes that couldn’t be saved stay in your browser and are sent as soon as you’re back online. Writely tells you when something isn’t saved yet.",
    ],
] as const;

function Faq() {
    return (
        <section
            id="faq"
            aria-labelledby="faq-title"
            className="scroll-mt-20 pb-24 max-sm:pb-16"
        >
            <div className={`${WIDTH} max-w-[820px]!`}>
                <SectionTitle
                    id="faq-title"
                    eyebrow="Questions"
                    title="Frequently asked questions."
                />
                <div className="flex flex-col gap-3">
                    {QUESTIONS.map(([question, answer], i) => (
                        <details
                            key={question}
                            open={i === 0}
                            className={`${PANEL} group px-6 open:pb-5 max-sm:px-4`}
                        >
                            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-[15.5px] font-medium focus-visible:outline-none focus-visible:[box-shadow:0_0_0_2px_var(--hover)] [&::-webkit-details-marker]:hidden">
                                {question}
                                <ChevronDown
                                    size={18}
                                    aria-hidden="true"
                                    className="text-muted shrink-0 transition-transform duration-200 group-open:rotate-180"
                                />
                            </summary>
                            <p className="text-muted -mt-1 text-[15px] leading-[1.65]">
                                {answer}
                            </p>
                        </details>
                    ))}
                </div>
            </div>
        </section>
    );
}

/* ——— Final call to action ——— */

function FinalCta() {
    return (
        <section aria-labelledby="cta-title" className="pb-24 max-sm:pb-16">
            <div className={WIDTH}>
                <div className="relative isolate overflow-hidden rounded-[24px] bg-[#244a4e] px-8 py-20 text-center text-[#f4f1ec] max-sm:px-5 max-sm:py-14">
                    <Feather
                        aria-hidden="true"
                        strokeWidth={0.6}
                        className="absolute -right-6 -bottom-10 -z-10 size-[260px] rotate-[-18deg] text-[color-mix(in_srgb,#f4f1ec_9%,transparent)]"
                    />
                    <p className="text-[11px] font-semibold tracking-[0.14em] text-[color-mix(in_srgb,#f4f1ec_70%,#244a4e)] uppercase">
                        Ready to write better?
                    </p>
                    <h2
                        id="cta-title"
                        className="mt-4 font-serif text-[clamp(32px,4.4vw,52px)] leading-[1.08] font-normal tracking-[-0.03em] text-balance"
                    >
                        Give your writing the space it deserves.
                    </h2>
                    <p className="mx-auto mt-4 max-w-[34em] text-[16px] leading-[1.6] text-[color-mix(in_srgb,#f4f1ec_78%,#244a4e)]">
                        A cleaner page. A clearer process. Better writing.
                    </p>
                    <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
                        <Link
                            href={SIGN_UP}
                            className={`${PRIMARY} bg-[#f4f1ec]! text-[#1f3d40]! [box-shadow:none]! hover:bg-white! focus-visible:[box-shadow:0_0_0_2px_#244a4e,0_0_0_4px_#f4f1ec]!`}
                        >
                            Get started
                            <ArrowRight size={17} aria-hidden="true" />
                        </Link>
                        <Link
                            href="/sign-in"
                            className="inline-flex min-h-12 items-center rounded-[10px] border border-[color-mix(in_srgb,#f4f1ec_35%,transparent)] px-6 text-[15px] font-medium text-[#f4f1ec] no-underline hover:bg-[color-mix(in_srgb,#f4f1ec_10%,transparent)] focus-visible:outline-none focus-visible:[box-shadow:0_0_0_2px_#f4f1ec]"
                        >
                            Sign in
                        </Link>
                    </div>
                    <ul className="m-0 mt-8 flex list-none flex-wrap justify-center gap-x-6 gap-y-2 p-0 text-[13.5px] text-[color-mix(in_srgb,#f4f1ec_78%,#244a4e)]">
                        {[
                            "Works in any modern browser",
                            "Export to Word and PDF",
                            "Light and dark themes",
                        ].map((item) => (
                            <li key={item} className="flex items-center gap-2">
                                <Check size={14} strokeWidth={2.4} aria-hidden="true" />
                                {item}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </section>
    );
}
