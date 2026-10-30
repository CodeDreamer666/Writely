"use client";
import {
    ArrowRight,
    ChartNoAxesColumn,
    ChevronRight,
    X,
} from "lucide-react";
import Link from "next/link";
import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { LEGACY_STORAGE_KEY } from "~/config/storage";
import { migrateRevisions } from "~/lib/writely/revision-model";
import { localDay } from "~/lib/writely/sync";
import type { UnmigratedWorkspace } from "~/lib/writely/types";
import { api } from "~/trpc/react";
import { BottomSheet } from "../ui";

/**
 * What: One day in milliseconds.
 *
 * Used in:
 * - src/app/components/library/home-notes.tsx (daysBetween)
 *
 * Effect: Used to count whole days between two dates. It should not be
 * changed.
 */
const DAY = 86_400_000;
const parseDay = (day: string) => {
    const [y, m, d] = day.split("-").map(Number) as [number, number, number];
    return new Date(y, m - 1, d);
};
const daysBetween = (from: Date, to: Date) =>
    Math.round(
        (new Date(to.getFullYear(), to.getMonth(), to.getDate()).getTime() -
            new Date(
                from.getFullYear(),
                from.getMonth(),
                from.getDate(),
            ).getTime()) /
            DAY,
    );

/** This calendar week, Monday to Sunday, and what the library knows about writing in it. */
function useWeek() {
    const [today] = useState(() => new Date());
    const week = useMemo(() => {
        const monday = today.getDate() - ((today.getDay() + 6) % 7);
        return Array.from(
            { length: 7 },
            (_, i) =>
                new Date(today.getFullYear(), today.getMonth(), monday + i),
        );
    }, [today]);
    const home = api.account.home.useQuery(
        { since: localDay(week[0]) },
        { staleTime: 60_000 },
    );
    return { today, week, home };
}

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

/** Moves writing from the browser-only prototype into the account, once. It shows nothing. */
export function LegacyImport({ onImported }: { onImported: () => void }) {
    const create = api.documents.create.useMutation();
    const started = useRef(false);
    useEffect(() => {
        if (started.current) return;
        started.current = true;
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
                        onImported();
                    },
                },
            );
    }, [create, onImported]);
    return null;
}

/**
 * A gentle welcome-back line after a week or more without writing, shown once per absence. It
 * doesn't count logins or reading.
 */
export function WelcomeBack() {
    const { today, home } = useWeek();
    const markShown = api.account.markWelcomeBack.useMutation();
    const [dismissed, setDismissed] = useState(false);

    const welcome = useMemo(() => {
        const data = home.data;
        if (!data) return null;
        const last = data.lastWritingDay
            ? parseDay(data.lastWritingDay)
            : data.latestDocument?.updated;
        if (!last) return null;
        const away = daysBetween(last, today);
        if (away < 7) return null;
        // Shown already during this absence: the message was after the last day of writing.
        const endOfLastDay = new Date(
            last.getFullYear(),
            last.getMonth(),
            last.getDate() + 1,
        );
        if (data.welcomeBackAt && data.welcomeBackAt >= endOfLastDay)
            return null;
        return {
            message:
                away >= 30
                    ? "It’s been a while. Ready to put some thoughts into words?"
                    : "Welcome back. Your drafts are right where you left them.",
            latest: data.latestDocument,
        };
    }, [home.data, today]);

    const recorded = useRef(false);
    useEffect(() => {
        if (welcome && !recorded.current) {
            recorded.current = true;
            markShown.mutate();
        }
    }, [welcome, markShown]);

    if (!welcome || dismissed) return null;
    return (
        <div
            role="status"
            className="border-line bg-surface mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border py-2 pr-2 pl-5 text-[14px]"
        >
            <span className="font-serif text-[15px]">{welcome.message}</span>
            <span className="ml-auto flex items-center gap-1">
                {welcome.latest && (
                    <Link
                        href={`/d/${welcome.latest.id}`}
                        className="text-accent inline-flex min-h-10 max-w-[260px] items-center gap-1.5 rounded-lg px-3 text-[13px] no-underline hover:bg-[var(--control-hover)] focus-visible:[box-shadow:0_0_0_2px_var(--control-ring)] focus-visible:outline-none"
                    >
                        <span className="truncate">
                            Continue {welcome.latest.title || "Untitled"}
                        </span>
                        <ArrowRight size={14} aria-hidden="true" />
                    </Link>
                )}
                <button
                    aria-label="Dismiss"
                    className="size-10! min-h-10! min-w-10! p-0!"
                    onClick={() => setDismissed(true)}
                >
                    <X size={15} />
                </button>
            </span>
        </div>
    );
}

/**
 * A phone-sized "Writing this week": a button for the library's scrolling row that opens the week's
 * bars in a bottom sheet.
 */
export function WritingWeekPill() {
    const [open, setOpen] = useState(false);
    const { today, week, home } = useWeek();
    const close = useCallback(() => setOpen(false), []);
    const todayKey = localDay(today);
    const words = home.data?.wordsByDay ?? {};
    const active = new Set(home.data?.activeDays ?? []);
    const total = week.reduce(
        (sum, day) => sum + (words[localDay(day)] ?? 0),
        0,
    );
    const daysWritten = week.filter((day) => active.has(localDay(day))).length;
    const most = Math.max(1, ...week.map((day) => words[localDay(day)] ?? 0));

    return (
        <>
            <button
                type="button"
                aria-haspopup="dialog"
                aria-expanded={open}
                onClick={() => setOpen(true)}
                className="text-muted! hover:text-ink! h-11! min-h-11! gap-2! rounded-xl! border-0! bg-transparent! px-2.5! text-[13px]! whitespace-nowrap shadow-none! hover:bg-[var(--control-hover)]!"
            >
                <ChartNoAxesColumn
                    size={19}
                    strokeWidth={1.6}
                    aria-hidden="true"
                />
                Writing this week
            </button>
            <BottomSheet open={open} onClose={close} title="Writing this week">
                <div className="border-line bg-surface rounded-2xl border px-5 pt-5 pb-4">
                    <ol
                        className="m-0 mx-auto grid h-[104px] w-full max-w-[420px] list-none grid-cols-7 items-end gap-2 p-0"
                        aria-label="Words written each day"
                    >
                        {week.map((day) => {
                            const key = localDay(day);
                            const count = words[key] ?? 0;
                            const isToday = key === todayKey;
                            const height = count
                                ? 20 + (count / most) * 60
                                : active.has(key)
                                  ? 20
                                  : 14;
                            return (
                                <li
                                    key={key}
                                    className="flex flex-col items-center gap-2"
                                >
                                    <span
                                        style={{ height }}
                                        className={`block w-full max-w-[18px] rounded-full ${
                                            isToday
                                                ? "bg-accent"
                                                : key > todayKey
                                                  ? "bg-[color-mix(in_srgb,var(--tint)_55%,var(--surface))]"
                                                  : "bg-tint"
                                        }`}
                                    />
                                    <span
                                        className={`text-[11px] leading-none ${isToday ? "text-ink font-semibold" : "text-muted"}`}
                                    >
                                        <span aria-hidden="true">
                                            {day.toLocaleDateString(undefined, {
                                                weekday: "narrow",
                                            })}
                                        </span>
                                        <span className="sr-only">
                                            {day.toLocaleDateString(undefined, {
                                                weekday: "long",
                                            })}
                                            : {count} words
                                        </span>
                                    </span>
                                </li>
                            );
                        })}
                    </ol>
                    <p className="text-muted m-0 mt-4 text-[13.5px] leading-[1.5]">
                        {!home.data ? (
                            " "
                        ) : total ? (
                            <>
                                You wrote{" "}
                                <strong className="text-ink font-semibold">
                                    {total.toLocaleString()}
                                </strong>{" "}
                                {total === 1 ? "word" : "words"} this week
                            </>
                        ) : daysWritten ? (
                            `You wrote on ${daysWritten} ${daysWritten === 1 ? "day" : "days"} this week`
                        ) : (
                            "Your writing this week will show here"
                        )}
                    </p>
                </div>
            </BottomSheet>
        </>
    );
}

/**
 * "Writing this week": one bar per day, Monday to Sunday, sized by the words added that day, with
 * today in the accent colour. Days recorded before word counts were kept show as small marks.
 */
export function WritingWeek() {
    const { today, week, home } = useWeek();
    const [open, setOpen] = useState(true);
    const todayKey = localDay(today);
    const words = home.data?.wordsByDay ?? {};
    const active = new Set(home.data?.activeDays ?? []);
    const total = week.reduce(
        (sum, day) => sum + (words[localDay(day)] ?? 0),
        0,
    );
    const daysWritten = week.filter((day) => active.has(localDay(day))).length;
    const most = Math.max(1, ...week.map((day) => words[localDay(day)] ?? 0));

    return (
        <section aria-labelledby="writing-week-title">
            <button
                type="button"
                aria-expanded={open}
                aria-controls="writing-week"
                onClick={() => setOpen(!open)}
                className="text-ink! mb-3 h-10! min-h-10! w-full! justify-between! rounded-lg! border-0! bg-transparent! px-2! text-[14.5px]! font-medium shadow-none! hover:bg-[var(--control-hover)]!"
            >
                <span id="writing-week-title">Writing this week</span>
                <ChevronRight
                    size={16}
                    aria-hidden="true"
                    className={`text-muted transition-transform duration-150 ${open ? "rotate-90" : ""}`}
                />
            </button>
            {open && (
                <div
                    id="writing-week"
                    className="border-line bg-surface rounded-2xl border px-6 pt-6 pb-5"
                >
                    <ol
                        className="m-0 grid h-[104px] list-none grid-cols-7 items-end gap-2 p-0"
                        aria-label="Words written each day"
                    >
                        {week.map((day) => {
                            const key = localDay(day);
                            const count = words[key] ?? 0;
                            const future = key > todayKey;
                            const isToday = key === todayKey;
                            const height = count
                                ? 20 + (count / most) * 60
                                : active.has(key)
                                  ? 20
                                  : 14;
                            return (
                                <li
                                    key={key}
                                    className="flex flex-col items-center gap-2"
                                >
                                    <span
                                        title={`${day.toLocaleDateString(undefined, { weekday: "long" })}: ${count.toLocaleString()} ${count === 1 ? "word" : "words"}`}
                                        style={{ height }}
                                        className={`block w-full max-w-[18px] rounded-full transition-[height] duration-300 ${
                                            isToday
                                                ? "bg-accent"
                                                : future
                                                  ? "bg-[color-mix(in_srgb,var(--tint)_55%,var(--surface))]"
                                                  : "bg-tint"
                                        }`}
                                    />
                                    <span
                                        className={`text-[11px] leading-none ${isToday ? "text-ink font-semibold" : "text-muted"}`}
                                    >
                                        <span aria-hidden="true">
                                            {day.toLocaleDateString(undefined, {
                                                weekday: "narrow",
                                            })}
                                        </span>
                                        <span className="sr-only">
                                            {day.toLocaleDateString(undefined, {
                                                weekday: "long",
                                            })}
                                            : {count} words
                                        </span>
                                    </span>
                                </li>
                            );
                        })}
                    </ol>
                    <p className="text-muted m-0 mt-4 text-[13.5px] leading-[1.5]">
                        {!home.data ? (
                            " "
                        ) : total ? (
                            <>
                                You wrote{" "}
                                <strong className="text-ink font-semibold">
                                    {total.toLocaleString()}
                                </strong>{" "}
                                {total === 1 ? "word" : "words"} this week
                            </>
                        ) : daysWritten ? (
                            `You wrote on ${daysWritten} ${daysWritten === 1 ? "day" : "days"} this week`
                        ) : (
                            "Your writing this week will show here"
                        )}
                    </p>
                </div>
            )}
        </section>
    );
}
