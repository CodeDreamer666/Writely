"use client";
import * as Tooltip from "@radix-ui/react-tooltip";
import { keepPreviousData } from "@tanstack/react-query";
import {
    Archive,
    Download,
    FilePen,
    FileText,
    LayoutGrid,
    List,
    ListChecks,
    LoaderCircle,
    MoreHorizontal,
    MoreVertical,
    PenLine,
    Pin,
    Plus,
    Search,
    SearchX,
    StickyNote,
    Trash2,
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
import { formatEdited } from "~/lib/writely/edited-date";
import { makeDoc } from "~/lib/writely/model";
import { highlightParts } from "~/lib/writely/plain-text";
import {
    exportOptions,
    type Preferences,
} from "~/lib/writely/preferences";
import type {
    DocumentFilter,
    DocumentSummary,
} from "~/server/documents";
import { api } from "~/trpc/react";
import {
    AppHeader,
    type AccountUser,
} from "../app-header";
import { EmptyState } from "../empty-state";
import { usePreferences } from "../preferences";
import { useDocumentExport } from "../use-document-export";
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
import {
    LegacyImport,
    WelcomeBack,
    WritingWeek,
    WritingWeekPill,
} from "./home-notes";

/**
 * What: The filter buttons above the document list, as the filter name and
 * the label shown. Archived documents are reached from the list's ⋮ menu
 * instead, so the buttons fit side by side on a phone.
 *
 * Used in:
 * - src/app/components/library/library.tsx (Library)
 *
 * Effect: Changes the labels or order of the filter buttons. Each name must
 * also be in DOCUMENT_FILTERS in src/config/documents.ts.
 */
const FILTERS: [DocumentFilter, string, LucideIcon][] = [
    ["all", "All documents", FileText],
    ["pinned", "Pinned", Pin],
];

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
    const exporter = useDocumentExport();
    const filter: DocumentFilter =
        params.get("filter") === "archived"
            ? "archived"
            : (FILTERS.find(([f]) => f === params.get("filter"))?.[0] ?? "all");
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
        { query, filter, limit: 30 },
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
        {
            label: "Rename",
            icon: PenLine,
            onSelect: () => {
                setRenameText(doc.title);
                setRenaming(doc);
            },
        },
        {
            label: "Export as Word (.docx)",
            icon: Download,
            onSelect: () =>
                void exporter.run(doc.id, "docx", exportOptions(preferences)),
        },
        {
            label: "Export as PDF (.pdf)",
            icon: Download,
            onSelect: () =>
                void exporter.run(doc.id, "pdf", exportOptions(preferences)),
        },
        {
            label: "Delete",
            icon: Trash2,
            danger: true,
            onSelect: () => {
                setConfirmation("");
                setDeleting(doc);
            },
        },
        ...(doc.archived
            ? []
            : [
                  {
                      label: doc.pinned ? "Unpin" : "Pin",
                      icon: Pin,
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
            icon: Archive,
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
                body: "Pin a document from its ⋮ menu to keep it close at hand.",
            };
        if (filter === "archived")
            return {
                icon: Archive,
                title: "Nothing archived",
                body: "Archive finished or paused documents from their ⋮ menu. They stay safe here, out of the way.",
            };
        return {
            icon: FilePen,
            title: "Your library is empty",
            body: "A blank page is a good place to start. Writely keeps your notes, goals and drafts beside the writing.",
        };
    }, [searching, query, filter]);

    return (
        <Tooltip.Provider delayDuration={450}>
            <div className="library bg-paper text-ink min-h-dvh max-lg:[&_input]:text-[16px]!">
                <AppHeader
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
                                placeholder="Search your writing…"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Escape" && input) {
                                        e.preventDefault();
                                        setInput("");
                                        setParams({ q: null });
                                    }
                                }}
                                className="placeholder:text-muted min-h-12! rounded-xl! border-transparent! bg-[color-mix(in_srgb,var(--text)_4%,var(--bg))]! pr-20! pl-12! text-[14.5px]! shadow-none! focus:border-[var(--control-focus)]! focus:bg-[var(--surface)]! max-lg:text-[16px]! max-md:pr-12! [&::-webkit-search-cancel-button]:hidden"
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
                                    className="border-line text-muted pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 rounded-md border bg-[var(--surface)] px-2 py-0.5 font-sans text-[11.5px] max-md:hidden"
                                >
                                    Ctrl K
                                </kbd>
                            )}
                        </div>
                    }
                />
                <div className="grid min-h-[calc(100dvh-76px)] grid-cols-[minmax(260px,330px)_minmax(0,1fr)] max-lg:grid-cols-1 max-lg:content-start">
                    <aside className="border-line flex min-w-0 flex-col gap-8 self-stretch border-r px-8 pt-9 pb-10 max-lg:gap-0 max-lg:border-r-0 max-lg:px-6 max-lg:pt-4 max-lg:pb-0 max-md:px-4">
                        <Button
                            className={`${PRIMARY_BUTTON} h-[52px]! w-full! gap-2.5! rounded-xl! text-[15px]! font-semibold [box-shadow:0_10px_22px_-14px_color-mix(in_srgb,var(--accent)_80%,transparent)] max-lg:fixed max-lg:right-[max(20px,env(safe-area-inset-right))] max-lg:bottom-[calc(24px+env(safe-area-inset-bottom))] max-lg:z-[14] max-lg:h-14! max-lg:w-auto! max-lg:rounded-[18px]! max-lg:px-5!`}
                            icon={creating ? LoaderCircle : Plus}
                            onClick={() => void newDocument()}
                            disabled={creating}
                        >
                            New document
                        </Button>
                        <nav aria-label="Library" className="min-w-0">
                            <ul className="m-0 flex list-none flex-col gap-1 p-0 max-lg:relative max-lg:w-full max-lg:[scrollbar-width:none] max-lg:flex-row max-lg:gap-2 max-lg:overflow-x-auto max-lg:[&::-webkit-scrollbar]:hidden">
                                {FILTERS.map(([value, label, Icon]) => {
                                    const current = filter === value;
                                    const count = counts.data?.[value];
                                    return (
                                        <li
                                            key={value}
                                            className="shrink-0 max-lg:flex-auto"
                                        >
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
                                                className={`h-[50px]! min-h-[50px]! w-full! justify-start! gap-3.5! rounded-xl! border-0! px-4! text-[15px]! shadow-none! max-lg:h-11! max-lg:min-h-11! max-lg:justify-center! max-lg:gap-2! max-lg:px-3! max-lg:text-[13.5px]! max-lg:whitespace-nowrap max-md:px-2.5! max-md:text-[13px]! ${
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
                                                <span className="flex-1 text-left max-lg:flex-none">
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
                                {/* Phones and tablets: a button that opens the week in a bottom sheet. */}
                                <li className="shrink-0 max-lg:flex-auto lg:hidden [&>button]:max-lg:w-full [&>button]:max-lg:justify-center">
                                    <WritingWeekPill />
                                </li>
                            </ul>
                        </nav>
                        <div className="border-line border-t pt-7 max-lg:hidden">
                            <WritingWeek />
                        </div>
                    </aside>

                    <main className="min-w-0 px-10 pt-11 pb-24 max-lg:px-6 max-lg:pt-6 max-md:px-4">
                        <LegacyImport onImported={refresh} />
                        <WelcomeBack />
                        <div className="mb-9 flex flex-wrap items-end justify-between gap-x-6 gap-y-4 max-md:mb-6">
                            <div className="min-w-0">
                                <h1 className="m-0 font-serif text-[52px] leading-[1.05] font-normal tracking-[-0.03em] max-lg:text-[32px] max-md:text-[28px]">
                                    {searching
                                        ? "Search results"
                                        : filter === "all"
                                          ? "Documents"
                                          : filter === "archived"
                                            ? "Archived"
                                            : FILTERS.find(
                                                  ([f]) => f === filter,
                                              )![1]}
                                </h1>
                                {searching && (
                                    <p
                                        className="text-muted m-0 mt-2 text-[16px] max-md:text-[14px] max-md:leading-relaxed"
                                        role="status"
                                        aria-live="polite"
                                    >
                                        {list.isPending
                                            ? "Loading…"
                                            : `${total} ${total === 1 ? "result" : "results"} for “${query}”`}
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
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                {!!items.length && (
                                    <div
                                        role="radiogroup"
                                        aria-label="Layout"
                                        className="border-line bg-surface flex shrink-0 gap-1 rounded-xl border p-1"
                                    >
                                        {(
                                            [
                                                [
                                                    "cards",
                                                    LayoutGrid,
                                                    "Card view",
                                                ],
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
                                                className={`size-11! min-h-11! min-w-11! rounded-lg! border-0! p-0! shadow-none! ${
                                                    view === value
                                                        ? "bg-tint! text-ink!"
                                                        : "text-muted! bg-transparent! hover:bg-[var(--control-hover)]!"
                                                }`}
                                            >
                                                <Icon
                                                    size={19}
                                                    strokeWidth={1.6}
                                                />
                                            </button>
                                        ))}
                                    </div>
                                )}
                                {/* Archived documents are kept out of the filters above and reached from here. */}
                                <ActionMenu
                                    label="More views"
                                    menuLabel="More views"
                                    menuWidth={208}
                                    triggerClassName="pointer-events-auto! h-[54px]! min-h-[54px]! w-11! min-w-11! rounded-xl! border! border-[var(--border)]! bg-[var(--surface)]! p-0! text-[var(--muted)]! opacity-100! shadow-none! hover:bg-[var(--control-hover)]! hover:text-[var(--text)]! focus-visible:[box-shadow:0_0_0_2px_var(--control-ring)]!"
                                    trigger={
                                        <MoreHorizontal
                                            size={19}
                                            strokeWidth={1.6}
                                        />
                                    }
                                    items={
                                        filter === "archived"
                                            ? [
                                                  {
                                                      label: "Back to all documents",
                                                      onSelect: () =>
                                                          setParams({
                                                              filter: null,
                                                          }),
                                                  },
                                              ]
                                            : [
                                                  {
                                                      label: counts.data
                                                          ?.archived
                                                          ? `Archived (${counts.data.archived})`
                                                          : "Archived",
                                                      onSelect: () =>
                                                          setParams({
                                                              filter: "archived",
                                                          }),
                                                  },
                                              ]
                                    }
                                />
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
                                inlineHeader={!searching && filter !== "all"}
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
                                        <Button
                                            className={`${PRIMARY_BUTTON} h-10! gap-2! rounded-lg! px-4! text-[13px]! font-medium`}
                                            icon={
                                                creating ? LoaderCircle : Plus
                                            }
                                            onClick={() => void newDocument()}
                                            disabled={creating}
                                        >
                                            New document
                                        </Button>
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
                                    className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4 p-0 max-md:grid-cols-2 max-md:gap-3"
                                >
                                    {items.map((doc) => (
                                        <li
                                            key={doc.id}
                                            className="group relative flex min-w-0 flex-col"
                                        >
                                            <TitleTooltip title={doc.title}>
                                                <Link
                                                    href={`/d/${doc.id}`}
                                                    className={`border-line bg-surface text-ink flex flex-1 flex-col overflow-hidden rounded-xl border no-underline transition-colors group-hover:border-[var(--control-focus)] ${FOCUS_RING}`}
                                                >
                                                    {/* The top of the card is the page itself, like Google Docs: the opening text sits directly in it, and an empty document leaves it blank. */}
                                                    <span
                                                        aria-hidden="true"
                                                        className="border-line relative block aspect-[5/4] shrink-0 overflow-hidden border-b"
                                                    >
                                                        <span className="absolute inset-0 overflow-hidden [mask-image:linear-gradient(to_bottom,#000_65%,transparent)] px-4 pt-3.5 font-serif text-[9px] leading-[1.55] break-words text-[color-mix(in_srgb,var(--text)_72%,transparent)] max-md:px-3 max-md:pt-3 md:text-[10px]">
                                                            {doc.excerpt && (
                                                                <Highlighted
                                                                    text={
                                                                        doc.excerpt
                                                                    }
                                                                    terms={
                                                                        terms
                                                                    }
                                                                />
                                                            )}
                                                        </span>
                                                    </span>
                                                    <span className="flex min-w-0 flex-col gap-0.5 py-3 pr-12 pl-4 max-md:pr-10 max-md:pl-3">
                                                        <span className="flex min-w-0 items-center gap-2">
                                                            <DocIcon />
                                                            <span className="truncate font-serif text-[16px] leading-6">
                                                                <Highlighted
                                                                    text={
                                                                        doc.title ||
                                                                        "Untitled"
                                                                    }
                                                                    terms={
                                                                        terms
                                                                    }
                                                                />
                                                            </span>
                                                            {doc.pinned && (
                                                                <PinnedIndicator />
                                                            )}
                                                        </span>
                                                        <EditedTime
                                                            date={doc.updated}
                                                            className="text-[12.5px] leading-5"
                                                        >
                                                            {formatEdited(
                                                                doc.updated,
                                                            )}
                                                        </EditedTime>
                                                    </span>
                                                </Link>
                                            </TitleTooltip>
                                            <div className="absolute right-1 bottom-1.5">
                                                <ActionMenu
                                                    label={`Document actions: ${doc.title || "Untitled"}`}
                                                    menuLabel={`Actions for ${doc.title || "Untitled"}`}
                                                    // Wide enough for "Export as Word (.docx)" on one line.
                                                    menuWidth={208}
                                                    triggerClassName="pointer-events-auto! size-10! min-h-10! min-w-10! max-lg:size-11! max-lg:min-h-11! max-lg:min-w-11! rounded-full! text-[var(--muted)]! opacity-100! hover:text-[var(--text)]!"
                                                    items={menuFor(doc)}
                                                    sheetTitle={
                                                        doc.title ||
                                                        "Untitled document"
                                                    }
                                                    trigger={
                                                        <MoreVertical
                                                            size={16}
                                                            strokeWidth={1.6}
                                                        />
                                                    }
                                                />
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div>
                                    <div
                                        aria-hidden="true"
                                        className="border-line text-muted grid grid-cols-[28px_minmax(0,1fr)_minmax(120px,200px)_40px] gap-6 border-b px-3 pb-2.5 text-[12.5px] font-medium max-md:hidden"
                                    >
                                        <span />
                                        <span>Title</span>
                                        <span>Last edited</span>
                                    </div>
                                    <ul
                                        aria-label="Documents"
                                        className="border-line m-0 list-none p-0 max-md:border-t"
                                    >
                                        {items.map((doc) => (
                                            <li
                                                key={doc.id}
                                                className="group border-line relative min-w-0 border-b"
                                            >
                                                <TitleTooltip title={doc.title}>
                                                    <Link
                                                        href={`/d/${doc.id}`}
                                                        className={`text-ink grid min-h-14 grid-cols-[28px_minmax(0,1fr)_minmax(120px,200px)] items-center gap-x-6 py-2 pr-[76px] pl-3 no-underline transition-colors hover:bg-[var(--control-hover)] max-md:grid-cols-[28px_minmax(0,1fr)] max-md:gap-x-3 max-md:gap-y-0.5 max-md:py-3 max-md:pr-14 max-md:pl-2 ${FOCUS_RING}`}
                                                    >
                                                        <span className="flex justify-center max-md:row-span-2">
                                                            <DocIcon
                                                                size={20}
                                                            />
                                                        </span>
                                                        <span className="flex min-w-0 items-center gap-2">
                                                            <span className="truncate font-serif text-[16px] leading-6">
                                                                <Highlighted
                                                                    text={
                                                                        doc.title ||
                                                                        "Untitled"
                                                                    }
                                                                    terms={
                                                                        terms
                                                                    }
                                                                />
                                                            </span>
                                                            {doc.pinned && (
                                                                <PinnedIndicator />
                                                            )}
                                                        </span>
                                                        <EditedTime
                                                            date={doc.updated}
                                                            className="text-[13px] leading-5 max-md:text-[12.5px]"
                                                        >
                                                            <span className="md:hidden">
                                                                {formatEdited(
                                                                    doc.updated,
                                                                )}
                                                            </span>
                                                            <span className="max-md:hidden">
                                                                {editedDate(
                                                                    doc.updated,
                                                                )}
                                                            </span>
                                                        </EditedTime>
                                                    </Link>
                                                </TitleTooltip>
                                                <div className="absolute inset-y-0 right-3 flex items-center max-md:right-1">
                                                    <ActionMenu
                                                        label={`Document actions: ${doc.title || "Untitled"}`}
                                                        menuLabel={`Actions for ${doc.title || "Untitled"}`}
                                                        // Wide enough for "Export as Word (.docx)" on one line.
                                                        menuWidth={208}
                                                        triggerClassName="pointer-events-auto! size-10! min-h-10! min-w-10! max-lg:size-11! max-lg:min-h-11! max-lg:min-w-11! rounded-full! text-[var(--muted)]! opacity-100! hover:text-[var(--text)]!"
                                                        items={menuFor(doc)}
                                                        sheetTitle={
                                                            doc.title ||
                                                            "Untitled document"
                                                        }
                                                        trigger={
                                                            <MoreVertical
                                                                size={16}
                                                                strokeWidth={
                                                                    1.6
                                                                }
                                                            />
                                                        }
                                                    />
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
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
                {(notice || error || exporter.error) && (
                    <div
                        role={error || exporter.error ? "alert" : "status"}
                        className="border-line bg-surface fixed bottom-6 left-1/2 z-50 flex max-w-[calc(100vw-32px)] -translate-x-1/2 items-center gap-3 rounded-lg border px-4 py-2.5 text-[13px] shadow-[0_4px_16px_color-mix(in_srgb,var(--shadow)_10%,transparent)]"
                    >
                        <span
                            className={
                                error || exporter.error ? "text-danger" : ""
                            }
                        >
                            {error || exporter.error || notice}
                        </span>
                        {(error || exporter.error) && (
                            <button
                                aria-label="Dismiss"
                                className="size-8! min-h-8! min-w-8! p-0!"
                                onClick={() => {
                                    setError("");
                                    exporter.setError("");
                                }}
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

/** The list's "Last edited" column already names the date: "Today", "3 days ago", "3 Oct". */
/** The document mark beside each title in the library, like a file icon in a file list. */
function DocIcon({ size = 17 }: { size?: number }) {
    return (
        <FileText
            aria-hidden="true"
            size={size}
            strokeWidth={1.7}
            className="text-accent shrink-0"
        />
    );
}

function PinnedIndicator() {
    return (
        <span className="text-accent inline-flex shrink-0" title="Pinned">
            <Pin size={15} strokeWidth={1.8} aria-hidden="true" />
            <span className="sr-only">Pinned</span>
        </span>
    );
}

function editedDate(date: Date) {
    const text = formatEdited(date).replace(/^Edited /, "");
    return text.charAt(0).toUpperCase() + text.slice(1);
}

function EditedTime({
    date,
    className,
    children,
}: {
    date: Date;
    className: string;
    children: React.ReactNode;
}) {
    return (
        <time
            dateTime={date.toISOString()}
            title={date.toLocaleString(undefined, {
                dateStyle: "full",
                timeStyle: "long",
            })}
            className={`text-muted truncate ${className}`}
        >
            {children}
        </time>
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
