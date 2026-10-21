"use client";
import * as Tooltip from "@radix-ui/react-tooltip";
import { keepPreviousData } from "@tanstack/react-query";
import {
    Archive,
    Clock,
    Compass,
    FilePen,
    FileText,
    LayoutGrid,
    List,
    ListChecks,
    LoaderCircle,
    Pin,
    Plus,
    Search,
    SearchX,
    StickyNote,
    X,
    type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import {
    usePathname,
    useRouter,
    useSearchParams,
} from "next/navigation";
import {
    useEffect,
    useMemo,
    useRef,
    useState,
    type FormEvent,
} from "react";
import { makeDoc } from "~/lib/writely/model";
import { highlightParts } from "~/lib/writely/plain-text";
import type { Preferences } from "~/lib/writely/preferences";
import type {
    DocumentFilter,
    DocumentSort,
    DocumentSummary,
} from "~/server/documents";
import { api } from "~/trpc/react";
import {
    AppHeader,
    type AccountUser,
} from "../app-header";
import { EmptyState } from "../empty-state";
import { usePreferences } from "../preferences";
import {
    ActionMenu,
    Button,
    Dialog,
} from "../ui";
import {
    DANGER_BUTTON,
    DIALOG_ACTIONS,
    PRIMARY_BUTTON,
    TOOLTIP_CLASS,
} from "~/config/ui";
import { WelcomeBack, WritingWeek } from "./home-notes";

/**
 * What: The filter buttons above the document list, as the filter name and
 * the label shown.
 *
 * Used in:
 * - src/app/components/library/library.tsx (Library)
 *
 * Effect: Changes the labels or order of the filter buttons. Each name must
 * also be in DOCUMENT_FILTERS in src/config/documents.ts.
 */
const FILTERS: [DocumentFilter, string, LucideIcon][] = [
    ["all", "All documents", FileText],
    ["recent", "Recent", Clock],
    ["pinned", "Pinned", Pin],
    ["archived", "Archived", Archive],
];
/**
 * What: The sort menu choices, as the sort name and the label shown.
 *
 * Used in:
 * - src/app/components/library/library.tsx (Library)
 *
 * Effect: Changes the labels or order of the sort menu. Each name must also
 * be in DOCUMENT_SORTS in src/config/documents.ts.
 */
const SORTS: [DocumentSort, string][] = [
    ["updated-desc", "Last edited"],
    ["updated-asc", "Oldest edited"],
    ["created-desc", "Date created"],
    ["title-asc", "Title A–Z"],
];

/**
 * What: The soft colours of the document icon on each card, as a background
 * and an icon colour. Each document always gets the same one (picked from its
 * id), so a document is easy to spot again.
 *
 * Used in:
 * - src/app/components/library/library.tsx (DocumentIcon)
 *
 * Effect: Changes the icon colours in the library. Dark mode blends each one
 * into the dark surface automatically.
 */
const DOCUMENT_COLOURS = [
    ["#e1f1e8", "#3f8f6b"],
    ["#e2ecfb", "#3b6fd1"],
    ["#ebe7fa", "#6b55c9"],
    ["#fbf0d9", "#b9832a"],
    ["#fbe4e7", "#c0475a"],
    ["#e4f0ec", "#4f8a78"],
] as const;

function DocumentIcon({ id, size = 42 }: { id: string; size?: number }) {
    let hash = 0;
    for (const c of id) hash = (hash * 31 + c.charCodeAt(0)) | 0;
    const [bg, fg] = DOCUMENT_COLOURS[Math.abs(hash) % DOCUMENT_COLOURS.length]!;
    return (
        <span
            aria-hidden="true"
            style={{
                background: `color-mix(in srgb, ${bg} var(--card-strength), var(--surface))`,
                color: fg,
                width: size,
                height: size,
            }}
            className="flex shrink-0 items-center justify-center rounded-[10px]"
        >
            <FileText size={Math.round(size * 0.46)} strokeWidth={1.7} />
        </span>
    );
}

/** "Today, 14:02", "Yesterday", "3 Oct" or "3 Oct 2025". */
export function formatEdited(date: Date, now = new Date()) {
    const day = (d: Date) =>
        new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const days = Math.round((day(now) - day(date)) / 86_400_000);
    if (days === 0)
        return `Today, ${date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`;
    if (days === 1) return "Yesterday";
    return date.toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        ...(date.getFullYear() !== now.getFullYear() && { year: "numeric" }),
    });
}

/** The card footer's date: "today, 10:02 AM", "yesterday" or "Oct 19, 2026". */
function formatCardEdited(date: Date, now = new Date()) {
    const text = formatEdited(date, now);
    if (/^(Today|Yesterday)/.test(text))
        return text.charAt(0).toLowerCase() + text.slice(1);
    return date.toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

function Highlighted({ text, terms }: { text: string; terms: string[] }) {
    return (
        <>
            {highlightParts(text, terms).map((part, i) =>
                part.match ? (
                    <mark
                        key={i}
                        className="rounded-[2px] bg-[var(--mark)] px-px text-inherit"
                    >
                        {part.text}
                    </mark>
                ) : (
                    part.text
                ),
            )}
        </>
    );
}

/**
 * What: The ring drawn around a document card or row when it is reached
 * with the keyboard.
 *
 * Used in:
 * - src/app/components/library/library.tsx (Library)
 *
 * Effect: Changes how visible keyboard focus is in the document list.
 */
const FOCUS_RING =
    "focus-visible:outline-none focus-visible:[box-shadow:0_0_0_2px_var(--control-ring)] focus-visible:[border-color:var(--control-focus)]";

export default function Library({
    user,
    initialPreferences,
}: {
    user: AccountUser;
    initialPreferences: Preferences;
}) {
    const router = useRouter(),
        pathname = usePathname(),
        params = useSearchParams();
    const [preferences, setPreferences] = usePreferences(initialPreferences);
    const view = preferences.libraryView;
    const filter =
        FILTERS.find(([f]) => f === params.get("filter"))?.[0] ?? "all";
    const sort =
        SORTS.find(([s]) => s === params.get("sort"))?.[0] ?? "updated-desc";
    const [input, setInput] = useState(params.get("q") ?? "");
    const query = params.get("q") ?? "";

    // Library state lives in the URL, so Back, Forward, refresh and shared links keep it.
    const setParams = (changes: Record<string, string | null>) => {
        const next = new URLSearchParams(params.toString());
        for (const [key, value] of Object.entries(changes))
            if (value) next.set(key, value);
            else next.delete(key);
        const search = next.toString();
        router.replace(search ? `${pathname}?${search}` : pathname, {
            scroll: false,
        });
    };
    useEffect(() => {
        const value = input.trim();
        if (value === query) return;
        const timer = setTimeout(() => setParams({ q: value || null }), 250);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [input]);
    // Back/Forward changes the URL; the field follows it.
    const [shownQuery, setShownQuery] = useState(query);
    if (shownQuery !== query) {
        setShownQuery(query);
        if (input.trim() !== query) setInput(query);
    }

    const utils = api.useUtils();
    const list = api.documents.list.useInfiniteQuery(
        { query, filter, sort, limit: 30 },
        {
            getNextPageParam: (page) => page.nextOffset,
            placeholderData: keepPreviousData,
        },
    );
    const counts = api.documents.counts.useQuery(undefined, {
        staleTime: 30_000,
    });
    const pages = list.data?.pages ?? [];
    const items = pages.flatMap((page) => page.items);
    const total = pages[0]?.total ?? 0;
    const terms = pages[0]?.terms ?? [];

    const sentinel = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const el = sentinel.current;
        if (!el || !list.hasNextPage) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry?.isIntersecting && !list.isFetchingNextPage)
                    void list.fetchNextPage();
            },
            { rootMargin: "400px" },
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [list, list.hasNextPage, list.isFetchingNextPage]);

    const [creating, setCreating] = useState(false);
    const [error, setError] = useState("");
    const create = api.documents.create.useMutation();
    const newDocument = async () => {
        if (creating) return;
        setCreating(true);
        const doc = makeDoc();
        try {
            await create.mutateAsync({ documents: [doc] });
            router.push(`/d/${doc.id}`);
        } catch {
            setCreating(false);
            setError(
                "Couldn’t create a document. Check your connection and try again.",
            );
        }
    };

    const refresh = () => {
        void utils.documents.list.invalidate();
        void utils.documents.recent.invalidate();
        void utils.documents.counts.invalidate();
    };
    const pin = api.documents.pin.useMutation({ onSettled: refresh });
    const rename = api.documents.rename.useMutation({ onSettled: refresh });
    const remove = api.documents.delete.useMutation({ onSettled: refresh });
    const archive = api.documents.archive.useMutation({ onSettled: refresh });
    const searchField = useRef<HTMLInputElement>(null);
    // Ctrl/⌘ K jumps to the search field from anywhere in the library.
    useEffect(() => {
        const key = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
                e.preventDefault();
                searchField.current?.focus();
                searchField.current?.select();
            }
        };
        window.addEventListener("keydown", key);
        return () => window.removeEventListener("keydown", key);
    }, []);

    const [renaming, setRenaming] = useState<DocumentSummary | null>(null);
    const [renameText, setRenameText] = useState("");
    const [deleting, setDeleting] = useState<DocumentSummary | null>(null);
    const [confirmation, setConfirmation] = useState("");
    const [notice, setNotice] = useState("");
    useEffect(() => {
        if (!notice) return;
        const t = setTimeout(() => setNotice(""), 3500);
        return () => clearTimeout(t);
    }, [notice]);

    const submitRename = (e: FormEvent) => {
        e.preventDefault();
        if (!renaming || !renameText.trim()) return;
        rename.mutate(
            { id: renaming.id, title: renameText.trim() },
            { onError: () => setError("Couldn’t rename the document.") },
        );
        setRenaming(null);
    };
    const confirmDelete = () => {
        if (!deleting || confirmation !== "delete") return;
        const title = deleting.title || "Untitled";
        remove.mutate(
            { id: deleting.id },
            {
                onSuccess: () => setNotice(`Deleted “${title}”.`),
                onError: () => setError("Couldn’t delete the document."),
            },
        );
        setDeleting(null);
    };

    const menuFor = (doc: DocumentSummary) => [
        { label: "Open", onSelect: () => router.push(`/d/${doc.id}`) },
        {
            label: "Rename",
            onSelect: () => {
                setRenameText(doc.title);
                setRenaming(doc);
            },
        },
        ...(doc.archived
            ? []
            : [
                  {
                      label: doc.pinned ? "Unpin" : "Pin",
                      onSelect: () =>
                          pin.mutate(
                              { id: doc.id, pinned: !doc.pinned },
                              {
                                  onError: () =>
                                      setError("Couldn’t update the document."),
                              },
                          ),
                  },
              ]),
        {
            label: doc.archived ? "Unarchive" : "Archive",
            onSelect: () =>
                archive.mutate(
                    { id: doc.id, archived: !doc.archived },
                    {
                        onSuccess: () =>
                            setNotice(
                                doc.archived
                                    ? `Moved “${doc.title || "Untitled"}” back to your documents.`
                                    : `Archived “${doc.title || "Untitled"}”.`,
                            ),
                        onError: () =>
                            setError("Couldn’t update the document."),
                    },
                ),
        },
        {
            label: "Delete",
            danger: true,
            separator: true,
            onSelect: () => {
                setConfirmation("");
                setDeleting(doc);
            },
        },
    ];

    const searching = !!query;
    const emptyMessage = useMemo(() => {
        if (searching)
            return {
                icon: SearchX,
                title: `Nothing matches “${query}”`,
                body:
                    filter === "all"
                        ? "Try fewer or different words."
                        : "Try fewer words, or search all documents.",
            };
        if (filter === "pinned")
            return {
                icon: Pin,
                title: "No pinned documents",
                body: "Pin a document from its ⋯ menu to keep it close at hand.",
            };
        if (filter === "archived")
            return {
                icon: Archive,
                title: "Nothing archived",
                body: "Archive finished or paused documents from their ⋯ menu. They stay safe here, out of the way.",
            };
        if (filter === "recent")
            return {
                icon: Clock,
                title: "Nothing edited recently",
                body: "Documents you’ve edited in the last two weeks appear here.",
            };
        return {
            icon: FilePen,
            title: "Your library is empty",
            body: "A blank page is a good place to start. Writely keeps your notes, goals and drafts beside the writing.",
        };
    }, [searching, query, filter]);

    return (
        <Tooltip.Provider delayDuration={450}>
            <div className="bg-paper text-ink min-h-dvh">
                <AppHeader
                    user={user}
                    search={
                        <div role="search" className="relative">
                            <Search
                                size={18}
                                strokeWidth={1.7}
                                aria-hidden="true"
                                className="text-muted pointer-events-none absolute top-1/2 left-4 -translate-y-1/2"
                            />
                            <input
                                ref={searchField}
                                type="search"
                                aria-label="Search documents"
                                aria-keyshortcuts="Control+K Meta+K"
                                placeholder="Search documents, content, or keywords..."
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Escape" && input) {
                                        e.preventDefault();
                                        setInput("");
                                        setParams({ q: null });
                                    }
                                }}
                                className="placeholder:text-muted min-h-12! rounded-xl! border-transparent! bg-[color-mix(in_srgb,var(--text)_4%,var(--bg))]! pr-20! pl-12! text-[14.5px]! shadow-none! focus:border-[var(--control-focus)]! focus:bg-[var(--surface)]! [&::-webkit-search-cancel-button]:hidden"
                            />
                            {input ? (
                                <button
                                    type="button"
                                    aria-label="Clear search"
                                    className="absolute top-1/2 right-2 size-9! min-h-9! min-w-9! -translate-y-1/2 rounded-lg! p-0!"
                                    onClick={() => {
                                        setInput("");
                                        setParams({ q: null });
                                        searchField.current?.focus();
                                    }}
                                >
                                    <X size={15} />
                                </button>
                            ) : (
                                <kbd
                                    aria-hidden="true"
                                    className="border-line text-muted pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 rounded-md border bg-[var(--surface)] px-2 py-0.5 font-sans text-[11.5px] max-sm:hidden"
                                >
                                    Ctrl K
                                </kbd>
                            )}
                        </div>
                    }
                />
                <div className="grid min-h-[calc(100dvh-76px)] grid-cols-[minmax(260px,330px)_minmax(0,1fr)] max-[1023px]:grid-cols-1">
                    <aside className="border-line flex flex-col gap-8 self-stretch border-r px-8 pt-9 pb-10 max-[1023px]:gap-4 max-[1023px]:border-r-0 max-[1023px]:border-b max-[1023px]:px-4 max-[1023px]:pt-4 max-[1023px]:pb-4">
                        <Button
                            className={`${PRIMARY_BUTTON} h-[52px]! w-full! gap-2.5! rounded-xl! text-[15px]! font-semibold [box-shadow:0_10px_22px_-14px_color-mix(in_srgb,var(--accent)_80%,transparent)] max-[1023px]:h-11! max-[1023px]:w-auto! max-[1023px]:self-start`}
                            icon={creating ? LoaderCircle : Plus}
                            onClick={() => void newDocument()}
                            disabled={creating}
                        >
                            New document
                        </Button>
                        <nav aria-label="Library">
                            <ul className="m-0 flex list-none flex-col gap-1 p-0 max-[1023px]:flex-row max-[1023px]:overflow-x-auto">
                                {FILTERS.map(([value, label, Icon]) => {
                                    const current = filter === value;
                                    const count = counts.data?.[value];
                                    return (
                                        <li key={value} className="shrink-0">
                                            <button
                                                aria-current={
                                                    current ? "page" : undefined
                                                }
                                                onClick={() =>
                                                    setParams({
                                                        filter:
                                                            value === "all"
                                                                ? null
                                                                : value,
                                                    })
                                                }
                                                className={`h-[50px]! min-h-[50px]! w-full! justify-start! gap-3.5! rounded-xl! border-0! px-4! text-[15px]! shadow-none! max-[1023px]:h-10! max-[1023px]:min-h-10! max-[1023px]:px-3! max-[1023px]:text-[13.5px]! ${
                                                    current
                                                        ? "bg-tint! text-ink! font-semibold"
                                                        : "text-muted! hover:text-ink! bg-transparent! hover:bg-[var(--control-hover)]!"
                                                }`}
                                            >
                                                <Icon
                                                    size={19}
                                                    strokeWidth={1.6}
                                                    aria-hidden="true"
                                                    className={
                                                        current
                                                            ? "text-ink"
                                                            : "text-muted"
                                                    }
                                                />
                                                <span className="flex-1 text-left">
                                                    {label}
                                                </span>
                                                {count !== undefined && (
                                                    <span className="text-muted text-[13px] font-normal tabular-nums">
                                                        <span className="sr-only">
                                                            ,{" "}
                                                        </span>
                                                        {count}
                                                    </span>
                                                )}
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        </nav>
                        <div className="border-line border-t pt-7 max-[1023px]:hidden">
                            <WritingWeek />
                        </div>
                    </aside>

                    <main className="min-w-0 px-10 pt-11 pb-24 max-[1023px]:px-4 max-[1023px]:pt-6">
                        <WelcomeBack />
                        <div className="mb-9 flex flex-wrap items-end justify-between gap-x-6 gap-y-4 max-sm:mb-6">
                            <div className="min-w-0">
                                <h1 className="m-0 font-serif text-[52px] leading-[1.05] font-normal tracking-[-0.03em] max-sm:text-[38px]">
                                    {searching
                                        ? "Search results"
                                        : filter === "all"
                                          ? "Documents"
                                          : FILTERS.find(
                                                ([f]) => f === filter,
                                            )![1]}
                                </h1>
                                <p
                                    className="text-muted m-0 mt-2 text-[16px] max-sm:text-[14px]"
                                    role="status"
                                    aria-live="polite"
                                >
                                    {list.isPending
                                        ? "Loading…"
                                        : searching
                                          ? `${total} ${total === 1 ? "result" : "results"} for “${query}”`
                                          : filter === "archived"
                                            ? "Finished or paused work, kept out of the way."
                                            : "Your ideas, drafts and finished work — all in one place."}
                                    {list.isFetching &&
                                        !list.isPending &&
                                        !list.isFetchingNextPage && (
                                            <LoaderCircle
                                                size={13}
                                                aria-hidden="true"
                                                className="ml-2 inline animate-[save-spin_900ms_linear_infinite] align-[-2px]"
                                            />
                                        )}
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <label className="sr-only" htmlFor="library-sort">
                                    Sort by
                                </label>
                                <select
                                    id="library-sort"
                                    value={sort}
                                    onChange={(e) =>
                                        setParams({
                                            sort:
                                                e.target.value === "updated-desc"
                                                    ? null
                                                    : e.target.value,
                                        })
                                    }
                                    className="border-line! bg-surface! h-[52px]! min-h-[52px]! w-auto! rounded-xl! py-2! pr-10! pl-4! text-[14px]! max-sm:h-11! max-sm:min-h-11!"
                                >
                                    {SORTS.map(([value, label]) => (
                                        <option key={value} value={value}>
                                            {label}
                                        </option>
                                    ))}
                                </select>
                                <div
                                    role="radiogroup"
                                    aria-label="Layout"
                                    className="border-line bg-surface flex gap-1 rounded-xl border p-1"
                                >
                                    {(
                                        [
                                            ["cards", LayoutGrid, "Card view"],
                                            ["list", List, "List view"],
                                        ] as const
                                    ).map(([value, Icon, label]) => (
                                        <button
                                            key={value}
                                            role="radio"
                                            aria-checked={view === value}
                                            aria-label={label}
                                            title={label}
                                            onClick={() =>
                                                setPreferences({
                                                    libraryView: value,
                                                })
                                            }
                                            className={`size-11! min-h-11! min-w-11! rounded-lg! border-0! p-0! shadow-none! max-sm:size-9! max-sm:min-h-9! max-sm:min-w-9! ${
                                                view === value
                                                    ? "bg-tint! text-ink!"
                                                    : "text-muted! bg-transparent! hover:bg-[var(--control-hover)]!"
                                            }`}
                                        >
                                            <Icon size={19} strokeWidth={1.6} />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {list.isError && (
                            <div className="border-line bg-surface rounded-2xl border px-6 py-10 text-center">
                                <p className="text-[15px]">
                                    Couldn’t load your documents.
                                </p>
                                <button
                                    className="text-accent! mt-3 text-[13px]!"
                                    onClick={() => void list.refetch()}
                                >
                                    Try again
                                </button>
                            </div>
                        )}

                        {!list.isPending && !list.isError && !items.length && (
                            <EmptyState
                                icon={emptyMessage.icon}
                                title={emptyMessage.title}
                                body={emptyMessage.body}
                                actions={
                                    searching ? (
                                        <button
                                            className="border-line! h-10! rounded-lg! border! px-4! text-[13px]!"
                                            onClick={() => {
                                                setInput("");
                                                setParams({
                                                    q: null,
                                                    filter: null,
                                                });
                                            }}
                                        >
                                            Clear search
                                        </button>
                                    ) : filter === "all" ? (
                                        <>
                                            <Button
                                                className={`${PRIMARY_BUTTON} h-10! gap-2! rounded-lg! px-4! text-[13px]! font-medium`}
                                                icon={
                                                    creating
                                                        ? LoaderCircle
                                                        : Plus
                                                }
                                                onClick={() =>
                                                    void newDocument()
                                                }
                                                disabled={creating}
                                            >
                                                New document
                                            </Button>
                                            <Link
                                                href="/tutorial"
                                                className="border-line text-ink hover:bg-surface inline-flex h-10 items-center gap-2 rounded-lg border px-4 text-[13px] no-underline"
                                            >
                                                <Compass
                                                    size={16}
                                                    strokeWidth={1.6}
                                                    aria-hidden="true"
                                                />
                                                Take the 2-minute tour
                                            </Link>
                                        </>
                                    ) : (
                                        <button
                                            className="border-line! h-10! rounded-lg! border! px-4! text-[13px]!"
                                            onClick={() =>
                                                setParams({ filter: null })
                                            }
                                        >
                                            Show all documents
                                        </button>
                                    )
                                }
                                cards={
                                    !searching && filter === "all"
                                        ? [
                                              {
                                                  icon: FilePen,
                                                  title: "Write without clutter",
                                                  text: "A calm page with every tool tucked into the dock below.",
                                              },
                                              {
                                                  icon: StickyNote,
                                                  title: "Leave thoughts beside it",
                                                  text: "Pin notes to any phrase without touching the text.",
                                              },
                                              {
                                                  icon: ListChecks,
                                                  title: "Revise toward a goal",
                                                  text: "Pick a goal, revise, then compare against where you began.",
                                              },
                                          ]
                                        : undefined
                                }
                            />
                        )}

                        {!!items.length &&
                            (view === "cards" ? (
                                <ul
                                    aria-label="Documents"
                                    className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-7 p-0 max-sm:grid-cols-1 max-sm:gap-4"
                                >
                                    {items.map((doc) => (
                                        <li
                                            key={doc.id}
                                            className="group relative"
                                        >
                                            <TitleTooltip title={doc.title}>
                                                <Link
                                                    href={`/d/${doc.id}`}
                                                    className={`border-line bg-surface text-ink flex h-full flex-col rounded-2xl border px-7 pt-7 pb-6 no-underline [box-shadow:0_1px_2px_color-mix(in_srgb,var(--shadow)_4%,transparent)] transition-[translate,box-shadow,border-color] duration-200 ease-out group-hover:-translate-y-0.5 group-hover:border-[var(--control-focus)] group-hover:[box-shadow:0_18px_32px_-22px_color-mix(in_srgb,var(--shadow)_40%,transparent)] motion-reduce:group-hover:translate-y-0 max-sm:px-5 max-sm:pt-5 max-sm:pb-4 ${FOCUS_RING}`}
                                                >
                                                    <DocumentIcon id={doc.id} />
                                                    <span className="mt-5 line-clamp-2 pr-2 font-serif text-[25px] leading-[1.2] font-normal tracking-[-0.015em] max-sm:text-[21px]">
                                                        <Highlighted
                                                            text={
                                                                doc.title ||
                                                                "Untitled"
                                                            }
                                                            terms={terms}
                                                        />
                                                    </span>
                                                    <span className="text-muted mt-3 line-clamp-3 min-h-[calc(3*1.65em)] text-[15.5px] leading-[1.65] max-sm:text-[14px]">
                                                        {doc.excerpt ? (
                                                            <Highlighted
                                                                text={doc.excerpt}
                                                                terms={terms}
                                                            />
                                                        ) : (
                                                            <em>Empty</em>
                                                        )}
                                                    </span>
                                                    <span className="border-line text-muted mt-auto flex items-center justify-between gap-3 border-t pt-4 text-[13.5px] max-sm:text-[12.5px] [&:not(:first-child)]:mt-6">
                                                        <span className="tabular-nums">
                                                            {doc.wordCount.toLocaleString()}{" "}
                                                            {doc.wordCount === 1
                                                                ? "word"
                                                                : "words"}
                                                        </span>
                                                        <span className="truncate">
                                                            Edited{" "}
                                                            {formatCardEdited(
                                                                doc.updated,
                                                            )}
                                                        </span>
                                                    </span>
                                                </Link>
                                            </TitleTooltip>
                                            <div className="absolute top-6 right-5 flex items-center gap-1 max-sm:top-4 max-sm:right-3 [&_.document-menu-trigger]:pointer-events-auto! [&_.document-menu-trigger]:size-9! [&_.document-menu-trigger]:min-h-9! [&_.document-menu-trigger]:min-w-9! [&_.document-menu-trigger]:rounded-lg! [&_.document-menu-trigger]:text-[var(--muted)]! [&_.document-menu-trigger]:opacity-100! [&_.document-menu-trigger:hover]:text-[var(--text)]!">
                                                {doc.pinned && (
                                                    <Pin
                                                        size={17}
                                                        strokeWidth={1.7}
                                                        className="text-[#c08a2b]"
                                                        aria-label="Pinned"
                                                    />
                                                )}
                                                <ActionMenu
                                                    label={`Document actions: ${doc.title || "Untitled"}`}
                                                    menuLabel={`Actions for ${doc.title || "Untitled"}`}
                                                    items={menuFor(doc)}
                                                />
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <ul
                                    aria-label="Documents"
                                    className="border-line bg-surface m-0 list-none overflow-hidden rounded-2xl border p-0"
                                >
                                    {items.map((doc) => (
                                        <li
                                            key={doc.id}
                                            className="group border-line relative border-b last:border-b-0"
                                        >
                                            <TitleTooltip title={doc.title}>
                                                <Link
                                                    href={`/d/${doc.id}`}
                                                    className={`text-ink grid min-h-[68px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 py-3 pr-24 pl-5 no-underline hover:bg-[var(--control-hover)] max-sm:pr-14 max-sm:pl-3 ${FOCUS_RING}`}
                                                >
                                                    <DocumentIcon
                                                        id={doc.id}
                                                        size={34}
                                                    />
                                                    <span className="min-w-0">
                                                        <span className="block truncate font-serif text-[17px]">
                                                            <Highlighted
                                                                text={
                                                                    doc.title ||
                                                                    "Untitled"
                                                                }
                                                                terms={terms}
                                                            />
                                                        </span>
                                                        {doc.excerpt && (
                                                            <span className="text-muted mt-0.5 block truncate text-[13px]">
                                                                <Highlighted
                                                                    text={
                                                                        doc.excerpt
                                                                    }
                                                                    terms={terms}
                                                                />
                                                            </span>
                                                        )}
                                                    </span>
                                                    <span className="text-muted flex gap-6 text-[13px] whitespace-nowrap">
                                                        <span className="tabular-nums max-md:hidden">
                                                            {doc.wordCount.toLocaleString()}{" "}
                                                            words
                                                        </span>
                                                        <span className="max-sm:hidden">
                                                            Edited{" "}
                                                            {formatCardEdited(
                                                                doc.updated,
                                                            )}
                                                        </span>
                                                    </span>
                                                </Link>
                                            </TitleTooltip>
                                            <div className="absolute top-1/2 right-3 flex -translate-y-1/2 items-center gap-1 [&_.document-menu-trigger]:pointer-events-auto! [&_.document-menu-trigger]:opacity-100! [&_.document-menu-trigger]:rounded-lg!">
                                                {doc.pinned && (
                                                    <Pin
                                                        size={15}
                                                        strokeWidth={1.7}
                                                        className="text-[#c08a2b]"
                                                        aria-label="Pinned"
                                                    />
                                                )}
                                                <ActionMenu
                                                    label={`Document actions: ${doc.title || "Untitled"}`}
                                                    menuLabel={`Actions for ${doc.title || "Untitled"}`}
                                                    items={menuFor(doc)}
                                                />
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            ))}
                        <div ref={sentinel} aria-hidden="true" />
                        {list.hasNextPage && (
                            <div className="mt-8 flex justify-center">
                                <button
                                    className="text-[13px]!"
                                    disabled={list.isFetchingNextPage}
                                    onClick={() => void list.fetchNextPage()}
                                >
                                    {list.isFetchingNextPage
                                        ? "Loading…"
                                        : "Show more"}
                                </button>
                            </div>
                        )}
                    </main>
                </div>
                {renaming && (
                    <Dialog
                        title="Rename document"
                        onClose={() => setRenaming(null)}
                    >
                        <form onSubmit={submitRename}>
                            <label htmlFor="library-rename">
                                Document title
                            </label>
                            <input
                                id="library-rename"
                                value={renameText}
                                onChange={(e) => setRenameText(e.target.value)}
                                maxLength={120}
                                required
                            />
                            <div className={DIALOG_ACTIONS}>
                                <button
                                    type="button"
                                    onClick={() => setRenaming(null)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className={PRIMARY_BUTTON}
                                    disabled={!renameText.trim()}
                                >
                                    Rename
                                </button>
                            </div>
                        </form>
                    </Dialog>
                )}
                {deleting && (
                    <Dialog
                        title="Delete document?"
                        onClose={() => setDeleting(null)}
                        describedBy="library-delete-description"
                    >
                        <p id="library-delete-description">
                            Delete “{deleting.title || "Untitled"}” and its
                            drafts and thought cards? This cannot be undone.
                        </p>
                        <label htmlFor="library-delete-confirmation">
                            Type delete to confirm
                        </label>
                        <input
                            id="library-delete-confirmation"
                            value={confirmation}
                            onChange={(e) => setConfirmation(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") confirmDelete();
                            }}
                            autoComplete="off"
                            spellCheck={false}
                        />
                        <div className={DIALOG_ACTIONS}>
                            <button onClick={() => setDeleting(null)}>
                                Cancel
                            </button>
                            <button
                                className={DANGER_BUTTON}
                                disabled={confirmation !== "delete"}
                                onClick={confirmDelete}
                            >
                                Delete document
                            </button>
                        </div>
                    </Dialog>
                )}
                {(notice || error) && (
                    <div
                        role={error ? "alert" : "status"}
                        className="border-line bg-surface fixed bottom-6 left-1/2 z-50 flex max-w-[calc(100vw-32px)] -translate-x-1/2 items-center gap-3 rounded-lg border px-4 py-2.5 text-[13px] shadow-[0_4px_16px_color-mix(in_srgb,var(--shadow)_10%,transparent)]"
                    >
                        <span className={error ? "text-danger" : ""}>
                            {error || notice}
                        </span>
                        {error && (
                            <button
                                aria-label="Dismiss"
                                className="size-8! min-h-8! min-w-8! p-0!"
                                onClick={() => setError("")}
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>
                )}
            </div>
        </Tooltip.Provider>
    );
}

/** Long titles are cut to one line; hovering or focusing shows them in full. */
function TitleTooltip({
    title,
    children,
}: {
    title: string;
    children: React.ReactElement;
}) {
    if (title.length < 28) return children;
    return (
        <Tooltip.Root>
            <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
            <Tooltip.Portal>
                <Tooltip.Content
                    className={TOOLTIP_CLASS}
                    side="top"
                    align="start"
                    sideOffset={6}
                >
                    {title}
                </Tooltip.Content>
            </Tooltip.Portal>
        </Tooltip.Root>
    );
}
