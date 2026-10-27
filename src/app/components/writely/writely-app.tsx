"use client";
import * as Tooltip from "@radix-ui/react-tooltip";
import {
    EditorContent,
    useEditor,
    type Editor,
} from "@tiptap/react";
import { useRouter } from "next/navigation";
import {
    ChartNoAxesColumnIncreasing,
    Check,
    CheckCheck,
    ChevronDown,
    ChevronRight,
    ChevronUp,
    Globe,
    Eye,
    EyeOff,
    History,
    ListChecks,
    Palette,
    Pencil,
    Plus,
    Save,
    StickyNote,
    Target,
    Trash2,
    X,
} from "lucide-react";
import {
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
    type FormEvent,
    type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
    remapConnectors,
    remapSelection,
    selectionTarget,
    type SelectionSnapshot,
} from "~/lib/writely/annotation-model";
import {
    CardHighlights,
    setCardHighlights,
} from "~/lib/writely/editor/card-highlights";
import { ActiveBlocks } from "~/lib/writely/editor/active-blocks";
import { EmptyDraftPlaceholder } from "~/lib/writely/editor/empty-draft-placeholder";
import { documentExtensions } from "~/lib/writely/editor/document-extensions";
import { EDITOR_TEXT_CLASS } from "~/config/editor";
import EditorToolbar from "./editor-toolbar";
import DraftTitle from "./draft-title";
import FocusExit from "./focus-exit";
import { useFlowAnchor } from "~/lib/writely/editor/flow-anchor";
import {
    restoreDraft,
    snapshot,
    startRevision,
    uid,
} from "~/lib/writely/model";
import {
    completeRevision,
    universalChecks,
} from "~/lib/writely/revision-model";
import type {
    Card,
    Check as RevisionCheck,
    Draft,
    WorkspaceData,
    WritingDocument,
} from "~/lib/writely/types";
import { getWritingStatistics } from "~/lib/writely/writing-statistics";
import Annotations from "./annotations";
import { CardColourPopover } from "./card-colours";
import { addThought } from "~/lib/writely/thought-cards";
import Comparison, { type ComparisonState } from "./comparison";
import type { AccountUser } from "../app-header";
import { usePreferences } from "../preferences";
import {
    editorStyle,
    exportOptions,
    type Preferences,
} from "~/lib/writely/preferences";
import { EmptyState } from "../empty-state";
import { useDocumentExport } from "../use-document-export";
import EditorHeader from "./editor-header";
import { CompactCards } from "./compact-cards";
import { useCompactLayout } from "./use-compact-layout";
import { ShortcutsDialog } from "./shortcuts";
import {
    ActionMenu,
    Button,
} from "../ui";
import {
    DANGER_BUTTON,
    DIALOG_ACTIONS,
    DIALOG_CLASS,
    DIALOG_HEADING,
    OVERLAY_CLASS,
    PRIMARY_BUTTON,
} from "~/config/ui";
import {
    DockButton,
    DockDivider,
    Drawer,
} from "./dock";
import {
    readUnsavedWorkspace,
    useAutosave,
} from "./use-autosave";

type Modal = "draft-delete" | "save" | "revision-goal" | "restore";
type Panel = "thoughts" | "checklist" | "drafts" | "stats";
/**
 * What: An empty list of cards, shared so it is the same list every time.
 *
 * Used in:
 * - src/app/components/writely/writely-app.tsx (WritelyApp, when cards are hidden)
 *
 * Effect: Nothing to tune. Using a fresh empty list each time would make the
 * cards layer redraw more often.
 */
const EMPTY_CARDS: Card[] = [];

/** What the tutorial coach can see and steer while it guides someone through the real editor. */
export type CoachContext = {
    doc: WritingDocument;
    editor: Editor | null;
    comparing: boolean;
    closeComparison: () => void;
    /** Lets the tutorial play the revision loop itself, through the same state the controls use. */
    demo: {
        /** Puts the sample back as it started, with the tools showing. */
        reset: () => void;
        /** Adds a card level with document position `near` and returns its id. */
        addCard: (near: number) => string;
        patchCard: (id: string, patch: Partial<Card>) => void;
        /** Fills in the open "Add revision goal" dialog. */
        setGoalText: (text: string) => void;
        closePanel: () => void;
    };
};

export default function WritelyApp({
    initialWorkspace,
    user,
    preferences: initialPreferences,
    tutorial,
}: {
    initialWorkspace: WorkspaceData;
    user: AccountUser;
    preferences: Preferences;
    /** Runs the editor as an isolated sandbox: saved only in this browser, no documents sidebar. */
    tutorial?: {
        storageKey: string;
        initial: WorkspaceData;
        coach: (context: CoachContext) => ReactNode;
        onExit: () => void;
    };
}) {
    const router = useRouter();
    const compact = useCompactLayout();
    const [data, setData] = useState<WorkspaceData>(
        () =>
            tutorial?.initial ??
            readUnsavedWorkspace(user.id, initialWorkspace.active) ??
            initialWorkspace,
    );
    // The tutorial is a sandbox: its preference changes last only while it runs.
    const [account, setAccountPreferences] = usePreferences(initialPreferences);
    const [sandbox, setSandbox] = useState<Partial<Preferences>>({});
    const preferences = tutorial ? { ...account, ...sandbox } : account;
    const setPreferences = (changes: Partial<Preferences>) =>
        tutorial
            ? setSandbox((current) => ({ ...current, ...changes }))
            : setAccountPreferences(changes);
    const toolsOpen = preferences.toolsOpen;
    const setToolsOpen = (open: boolean) => setPreferences({ toolsOpen: open });
    const [shortcutsOpen, setShortcutsOpen] = useState(false);
    // The thought whose colour popover is open in the Thoughts drawer, and the button it hangs from.
    const [colouring, setColouring] = useState<{
        id: string;
        anchor: HTMLElement;
    } | null>(null);
    const doc = data.docs.find((d) => d.id === data.active) ?? data.docs[0]!;
    const [panel, setPanel] = useState<Panel | null>(null),
        [modal, setModal] = useState<Modal | null>(null),
        [draftName, setDraftName] = useState(""),
        [selected, setSelected] = useState<string | null>(null),
        [comparison, setComparison] = useState<ComparisonState | null>(null),
        [notice, setNotice] = useState(""),
        [rename, setRename] = useState<string | null>(null);
    const [draftToDelete, setDraftToDelete] = useState<{
        documentId: string;
        id: string;
    } | null>(null);
    const [editingCard, setEditingCard] = useState<string | null>(null);
    const [connectionSelection, setConnectionSelection] =
        useState<SelectionSnapshot | null>(null);
    useEffect(() => {
        setConnectionSelection(null);
        setEditingCard(null);
    }, [doc.id]);
    const [revisionGoalText, setRevisionGoalText] = useState(""),
        [revisionGoalEdit, setRevisionGoalEdit] = useState<string | null>(null);
    const openRevisionGoal = () => {
        setRevisionGoalEdit(null);
        setRevisionGoalText("");
        setModal("revision-goal");
    };
    const saveRevisionGoal = (e: FormEvent) => {
        e.preventDefault();
        const text = revisionGoalText.trim();
        if (!text) return;
        update((d) => ({
            checks: revisionGoalEdit
                ? d.checks.map((c) =>
                      c.id === revisionGoalEdit ? { ...c, text } : c,
                  )
                : [...d.checks, { id: uid(), text, done: false }],
            session:
                d.session?.checkId === revisionGoalEdit
                    ? { ...d.session, goal: text }
                    : d.session,
        }));
        setModal(null);
    };

    // The dock's height decides where drawers and the page's bottom space begin.
    const dock = useRef<HTMLElement>(null);
    useEffect(() => {
        const el = dock.current;
        if (!el) return;
        const sync = () =>
            document.documentElement.style.setProperty(
                "--dock-height",
                `${el.offsetHeight}px`,
            );
        sync();
        const observer = new ResizeObserver(sync);
        observer.observe(el);
        return () => observer.disconnect();
    });
    const workspace = useRef<HTMLElement>(null),
        dialog = useRef<HTMLElement>(null),
        priorFocus = useRef<Element | null>(null);
    const autosave = useAutosave(data, tutorial?.initial ?? initialWorkspace, {
        userId: user.id,
        local: tutorial?.storageKey,
    });
    // Leaving the editor saves first; an unconfirmed save stays in this browser and is retried.
    const leaveTo = async (href: string) => {
        await autosave.flush().catch(() => false);
        router.push(href);
    };
    // Export reads the saved copy, so pending edits are saved first; a failed save stops the export.
    const exporter = useDocumentExport();
    const exportDocument = (format: "docx" | "pdf") =>
        void exporter.run(doc.id, format, exportOptions(preferences), () =>
            autosave.flush().catch(() => false),
        );
    const update = (
        patch:
            | Partial<WritingDocument>
            | ((doc: WritingDocument) => Partial<WritingDocument>),
    ) =>
        setData((s) => ({
            ...s,
            docs: s.docs.map((d) =>
                d.id === s.active
                    ? {
                          ...d,
                          ...(typeof patch === "function" ? patch(d) : patch),
                          updated: Date.now(),
                      }
                    : d,
            ),
        }));
    const editor = useEditor(
        {
            // WritelyLoader mounts this DOM-based editor exclusively on the client.
            immediatelyRender: true,
            extensions: [
                ...documentExtensions({
                    smartPunctuation: preferences.smartPunctuation,
                }),
                // Marks the blocks holding the caret, which paragraph highlighting keeps bright.
                ActiveBlocks,
                CardHighlights,
                EmptyDraftPlaceholder,
            ],
            content: doc.html,
            editorProps: {
                attributes: {
                    class: EDITOR_TEXT_CLASS,
                    "aria-label": "Document text",
                    role: "textbox",
                    "aria-multiline": "true",
                },
                handleDOMEvents: {
                    focus: () => {
                        setSelected(null);
                        return false;
                    },
                },
            },
            onUpdate: ({ editor, transaction }) => {
                const html = editor.getHTML(),
                    nextDoc = transaction.doc;
                setConnectionSelection((selection) =>
                    remapSelection(selection, transaction.mapping, nextDoc),
                );
                update((d) => ({
                    html,
                    cards: remapConnectors(
                        d.cards,
                        transaction.mapping,
                        nextDoc,
                    ),
                }));
            },
        },
        // Smart punctuation is part of the editor's input rules, so changing it starts a new editor.
        [doc.id, preferences.smartPunctuation],
    );
    // A blank page is ready for typing as soon as it opens.
    useEffect(() => {
        if (
            editor &&
            !editor.isDestroyed &&
            !editor.state.doc.textContent.trim()
        )
            requestAnimationFrame(() => editor.commands.focus("end"));
    }, [editor]);
    // Focus mode hides everything but the text. It lasts for this visit only and only changes how
    // the page looks: cards, panels and their state stay mounted underneath.
    const [focusMode, setFocusMode] = useState(false);
    // Where the caret sat on screen before focus mode changed, so the text stays put around it.
    const caretTop = useRef<number | null>(null);
    const toggleFocusMode = () => {
        caretTop.current =
            editor && !editor.isDestroyed
                ? editor.view.coordsAtPos(editor.state.selection.head).top
                : null;
        if (!focusMode) {
            setPanel(null);
            setComparison(null);
        }
        setFocusMode(!focusMode);
        setNotice(
            focusMode
                ? "Focus mode is off."
                : "Focus mode is on. Press Escape to leave.",
        );
    };
    useLayoutEffect(() => {
        const before = caretTop.current;
        caretTop.current = null;
        if (before === null || !editor || editor.isDestroyed) return;
        const el = workspace.current;
        if (el)
            el.scrollTop +=
                editor.view.coordsAtPos(editor.state.selection.head).top -
                before;
        // The ⋯ menu or the exit control may have held focus; writing carries on where it was.
        if (!editor.isFocused)
            editor.commands.focus(null, { scrollIntoView: false });
    }, [focusMode, editor]);
    useFlowAnchor(
        editor,
        workspace,
        !comparison && !modal && !panel,
        preferences.typewriter ? "centred" : "gentle",
    );
    useEffect(() => {
        setSelected(null);
        setComparison(null);
    }, [doc.id]);
    useEffect(() => {
        const el = workspace.current;
        if (!el) return;
        const sync = () =>
            el.parentElement?.parentElement?.classList.toggle(
                "is-scrolled",
                el.scrollTop > 2,
            );
        el.addEventListener("scroll", sync, { passive: true });
        return () => el.removeEventListener("scroll", sync);
    }, []);
    useEffect(() => {
        if (!notice) return;
        const t = setTimeout(() => setNotice(""), 3500);
        return () => clearTimeout(t);
    }, [notice]);
    useEffect(() => {
        if (modal) {
            priorFocus.current = document.activeElement;
            requestAnimationFrame(() =>
                dialog.current
                    ?.querySelector<HTMLElement>(
                        "#document-name,#delete-confirmation,input,button",
                    )
                    ?.focus(),
            );
        } else (priorFocus.current as HTMLElement | null)?.focus?.();
    }, [modal]);
    const saveOpen = () => {
        setDraftName(
            doc.session?.goal ||
                `Draft ${doc.drafts.filter((d) => !d.name.startsWith("Before")).length + 1}`,
        );
        setRename(null);
        setModal("save");
    };
    const finish = () => {
        if (!doc.session) return;
        update(completeRevision);
        setComparison(null);
        setPanel("checklist");
        setNotice("Revision finished. Your working text is autosaved.");
    };
    const addCard = () => {
        const id = uid();
        const y = Math.max(64, (workspace.current?.scrollTop ?? 0) + 96);
        setData((data) => {
            const next = addThought(data, id, y);
            const target =
                compact && editor
                    ? selectionTarget(editor.state.doc, connectionSelection)
                    : null;
            if (target) {
                const card = next.docs
                    .find((d) => d.id === next.active)
                    ?.cards.find((c) => c.id === id);
                if (card) card.connectors = [{ id: uid(), target }];
            }
            return next;
        });
        if (compact) setConnectionSelection(null);
        setSelected(id);
        setEditingCard(id);
        setPanel(compact ? "thoughts" : null);
        setModal(null);
    };
    const deleteCard = (id: string) => {
        update((doc) => ({
            cards: doc.cards.filter((card) => card.id !== id),
        }));
        if (selected === id) setSelected(null);
        if (editingCard === id) setEditingCard(null);
    };
    const begin = (c: RevisionCheck) => {
        if (doc.session) {
            setNotice(
                "Finish your current revision before choosing another goal.",
            );
            return;
        }
        update((d) => startRevision(d, c));
        setPanel(null);
        setNotice("Baseline preserved. You’re editing a working draft.");
        editor?.commands.focus();
    };
    useEffect(() => {
        const key = (e: KeyboardEvent) => {
            if (e.defaultPrevented) return;
            const mod = e.metaKey || e.ctrlKey;
            if (mod && e.shiftKey && e.key.toLowerCase() === "f") {
                e.preventDefault();
                toggleFocusMode();
                return;
            }
            if (mod && (e.key === "/" || e.code === "Slash")) {
                e.preventDefault();
                setShortcutsOpen((open) => !open);
                return;
            }
            if (mod && e.key.toLowerCase() === "s") {
                e.preventDefault();
                saveOpen();
            }
            if (e.key === "Escape") {
                setConnectionSelection(null);
                setModal(null);
                setSelected(null);
                if (comparison) setComparison(null);
            }
        };
        window.addEventListener("keydown", key);
        return () => window.removeEventListener("keydown", key);
    });
    // Escape leaves focus mode. It is caught before the editor, which would otherwise use it to
    // select the whole paragraph; open dialogs keep their own Escape.
    useEffect(() => {
        if (!focusMode || modal || shortcutsOpen) return;
        const escape = (e: KeyboardEvent) => {
            if (e.key !== "Escape" || e.isComposing) return;
            e.preventDefault();
            e.stopPropagation();
            toggleFocusMode();
        };
        window.addEventListener("keydown", escape, true);
        return () => window.removeEventListener("keydown", escape, true);
    });
    const patchCard = (id: string, patch: Partial<Card>) =>
        update((d) => ({
            cards: d.cards.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        }));
    const statistics = useMemo(
        () => getWritingStatistics(doc.html),
        [doc.html],
    );
    const doRestore = (d: Draft) => {
        update((current) => restoreDraft(current, d));
        editor?.commands.setContent(d.html, { emitUpdate: false });
        setComparison(null);
        setNotice("Draft restored. Your previous text was preserved first.");
    };
    const targetDraft = data.docs
        .find((d) => d.id === draftToDelete?.documentId)
        ?.drafts.find((d) => d.id === draftToDelete?.id);
    const deleteDraft = () => {
        if (!draftToDelete || !targetDraft) return;
        setData((current) => ({
            ...current,
            docs: current.docs.map((d) =>
                d.id === draftToDelete.documentId
                    ? {
                          ...d,
                          drafts: d.drafts.filter(
                              (draft) => draft.id !== draftToDelete.id,
                          ),
                          updated: Date.now(),
                      }
                    : d,
            ),
        }));
        if (
            doc.id === draftToDelete.documentId &&
            (comparison?.left === draftToDelete.id ||
                comparison?.right === draftToDelete.id)
        )
            setComparison(null);
        setModal(null);
        setDraftToDelete(null);
        setNotice("Draft permanently deleted.");
        requestAnimationFrame(() =>
            document.querySelector<HTMLButtonElement>(".draft-save")?.focus(),
        );
    };
    const saveDraft = (e: FormEvent) => {
        e.preventDefault();
        if (rename) {
            update((d) => ({
                drafts: d.drafts.map((v) =>
                    v.id === rename ? { ...v, name: draftName.trim() } : v,
                ),
            }));
        } else {
            const d = snapshot(doc, draftName.trim(), {
                goal: doc.session?.goal,
                baseline: doc.session?.baseline || doc.drafts.at(-1)?.id,
            });
            update((v) => ({ drafts: [...v.drafts, d] }));
            if (d.baseline) setComparison({ left: d.baseline, right: d.id });
            setNotice("Named draft saved. Revision remains open.");
        }
        setModal(null);
    };
    const cardCount = doc.cards.length;
    const allChecks: (RevisionCheck & { universalId?: string })[] = [
        ...universalChecks(data, doc),
        ...doc.checks,
    ];
    const doneCount = allChecks.filter((c) => c.done).length;
    const toggle = (next: Panel) => setPanel(panel === next ? null : next);
    // Picking a thought in the list brings its card back onto the page and scrolls to it.
    const revealCard = (card: Card) => {
        if (compact) {
            setPanel(null);
            setEditingCard(null);
            setSelected(card.id);
            const target = card.connectors?.[0]?.target;
            if (editor && target && !target.orphaned) {
                const position = target.kind === "essay" ? 0 : target.from;
                if (
                    position !== undefined &&
                    position <= editor.state.doc.content.size
                ) {
                    requestAnimationFrame(() => {
                        if (editor.isDestroyed || !workspace.current) return;
                        const top = editor.view.coordsAtPos(position).top;
                        const bounds =
                            workspace.current.getBoundingClientRect();
                        workspace.current.scrollTo({
                            top: Math.max(
                                0,
                                workspace.current.scrollTop +
                                    top -
                                    bounds.top -
                                    72,
                            ),
                            behavior: "auto",
                        });
                    });
                }
            }
            return;
        }
        if (doc.hidden) update({ hidden: false });
        setPanel(null);
        setSelected(card.id);
        const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)")
            .matches;
        requestAnimationFrame(() =>
            workspace.current?.scrollTo({
                top: Math.max(0, (card.y ?? 0) - 160),
                behavior: smooth ? "smooth" : "auto",
            }),
        );
    };

    useEffect(() => {
        if (!compact) return;
        setCardHighlights(
            editor,
            selected ? doc.cards.filter((card) => card.id === selected) : [],
            selected,
        );
        return () => setCardHighlights(editor);
    }, [compact, editor, doc.cards, selected]);

    const attachCompactCard = (card: Card) => {
        const target =
            editor && selectionTarget(editor.state.doc, connectionSelection);
        if (!target) {
            setConnectionSelection(null);
            setNotice("Select words in the document to attach a card.");
            return;
        }
        const attached = { ...card, connectors: [{ id: uid(), target }] };
        patchCard(card.id, { connectors: attached.connectors });
        setConnectionSelection(null);
        revealCard(attached);
    };

    return (
        <Tooltip.Provider delayDuration={450}>
            <div
                style={editorStyle(preferences)}
                spellCheck={preferences.spellcheck ? undefined : false}
                className={`app bg-paper relative flex h-dvh flex-col overflow-hidden ${panel ? "tool-panel-visible" : ""} ${comparison ? "comparison-mode" : ""} ${focusMode ? "focus-mode" : ""} ${focusMode && preferences.paragraphHighlight ? "paragraph-highlight" : ""}`}
            >
                {focusMode && <FocusExit onExit={toggleFocusMode} />}
                <div
                    className={`writing-view flex min-h-0 flex-1 flex-col ${doc.session ? "has-revision-session" : ""}`}
                >
                    <EditorHeader
                        editor={editor}
                        onExport={tutorial ? undefined : exportDocument}
                        exporting={exporter.exporting}
                        focusMode={focusMode}
                        onToggleFocusMode={toggleFocusMode}
                        onShortcuts={() => setShortcutsOpen(true)}
                        compact={compact}
                        onCards={() => {
                            setEditingCard(null);
                            setPanel("thoughts");
                        }}
                        onRetrySave={autosave.retry}
                        onDrafts={() => toggle("drafts")}
                        onGoals={() => toggle("checklist")}
                        title={doc.title}
                        onRename={(title) => update({ title })}
                        status={tutorial ? null : autosave.status}
                        onBack={() =>
                            tutorial ? tutorial.onExit() : void leaveTo("/")
                        }
                        backLabel={tutorial ? "Exit tutorial" : "Documents"}
                    />
                    <div className="workspace-shell relative flex min-h-0 flex-1">
                        <main
                            className={`workspace relative min-w-0 flex-1 overflow-auto [scroll-behavior:auto] [overflow-anchor:none] [&:has(.annotation-layer)]:overflow-x-hidden [.focus-mode_&_.annotation-layer]:invisible ${comparison ? "comparison-workspace overflow-hidden" : ""}`}
                            ref={workspace}
                        >
                            {comparison ? (
                                <Comparison
                                    doc={doc}
                                    comparison={comparison}
                                    setComparison={setComparison}
                                    onRestore={(draft) => {
                                        // Restoring replaces the text, so it asks first, as from Drafts.
                                        setRename(draft.id);
                                        setModal("restore");
                                    }}
                                />
                            ) : (
                                <article className="paper relative mx-auto w-[calc(100%-384px)] max-w-[var(--editor-width)] pt-14 pb-[calc(48px+var(--flow-bottom-space,50vh))] max-[1119px]:w-[calc(100%-128px)] max-[1000px]:w-[calc(100%-96px)] max-[760px]:w-[calc(100%-40px)] max-[760px]:pt-8 [&:has(.blank-start)_.tiptap]:[min-height:0] min-[761px]:[.focus-mode_&]:w-[calc(100%-96px)] min-[761px]:[.focus-mode_&]:pt-[12vh] [.focus-mode_&_.card-text-highlight]:bg-transparent! [.focus-mode_&_:is(.blank-start,.endmark)]:hidden">
                                    {editor && (
                                        <EditorToolbar
                                            key={doc.id}
                                            editor={editor}
                                            connecting={!!connectionSelection}
                                            onConnect={() => {
                                                const { from, to } =
                                                    editor.state.selection;
                                                const selection = {
                                                    from,
                                                    to,
                                                    quote: editor.state.doc.textBetween(
                                                        from,
                                                        to,
                                                        " ",
                                                    ),
                                                };
                                                if (
                                                    !selectionTarget(
                                                        editor.state.doc,
                                                        selection,
                                                    )
                                                )
                                                    return;
                                                setConnectionSelection(
                                                    selection,
                                                );
                                                setSelected(null);
                                                setEditingCard(null);
                                                setPanel(
                                                    compact ? "thoughts" : null,
                                                );
                                                if (doc.hidden)
                                                    update({ hidden: false });
                                            }}
                                        />
                                    )}
                                    <EditorContent editor={editor} />
                                    <div
                                        className="endmark bg-line mt-10 h-px w-6"
                                        aria-hidden="true"
                                    />
                                </article>
                            )}
                            {!comparison && editor && !compact && (
                                <Annotations
                                    key={doc.id}
                                    editor={editor}
                                    workspace={workspace}
                                    cards={doc.hidden ? EMPTY_CARDS : doc.cards}
                                    selected={selected}
                                    onSelect={setSelected}
                                    onPatch={patchCard}
                                    editingCard={editingCard}
                                    onEdit={(id) => {
                                        setSelected(id);
                                        setPanel(null);
                                        setEditingCard(id);
                                    }}
                                    onEditEnd={() => setEditingCard(null)}
                                    connectionSelection={connectionSelection}
                                    onConnectionEnd={() =>
                                        setConnectionSelection(null)
                                    }
                                    smartPunctuation={
                                        preferences.smartPunctuation
                                    }
                                />
                            )}
                        </main>
                    </div>

                    {compact && (
                        <CompactCards
                            open={panel === "thoughts"}
                            onClose={() => {
                                setPanel(null);
                                setEditingCard(null);
                                setConnectionSelection(null);
                            }}
                            cards={doc.cards}
                            editing={editingCard}
                            onEdit={setEditingCard}
                            onPatch={patchCard}
                            onDelete={deleteCard}
                            onAdd={addCard}
                            onReveal={revealCard}
                            connecting={!!connectionSelection}
                            onAttach={attachCompactCard}
                            onCancelConnection={() =>
                                setConnectionSelection(null)
                            }
                            smartPunctuation={preferences.smartPunctuation}
                        />
                    )}
                    <Drawer
                        open={!compact && panel === "thoughts"}
                        title="Thoughts"
                        onClose={() => setPanel(null)}
                        actions={
                            <Button
                                className="h-9! min-h-9! gap-1.5! px-2.5! text-[12px]!"
                                icon={doc.hidden ? EyeOff : Eye}
                                label={
                                    doc.hidden
                                        ? "Show all cards"
                                        : "Hide all cards"
                                }
                                onClick={() => update({ hidden: !doc.hidden })}
                            >
                                {doc.hidden ? "Hidden" : "Shown"}
                            </Button>
                        }
                    >
                        <button
                            data-autofocus
                            className={`${PRIMARY_BUTTON} w-full! gap-2! text-[13px]! font-medium`}
                            onClick={addCard}
                        >
                            <Plus size={16} aria-hidden="true" />
                            New thought
                        </button>
                        {cardCount ? (
                            <ul className="m-0 mt-4 grid list-none grid-cols-1 gap-2 p-0">
                                {doc.cards.map((card, i) => {
                                    const link = card.connectors?.[0]?.target;
                                    return (
                                        <li
                                            key={card.id}
                                            className="border-line hover:bg-surface flex min-w-0 flex-wrap items-center gap-0.5 rounded-xl border pr-1.5 transition-colors focus-within:border-[var(--control-focus)] hover:border-[var(--control-focus)]"
                                        >
                                            <button
                                                onClick={() => revealCard(card)}
                                                className="text-ink! min-w-0! flex-1 basis-0 items-start! justify-start! gap-3! self-stretch rounded-xl! border-0! bg-transparent! px-3! py-3! text-left whitespace-normal! hover:bg-transparent!"
                                            >
                                                <span
                                                    aria-hidden="true"
                                                    className="mt-1 size-3.5 shrink-0 rounded-[4px] border border-[color-mix(in_srgb,var(--text)_14%,transparent)]"
                                                    style={{
                                                        background: card.bg,
                                                        opacity: card.opacity,
                                                    }}
                                                />
                                                <span className="min-w-0 flex-1">
                                                    <span className="block truncate font-serif text-[15px] leading-[1.5]">
                                                        {card.text.trim() || (
                                                            <em className="text-muted">
                                                                An unfinished
                                                                thought…
                                                            </em>
                                                        )}
                                                    </span>
                                                    {(link ||
                                                        card.collapsed) && (
                                                        <span className="text-muted mt-1 block truncate text-[11px]">
                                                            {link
                                                                ? link.orphaned
                                                                    ? "Text removed; reconnect"
                                                                    : link.kind ===
                                                                        "essay"
                                                                      ? "Connected to the whole essay"
                                                                      : `Connected to “${link.quote}”`
                                                                : "Folded in the margin"}
                                                        </span>
                                                    )}
                                                </span>
                                            </button>
                                            <Button
                                                icon={Palette}
                                                label={`Change colour of thought ${i + 1}`}
                                                aria-haspopup="dialog"
                                                aria-expanded={
                                                    colouring?.id === card.id
                                                }
                                                onClick={(e) =>
                                                    setColouring(
                                                        colouring?.id ===
                                                            card.id
                                                            ? null
                                                            : {
                                                                  id: card.id,
                                                                  anchor: e.currentTarget,
                                                              },
                                                    )
                                                }
                                            />
                                            <Button
                                                icon={Pencil}
                                                label={`Edit thought ${i + 1}`}
                                                onClick={() => {
                                                    revealCard(card);
                                                    setEditingCard(card.id);
                                                }}
                                            />
                                            <Button
                                                icon={Trash2}
                                                label={`Delete thought ${i + 1}`}
                                                className="hover:text-danger!"
                                                onClick={() =>
                                                    deleteCard(card.id)
                                                }
                                            />
                                            {panel === "thoughts" &&
                                                colouring?.id === card.id && (
                                                    <CardColourPopover
                                                        anchor={
                                                            colouring.anchor
                                                        }
                                                        label={`Colour of thought ${i + 1}`}
                                                        value={card.bg}
                                                        onChange={(bg, fg) =>
                                                            patchCard(card.id, {
                                                                bg,
                                                                fg,
                                                            })
                                                        }
                                                        onClose={() =>
                                                            setColouring(null)
                                                        }
                                                    />
                                                )}
                                        </li>
                                    );
                                })}
                            </ul>
                        ) : null}
                    </Drawer>

                    <Drawer
                        open={panel === "checklist"}
                        title="Revision Checklist"
                        onClose={() => setPanel(null)}
                    >
                        {(
                            [
                                ["Universal goals", universalChecks(data, doc)],
                                ["This draft", doc.checks],
                            ] as [
                                string,
                                (RevisionCheck & { universalId?: string })[],
                            ][]
                        ).map(([title, checks]) => (
                            <section
                                className="revision-group mb-5 last:mb-0"
                                key={title}
                            >
                                <div className="revision-group-heading mb-2 flex min-h-8 items-center justify-between">
                                    <h3 className="text-muted m-0 text-[14px] font-medium">
                                        {title}
                                    </h3>
                                    {title === "This draft" &&
                                        !!checks.length && (
                                            <Button
                                                className="h-8! min-h-8! gap-1! px-2! text-[12px]!"
                                                icon={Plus}
                                                label="Add revision goal"
                                                onClick={openRevisionGoal}
                                            >
                                                Add
                                            </Button>
                                        )}
                                </div>
                                <div className="checks border-line overflow-hidden rounded-xl border">
                                    {checks.map((c) => {
                                        const active =
                                            doc.session?.checkId === c.id;
                                        return (
                                            <div
                                                className={`check-row border-line flex items-center border-t first:border-t-0 ${active ? "bg-tint" : "focus-within:bg-[var(--control-hover)] hover:bg-[var(--control-hover)]"}`}
                                                key={c.id}
                                            >
                                                <button
                                                    className={`check-start text-ink! min-w-0! flex-1 justify-start! gap-3! rounded-none! border-0! bg-transparent! px-3.5! py-3! text-left disabled:opacity-100! ${c.done ? "complete" : ""}`}
                                                    onClick={() => begin(c)}
                                                    disabled={!!doc.session}
                                                >
                                                    <span
                                                        className={`check-box flex size-[18px] shrink-0 items-center justify-center rounded-[5px] border ${c.done ? "border-success bg-success text-[var(--on-accent)]" : active ? "border-accent" : "border-[color-mix(in_srgb,var(--muted)_55%,transparent)]"}`}
                                                    >
                                                        {c.done && (
                                                            <Check
                                                                size={13}
                                                                strokeWidth={
                                                                    2.4
                                                                }
                                                            />
                                                        )}
                                                        {active && !c.done && (
                                                            <span className="bg-accent size-2 rounded-full" />
                                                        )}
                                                    </span>
                                                    <span
                                                        className={`min-w-0 flex-1 text-[13.5px] leading-[1.5] [overflow-wrap:anywhere] ${doc.session && !active ? "opacity-55" : ""}`}
                                                    >
                                                        {c.text}
                                                        <small className="text-muted mt-0.5 block text-[11px]">
                                                            {active
                                                                ? "Revising now"
                                                                : c.done
                                                                  ? "Complete · revise again"
                                                                  : "Start a revision"}
                                                        </small>
                                                    </span>
                                                </button>
                                                {!c.universalId && (
                                                    <span className="flex shrink-0 pr-1">
                                                        <Button
                                                            icon={Pencil}
                                                            label={`Edit check: ${c.text}`}
                                                            onClick={() => {
                                                                setRevisionGoalEdit(
                                                                    c.id,
                                                                );
                                                                setRevisionGoalText(
                                                                    c.text,
                                                                );
                                                                setModal(
                                                                    "revision-goal",
                                                                );
                                                            }}
                                                        />
                                                        <Button
                                                            icon={Trash2}
                                                            label={`Delete check: ${c.text}`}
                                                            onClick={() =>
                                                                update((d) => ({
                                                                    checks: d.checks.filter(
                                                                        (v) =>
                                                                            v.id !==
                                                                            c.id,
                                                                    ),
                                                                }))
                                                            }
                                                            disabled={active}
                                                        />
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })}
                                    {!checks.length && (
                                        <div className="empty flex items-center gap-3 py-3 pr-1.5 pl-3.5">
                                            <span
                                                aria-hidden="true"
                                                className="bg-paper border-line text-ink flex size-8 shrink-0 items-center justify-center rounded-lg border"
                                            >
                                                {title === "This draft" ? (
                                                    <Target
                                                        size={15}
                                                        strokeWidth={1.7}
                                                    />
                                                ) : (
                                                    <Globe
                                                        size={15}
                                                        strokeWidth={1.7}
                                                    />
                                                )}
                                            </span>
                                            <span className="text-ink min-w-0 flex-1 text-[13.5px] leading-[1.5]">
                                                {title === "This draft"
                                                    ? "What would you like to improve in this draft?"
                                                    : "Goals that apply to every draft."}
                                            </span>
                                            {title === "This draft" ? (
                                                <button
                                                    className="text-ink! h-8! min-h-8! shrink-0 gap-1! rounded-lg! px-2! text-[12px]! font-medium"
                                                    aria-label="Add revision goal"
                                                    onClick={openRevisionGoal}
                                                >
                                                    <Plus
                                                        size={14}
                                                        aria-hidden="true"
                                                    />
                                                    Add goal
                                                </button>
                                            ) : (
                                                !tutorial && (
                                                    <button
                                                        className="text-ink! h-8! min-h-8! shrink-0 gap-1! rounded-lg! px-2! text-[12px]! font-medium"
                                                        aria-label="Manage universal goals in Settings"
                                                        onClick={() =>
                                                            void leaveTo(
                                                                "/settings",
                                                            )
                                                        }
                                                    >
                                                        Manage
                                                        <ChevronRight
                                                            size={14}
                                                            aria-hidden="true"
                                                        />
                                                    </button>
                                                )
                                            )}
                                        </div>
                                    )}
                                </div>
                            </section>
                        ))}
                    </Drawer>

                    <Drawer
                        open={panel === "drafts"}
                        title="Your drafts"
                        onClose={() => setPanel(null)}
                    >
                        <button
                            data-autofocus
                            className={`${PRIMARY_BUTTON} draft-save w-full! gap-2! text-[13px]! font-medium`}
                            onClick={saveOpen}
                        >
                            <Plus size={16} aria-hidden="true" />
                            Save named draft
                        </button>
                        {!doc.drafts.length && (
                            <EmptyState
                                compact
                                inlineHeader
                                className="mt-5"
                                icon={History}
                                title="No named drafts yet"
                                body="Your working text is always autosaved. Name a draft to keep a version you can return to."
                            />
                        )}
                        <ol
                            className="draft-list draft-timeline before:bg-line relative m-0 mt-5 list-none p-0 pl-6 before:absolute before:top-5 before:bottom-5 before:left-[5px] before:w-px before:content-['']"
                            aria-label="Draft timeline"
                        >
                            {[...doc.drafts].reverse().map((d, i) => (
                                <li
                                    className={`draft-entry relative pb-2.5 last:pb-0 ${i === 0 ? "is-latest" : ""}`}
                                    key={d.id}
                                >
                                    <span
                                        className={`draft-marker bg-surface absolute top-[22px] -left-6 size-[11px] rounded-full ${i === 0 ? "border-accent border-[3px]" : "border-muted border-[1.5px]"}`}
                                        aria-hidden="true"
                                    />
                                    <div className="draft-item border-line flex items-center gap-2 rounded-xl border py-2 pr-1 pl-3.5">
                                        <div className="min-w-0 flex-1">
                                            <time
                                                className="text-muted block text-[11px] tabular-nums"
                                                dateTime={new Date(
                                                    d.time,
                                                ).toISOString()}
                                            >
                                                {new Date(
                                                    d.time,
                                                ).toLocaleString(undefined, {
                                                    month: "short",
                                                    day: "numeric",
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                })}
                                            </time>
                                            <div className="draft-row flex min-w-0 [&_strong]:min-w-0 [&_strong]:truncate [&_strong]:font-serif [&_strong]:text-[15px] [&_strong]:leading-[1.45] [&_strong]:font-normal">
                                                <DraftTitle title={d.name} />
                                            </div>
                                            {d.goal && (
                                                <p
                                                    className="text-muted mt-0.5 truncate text-[11px]"
                                                    title={d.goal}
                                                >
                                                    Goal: {d.goal}
                                                </p>
                                            )}
                                        </div>
                                        <button
                                            className="draft-compare border-line! text-accent! hover:bg-tint! h-9! min-h-9! shrink-0 rounded-lg! border! px-3! text-[12px]! font-medium"
                                            onClick={() => {
                                                setComparison({
                                                    left:
                                                        d.baseline ||
                                                        doc.drafts.find(
                                                            (v) =>
                                                                v.id !== d.id,
                                                        )?.id ||
                                                        "working",
                                                    right: d.id,
                                                });
                                                setPanel(null);
                                            }}
                                        >
                                            Compare
                                        </button>
                                        <span className="draft-meta flex">
                                            <ActionMenu
                                                label={`Draft actions: ${d.name}`}
                                                menuLabel={`Actions for ${d.name}`}
                                                items={[
                                                    {
                                                        label: "Rename",
                                                        onSelect: () => {
                                                            setRename(d.id);
                                                            setDraftName(
                                                                d.name,
                                                            );
                                                            setModal("save");
                                                        },
                                                    },
                                                    {
                                                        label: "Restore",
                                                        onSelect: () => {
                                                            setRename(d.id);
                                                            setModal("restore");
                                                        },
                                                    },
                                                    {
                                                        label: "Delete",
                                                        danger: true,
                                                        separator: true,
                                                        onSelect: () => {
                                                            setDraftToDelete({
                                                                documentId:
                                                                    doc.id,
                                                                id: d.id,
                                                            });
                                                            setModal(
                                                                "draft-delete",
                                                            );
                                                        },
                                                    },
                                                ]}
                                            />
                                        </span>
                                    </div>
                                </li>
                            ))}
                        </ol>
                    </Drawer>

                    <Drawer
                        open={panel === "stats"}
                        title="Writing statistics"
                        onClose={() => setPanel(null)}
                    >
                        <dl className="writing-statistics border-line [&_dt]:text-muted [&>div:nth-child(-n+2)]:border-line [&>div:nth-child(odd)]:border-line m-0 grid grid-cols-2 overflow-hidden rounded-xl border [&_dd]:m-0 [&_dd]:font-serif [&_dd]:text-[28px] [&_dd]:leading-[1.2] [&_dd]:tabular-nums [&_dt]:mb-1 [&_dt]:text-[12px] [&>div]:px-4 [&>div]:py-3.5 [&>div:nth-child(-n+2)]:border-b [&>div:nth-child(odd)]:border-r">
                            {(
                                [
                                    ["Words", statistics.words],
                                    ["Characters", statistics.characters],
                                    ["Sentences", statistics.sentences],
                                    ["Paragraphs", statistics.paragraphs],
                                ] as const
                            ).map(([label, value]) => (
                                <div key={label}>
                                    <dt>{label}</dt>
                                    <dd>{value.toLocaleString()}</dd>
                                </div>
                            ))}
                        </dl>
                        <dl className="writing-statistics-secondary [&_dt]:text-muted m-0 mt-4 grid grid-cols-2 gap-4 px-1 [&_dd]:m-0 [&_dd]:text-[14px] [&_dd]:font-medium [&_dd]:tabular-nums [&_dt]:mb-0.5 [&_dt]:text-[12px]">
                            <div>
                                <dt>Reading time</dt>
                                <dd>{statistics.readingTime} min</dd>
                            </div>
                            <div>
                                <dt>Average sentence length</dt>
                                <dd>
                                    {statistics.averageSentenceLength.toLocaleString()}{" "}
                                    words
                                </dd>
                            </div>
                        </dl>
                    </Drawer>

                    {!comparison && (
                        <div
                            aria-hidden="true"
                            className="pointer-events-none fixed inset-x-0 bottom-0 z-[16] h-28 bg-linear-to-t from-[var(--bg)] from-35% to-transparent [.focus-mode_&]:hidden"
                        />
                    )}
                    {!comparison &&
                        (toolsOpen ? (
                            <nav
                                ref={dock}
                                className="workspace-tools dock border-line bg-surface text-ink fixed bottom-5 left-1/2 z-[19] flex w-max max-w-[calc(100vw-16px)] -translate-x-1/2 flex-col overflow-hidden rounded-[16px] border [box-shadow:0_12px_32px_-8px_color-mix(in_srgb,var(--shadow)_16%,transparent),0_1px_2px_color-mix(in_srgb,var(--shadow)_6%,transparent)] max-[720px]:bottom-3 [.focus-mode_&]:hidden"
                                aria-label="Writing tools"
                            >
                                {doc.session && (
                                    <div
                                        className="revision-actions border-line bg-tint flex items-center gap-1.5 border-b py-1.5 pr-1.5 pl-4 max-[720px]:pl-3"
                                        role="group"
                                        aria-label="Revision actions"
                                    >
                                        <span className="text-accent flex min-w-0 flex-1 items-center gap-2 text-[12.5px]">
                                            <span
                                                aria-hidden="true"
                                                className="bg-accent size-2 shrink-0 rounded-full"
                                            />
                                            <span className="min-w-0 truncate">
                                                <span className="font-semibold">
                                                    Revising
                                                </span>
                                                <span className="max-[480px]:hidden">
                                                    {" "}
                                                    · {doc.session.goal}
                                                </span>
                                            </span>
                                        </span>
                                        <button
                                            className="revision-save text-ink! h-9! min-h-9! gap-1.5! rounded-lg! px-3! text-[12px]! font-medium hover:bg-[color-mix(in_srgb,var(--surface)_70%,transparent)]!"
                                            onClick={saveOpen}
                                        >
                                            <Save
                                                size={15}
                                                aria-hidden="true"
                                            />
                                            Save draft
                                        </button>
                                        <button
                                            className={`${PRIMARY_BUTTON} revision-finish h-9! min-h-9! gap-1.5! rounded-lg! px-3! text-[12px]! font-medium`}
                                            onClick={finish}
                                        >
                                            <Check
                                                size={15}
                                                aria-hidden="true"
                                            />
                                            Finish revision
                                        </button>
                                    </div>
                                )}
                                <div
                                    id="writing-tool-items"
                                    className="writing-tool-items flex items-center gap-0.5 overflow-x-auto p-1.5"
                                >
                                    <DockButton
                                        icon={Plus}
                                        label="Add thought card"
                                        onClick={addCard}
                                    />
                                    <DockButton
                                        icon={StickyNote}
                                        label="Thoughts"
                                        text="Thoughts"
                                        count={cardCount || undefined}
                                        pressed={panel === "thoughts"}
                                        onClick={() => toggle("thoughts")}
                                    />
                                    <DockButton
                                        icon={ListChecks}
                                        label="Revision checklist"
                                        text="Checklist"
                                        count={
                                            allChecks.length
                                                ? `${doneCount}/${allChecks.length}`
                                                : undefined
                                        }
                                        pressed={panel === "checklist"}
                                        onClick={() => toggle("checklist")}
                                    />
                                    <DockButton
                                        icon={History}
                                        label="Saved drafts"
                                        text="Drafts"
                                        count={doc.drafts.length || undefined}
                                        pressed={panel === "drafts"}
                                        onClick={() => toggle("drafts")}
                                    />
                                    <DockDivider />
                                    <DockButton
                                        icon={ChartNoAxesColumnIncreasing}
                                        label="Writing statistics"
                                        text={`${statistics.words.toLocaleString()} ${statistics.words === 1 ? "word" : "words"}`}
                                        pressed={panel === "stats"}
                                        onClick={() => toggle("stats")}
                                        className="font-normal! tabular-nums"
                                    />
                                    <DockButton
                                        icon={ChevronDown}
                                        label="Hide writing tools"
                                        aria-expanded={toolsOpen}
                                        aria-controls="writing-tool-items"
                                        onClick={() => {
                                            setPanel(null);
                                            setToolsOpen(false);
                                            requestAnimationFrame(() =>
                                                document
                                                    .querySelector<HTMLElement>(
                                                        ".canvas-tools-launcher",
                                                    )
                                                    ?.focus(),
                                            );
                                        }}
                                    />
                                </div>
                            </nav>
                        ) : (
                            <button
                                className="canvas-tools-launcher border-line! bg-surface! text-muted! hover:text-ink! fixed! bottom-5 left-1/2 z-[19] h-10! min-h-10! -translate-x-1/2 gap-2! rounded-full! border! px-4! text-[12px]! [box-shadow:0_8px_24px_-8px_color-mix(in_srgb,var(--shadow)_16%,transparent)] max-[720px]:bottom-3 [.focus-mode_&]:hidden!"
                                aria-label="Show writing tools"
                                aria-expanded={false}
                                aria-controls="writing-tool-items"
                                onClick={() => {
                                    setToolsOpen(true);
                                    requestAnimationFrame(() =>
                                        document
                                            .querySelector<HTMLElement>(
                                                '.workspace-tools [aria-label="Hide writing tools"]',
                                            )
                                            ?.focus(),
                                    );
                                }}
                            >
                                <ChevronUp size={15} aria-hidden="true" />
                                {doc.session ? "Revising · tools" : "Tools"}
                            </button>
                        ))}
                </div>
                {autosave.status === "error" && (
                    <div
                        className={
                            "save-failure-notice canvas-save-failure bg-surface text-danger [&_button]:text-danger! fixed top-[68px] right-4 z-[60] flex max-w-[calc(100vw-32px)] items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--danger)_35%,var(--border))] py-1 pr-1 pl-4 text-[12px] [box-shadow:0_8px_24px_-10px_color-mix(in_srgb,var(--shadow)_18%,transparent)] [&_button]:h-8! [&_button]:min-h-8! [&_button]:rounded-full! [&_button]:px-3! [&_button]:text-[12px]! [&_button]:font-medium [&_button:hover]:bg-[color-mix(in_srgb,var(--danger)_10%,transparent)]!"
                        }
                        role="alert"
                    >
                        <span>Couldn’t save your writing</span>
                        <button onClick={autosave.retry}>Retry</button>
                    </div>
                )}
                {exporter.error && (
                    <div
                        className="export-failure-notice bg-surface text-danger fixed top-[68px] right-4 z-[60] flex max-w-[min(440px,calc(100vw-32px))] items-start gap-2 rounded-2xl border border-[color-mix(in_srgb,var(--danger)_35%,var(--border))] py-2.5 pr-1.5 pl-4 text-[12.5px] leading-[1.5] [box-shadow:0_8px_24px_-10px_color-mix(in_srgb,var(--shadow)_18%,transparent)]"
                        role="alert"
                    >
                        <span className="flex-1">{exporter.error}</span>
                        <button
                            aria-label="Dismiss"
                            className="text-danger! h-7! min-h-7! w-7! min-w-7! shrink-0 rounded-full! p-0!"
                            onClick={() => exporter.setError("")}
                        >
                            <X size={14} />
                        </button>
                    </div>
                )}
                {shortcutsOpen && (
                    <ShortcutsDialog onClose={() => setShortcutsOpen(false)} />
                )}
                {tutorial?.coach({
                    doc,
                    editor,
                    comparing: !!comparison,
                    closeComparison: () => setComparison(null),
                    demo: {
                        reset: () => {
                            setData(tutorial.initial);
                            setComparison(null);
                            setPanel(null);
                            setModal(null);
                            setSelected(null);
                            setEditingCard(null);
                            setConnectionSelection(null);
                            setRevisionGoalText("");
                            setToolsOpen(true);
                            editor?.commands.setContent(
                                tutorial.initial.docs[0]!.html,
                                { emitUpdate: false },
                            );
                        },
                        addCard: (near) => {
                            const id = uid();
                            const el = workspace.current;
                            const y =
                                editor && el
                                    ? editor.view.coordsAtPos(near).top -
                                      el.getBoundingClientRect().top +
                                      el.scrollTop -
                                      24
                                    : 96;
                            setData((data) =>
                                addThought(data, id, Math.max(24, y)),
                            );
                            return id;
                        },
                        patchCard,
                        setGoalText: setRevisionGoalText,
                        closePanel: () => setPanel(null),
                    },
                })}
                {notice && (
                    <div
                        className={
                            "toast border-line bg-surface [&_svg]:text-accent fixed top-2 left-1/2 z-30 flex max-w-[calc(100%-32px)] -translate-x-1/2 [animation:appear_200ms_ease-out] items-center gap-2.5 rounded-full border py-2.5 pr-5 pl-4 text-[12.5px] [box-shadow:0_12px_32px_-10px_color-mix(in_srgb,var(--shadow)_18%,transparent)] motion-reduce:animate-none [.focus-mode_&]:sr-only"
                        }
                        role="status"
                    >
                        <CheckCheck size={16} />
                        {notice}
                    </div>
                )}
                {modal &&
                    createPortal(
                        <div
                            className={OVERLAY_CLASS}
                            onMouseDown={(e) => {
                                if (e.target === e.currentTarget)
                                    setModal(null);
                            }}
                        >
                            <section
                                className={DIALOG_CLASS}
                                role="dialog"
                                aria-modal="true"
                                aria-labelledby="dialog-title"
                                aria-describedby={
                                    modal === "draft-delete"
                                        ? "draft-delete-description"
                                        : undefined
                                }
                                ref={dialog}
                                onKeyDown={(e) => {
                                    if (e.key === "Tab") {
                                        const nodes = [
                                            ...dialog.current!.querySelectorAll<HTMLElement>(
                                                "button:not(:disabled),input,textarea,select",
                                            ),
                                        ];
                                        const first = nodes[0],
                                            last = nodes.at(-1);
                                        if (
                                            e.shiftKey &&
                                            document.activeElement === first
                                        ) {
                                            e.preventDefault();
                                            last?.focus();
                                        } else if (
                                            !e.shiftKey &&
                                            document.activeElement === last
                                        ) {
                                            e.preventDefault();
                                            first?.focus();
                                        }
                                    }
                                }}
                            >
                                {modal === "draft-delete" && (
                                    <>
                                        <div className={DIALOG_HEADING}>
                                            <h2 id="dialog-title">
                                                Delete “
                                                {targetDraft?.name ??
                                                    "this draft"}
                                                ”?
                                            </h2>
                                            <Button
                                                icon={X}
                                                label="Close dialog"
                                                onClick={() => setModal(null)}
                                            />
                                        </div>
                                        <p id="draft-delete-description">
                                            This permanently deletes the saved
                                            draft. This action cannot be undone.
                                            Your current writing and other
                                            drafts will be kept.
                                        </p>
                                        <div className={DIALOG_ACTIONS}>
                                            <Button
                                                onClick={() => setModal(null)}
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                className={`draft-delete-confirm ${DANGER_BUTTON}`}
                                                onClick={deleteDraft}
                                                disabled={!targetDraft}
                                            >
                                                Delete draft
                                            </Button>
                                        </div>
                                    </>
                                )}
                                {modal === "save" && (
                                    <form onSubmit={saveDraft}>
                                        <div className={DIALOG_HEADING}>
                                            <h2 id="dialog-title">
                                                {rename
                                                    ? "Rename draft"
                                                    : "Keep this version"}
                                            </h2>
                                            <Button
                                                icon={X}
                                                label="Close dialog"
                                                type="button"
                                                onClick={() => setModal(null)}
                                            />
                                        </div>
                                        <p>
                                            A name makes it easier to find your
                                            way back.
                                        </p>
                                        <label htmlFor="draft-name">
                                            Draft name
                                        </label>
                                        <input
                                            id="draft-name"
                                            value={draftName}
                                            onChange={(e) =>
                                                setDraftName(e.target.value)
                                            }
                                            required
                                            maxLength={120}
                                        />
                                        {doc.session && !rename && (
                                            <div
                                                className={
                                                    "save-explanation bg-paper text-muted mt-4 rounded-lg p-4 text-[12px] leading-[1.7]"
                                                }
                                            >
                                                This saves a version and opens
                                                comparison.
                                                <br />
                                                Your revision stays open until
                                                you finish it.
                                            </div>
                                        )}
                                        <div className={DIALOG_ACTIONS}>
                                            <Button
                                                type="button"
                                                onClick={() => setModal(null)}
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                className={PRIMARY_BUTTON}
                                                type="submit"
                                                disabled={!draftName.trim()}
                                            >
                                                {rename
                                                    ? "Rename draft"
                                                    : "Save draft"}
                                            </Button>
                                        </div>
                                    </form>
                                )}
                                {modal === "revision-goal" && (
                                    <form onSubmit={saveRevisionGoal}>
                                        <div className={DIALOG_HEADING}>
                                            <h2 id="dialog-title">
                                                {revisionGoalEdit
                                                    ? "Edit revision goal"
                                                    : "Add revision goal"}
                                            </h2>
                                            <Button
                                                icon={X}
                                                label="Close dialog"
                                                type="button"
                                                onClick={() => setModal(null)}
                                            />
                                        </div>
                                        <label htmlFor="revision-goal">
                                            Revision goal
                                        </label>
                                        <input
                                            id="revision-goal"
                                            autoFocus
                                            value={revisionGoalText}
                                            onChange={(e) =>
                                                setRevisionGoalText(
                                                    e.target.value,
                                                )
                                            }
                                            maxLength={240}
                                            required
                                            placeholder="What would you like to improve?"
                                        />
                                        <div className={DIALOG_ACTIONS}>
                                            <Button
                                                type="button"
                                                onClick={() => setModal(null)}
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                className={PRIMARY_BUTTON}
                                                type="submit"
                                                disabled={
                                                    !revisionGoalText.trim()
                                                }
                                            >
                                                {revisionGoalEdit
                                                    ? "Save goal"
                                                    : "Add"}
                                            </Button>
                                        </div>
                                    </form>
                                )}
                                {modal === "restore" && (
                                    <>
                                        <div className={DIALOG_HEADING}>
                                            <h2 id="dialog-title">
                                                Restore “
                                                {doc.drafts.find(
                                                    (d) => d.id === rename,
                                                )?.name ?? "this draft"}
                                                ”?
                                            </h2>
                                            <Button
                                                icon={X}
                                                label="Close dialog"
                                                onClick={() => setModal(null)}
                                            />
                                        </div>
                                        <p>
                                            Your current text will be saved as a
                                            version first. Your thought cards
                                            and revision goal stay with the
                                            document.
                                        </p>
                                        <div className={DIALOG_ACTIONS}>
                                            <Button
                                                onClick={() => setModal(null)}
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                className={PRIMARY_BUTTON}
                                                onClick={() => {
                                                    const draft =
                                                        doc.drafts.find(
                                                            (d) =>
                                                                d.id === rename,
                                                        );
                                                    if (draft) doRestore(draft);
                                                    setModal(null);
                                                }}
                                            >
                                                Preserve & restore
                                            </Button>
                                        </div>
                                    </>
                                )}
                            </section>
                        </div>,
                        document.body,
                    )}
            </div>
        </Tooltip.Provider>
    );
}
