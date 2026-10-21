"use client";
import type { Editor } from "@tiptap/core";
import { useEditorState } from "@tiptap/react";
import {
    ArrowLeft,
    Check,
    CloudOff,
    LoaderCircle,
    Redo2,
    Undo2,
} from "lucide-react";
import {
    useEffect,
    useRef,
    useState,
} from "react";
import type { ExportFormat } from "~/lib/writely/export";
import {
    ActionMenu,
    Button,
} from "../ui";
import type { SaveStatus } from "./use-autosave";

/**
 * What: The save message shown in the editor's top bar for each autosave
 * state.
 *
 * Used in:
 * - src/app/components/writely/editor-header.tsx (EditorHeader)
 *
 * Effect: Changes the words the writer sees while their document saves.
 */
const STATUS: Record<SaveStatus, string> = {
    idle: "Saved",
    saving: "Saving…",
    saved: "Saved",
    error: "Not saved",
};

/**
 * What: The look of the Undo and Redo buttons in the editor's top bar.
 *
 * Used in:
 * - src/app/components/writely/editor-header.tsx (EditorHeader)
 *
 * Effect: Changes the size of both buttons and how faded they look when
 * there is nothing to undo or redo.
 */
const HISTORY_BUTTON =
    "h-9! min-h-9! w-9! min-w-9! rounded-lg! p-0! text-muted! hover:text-ink! disabled:opacity-35!";

/**
 * The editor's slim top bar across the full width: back to the library on the left, the document
 * title (click to rename) in the middle, and the quiet save state with undo and redo on the right.
 * Every writing tool lives in the dock under the page instead.
 */
export default function EditorHeader({
    title,
    onRename,
    status,
    onBack,
    backLabel = "Documents",
    editor,
    onExport,
    exporting,
    focusMode,
    onToggleFocusMode,
    onShortcuts,
}: {
    title: string;
    onRename?: (title: string) => void;
    status: SaveStatus | null;
    onBack: () => void;
    backLabel?: string;
    editor: Editor | null;
    /** Word and PDF export for this document; left out where there's nothing saved to export. */
    onExport?: (format: ExportFormat) => void;
    exporting?: ExportFormat | null;
    focusMode: boolean;
    onToggleFocusMode: () => void;
    onShortcuts: () => void;
}) {
    const history = useEditorState({
        editor,
        selector: ({ editor }) => ({
            undo: !!editor?.can().undo(),
            redo: !!editor?.can().redo(),
        }),
    }) ?? { undo: false, redo: false };
    const [editing, setEditing] = useState(false);
    const [value, setValue] = useState(title);
    const input = useRef<HTMLInputElement>(null);
    useEffect(() => {
        if (!editing) setValue(title);
    }, [title, editing]);
    useEffect(() => {
        if (editing) input.current?.select();
    }, [editing]);
    const commit = () => {
        setEditing(false);
        const next = value.trim();
        if (next && next !== title) onRename?.(next);
    };

    return (
        <header className="editor-header bg-paper [.is-scrolled_&]:border-line relative z-[13] grid h-14 shrink-0 grid-cols-[minmax(0,1fr)_minmax(0,auto)_minmax(0,1fr)] items-center gap-3 border-b border-transparent px-4 transition-[border-color] duration-200 max-sm:gap-1 max-sm:px-2 [.focus-mode_&]:hidden">
            <div className="flex min-w-0 items-center">
                <button
                    className="text-muted hover:text-ink! h-9! min-h-9! gap-1.5! rounded-lg! px-2.5! text-[13px]!"
                    onClick={onBack}
                >
                    <ArrowLeft size={15} aria-hidden="true" />
                    <span className="max-sm:sr-only">{backLabel}</span>
                </button>
            </div>
            <div className="flex min-w-0 justify-center">
                {editing ? (
                    <input
                        ref={input}
                        aria-label="Document title"
                        value={value}
                        maxLength={120}
                        onChange={(e) => setValue(e.target.value)}
                        onBlur={commit}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") commit();
                            if (e.key === "Escape") {
                                e.stopPropagation();
                                setValue(title);
                                setEditing(false);
                            }
                        }}
                        className="min-h-9! w-[min(420px,50vw)] px-2! py-1! text-center text-[14px]! font-medium"
                    />
                ) : (
                    <button
                        className="document-title text-ink! h-9! min-h-9! max-w-full min-w-0! rounded-lg! px-2.5! text-[14px]! font-medium"
                        title={onRename ? "Rename document" : undefined}
                        disabled={!onRename}
                        onClick={() => setEditing(true)}
                    >
                        <span className="truncate">{title || "Untitled"}</span>
                    </button>
                )}
            </div>
            <div className="flex min-w-0 items-center justify-end gap-1">
                {status && (
                    <span
                        role="status"
                        title={STATUS[status]}
                        className={`save-status mr-1 flex shrink-0 items-center gap-1 text-[12px] whitespace-nowrap transition-opacity duration-300 ${status === "error" ? "text-danger" : status === "saving" ? "text-muted" : "text-muted opacity-60"}`}
                    >
                        {status === "saving" ? (
                            <LoaderCircle
                                size={12}
                                aria-hidden="true"
                                className="animate-[save-spin_900ms_linear_infinite] motion-reduce:animate-none"
                            />
                        ) : status === "error" ? (
                            <CloudOff size={12} aria-hidden="true" />
                        ) : (
                            <Check size={12} aria-hidden="true" />
                        )}
                        <span className="max-md:sr-only">{STATUS[status]}</span>
                    </span>
                )}
                <span aria-hidden="true" className="bg-line mx-1 h-4 w-px" />
                <Button
                    icon={Undo2}
                    label="Undo (Ctrl+Z)"
                    className={HISTORY_BUTTON}
                    disabled={!history.undo}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => editor?.chain().focus().undo().run()}
                />
                <Button
                    icon={Redo2}
                    label="Redo (Ctrl+Shift+Z)"
                    className={HISTORY_BUTTON}
                    disabled={!history.redo}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => editor?.chain().focus().redo().run()}
                />
                <ActionMenu
                    label="Document options"
                    menuLabel="Document options"
                    menuWidth={220}
                    triggerClassName="pointer-events-auto! opacity-100! h-9! min-h-9! w-9! min-w-9! rounded-lg! p-0! text-muted! hover:text-ink!"
                    trigger={
                        exporting ? (
                            <LoaderCircle
                                size={16}
                                aria-label="Exporting"
                                className="animate-[save-spin_900ms_linear_infinite] motion-reduce:animate-none"
                            />
                        ) : undefined
                    }
                    items={[
                        ...(onExport
                            ? [
                                  {
                                      label: "Export as Word (.docx)",
                                      onSelect: () => onExport("docx"),
                                  },
                                  {
                                      label: "Export as PDF (.pdf)",
                                      onSelect: () => onExport("pdf"),
                                  },
                              ]
                            : []),
                        {
                            label: focusMode
                                ? "Turn off focus mode"
                                : "Turn on focus mode",
                            onSelect: onToggleFocusMode,
                            separator: !!onExport,
                        },
                        {
                            label: "Keyboard shortcuts",
                            onSelect: onShortcuts,
                        },
                    ]}
                />
            </div>
        </header>
    );
}
