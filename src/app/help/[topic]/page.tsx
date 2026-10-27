import {
    ArrowLeft,
    ArrowRight,
    ChevronLeft,
    CircleAlert,
    CircleCheck,
    Lightbulb,
    type LucideIcon,
} from "lucide-react";
import { type Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader } from "../../components/app-header";
import {
    GUIDES,
    guideBySlug,
    type Note,
    type Step,
} from "../guides";
import { Shot } from "../shot";

export const dynamicParams = false;

export function generateStaticParams() {
    return GUIDES.map(({ slug }) => ({ topic: slug }));
}

export async function generateMetadata(props: {
    params: Promise<{ topic: string }>;
}): Promise<Metadata> {
    const guide = guideBySlug((await props.params).topic);
    return {
        title: guide ? `${guide.title} · Help · Writely` : "Help · Writely",
    };
}

const anchor = (title: string) =>
    title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

/**
 * What: How each kind of note under a step looks and is introduced.
 *
 * Used in:
 * - src/app/help/[topic]/page.tsx (StepNote)
 *
 * Effect: Changes the heading, icon and colour of tips, "how you'll know"
 * results and "if you don't see it" notes in every guide.
 */
const NOTES: Record<Note["kind"], [string, LucideIcon, string]> = {
    tip: ["Tip", Lightbulb, "bg-tint text-accent"],
    result: [
        "How you’ll know it worked",
        CircleCheck,
        "bg-[color-mix(in_srgb,var(--success)_12%,var(--surface))] text-success",
    ],
    missing: [
        "If you don’t see it",
        CircleAlert,
        "bg-[color-mix(in_srgb,var(--callout)_10%,var(--surface))] text-callout",
    ],
};

function StepNote({ note }: { note: Note }) {
    const [heading, Icon, tone] = NOTES[note.kind];
    return (
        <div className={`mt-3 flex gap-2.5 rounded-xl px-4 py-3 ${tone}`}>
            <Icon
                size={17}
                strokeWidth={1.7}
                aria-hidden="true"
                className="mt-0.5 shrink-0"
            />
            <p className="text-ink m-0 text-[14px] leading-relaxed">
                <span className="font-semibold">{heading}: </span>
                {note.text}
            </p>
        </div>
    );
}

function StepItem({ step, number }: { step: Step; number: number }) {
    return (
        <li className="grid grid-cols-[36px_minmax(0,1fr)] gap-x-4 max-sm:grid-cols-[30px_minmax(0,1fr)] max-sm:gap-x-3">
            <span
                aria-hidden="true"
                className="bg-accent flex size-9 items-center justify-center rounded-full text-[15px] font-semibold text-[var(--on-accent)] tabular-nums max-sm:size-[30px] max-sm:text-[13.5px]"
            >
                {number}
            </span>
            <div className="min-w-0 pt-1 max-sm:pt-0.5">
                <h3 className="m-0 text-[17px] leading-snug font-semibold max-sm:text-[16px]">
                    <span className="sr-only">Step {number}: </span>
                    {step.title}
                </h3>
                <p className="text-ink/90 [&_a]:text-accent mt-1.5 mb-0 text-[15px] leading-[1.65]">
                    {step.body}
                </p>
                {step.shot && (
                    <figure className="m-0 mt-4">
                        <Shot id={step.shot} alt={step.alt ?? step.title} />
                        {step.caption && (
                            <figcaption className="text-muted mt-2 text-[13px] leading-snug">
                                {step.caption}
                            </figcaption>
                        )}
                    </figure>
                )}
                {step.notes?.map((note, i) => (
                    <StepNote key={i} note={note} />
                ))}
            </div>
        </li>
    );
}

/** One guide: what the feature does, then numbered steps of one action each, with pictures. */
export default async function GuidePage(props: {
    params: Promise<{ topic: string }>;
}) {
    const { topic } = await props.params;
    const guide = guideBySlug(topic);
    if (!guide) notFound();
    const index = GUIDES.indexOf(guide);
    const previous = GUIDES[index - 1],
        next = GUIDES[index + 1];
    const Icon = guide.icon;
    return (
        <div className="bg-paper text-ink min-h-dvh">
            <AppHeader />
            <main className="mx-auto w-full max-w-[760px] px-6 pt-4 pb-24 max-sm:px-4 max-sm:pt-2">
                <Link
                    href="/help"
                    className="text-muted hover:text-ink -ml-1 inline-flex h-10 items-center gap-1 rounded-lg pr-3 pl-1 text-[14px] no-underline hover:bg-[var(--control-hover)]"
                >
                    <ChevronLeft
                        size={18}
                        strokeWidth={1.6}
                        aria-hidden="true"
                    />
                    Help
                </Link>
                <header className="mt-4 mb-8">
                    <span className="bg-tint text-accent flex size-11 items-center justify-center rounded-xl">
                        <Icon size={21} strokeWidth={1.6} aria-hidden="true" />
                    </span>
                    <h1 className="mt-4 mb-0 font-serif text-[44px] leading-[1.05] font-normal tracking-[-0.03em] max-sm:text-[34px]">
                        {guide.title}
                    </h1>
                    <h2 className="text-muted mt-6 mb-1.5 text-[13px] font-medium">
                        What it does
                    </h2>
                    <p className="[&_a]:text-accent m-0 text-[16px] leading-[1.65]">
                        {guide.about}
                    </p>
                </header>
                {guide.sections.length > 1 && (
                    <nav
                        aria-label="In this guide"
                        className="border-line bg-surface mb-10 rounded-2xl border px-5 py-4"
                    >
                        <h2 className="text-muted m-0 mb-2 text-[13px] font-medium">
                            In this guide
                        </h2>
                        <ol className="m-0 grid list-none gap-1 p-0">
                            {guide.sections.map((section, i) => (
                                <li key={section.title}>
                                    <a
                                        href={`#${anchor(section.title)}`}
                                        className="text-accent text-[14.5px] leading-7 underline-offset-4 hover:underline"
                                    >
                                        {i + 1}. {section.title}
                                    </a>
                                </li>
                            ))}
                        </ol>
                    </nav>
                )}
                {guide.sections.map((section) => (
                    <section
                        key={section.title}
                        id={anchor(section.title)}
                        aria-labelledby={`${anchor(section.title)}-title`}
                        className="border-line mt-10 scroll-mt-6 border-t pt-8 first-of-type:border-t-0 first-of-type:pt-0"
                    >
                        <h2
                            id={`${anchor(section.title)}-title`}
                            className="m-0 font-serif text-[28px] leading-tight font-normal tracking-[-0.02em] max-sm:text-[24px]"
                        >
                            {section.title}
                        </h2>
                        {section.intro && (
                            <p className="text-muted mt-2 mb-0 text-[15px] leading-relaxed">
                                {section.intro}
                            </p>
                        )}
                        <ol className="m-0 mt-6 grid list-none gap-10 p-0">
                            {section.steps.map((step, i) => (
                                <StepItem
                                    key={step.title}
                                    step={step}
                                    number={i + 1}
                                />
                            ))}
                        </ol>
                    </section>
                ))}
                <nav
                    aria-label="More guides"
                    className="border-line mt-14 grid grid-cols-2 gap-3 border-t pt-8 max-sm:grid-cols-1"
                >
                    {previous ? (
                        <Link
                            href={`/help/${previous.slug}`}
                            className="border-line bg-surface text-ink flex flex-col gap-1 rounded-2xl border px-5 py-4 no-underline hover:border-[var(--control-focus)]"
                        >
                            <span className="text-muted flex items-center gap-1 text-[12.5px]">
                                <ArrowLeft size={14} aria-hidden="true" />
                                Previous
                            </span>
                            <span className="text-[15px] font-semibold">
                                {previous.title}
                            </span>
                        </Link>
                    ) : (
                        <span className="max-sm:hidden" />
                    )}
                    <Link
                        href={next ? `/help/${next.slug}` : "/help"}
                        className="border-line bg-surface text-ink flex flex-col items-end gap-1 rounded-2xl border px-5 py-4 text-right no-underline hover:border-[var(--control-focus)] max-sm:items-start max-sm:text-left"
                    >
                        <span className="text-muted flex items-center gap-1 text-[12.5px]">
                            {next ? "Next" : "Back to"}
                            <ArrowRight size={14} aria-hidden="true" />
                        </span>
                        <span className="text-[15px] font-semibold">
                            {next ? next.title : "All help topics"}
                        </span>
                    </Link>
                </nav>
            </main>
        </div>
    );
}
