"use client";
import {
    ArrowRight,
    Check,
    ChartColumn,
    FileText,
    Feather,
    History,
    ListChecks,
    Plus,
    StickyNote,
} from "lucide-react";
import Link from "next/link";
import {
    useEffect,
    useState,
    type CSSProperties,
    type ReactNode,
} from "react";
import DiffText from "../writely/diff-text";
import {
    EDITOR_WIDTHS,
    FONT_FAMILIES,
    FONT_SIZE_RANGE,
    LINE_SPACINGS,
} from "~/config/preferences";
import type { DiffChunk } from "~/lib/writely/model";

/**
 * The signed-out front door. It follows one paragraph from first draft to the version a writer
 * keeps, then lets the visitor try a few appearance settings. Every passage of prose here is
 * illustrative sample writing; there are no prices, ratings or quotes, because Writely has none.
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
    "inline-flex min-h-[52px] items-center justify-center gap-2 rounded-[10px] bg-accent px-6 text-[16px] font-medium text-[var(--on-accent)] no-underline [box-shadow:0_10px_24px_-14px_color-mix(in_srgb,var(--accent)_90%,transparent)] transition-[background-color,translate] duration-150 hover:bg-[var(--hover)] active:translate-y-px focus-visible:outline-none focus-visible:[box-shadow:0_0_0_2px_var(--bg),0_0_0_4px_var(--hover)]";
/**
 * What: The look of the white surfaces that hold product drawings.
 *
 * Used in:
 * - src/app/components/landing/landing.tsx (Steps, Customize)
 *
 * Effect: Changes the border, corners and fill of every drawing on the page.
 */
const PANEL = "rounded-xl border border-line bg-surface";
const WIDTH = "mx-auto w-full max-w-[1120px] px-6";
const SERIF_TITLE =
    "font-serif text-[32px] leading-[1.1] font-normal tracking-[-0.03em] text-balance";
/** A thought card, in one of the landing pastels; dark mode blends it into the page. */
const THOUGHT =
    "landing-field bg-[var(--field)] font-serif text-[14px] leading-[1.4] text-[var(--field-text)] [box-shadow:0_12px_24px_-14px_color-mix(in_srgb,var(--shadow)_45%,transparent)]";
const CARET =
    "bg-accent ml-0.5 inline-block h-[1.05em] w-[1.5px] translate-y-[0.15em]";
const FOCUS =
    "focus-visible:outline-none focus-visible:[box-shadow:0_0_0_2px_var(--hover)]";

function Wordmark() {
    return (
        <span className="text-accent flex items-center gap-2">
            <Feather size={20} strokeWidth={1.6} aria-hidden="true" />
            <span className="text-ink text-[18px] font-semibold tracking-[-0.04em]">
                Writely
            </span>
        </span>
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
                className={`sticky top-0 z-40 transition-[background-color,border-color] duration-200 ${scrolled ? "border-line border-b bg-[color-mix(in_srgb,var(--bg)_88%,transparent)] backdrop-blur-md" : "border-b border-transparent"}`}
            >
                <div
                    className={`${WIDTH} flex h-16 items-center justify-between pr-3`}
                >
                    <Link
                        href="/"
                        aria-label="Writely home"
                        className={`rounded-md no-underline ${FOCUS}`}
                    >
                        <Wordmark />
                    </Link>
                    <nav
                        aria-label="Account"
                        className="flex items-center gap-2"
                    >
                        <Link
                            href="/sign-in"
                            className={`text-ink flex min-h-11 items-center rounded-lg px-3 text-[15px] font-medium no-underline ${FOCUS}`}
                        >
                            Sign in
                        </Link>
                        <Link
                            href={SIGN_UP}
                            className={`${PRIMARY} min-h-10 px-4 text-[14px] max-sm:hidden`}
                        >
                            Start writing
                        </Link>
                    </nav>
                </div>
            </header>

            <main id="main">
                <Hero />
                <Steps />
                <Customize />
                <FinalCta />
            </main>

            <footer className="border-line border-t">
                <div
                    className={`${WIDTH} text-muted flex items-center justify-between pt-7 pb-10 text-[13px]`}
                >
                    <span>© {new Date().getFullYear()} Writely</span>
                    <Link
                        href="/sign-in"
                        className="text-muted hover:text-ink flex min-h-11 items-center no-underline"
                    >
                        Sign in
                    </Link>
                </div>
            </footer>
        </div>
    );
}

/* ——— Hero: the editor with thoughts left on unfinished phrases ——— */

/**
 * What: The tools drawn in the hero's dock, in order. The second is shown
 * pressed, because the hero is about thoughts.
 *
 * Used in:
 * - src/app/components/landing/landing.tsx (EditorDrawing)
 *
 * Effect: Changes the icons in the drawn dock. Keep them in the same order
 * as the real editor dock.
 */
const DOCK = [FileText, StickyNote, ListChecks, History, ChartColumn];

function EditorDrawing() {
    return (
        <div className="relative pb-6">
            <div
                role="img"
                aria-label="The Writely editor with two thought cards left on unfinished phrases, and the tool dock at the bottom."
                className="border-line bg-surface relative h-[440px] overflow-hidden rounded-[18px] border [box-shadow:0_40px_80px_-48px_color-mix(in_srgb,var(--shadow)_45%,transparent)]"
            >
                <div className="text-muted flex h-12 items-center justify-between border-b border-[color-mix(in_srgb,var(--border)_60%,transparent)] px-4 text-[12px]">
                    <span>‹ Documents</span>
                    <span>Saved</span>
                </div>
                <div className="px-6 pt-7 font-serif">
                    <p className="text-[24px] tracking-[-0.01em]">
                        On Unfinished Things
                    </p>
                    <p className="mt-3.5 text-[16px] leading-[1.7] text-[color-mix(in_srgb,var(--text)_85%,var(--surface))]">
                        Every sentence begins as a guess.{" "}
                        <mark className="rounded-[2px] bg-[var(--landing-mark)] text-inherit">
                            Most of what I write is not yet what I mean
                        </mark>
                        , and that is where the work starts.
                    </p>
                    <p className="mt-[72px] text-[16px] leading-[1.7] text-[color-mix(in_srgb,var(--text)_55%,var(--surface))]">
                        <mark className="landing-field field-sky rounded-[2px] bg-[var(--field)] text-inherit">
                            Maybe revising is listening.
                        </mark>
                    </p>
                </div>
                <div className="absolute inset-x-0 bottom-0 h-[110px] bg-[linear-gradient(to_bottom,transparent,var(--surface)_55%)]" />
                <div className="border-line bg-surface text-muted absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-0.5 rounded-2xl border p-1.5 [box-shadow:0_12px_32px_-8px_color-mix(in_srgb,var(--shadow)_16%,transparent),0_1px_2px_color-mix(in_srgb,var(--shadow)_6%,transparent)]">
                    {DOCK.map((Icon, i) => (
                        <span
                            key={i}
                            className={`flex size-11 items-center justify-center rounded-[10px] ${i === 1 ? "bg-tint text-accent" : ""}`}
                        >
                            <Icon size={18} strokeWidth={1.7} />
                        </span>
                    ))}
                </div>
            </div>
            <p
                aria-hidden="true"
                className={`${THOUGHT} field-butter absolute top-[214px] right-2 w-[164px] rotate-3 px-3.5 py-3`}
            >
                Close. Not quite it yet.
            </p>
            <p
                aria-hidden="true"
                className={`${THOUGHT} field-sky absolute top-[306px] left-1.5 w-[160px] -rotate-4 px-3.5 py-3`}
            >
                The ending? Come back to this.
            </p>
        </div>
    );
}

function Hero() {
    return (
        <section
            aria-labelledby="hero-title"
            className={`${WIDTH} grid items-center gap-14 pt-12 pb-6 max-sm:px-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:pt-20`}
        >
            <div className="max-w-[520px] max-sm:px-2">
                <h1
                    id="hero-title"
                    className="font-serif text-[clamp(44px,5.4vw,68px)] leading-[1.04] font-normal tracking-[-0.035em] text-balance"
                >
                    Every good sentence was once{" "}
                    <em className="italic">unfinished.</em>
                </h1>
                <p className="text-muted mt-5 text-[17px] leading-[1.6] lg:text-[18px]">
                    A quiet place to leave notes for later, rewrite when the
                    words come, and keep every version.
                </p>
                <div className="mt-8 flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
                    <Link href={SIGN_UP} className={PRIMARY}>
                        Start writing
                        <ArrowRight size={17} aria-hidden="true" />
                    </Link>
                    <a
                        href="#how"
                        className={`text-muted hover:text-ink flex min-h-11 items-center justify-center rounded-lg px-3 text-[15px] font-medium no-underline ${FOCUS}`}
                    >
                        See how it works
                    </a>
                </div>
            </div>
            <EditorDrawing />
        </section>
    );
}

/* ——— Steps: one paragraph, from first draft to the version you keep ——— */

/**
 * What: The sample paragraph followed through the steps: as first written,
 * and as rewritten once the words arrive.
 *
 * Used in:
 * - src/app/components/landing/landing.tsx (Steps)
 *
 * Effect: Changes the writing shown in every step, including the word-by-word
 * comparison, which is worked out from these two.
 */
const FIRST_DRAFT =
    "My grandmother kept every letter she was sent. They were very important to her.";
const SECOND_DRAFT =
    "My grandmother kept every letter she was sent, each one still folded along its first crease.";
const [OPENING, VAGUE] = FIRST_DRAFT.split(". ") as [string, string];
/** The comparison, phrase by phrase: a word-by-word diff of a rewrite this size reads as noise. */
const CHANGES: DiffChunk[] = [
    { value: OPENING, type: "same", added: false, removed: false },
    { value: `. ${VAGUE}`, type: "remove", added: false, removed: true },
    {
        value: SECOND_DRAFT.slice(OPENING.length),
        type: "add",
        added: true,
        removed: false,
    },
];

/**
 * What: The goals shown in the polishing step, and whether each is done.
 * The one marked current is the goal being revised.
 *
 * Used in:
 * - src/app/components/landing/landing.tsx (Steps)
 *
 * Effect: Changes the sample checklist.
 */
const POLISH_GOALS = [
    ["Show, don’t tell", "done"],
    ["Cut what isn’t needed", "current"],
    ["Read it out loud", "todo"],
] as const;

function Step({
    n,
    last,
    title,
    body,
    children,
}: {
    n: number;
    last?: boolean;
    title: string;
    body: string;
    children: ReactNode;
}) {
    return (
        <li className="relative">
            <span
                aria-hidden="true"
                className={`absolute top-[-2px] -left-[45px] flex size-[26px] items-center justify-center rounded-full border-[1.5px] text-[12px] font-semibold ${last ? "bg-ink text-paper border-ink" : "bg-paper border-ink"}`}
            >
                {n}
            </span>
            <h3 className="m-0 text-[17px] font-semibold">{title}</h3>
            <p className="text-muted mt-1.5 text-[15px] leading-[1.55]">
                {body}
            </p>
            <div className="mt-4">{children}</div>
        </li>
    );
}

function Steps() {
    return (
        <section
            id="how"
            aria-labelledby="how-title"
            className="mx-auto w-full max-w-[640px] scroll-mt-20 px-6 pt-28"
        >
            <h2 id="how-title" className={SERIF_TITLE}>
                You know this moment.
            </h2>
            <p className="text-muted mt-3 mb-12 text-[16px] leading-[1.6]">
                One paragraph, from first draft to the version you keep.
            </p>
            <ol className="border-line m-0 ml-3 flex list-none flex-col gap-16 border-l pl-8">
                <Step
                    n={1}
                    title="Write it down"
                    body="Get the thought out first. Don’t stop to fix it."
                >
                    <p
                        className={`${PANEL} p-[18px] font-serif text-[17px] leading-[1.6]`}
                    >
                        {FIRST_DRAFT}
                        <span aria-hidden="true" className={CARET} />
                    </p>
                </Step>
                <Step
                    n={2}
                    title="Something feels off"
                    body="You can’t say what yet. Leave a thought on it and keep going."
                >
                    <div
                        className={`${PANEL} relative px-[18px] pt-[18px] pb-[54px] font-serif text-[17px] leading-[1.6]`}
                    >
                        {OPENING}.{" "}
                        <mark className="rounded-[2px] bg-[var(--landing-mark)] text-inherit">
                            {VAGUE}
                        </mark>
                        <span
                            aria-hidden="true"
                            className={`${THOUGHT} field-butter absolute right-3.5 -bottom-[18px] -rotate-2 px-3.5 py-2.5`}
                        >
                            Says it. Doesn’t show it.
                        </span>
                    </div>
                </Step>
                <Step
                    n={3}
                    title="The words arrive"
                    body="Maybe tomorrow. Your note is still there, right where you left it. Rewrite, then save it as a draft."
                >
                    <div
                        className={`${PANEL} p-[18px] font-serif text-[17px] leading-[1.6]`}
                    >
                        <p>
                            {SECOND_DRAFT}
                            <span aria-hidden="true" className={CARET} />
                        </p>
                        <p className="text-muted mt-3.5 flex items-center justify-between border-t border-[color-mix(in_srgb,var(--border)_60%,transparent)] pt-3 font-sans text-[13px]">
                            Draft 2
                            <span className="text-success flex items-center gap-1.5">
                                <Check
                                    size={14}
                                    strokeWidth={2.5}
                                    aria-hidden="true"
                                />
                                Saved
                            </span>
                        </p>
                    </div>
                </Step>
                <Step
                    n={4}
                    title="Polish, one thing at a time"
                    body="Once it says what you mean, review it. Pick one goal from your checklist and read only for that."
                >
                    <div className={`${PANEL} overflow-hidden`}>
                        <p className="bg-tint text-accent flex items-center gap-2 px-4 py-2.5 text-[13px]">
                            <span className="bg-accent size-2 rounded-full" />
                            <span className="font-semibold">Revising</span>· Cut
                            what isn’t needed
                        </p>
                        <ul className="m-0 flex list-none flex-col gap-0.5 p-2 text-[15px]">
                            {POLISH_GOALS.map(([goal, state]) => (
                                <li
                                    key={goal}
                                    className={`flex min-h-11 items-center gap-3 rounded-lg px-3 ${state === "current" ? "bg-[color-mix(in_srgb,var(--text)_5%,transparent)] font-medium" : ""} ${state === "done" ? "text-muted" : ""}`}
                                >
                                    <span
                                        className={`flex size-4 items-center justify-center rounded-[4px] border-[1.5px] ${state === "done" ? "border-success bg-success text-[var(--on-accent)]" : state === "current" ? "border-accent" : "border-line"}`}
                                    >
                                        {state === "done" && (
                                            <Check
                                                size={11}
                                                strokeWidth={3.5}
                                                aria-hidden="true"
                                            />
                                        )}
                                    </span>
                                    {state === "done" ? <s>{goal}</s> : goal}
                                </li>
                            ))}
                        </ul>
                    </div>
                </Step>
                <Step
                    n={5}
                    title="See exactly what changed"
                    body="Set two drafts side by side, word by word."
                >
                    <div
                        className={`${PANEL} p-[18px] pl-2 font-serif text-[19px] leading-[1.65] tracking-[-0.01em] [overflow-wrap:anywhere]`}
                    >
                        <DiffText chunks={CHANGES} />
                    </div>
                </Step>
                <Step
                    n={6}
                    last
                    title="Keep the one you like"
                    body="Every version stays. Choose one and carry on. Nothing is lost."
                >
                    <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
                        {(
                            [
                                ["Draft 1", VAGUE, false],
                                [
                                    "Draft 2 · In use",
                                    SECOND_DRAFT.slice(OPENING.length + 2),
                                    true,
                                ],
                            ] as const
                        ).map(([name, text, chosen]) => (
                            <li
                                key={name}
                                className={`bg-surface flex items-start gap-3 rounded-xl px-4 py-3.5 ${chosen ? "border-accent border-[1.5px]" : "border-line border"}`}
                            >
                                <span
                                    aria-hidden="true"
                                    className={`mt-[3px] size-[18px] shrink-0 rounded-full ${chosen ? "border-accent border-[5px]" : "border-line border-[1.5px]"}`}
                                />
                                <span>
                                    <span
                                        className={`block text-[12px] ${chosen ? "text-accent font-semibold" : "text-muted"}`}
                                    >
                                        {name}
                                    </span>
                                    <span
                                        className={`font-serif text-[16px] leading-[1.55] ${chosen ? "" : "text-muted"}`}
                                    >
                                        …{text}
                                    </span>
                                </span>
                            </li>
                        ))}
                    </ul>
                </Step>
            </ol>
        </section>
    );
}

/* ——— Customize: swipe through a few appearance settings and try them ——— */

/**
 * What: The sentence every appearance card previews.
 *
 * Used in:
 * - src/app/components/landing/landing.tsx (Customize)
 *
 * Effect: Changes the sample text in the swipeable settings cards.
 */
const SAMPLE =
    "We don’t write what we think. We write to find out what we think.";
/**
 * What: How far in from each side the page-width card draws its text column,
 * for each editor width.
 *
 * Used in:
 * - src/app/components/landing/landing.tsx (Customize)
 *
 * Effect: Changes how narrow or wide each page-width choice looks in its card.
 */
const WIDTH_INSET: Record<keyof typeof EDITOR_WIDTHS, number> = {
    narrow: 40,
    standard: 24,
    wide: 8,
};
/**
 * What: The goals drawn in the "Your own goals" card.
 *
 * Used in:
 * - src/app/components/landing/landing.tsx (Customize)
 *
 * Effect: Changes the sample checklist.
 */
const OWN_GOALS = [
    "Cut every “very”",
    "Read it out loud",
    "Does the ending earn it?",
];

function Segmented<K extends string>({
    label,
    options,
    value,
    onChange,
}: {
    label: string;
    options: readonly (readonly [K, string])[];
    value: K;
    onChange: (value: K) => void;
}) {
    return (
        <div
            role="group"
            aria-label={label}
            className="flex rounded-lg bg-[color-mix(in_srgb,var(--text)_5%,var(--surface))] p-[3px]"
        >
            {options.map(([key, name]) => (
                <button
                    key={key}
                    type="button"
                    aria-pressed={value === key}
                    onClick={() => onChange(key)}
                    className={`min-h-10! flex-1 rounded-md! px-1! text-[12.5px]! ${value === key ? "bg-surface! text-ink! [box-shadow:0_1px_2px_color-mix(in_srgb,var(--shadow)_12%,transparent)]" : "text-muted!"}`}
                >
                    {name}
                </button>
            ))}
        </div>
    );
}

function SettingCard({
    title,
    index,
    total,
    preview,
    previewStyle,
    dark,
    children,
}: {
    title: string;
    index: number;
    total: number;
    preview: ReactNode;
    previewStyle?: CSSProperties;
    dark?: boolean;
    children: ReactNode;
}) {
    return (
        <li className="border-line bg-surface flex w-[282px] shrink-0 snap-center flex-col gap-4 rounded-[18px] border p-[18px]">
            <p className="flex justify-between text-[13px]">
                <span className="font-semibold">{title}</span>
                <span className="text-muted">
                    {index} / {total}
                </span>
            </p>
            <div
                aria-hidden="true"
                className={`h-[132px] overflow-hidden rounded-[10px] px-4 py-3.5 ${dark ? "bg-[#22211e] text-[#e8e4dc]" : "bg-paper"}`}
                style={previewStyle}
            >
                {preview}
            </div>
            {children}
        </li>
    );
}

function Customize() {
    const [font, setFont] = useState<keyof typeof FONT_FAMILIES>("serif");
    const [size, setSize] = useState(20);
    const [spacing, setSpacing] =
        useState<keyof typeof LINE_SPACINGS>("spacious");
    const [width, setWidth] = useState<keyof typeof EDITOR_WIDTHS>("narrow");
    const [dark, setDark] = useState(true);
    const [typewriter, setTypewriter] = useState(true);
    const [card, setCard] = useState(0);
    const total = 7;
    const pick = <T extends Record<string, { label: string }>>(choices: T) =>
        Object.entries(choices).map(
            ([key, choice]) => [key as keyof T & string, choice.label] as const,
        );
    return (
        <section aria-labelledby="customize-title" className="pt-30">
            <div className={WIDTH}>
                <h2 id="customize-title" className={SERIF_TITLE}>
                    Set it up the way you write.
                </h2>
                <p className="text-muted mt-3 text-[16px] leading-[1.6]">
                    Almost everything is yours to change. Swipe to try a few.
                </p>
            </div>
            <ul
                onScroll={(e) =>
                    setCard(Math.round(e.currentTarget.scrollLeft / (282 + 12)))
                }
                className="mt-7 mb-0 flex snap-x snap-mandatory [scrollbar-width:none] list-none gap-3 overflow-x-auto px-[max(24px,calc((100%-1072px)/2))] pb-2 [&::-webkit-scrollbar]:hidden"
            >
                <SettingCard
                    title="Font"
                    index={1}
                    total={total}
                    previewStyle={{
                        fontFamily: FONT_FAMILIES[font].css,
                        fontSize: 16,
                        lineHeight: 1.6,
                    }}
                    preview={SAMPLE}
                >
                    <Segmented
                        label="Font"
                        options={pick(FONT_FAMILIES)}
                        value={font}
                        onChange={setFont}
                    />
                </SettingCard>
                <SettingCard
                    title="Text size"
                    index={2}
                    total={total}
                    previewStyle={{ fontSize: size, lineHeight: 1.5 }}
                    preview={<span className="font-serif">{SAMPLE}</span>}
                >
                    <label className="flex min-h-10 items-center gap-3 font-serif">
                        <span className="sr-only">Text size</span>
                        <span aria-hidden="true" className="text-[13px]">
                            A
                        </span>
                        <input
                            type="range"
                            min={FONT_SIZE_RANGE.min}
                            max={FONT_SIZE_RANGE.max}
                            value={size}
                            onChange={(e) => setSize(Number(e.target.value))}
                            className="accent-accent min-h-0! flex-1 border-0! bg-transparent! p-0!"
                        />
                        <span aria-hidden="true" className="text-[20px]">
                            A
                        </span>
                        <span className="text-muted w-11 text-right font-sans text-[13px] tabular-nums">
                            {size} px
                        </span>
                    </label>
                </SettingCard>
                <SettingCard
                    title="Line spacing"
                    index={3}
                    total={total}
                    previewStyle={{
                        fontSize: 16,
                        lineHeight: LINE_SPACINGS[spacing].value,
                    }}
                    preview={<span className="font-serif">{SAMPLE}</span>}
                >
                    <Segmented
                        label="Line spacing"
                        options={pick(LINE_SPACINGS)}
                        value={spacing}
                        onChange={setSpacing}
                    />
                </SettingCard>
                <SettingCard
                    title="Page width"
                    index={4}
                    total={total}
                    previewStyle={{
                        paddingInline: WIDTH_INSET[width],
                    }}
                    preview={
                        <span className="border-line block h-full border-x border-dashed px-2.5 font-serif text-[14px] leading-[1.6]">
                            {SAMPLE}
                        </span>
                    }
                >
                    <Segmented
                        label="Page width"
                        options={pick(EDITOR_WIDTHS)}
                        value={width}
                        onChange={setWidth}
                    />
                </SettingCard>
                <SettingCard
                    title="Theme"
                    index={5}
                    total={total}
                    dark={dark}
                    preview={
                        <span className="font-serif text-[16px] leading-[1.6]">
                            {SAMPLE}
                        </span>
                    }
                >
                    <Segmented
                        label="Theme"
                        options={[
                            ["light", "Light"],
                            ["dark", "Dark"],
                        ]}
                        value={dark ? "dark" : "light"}
                        onChange={(v) => setDark(v === "dark")}
                    />
                </SettingCard>
                <SettingCard
                    title="Typewriter mode"
                    index={6}
                    total={total}
                    preview={
                        <span className="flex h-full flex-col justify-center font-serif text-[15px] leading-[1.7]">
                            {[
                                "We don’t write what we think.",
                                "We write to find out what",
                                "we think, one line at a time",
                            ].map((line, i) => (
                                <span
                                    key={line}
                                    className={
                                        typewriter && i < 2
                                            ? "text-[color-mix(in_srgb,var(--text)_30%,var(--bg))]"
                                            : ""
                                    }
                                >
                                    {line}
                                    {i === 2 && <span className={CARET} />}
                                </span>
                            ))}
                            <span>&nbsp;</span>
                        </span>
                    }
                >
                    <button
                        type="button"
                        role="switch"
                        aria-checked={typewriter}
                        onClick={() => setTypewriter((on) => !on)}
                        className="text-muted! min-h-10! w-full justify-between! bg-transparent! px-0! text-[14px]! hover:bg-transparent!"
                    >
                        Keep my line centred
                        <span
                            aria-hidden="true"
                            className={`relative h-6 w-10 rounded-full transition-colors ${typewriter ? "bg-accent" : "bg-line"}`}
                        >
                            <span
                                className={`bg-surface absolute top-[3px] size-[18px] rounded-full transition-[left] ${typewriter ? "left-[19px]" : "left-[3px]"}`}
                            />
                        </span>
                    </button>
                </SettingCard>
                <SettingCard
                    title="Your own goals"
                    index={7}
                    total={total}
                    preview={
                        <span className="flex h-full flex-col justify-center gap-0.5 text-[14px]">
                            {OWN_GOALS.map((goal) => (
                                <span
                                    key={goal}
                                    className="flex min-h-[34px] items-center gap-2.5"
                                >
                                    <span className="border-line size-3.5 rounded-[4px] border-[1.5px]" />
                                    {goal}
                                </span>
                            ))}
                        </span>
                    }
                >
                    <p className="text-muted flex min-h-10 items-center gap-2 text-[14px]">
                        <Plus size={16} aria-hidden="true" />
                        Write the goals you revise for, in Settings.
                    </p>
                </SettingCard>
            </ul>
            <div
                aria-hidden="true"
                className="mt-4 flex justify-center gap-1.5"
            >
                {Array.from({ length: total }, (_, i) => (
                    <span
                        key={i}
                        className={`h-1.5 rounded-full transition-[width] ${i === card ? "bg-ink w-[18px]" : "bg-line w-1.5"}`}
                    />
                ))}
            </div>
        </section>
    );
}

/* ——— Final call to action: a blank page, as the editor shows it ——— */

function FinalCta() {
    return (
        <section
            aria-labelledby="cta-title"
            className="mx-auto w-full max-w-[592px] px-4 pt-32 pb-28"
        >
            <div className="border-line bg-surface rounded-md border px-6 pt-10 pb-6 [box-shadow:0_30px_60px_-36px_color-mix(in_srgb,var(--shadow)_35%,transparent)]">
                <p className="text-muted text-[12px]">A new piece</p>
                <h2
                    id="cta-title"
                    className="mt-3.5 font-serif text-[30px] leading-[1.15] font-normal tracking-[-0.025em]"
                >
                    Begin anywhere.
                    <br />
                    <span className="text-muted">
                        Every thought has somewhere to go.
                    </span>
                    <span
                        aria-hidden="true"
                        className="bg-accent ml-1 inline-block h-7 w-0.5 translate-y-1 animate-[caret-blink_1.1s_steps(1)_infinite] motion-reduce:animate-none"
                    />
                </h2>
                <Link href={SIGN_UP} className={`${PRIMARY} mt-14 w-full`}>
                    Start your first piece
                    <ArrowRight size={17} aria-hidden="true" />
                </Link>
                <p className="text-muted mt-3.5 text-center text-[14px]">
                    Already writing here?{" "}
                    <Link
                        href="/sign-in"
                        className="text-ink font-medium underline-offset-3"
                    >
                        Sign in
                    </Link>
                </p>
            </div>
        </section>
    );
}
