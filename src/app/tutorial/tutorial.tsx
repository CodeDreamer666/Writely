"use client";
import type { Editor } from "@tiptap/react";
import {
    Check,
    ChevronDown,
    ChevronUp,
    Pause,
    Play,
    RotateCcw,
    SkipBack,
    SkipForward,
    X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
    type ReactNode,
} from "react";
import {
    makeDoc,
    uid,
} from "~/lib/writely/model";
import type { Preferences } from "~/lib/writely/preferences";
import {
    TUTORIAL_GOAL,
    TUTORIAL_GOAL_PHRASE,
    TUTORIAL_GOAL_REVISION,
    TUTORIAL_INTENTION,
    TUTORIAL_PHRASE,
    TUTORIAL_REVISION,
    makeTutorialWorkspace,
    tutorialAsDocument,
    tutorialStorageKey,
} from "~/lib/writely/tutorial";
import type {
    Card,
    WritingDocument,
} from "~/lib/writely/types";
import { api } from "~/trpc/react";
import type { AccountUser } from "../components/app-header";
import { PRIMARY_BUTTON } from "~/config/ui";
import WritelyApp, {
    type CoachContext,
} from "../components/writely/writely-app";

/**
 * What: How long, in milliseconds, the tutorial waits between keystrokes
 * while it types and deletes.
 *
 * Used in:
 * - src/app/tutorial/tutorial.tsx (SCENES, retype)
 *
 * Effect: Lower values type faster; higher values give the viewer more time
 * to follow the words appearing.
 */
const TYPING = { type: 42, erase: 22 } as const;

/** Thrown into a running scene when the viewer skips, goes back or leaves. */
class Stopped extends Error {}

/** A spot on screen the tutorial's pointer moves to, or the text caret it shows while typing. */
type Pointer = { x: number; y: number; caret?: number };
type Range = { from: number; to: number };

/** What a scene can do while it plays. In fast mode it skips every pause and animation. */
type Player = {
    fast: boolean;
    context: () => CoachContext;
    wait: (ms: number) => Promise<void>;
    /** Moves the pointer to an element or a point, then waits for it to arrive. */
    moveTo: (target: string | Pointer) => Promise<void>;
    /** Points at a real control and presses it, so the app does exactly what a click does. */
    click: (selector: string) => Promise<void>;
    press: () => Promise<void>;
    hidePointer: () => void;
    /** Rings the control the caption talks about, as the coach marks do. */
    mark: (selector: string | null) => void;
    /** Tints a stretch of the text, as a selection would. */
    highlight: (range: Range | null) => void;
    /** Shared between scenes; holds the id of the card the tutorial makes. */
    memory: { card?: string };
};

type Scene = {
    /** The part of the loop a scene belongs to, shown above its title. */
    part: "Start" | "Thought cards" | "Revision goals" | "Finished";
    title: string;
    body: ReactNode;
    /** How to do this step by hand. */
    yourself?: ReactNode;
    play: (player: Player) => Promise<void>;
};

/** Where a phrase from the sample is in the editor, if it's still there. */
function findText(editor: Editor, phrase: string) {
    let range: Range | null = null;
    editor.state.doc.descendants((node, pos) => {
        if (range || !node.isText) return !range;
        const index = node.text!.toLowerCase().indexOf(phrase.toLowerCase());
        if (index >= 0)
            range = { from: pos + index, to: pos + index + phrase.length };
        return false;
    });
    return range as Range | null;
}

/**
 * Scrolls `page` so the span from `from` to `to` (screen positions) sits in view. On narrow
 * screens the captions cover the lower page, so only the space above them counts; a span too
 * tall for it keeps its end in view when `keepEnd` is set, otherwise its start.
 */
function frame(
    page: HTMLElement,
    from: number,
    to: number,
    keepEnd: boolean,
    smooth: boolean,
) {
    const box = page.getBoundingClientRect();
    const captions = document
        .querySelector(".tutorial-coach")
        ?.getBoundingClientRect();
    const top = box.top + 16,
        bottom =
            captions && captions.top > box.top + 80
                ? captions.top - 16
                : box.bottom - 16;
    const offset =
        to - from <= bottom - top
            ? (from + to) / 2 - (top + bottom) / 2
            : keepEnd
              ? to - bottom
              : from - top;
    if (Math.abs(offset) > 24)
        page.scrollBy({ top: offset, behavior: smooth ? "smooth" : "auto" });
}

/** Brings the phrase, and its card if there is one, into view. On narrow screens cards stack below the text. */
function reveal(
    editor: Editor,
    range: Range,
    card: string | undefined,
    smooth: boolean,
) {
    const page = document.querySelector<HTMLElement>("main.workspace");
    if (!page) return;
    let from = editor.view.coordsAtPos(range.from).top,
        to = editor.view.coordsAtPos(range.to).bottom;
    const cardBox =
        card &&
        document
            .querySelector(`[data-card-id="${card}"]`)
            ?.getBoundingClientRect();
    if (cardBox) {
        from = Math.min(from, cardBox.top);
        to = Math.max(to, cardBox.bottom);
    }
    frame(page, from, to, !!cardBox, smooth);
}

/**
 * Brings the removed (column 1) or added (column 2) words of the comparison into view, in
 * whichever layout is showing: side by side, or the single text on phones.
 */
function revealChanges(column: number, smooth: boolean) {
    const page = document.querySelector<HTMLElement>(".comparison-scroll");
    const changes = [
        ...document.querySelectorAll(
            column === 1
                ? "[data-side='before'] del, .compare-unified del"
                : "[data-side='after'] ins, .compare-unified ins",
        ),
    ]
        .filter((el) => el.getClientRects().length)
        .map((el) => el.getBoundingClientRect());
    if (!page || !changes.length) return;
    frame(
        page,
        Math.min(...changes.map((r) => r.top)) - 40,
        Math.max(...changes.map((r) => r.bottom)),
        false,
        smooth,
    );
}

function caretAt(editor: Editor, pos: number): Pointer {
    const at = editor.view.coordsAtPos(pos);
    return { x: at.left, y: at.top, caret: at.bottom - at.top };
}

/**
 * Deletes a phrase letter by letter and types its replacement, keeping its first `keep` letters
 * so anything connected to it stays connected. Returns where the new words are.
 */
async function retype(
    p: Player,
    editor: Editor,
    range: Range,
    text: string,
    keep: number,
) {
    const start = range.from + keep;
    if (p.fast) {
        editor.view.dispatch(
            editor.state.tr.insertText(text.slice(keep), start, range.to),
        );
        return { from: range.from, to: range.from + text.length };
    }
    for (let to = range.to; to > start; to--) {
        editor.view.dispatch(editor.state.tr.delete(to - 1, to));
        await p.moveTo(caretAt(editor, to - 1));
        await p.wait(TYPING.erase);
    }
    await p.wait(400);
    const rest = text.slice(keep);
    for (let i = 0; i < rest.length; i++) {
        editor.view.dispatch(editor.state.tr.insertText(rest[i]!, start + i));
        await p.moveTo(caretAt(editor, start + i + 1));
        await p.wait(TYPING.type);
    }
    return { from: range.from, to: range.from + text.length };
}

const connectTo = (editor: Editor, range: Range): Partial<Card> => ({
    connectors: [
        {
            id: uid(),
            target: {
                kind: "text",
                ...range,
                quote: editor.state.doc.textBetween(range.from, range.to, " "),
            },
        },
    ],
});

const SCENES: Scene[] = [
    {
        part: "Start",
        title: "Watch one revision, start to finish",
        body: "In about two minutes you’ll see a flat paragraph become a vivid one. Everything happens on its own, so just watch. Pause or skip whenever you like.",
        play: (p) => p.wait(5500),
    },
    {
        part: "Thought cards",
        title: "Note what you want to improve",
        body: (
            <>
                A <strong>thought card</strong> is a note to yourself, kept
                beside the page. The writer adds one that says{" "}
                <em>{TUTORIAL_INTENTION}</em>.
            </>
        ),
        yourself: (
            <>
                Choose <strong>+</strong> in the tools, then type.
            </>
        ),
        play: async (p) => {
            const { editor, demo } = p.context();
            const range = editor && findText(editor, TUTORIAL_PHRASE);
            if (!editor || !range) return;
            reveal(editor, range, undefined, !p.fast);
            await p.wait(600);
            p.mark('[aria-label="Add thought card"]');
            await p.moveTo('[aria-label="Add thought card"]');
            await p.press();
            p.mark(null);
            const id = demo.addCard(range.from);
            p.memory.card = id;
            await p.wait(300);
            reveal(editor, range, id, !p.fast);
            await p.wait(500);
            await p.moveTo(`[data-card-id="${id}"]`);
            p.hidePointer();
            for (
                let i = p.fast ? TUTORIAL_INTENTION.length : 1;
                i <= TUTORIAL_INTENTION.length;
                i++
            ) {
                const text = TUTORIAL_INTENTION.slice(0, i);
                p.context().demo.patchCard(id, {
                    text,
                    html: `<p>${text}</p>`,
                });
                await p.wait(TYPING.type);
            }
            reveal(editor, range, id, !p.fast);
            await p.wait(3200);
        },
    },
    {
        part: "Thought cards",
        title: "Connect it to the words",
        body: (
            <>
                The note is about “{TUTORIAL_PHRASE}”, so the writer connects
                the two. A line now joins the note to the exact words it’s for.
            </>
        ),
        yourself: (
            <>
                Select the words, choose <strong>⋯</strong> then{" "}
                <strong>Connect to thought</strong>, and pick the card.
            </>
        ),
        play: async (p) => {
            const { editor } = p.context();
            const range = editor && findText(editor, TUTORIAL_PHRASE);
            const card = p.memory.card;
            if (!editor || !range || !card) return;
            reveal(editor, range, undefined, !p.fast);
            await p.wait(600);
            await p.moveTo(caretAt(editor, range.from));
            await p.wait(300);
            p.highlight(range);
            await p.moveTo(caretAt(editor, range.to));
            await p.wait(1400);
            // On small screens the card sits below the text; bring it up before reaching for it.
            reveal(editor, range, card, !p.fast);
            await p.wait(600);
            await p.moveTo(`[data-card-id="${card}"]`);
            await p.press();
            p.highlight(null);
            p.context().demo.patchCard(card, connectTo(editor, range));
            p.hidePointer();
            await p.wait(4200);
        },
    },
    {
        part: "Thought cards",
        title: "Rewrite those words yourself",
        body: "Following the note, the writer swaps the vague words for specific ones. Writely never writes for you; the card is only a reminder.",
        yourself: "Type over the highlighted words.",
        play: async (p) => {
            const { editor } = p.context();
            const range = editor && findText(editor, TUTORIAL_PHRASE);
            const card = p.memory.card;
            if (!editor || !range || !card) return;
            reveal(editor, range, undefined, !p.fast);
            await p.wait(600);
            // The first letter stays, so the card keeps its connection while the words change.
            const next = await retype(p, editor, range, TUTORIAL_REVISION, 1);
            p.context().demo.patchCard(card, connectTo(editor, next));
            p.hidePointer();
            await p.wait(3600);
        },
    },
    {
        part: "Revision goals",
        title: "Set a goal for the next revision",
        body: (
            <>
                A card is about a few words. A <strong>revision goal</strong> is
                about a whole pass over the draft. The writer adds one:{" "}
                <em>{TUTORIAL_GOAL}</em>.
            </>
        ),
        yourself: (
            <>
                Open <strong>Checklist</strong> in the tools and choose{" "}
                <strong>Add goal</strong>.
            </>
        ),
        play: async (p) => {
            p.mark('[aria-label="Revision checklist"]');
            await p.click('[aria-label="Revision checklist"]');
            p.mark(null);
            await p.wait(900);
            await p.click('.drawer [aria-label="Add revision goal"]');
            await p.wait(500);
            await p.moveTo("#revision-goal");
            p.hidePointer();
            for (
                let i = p.fast ? TUTORIAL_GOAL.length : 1;
                i <= TUTORIAL_GOAL.length;
                i++
            ) {
                p.context().demo.setGoalText(TUTORIAL_GOAL.slice(0, i));
                await p.wait(TYPING.type);
            }
            await p.wait(500);
            await p.click('[role="dialog"] button[type="submit"]');
            await p.wait(2600);
        },
    },
    {
        part: "Revision goals",
        title: "Start the revision",
        body: "Choosing the goal starts a revision. Writely first keeps a copy of the text as it is now, so this pass can be compared, or undone, on its own.",
        yourself: (
            <>
                In <strong>Checklist</strong>, choose the goal.
            </>
        ),
        play: async (p) => {
            await p.click(".drawer .check-start:not(:disabled)");
            p.hidePointer();
            await p.wait(800);
            p.mark(".revision-actions");
            await p.wait(3800);
            p.mark(null);
        },
    },
    {
        part: "Revision goals",
        title: "Revise toward the goal",
        body: "This time the writer works on a different sentence. Instead of saying the visit felt relaxing, the new words let the reader feel it.",
        yourself:
            "Edit as usual; the bar above the tools shows which goal you’re on.",
        play: async (p) => {
            const { editor } = p.context();
            const range = editor && findText(editor, TUTORIAL_GOAL_PHRASE);
            if (!editor || !range) return;
            reveal(editor, range, undefined, !p.fast);
            await p.wait(700);
            p.highlight(range);
            await p.wait(1500);
            p.highlight(null);
            await retype(p, editor, range, TUTORIAL_GOAL_REVISION, 0);
            p.hidePointer();
            await p.wait(3200);
        },
    },
    {
        part: "Revision goals",
        title: "Save a draft",
        body: "Saving names this version after the goal and opens a comparison with the copy kept when the revision started.",
        yourself: (
            <>
                Choose <strong>Save draft</strong> above the tools, or press{" "}
                <kbd>Ctrl/⌘ + S</kbd>.
            </>
        ),
        play: async (p) => {
            await p.click(".revision-save");
            await p.wait(1400);
            await p.click('[role="dialog"] button[type="submit"]');
            p.hidePointer();
            await p.wait(2400);
        },
    },
    {
        part: "Revision goals",
        title: "See what this revision changed",
        body: (
            <>
                Only this pass shows: removed words are struck through under{" "}
                <strong>Before</strong>, new words are underlined under{" "}
                <strong>After</strong>. <strong>Restore this version</strong>{" "}
                can bring back the earlier text.
            </>
        ),
        yourself: (
            <>
                Open <strong>Drafts</strong> and choose <strong>Compare</strong>{" "}
                on any version.
            </>
        ),
        play: async (p) => {
            p.mark(".diff-column:nth-child(1)");
            revealChanges(1, !p.fast);
            await p.wait(4200);
            p.mark(".diff-column:nth-child(2)");
            revealChanges(2, !p.fast);
            await p.wait(5200);
            p.mark(null);
        },
    },
    {
        part: "Revision goals",
        title: "Finish the revision",
        body: "Finishing ticks the goal off in the checklist. The draft stays saved, ready for the next goal.",
        yourself: (
            <>
                Choose <strong>Finish revision</strong> above the tools.
            </>
        ),
        play: async (p) => {
            p.context().closeComparison();
            await p.wait(700);
            await p.click(".revision-finish");
            p.hidePointer();
            await p.wait(4200);
        },
    },
    {
        part: "Finished",
        title: "That’s the revision loop",
        body: "",
        play: async (p) => {
            p.context().closeComparison();
            p.context().demo.closePanel();
            p.hidePointer();
        },
    },
];

/** The loop, read back at the end so the viewer leaves with the whole picture. */
const RECAP = [
    ["Note it", "Put what you want to improve on a thought card."],
    ["Connect and rewrite", "Join the card to its words, then change them."],
    ["Set a goal", "Name what the next whole pass should do."],
    ["Revise", "Work toward that goal; Writely keeps a copy first."],
    ["Save and compare", "See exactly what changed, then finish."],
] as const;

const LAST = SCENES.length - 1;
const STEPS = SCENES.slice(1, LAST);

function Coach({
    context,
    onExit,
    onFinish,
    busy,
    error,
}: {
    context: CoachContext;
    onExit: () => void;
    onFinish: (choice: "own" | "save") => void;
    busy: boolean;
    error: string;
}) {
    const latest = useRef(context);
    useLayoutEffect(() => {
        latest.current = context;
    });
    const [scene, setScene] = useState(0);
    const [paused, setPaused] = useState(false);
    const [folded, setFolded] = useState(false);
    const [pointer, setPointer] = useState<Pointer | null>(null);
    const [pressing, setPressing] = useState(false);
    const [marked, setMarked] = useState<string | null>(null);
    const pausedRef = useRef(false);
    const run = useRef(0);

    const shown = useRef(false);
    const showPointer = (next: Pointer | null) => {
        shown.current = !!next;
        setPointer(next);
    };
    const highlight = (range: Range | null) => {
        const editor = latest.current.editor;
        if (!("highlights" in CSS)) return;
        if (!range || !editor) {
            CSS.highlights.delete("tutorial");
            return;
        }
        const start = editor.view.domAtPos(range.from),
            end = editor.view.domAtPos(range.to);
        const dom = document.createRange();
        dom.setStart(start.node, start.offset);
        dom.setEnd(end.node, end.offset);
        CSS.highlights.set("tutorial", new Highlight(dom));
    };

    const play = async (from: number) => {
        const id = ++run.current;
        const live = () => run.current === id;
        pausedRef.current = false;
        setPaused(false);
        setFolded(false);
        const pause = (ms: number, fast: boolean) =>
            new Promise<void>((resolve, reject) => {
                let left = fast ? 0 : ms,
                    last = performance.now();
                const tick = () => {
                    if (!live()) return reject(new Stopped());
                    const now = performance.now();
                    if (!pausedRef.current) left -= now - last;
                    last = now;
                    if (left <= 0) resolve();
                    else setTimeout(tick, Math.min(50, left));
                };
                // Fast mode still yields, so each step's changes reach the page before the next.
                setTimeout(tick, fast ? 16 : 0);
            });
        // Drawers and dialogs appear a render after the click that opens them.
        const find = async (selector: string) => {
            for (let tries = 0; tries < 60; tries++) {
                const el = document.querySelector<HTMLElement>(selector);
                if (el) return el;
                await pause(50, false);
            }
            return null;
        };
        const memory: Player["memory"] = {};
        const player = (fast: boolean): Player => {
            const moveTo = async (target: string | Pointer) => {
                if (fast) return;
                let point = target as Pointer;
                if (typeof target === "string") {
                    const el = await find(target);
                    if (!el) return;
                    // Tools can scroll sideways in the dock on small screens.
                    if (el.closest(".dock"))
                        el.scrollIntoView({
                            block: "nearest",
                            inline: "nearest",
                        });
                    const r = el.getBoundingClientRect();
                    point = {
                        x: r.left + Math.min(r.width / 2, 48),
                        y: r.top + Math.min(r.height / 2, 28),
                    };
                }
                // Arriving from nowhere starts just below, so the move is easy to follow.
                if (!shown.current && !point.caret) {
                    showPointer({ x: point.x + 40, y: point.y + 60 });
                    await new Promise((frame) =>
                        requestAnimationFrame(() =>
                            requestAnimationFrame(frame),
                        ),
                    );
                }
                showPointer(point);
                await pause(point.caret ? 0 : 750, false);
            };
            const press = async () => {
                if (fast) return;
                setPressing(true);
                await pause(320, false);
                setPressing(false);
            };
            return {
                fast,
                context: () => latest.current,
                wait: (ms) => pause(ms, fast),
                moveTo,
                press,
                click: async (selector) => {
                    const el = await find(selector);
                    if (!el) return;
                    await moveTo(selector);
                    await press();
                    el.click();
                },
                hidePointer: () => showPointer(null),
                mark: (selector) => setMarked(fast ? null : selector),
                highlight: (range) => highlight(fast ? null : range),
                memory,
            };
        };
        const { editor, demo } = latest.current;
        showPointer(null);
        setMarked(null);
        highlight(null);
        editor?.setEditable(false, false);
        demo.reset();
        try {
            await pause(0, true);
            for (let i = 0; i < from; i++) await SCENES[i]!.play(player(true));
            for (let i = from; i <= LAST; i++) {
                setScene(i);
                await SCENES[i]!.play(player(false));
            }
            editor?.setEditable(true, false);
        } catch (e) {
            if (!(e instanceof Stopped)) throw e;
        }
    };

    const stop = () => {
        run.current++;
        if ("highlights" in CSS) CSS.highlights.delete("tutorial");
    };
    useEffect(() => {
        const start = setTimeout(() => void play(0));
        return () => {
            clearTimeout(start);
            stop();
        };
        // Starts once; later runs begin from the controls.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Rings the real control. It may re-render or appear late, so look again as things change.
    useEffect(() => {
        if (!marked) return;
        let target: Element | null = null;
        const mark = () => {
            const next = document.querySelector(marked);
            if (next === target) return;
            target?.classList.remove("coach-target");
            next?.classList.add("coach-target");
            target = next;
        };
        mark();
        const observer = new MutationObserver(mark);
        observer.observe(document.body, { childList: true, subtree: true });
        return () => {
            observer.disconnect();
            target?.classList.remove("coach-target");
        };
    }, [marked]);

    const togglePause = () => {
        pausedRef.current = !pausedRef.current;
        setPaused(pausedRef.current);
    };
    const done = scene === LAST;
    const current = SCENES[scene]!;

    return (
        <>
            {pointer && (
                <div
                    aria-hidden="true"
                    className="pointer-events-none fixed top-0 left-0 z-[70] transition-transform duration-700 ease-[cubic-bezier(.45,0,.2,1)] motion-reduce:transition-none"
                    style={{
                        transform: `translate(${pointer.x}px, ${pointer.y}px)`,
                        transitionDuration: pointer.caret ? "0ms" : undefined,
                    }}
                >
                    {pointer.caret ? (
                        <span
                            className="bg-accent block w-0.5 -translate-x-px"
                            style={{ height: pointer.caret }}
                        />
                    ) : (
                        <span className="relative block">
                            <span
                                className={`border-accent absolute -top-5 -left-5 size-10 rounded-full border-2 transition-[opacity,scale] duration-300 ${pressing ? "scale-100 opacity-70" : "scale-50 opacity-0"}`}
                            />
                            <svg
                                width="22"
                                height="22"
                                viewBox="0 0 24 24"
                                className={`-translate-x-[3px] -translate-y-[2px] drop-shadow-[0_2px_3px_rgb(0_0_0/0.25)] transition-transform duration-150 ${pressing ? "scale-90" : ""}`}
                            >
                                <path
                                    d="M4 2.5v17.2l4.7-4.4 3 6.7 3-1.4-3-6.6h6.6z"
                                    fill="var(--ink, #1f1d1a)"
                                    stroke="var(--surface, #fff)"
                                    strokeWidth="1.5"
                                    strokeLinejoin="round"
                                />
                            </svg>
                        </span>
                    )}
                </div>
            )}
            <aside
                aria-label="Tutorial"
                className="tutorial-coach border-line text-ink fixed inset-x-3 bottom-[calc(var(--dock-height,64px)+28px)] z-[60] mx-auto max-w-[480px] overflow-hidden rounded-2xl border bg-[var(--raised)] shadow-[0_12px_40px_color-mix(in_srgb,var(--shadow)_18%,transparent)] max-[720px]:bottom-[calc(var(--dock-height,64px)+20px)] min-[1400px]:top-[68px] min-[1400px]:right-4 min-[1400px]:bottom-auto min-[1400px]:left-auto min-[1400px]:w-[340px] [.comparison-mode_&]:bottom-[84px] min-[1400px]:[.comparison-mode_&]:top-auto min-[1400px]:[.comparison-mode_&]:right-auto min-[1400px]:[.comparison-mode_&]:left-4"
            >
                <div className="px-5 pt-4 pb-4 max-[720px]:px-4 max-[720px]:pt-3.5">
                    <div className="flex items-center justify-between gap-3">
                        <p className="text-accent m-0 truncate text-[11.5px] font-semibold tracking-[0.06em] uppercase">
                            {current.part}
                            {!done && scene > 0 && (
                                <span className="text-muted font-medium tracking-normal normal-case">
                                    {" "}
                                    · Step {scene} of {STEPS.length}
                                </span>
                            )}
                        </p>
                        <div className="-mr-2 flex shrink-0">
                            <button
                                aria-label={
                                    folded ? "Show details" : "Hide details"
                                }
                                title={folded ? "Show details" : "Hide details"}
                                aria-expanded={!folded}
                                className="size-8! min-h-8! min-w-8! p-0!"
                                onClick={() => setFolded(!folded)}
                            >
                                {folded ? (
                                    <ChevronUp size={15} />
                                ) : (
                                    <ChevronDown size={15} />
                                )}
                            </button>
                            <button
                                aria-label="Exit tutorial"
                                title="Exit tutorial"
                                className="size-8! min-h-8! min-w-8! p-0!"
                                onClick={onExit}
                            >
                                <X size={15} />
                            </button>
                        </div>
                    </div>
                    <h2
                        className="m-0 mt-1 flex items-center gap-2 text-[18px] leading-snug font-semibold tracking-[-0.01em] max-[720px]:text-[16.5px]"
                        aria-live="polite"
                    >
                        {done && (
                            <Check
                                size={18}
                                className="text-success shrink-0"
                                aria-hidden="true"
                            />
                        )}
                        {current.title}
                    </h2>
                    {!folded &&
                        (done ? (
                            <ol
                                data-detail
                                className="m-0 mt-3 grid list-none gap-2 p-0"
                            >
                                {RECAP.map(([name, what], i) => (
                                    <li
                                        key={name}
                                        className="flex gap-2.5 text-[13px] leading-snug"
                                    >
                                        <span className="bg-tint text-accent flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums">
                                            {i + 1}
                                        </span>
                                        <span className="text-muted">
                                            <strong className="text-ink font-medium">
                                                {name}.
                                            </strong>{" "}
                                            {what}
                                        </span>
                                    </li>
                                ))}
                            </ol>
                        ) : (
                            <p
                                data-detail
                                className="text-muted [&_strong]:text-ink m-0 mt-2 text-[14px] leading-relaxed max-[720px]:text-[13.5px] [&_strong]:font-medium"
                            >
                                {current.body}
                            </p>
                        ))}
                </div>
                {!folded && current.yourself && (
                    <div
                        data-detail
                        className="border-line border-t bg-[color-mix(in_srgb,var(--text)_3%,var(--raised))] px-5 py-3 max-[720px]:px-4"
                    >
                        <p className="text-muted m-0 text-[11px] font-semibold tracking-[0.06em] uppercase">
                            In your own drafts
                        </p>
                        <p className="text-ink m-0 mt-1 text-[13px] leading-snug [&_strong]:font-semibold">
                            {current.yourself}
                        </p>
                    </div>
                )}
                <div className="border-line flex items-center gap-3 border-t px-3 py-2.5">
                    {done ? (
                        <div className="flex flex-1 flex-wrap items-center gap-2 px-1">
                            <button
                                className={`${PRIMARY_BUTTON} min-h-9! text-[12.5px]!`}
                                disabled={busy}
                                onClick={() => onFinish("own")}
                            >
                                Start my own draft
                            </button>
                            <button
                                className="border-line! text-ink! min-h-9! text-[12.5px]!"
                                disabled={busy}
                                onClick={() => onFinish("save")}
                            >
                                Save this sample
                            </button>
                            <button
                                className="text-ink! ml-auto min-h-9! gap-1.5! text-[12.5px]!"
                                disabled={busy}
                                onClick={() => void play(0)}
                            >
                                <RotateCcw size={14} aria-hidden="true" />
                                Watch again
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="flex shrink-0 items-center">
                                <button
                                    aria-label="Previous step"
                                    title="Previous step"
                                    className="size-9! min-h-9! min-w-9! p-0!"
                                    disabled={scene === 0}
                                    onClick={() =>
                                        void play(Math.max(0, scene - 1))
                                    }
                                >
                                    <SkipBack size={15} />
                                </button>
                                <button
                                    aria-label={paused ? "Play" : "Pause"}
                                    title={paused ? "Play" : "Pause"}
                                    className={`${PRIMARY_BUTTON} size-9! min-h-9! min-w-9! rounded-full! p-0!`}
                                    onClick={togglePause}
                                >
                                    {paused ? (
                                        <Play size={15} aria-hidden="true" />
                                    ) : (
                                        <Pause size={15} aria-hidden="true" />
                                    )}
                                </button>
                                <button
                                    aria-label="Next step"
                                    title="Next step"
                                    className="size-9! min-h-9! min-w-9! p-0!"
                                    onClick={() => void play(scene + 1)}
                                >
                                    <SkipForward size={15} />
                                </button>
                            </div>
                            <ol
                                className="m-0 flex min-w-0 flex-1 list-none gap-1 p-0 pr-1"
                                aria-label={`Progress: step ${Math.max(1, scene)} of ${STEPS.length}`}
                            >
                                {STEPS.map((step, i) => (
                                    <li
                                        key={step.title}
                                        className={`flex flex-1 ${step.part !== STEPS[i - 1]?.part && i > 0 ? "ml-1.5" : ""}`}
                                    >
                                        <button
                                            title={step.title}
                                            aria-label={`Watch step ${i + 1}: ${step.title}`}
                                            aria-current={
                                                i + 1 === scene
                                                    ? "step"
                                                    : undefined
                                            }
                                            onClick={() => void play(i + 1)}
                                            className="group h-6! min-h-6! w-full min-w-0! flex-1 rounded-none! border-0! bg-transparent! p-0! hover:bg-transparent!"
                                        >
                                            <span
                                                className={`block h-1 w-full rounded-full transition-colors group-hover:opacity-80 ${i + 1 <= scene ? "bg-accent" : "bg-line"}`}
                                            />
                                        </button>
                                    </li>
                                ))}
                            </ol>
                        </>
                    )}
                </div>
                {error && (
                    <p
                        role="alert"
                        className="text-danger m-0 px-5 pb-3 text-[12px]"
                    >
                        {error}
                    </p>
                )}
            </aside>
        </>
    );
}

/**
 * The tutorial plays the revision loop in the real editor, on a sandbox copy of the sample. It
 * stays in this browser; nothing reaches the account unless the writer saves it at the end.
 */
export default function Tutorial({
    user,
    preferences,
}: {
    user: AccountUser;
    preferences: Preferences;
}) {
    const router = useRouter();
    const key = tutorialStorageKey(user.id);
    const [initial] = useState(makeTutorialWorkspace);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const create = api.documents.create.useMutation();

    const discard = () => {
        try {
            localStorage.removeItem(key);
            // Left by the hands-on tutorial this one replaced.
            localStorage.removeItem(key + ":step");
        } catch {
            /* Nothing to discard. */
        }
    };
    const exit = () => {
        discard();
        router.push("/");
    };
    const finish = async (choice: "own" | "save", doc: WritingDocument) => {
        setBusy(true);
        setError("");
        const created = choice === "save" ? tutorialAsDocument(doc) : makeDoc();
        try {
            await create.mutateAsync({ documents: [created] });
            discard();
            router.push(`/d/${created.id}`);
        } catch {
            setBusy(false);
            setError("Couldn’t save to your documents. Please try again.");
        }
    };

    return (
        <WritelyApp
            initialWorkspace={initial}
            user={user}
            preferences={preferences}
            tutorial={{
                storageKey: key,
                initial,
                onExit: exit,
                coach: (context) => (
                    <Coach
                        context={context}
                        onExit={exit}
                        onFinish={(choice) => void finish(choice, context.doc)}
                        busy={busy}
                        error={error}
                    />
                ),
            }}
        />
    );
}
