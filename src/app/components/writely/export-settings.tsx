"use client";
import { keepPreviousData } from "@tanstack/react-query";
import {
    FileText,
    FileType2,
    LoaderCircle,
    Pin,
    Search,
    X,
} from "lucide-react";
import {
    useEffect,
    useId,
    useState,
} from "react";
import {
    EXPORT_FORMATS,
    type ExportFormat,
} from "~/lib/writely/export";
import {
    exportOptions,
    type Preferences,
} from "~/lib/writely/preferences";
import {
    EXPORT_FONTS,
    EXPORT_PAGE_SIZES,
    FONT_FAMILIES,
} from "~/config/preferences";
import { api } from "~/trpc/react";
import { formatEdited } from "../library/library";
import { useDocumentExport } from "../use-document-export";
import {
    entries,
    Segmented,
    SettingRow,
    SettingsCard,
    Switch,
} from "./settings-controls";

/**
 * What: The icon shown next to each export format in Settings → Export.
 *
 * Used in:
 * - src/app/components/writely/export-settings.tsx (ExportSettings)
 *
 * Effect: Changes the icon for Word or PDF. Each format in EXPORT_FORMATS
 * (src/lib/writely/export/index.ts) needs an icon here.
 */
const FORMAT_ICONS = { docx: FileText, pdf: FileType2 } as const;

/**
 * Document Export: how every export is laid out, then a way to export one document. Settings has
 * no open document, so the writer picks one explicitly, then a format. Only their own documents
 * are listed or exportable.
 */
export function ExportSettings({
    preferences,
    setPreferences,
}: {
    preferences: Preferences;
    setPreferences: (changes: Partial<Preferences>) => void;
}) {
    const [input, setInput] = useState("");
    const [query, setQuery] = useState("");
    useEffect(() => {
        const t = setTimeout(() => setQuery(input.trim()), 200);
        return () => clearTimeout(t);
    }, [input]);
    const results = api.documents.recent.useQuery(
        { query },
        { placeholderData: keepPreviousData },
    );
    const docs = results.data ?? [];
    const [selected, setSelected] = useState<{
        id: string;
        title: string;
    } | null>(null);
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(0);
    const exporter = useDocumentExport();
    const listId = useId();
    const choose = (doc: { id: string; title: string }) => {
        setSelected(doc);
        setOpen(false);
        setInput("");
        exporter.setError("");
    };

    return (
        <>
            <SettingsCard>
                <SettingRow id="setting-page-size" label="Paper size">
                    <Segmented
                        labelledBy="setting-page-size"
                        value={preferences.exportPageSize}
                        options={entries(EXPORT_PAGE_SIZES).map(
                            ([value, size]) => ({ value, label: size.label }),
                        )}
                        onChange={(exportPageSize) =>
                            setPreferences({ exportPageSize })
                        }
                    />
                </SettingRow>
                <SettingRow
                    id="setting-export-font"
                    label="Font"
                    hint={
                        preferences.exportFont === "editor"
                            ? `Follows your editor font, now ${FONT_FAMILIES[preferences.fontFamily].label.toLowerCase()}.`
                            : undefined
                    }
                >
                    <Segmented
                        labelledBy="setting-export-font"
                        value={preferences.exportFont}
                        options={entries(EXPORT_FONTS).map(([value, font]) => ({
                            value,
                            label: font.label,
                        }))}
                        onChange={(exportFont) =>
                            setPreferences({ exportFont })
                        }
                    />
                </SettingRow>
                <SettingRow
                    id="setting-export-title"
                    label="Start with the title"
                    hint="Prints the document’s title above the text, unless the text already opens with it."
                >
                    <Switch
                        labelledBy="setting-export-title"
                        describedBy="setting-export-title-hint"
                        checked={preferences.exportTitle}
                        onChange={(exportTitle) =>
                            setPreferences({ exportTitle })
                        }
                    />
                </SettingRow>
            </SettingsCard>

            <SettingsCard>
                <div className="px-5 py-4">
                    <label
                        htmlFor="export-document"
                        className="mb-2 block text-[13.5px] font-medium"
                    >
                        Export a document
                    </label>
                    {selected ? (
                        <div className="border-line bg-paper flex min-h-12 items-center gap-3 rounded-xl border py-1.5 pr-1.5 pl-3.5">
                            <FileText
                                size={16}
                                strokeWidth={1.6}
                                className="text-accent shrink-0"
                                aria-hidden="true"
                            />
                            <span className="min-w-0 flex-1 truncate font-serif text-[15px]">
                                {selected.title || "Untitled"}
                            </span>
                            <button
                                type="button"
                                className="text-muted! h-9! min-h-9! gap-1.5! rounded-lg! px-2.5! text-[12.5px]!"
                                onClick={() => {
                                    setSelected(null);
                                    setOpen(true);
                                    requestAnimationFrame(() =>
                                        document
                                            .getElementById("export-document")
                                            ?.focus(),
                                    );
                                }}
                            >
                                <X size={14} aria-hidden="true" />
                                Change
                            </button>
                        </div>
                    ) : (
                        <div className="relative">
                            <Search
                                size={16}
                                strokeWidth={1.6}
                                aria-hidden="true"
                                className="text-muted pointer-events-none absolute top-[18px] left-3.5"
                            />
                            <input
                                id="export-document"
                                type="search"
                                role="combobox"
                                aria-expanded={open}
                                aria-controls={listId}
                                aria-autocomplete="list"
                                aria-activedescendant={
                                    open && docs[active]
                                        ? `${listId}-${active}`
                                        : undefined
                                }
                                autoComplete="off"
                                placeholder="Search your documents"
                                value={input}
                                onFocus={() => setOpen(true)}
                                onBlur={() =>
                                    setTimeout(() => setOpen(false), 120)
                                }
                                onChange={(e) => {
                                    setInput(e.target.value);
                                    setActive(0);
                                    setOpen(true);
                                }}
                                onKeyDown={(e) => {
                                    if (
                                        e.key === "ArrowDown" ||
                                        e.key === "ArrowUp"
                                    ) {
                                        e.preventDefault();
                                        setOpen(true);
                                        const step =
                                            e.key === "ArrowDown" ? 1 : -1;
                                        setActive(
                                            (i) =>
                                                (i + step + docs.length) %
                                                Math.max(1, docs.length),
                                        );
                                    }
                                    if (
                                        e.key === "Enter" &&
                                        open &&
                                        docs[active]
                                    ) {
                                        e.preventDefault();
                                        choose(docs[active]);
                                    }
                                    if (e.key === "Escape") setOpen(false);
                                }}
                                className="min-h-12! rounded-xl! pl-10! text-[14px]! [&::-webkit-search-cancel-button]:hidden"
                            />
                            {open && (
                                <ul
                                    id={listId}
                                    role="listbox"
                                    aria-label="Your documents"
                                    className="border-line bg-surface absolute top-[calc(100%+6px)] right-0 left-0 z-20 m-0 max-h-[280px] list-none overflow-y-auto rounded-xl border p-1 [box-shadow:0_14px_36px_-14px_color-mix(in_srgb,var(--shadow)_30%,transparent)]"
                                >
                                    {results.isPending ? (
                                        <li className="text-muted px-3 py-2.5 text-[13px]">
                                            Loading…
                                        </li>
                                    ) : results.isError ? (
                                        <li className="text-danger px-3 py-2.5 text-[13px]">
                                            Couldn’t load your documents.
                                        </li>
                                    ) : !docs.length ? (
                                        <li className="text-muted px-3 py-2.5 text-[13px]">
                                            {query
                                                ? "No titles match."
                                                : "You don’t have any documents yet."}
                                        </li>
                                    ) : (
                                        docs.map((doc, i) => (
                                            <li
                                                key={doc.id}
                                                id={`${listId}-${i}`}
                                                role="option"
                                                aria-selected={i === active}
                                                onMouseEnter={() =>
                                                    setActive(i)
                                                }
                                                onMouseDown={(e) => {
                                                    e.preventDefault();
                                                    choose(doc);
                                                }}
                                                className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 ${i === active ? "bg-[var(--control-hover)]" : ""}`}
                                            >
                                                <span className="min-w-0 flex-1 truncate font-serif text-[14.5px]">
                                                    {doc.title || "Untitled"}
                                                </span>
                                                {doc.pinned && (
                                                    <Pin
                                                        size={12}
                                                        className="text-muted shrink-0"
                                                        aria-label="Pinned"
                                                    />
                                                )}
                                                <span className="text-muted shrink-0 text-[11.5px]">
                                                    {formatEdited(
                                                        new Date(doc.updated),
                                                    )}
                                                </span>
                                            </li>
                                        ))
                                    )}
                                </ul>
                            )}
                        </div>
                    )}
                    {!selected && (
                        <p className="text-muted mt-2 text-[12px]">
                            Choose a document to export. You can also export
                            from a document’s ⋯ menu while writing.
                        </p>
                    )}
                </div>

                {(Object.keys(EXPORT_FORMATS) as ExportFormat[]).map(
                    (format) => {
                        const info = EXPORT_FORMATS[format];
                        const Icon = FORMAT_ICONS[format];
                        const busy = exporter.exporting === format;
                        return (
                            <div
                                key={format}
                                className="flex items-center gap-3.5 px-5 py-4 max-sm:flex-wrap"
                            >
                                <span
                                    aria-hidden="true"
                                    className="bg-tint text-accent flex size-9 shrink-0 items-center justify-center rounded-lg"
                                >
                                    <Icon size={18} strokeWidth={1.6} />
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block text-[13.5px] font-medium">
                                        {info.label}{" "}
                                        <span className="text-muted font-normal">
                                            ({info.extension})
                                        </span>
                                    </span>
                                    <span className="text-muted block text-[12.5px]">
                                        {info.description}
                                    </span>
                                </span>
                                <button
                                    type="button"
                                    className="border-line! h-9! min-h-9! shrink-0 gap-1.5! rounded-lg! border! px-3.5! text-[12.5px]! disabled:opacity-50! max-sm:w-full!"
                                    disabled={!selected || !!exporter.exporting}
                                    aria-label={`Export as ${info.label} (${info.extension})`}
                                    onClick={() =>
                                        selected &&
                                        void exporter.run(
                                            selected.id,
                                            format,
                                            exportOptions(preferences),
                                        )
                                    }
                                >
                                    {busy && (
                                        <LoaderCircle
                                            size={14}
                                            aria-hidden="true"
                                            className="animate-[save-spin_900ms_linear_infinite] motion-reduce:animate-none"
                                        />
                                    )}
                                    {busy
                                        ? "Exporting…"
                                        : `Export ${info.extension}`}
                                </button>
                            </div>
                        );
                    },
                )}
            </SettingsCard>
            {exporter.error && (
                <p role="alert" className="text-danger -mt-2 text-[13px]">
                    {exporter.error}
                </p>
            )}
        </>
    );
}
