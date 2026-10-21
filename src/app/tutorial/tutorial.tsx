"use client";
import type { Editor } from "@tiptap/react";
import {
    Check,
    X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
    useEffect,
    useState,
} from "react";
import { makeDoc } from "~/lib/writely/model";
import { htmlToPlainText } from "~/lib/writely/plain-text";
import type { Preferences } from "~/lib/writely/preferences";
import {
    TUTORIAL_PHRASE,
    makeTutorialWorkspace,
    tutorialAsDocument,
    tutorialStorageKey,
} from "~/lib/writely/tutorial";
import type {
    WorkspaceData,
    WritingDocument,
} from "~/lib/writely/types";
import { api } from "~/trpc/react";
import type { AccountUser } from "../components/app-header";
import { PRIMARY_BUTTON } from "~/config/ui";
import WritelyApp, {
    type CoachContext,
} from "../components/writely/writely-app";

/**
 * What: The names of the tutorial's steps, in order. The first four make up
 * the progress bar; the last marks the end.
 *
 * Used in:
 * - src/app/tutorial/tutorial.tsx (Coach)
 *
 * Effect: Changes the step names read out for each segment of the progress
 * bar. The tutorial's logic expects four steps plus "Done".
 */
const STEPS = [
    "Add an intention",
    "Connect it to the text",
    "Revise the phrase",
    "Save and compare",
    "Done",
] as const;

/**
 * What: For each tutorial step, the real button the coach mark points at,
 * found by its accessible label. Coach marks point at the real controls
 * instead of copying them.
 *
 * Used in:
 * - src/app/tutorial/tutorial.tsx (Coach)
 *
 * Effect: Changing a label points the coach mark at a different button. If a
 * button's aria-label changes in the app, update it here too.
 */
const TARGETS: Record<number, string> = {
    0: '[aria-label="Add thought card"]',
    1: '[aria-label="More formatting"]',
    3: '[aria-label="Saved drafts"]',
};

function readSaved(key: string): WorkspaceData | null {
    try {
        const data = JSON.parse(
            localStorage.getItem(key) ?? "null",
        ) as WorkspaceData | null;
        if (data?.docs?.length === 1)
            return { ...data, active: data.docs[0]!.id };
    } catch {
        /* Start fresh. */
    }
    return null;
}

/** Where the sample phrase is in the editor, if it's still there. */
function findPhrase(editor: Editor) {
    let range: { from: number; to: number } | null = null;
    editor.state.doc.descendants((node, pos) => {
        if (range || !node.isText) return !range;
        const index = node.text!.toLowerCase().indexOf(TUTORIAL_PHRASE);
        if (index >= 0)
            range = {
                from: pos + index,
                to: pos + index + TUTORIAL_PHRASE.length,
            };
        return false;
    });
    return range as { from: number; to: number } | null;
}

/** How far the writer has got, read from the sandbox document itself. */
function progress(doc: WritingDocument) {
    const card = doc.cards.find((c) => c.text.trim());
    const connected = doc.cards.some((c) =>
        c.connectors?.some((link) =>
            link.target.quote.toLowerCase().includes("nice"),
        ),
    );
    const revised = !htmlToPlainText(doc.html)
        .toLowerCase()
        .includes(TUTORIAL_PHRASE);
    const saved = doc.drafts.length > 1;
    return [!!card, connected, revised, saved];
}

function Coach({
    context,
    step,
    setStep,
    onExit,
    onFinish,
    busy,
    error,
}: {
    context: CoachContext;
    step: number;
    setStep: (step: number) => void;
    onExit: () => void;
    onFinish: (choice: "own" | "save") => void;
    busy: boolean;
    error: string;
}) {
    const { doc, editor, comparing } = context;
    const done = progress(doc);
    const [seenComparison, setSeenComparison] = useState(false);
    if (comparing && step === 3 && done[3] && !seenComparison)
        setSeenComparison(true);

    // Steps only move forward; going back over a finished step would be confusing.
    useEffect(() => {
        if (step < 3 && done[step]) setStep(step + 1);
    }, [step, done, setStep]);

    useEffect(() => {
        const selector = TARGETS[step];
        if (!selector) return;
        let marked: Element | null = null;
        // The connect button only exists while text is selected, so look again as things change.
        const mark = () => {
            const target = document.querySelector(selector);
            if (target === marked) return;
            marked?.classList.remove("coach-target");
            target?.classList.add("coach-target");
            marked = target;
        };
        mark();
        const observer = new MutationObserver(mark);
        observer.observe(document.body, { childList: true, subtree: true });
        return () => {
            observer.disconnect();
            marked?.classList.remove("coach-target");
        };
    }, [step]);

    const selectPhrase = () => {
        if (!editor) return;
        const range = findPhrase(editor);
        if (range) editor.chain().focus().setTextSelection(range).run();
    };

    let title: string,
        body: React.ReactNode,
        action: React.ReactNode = null;
    switch (step) {
        case 0:
            title = "Name what you want to improve";
            body = (
                <>
                    Thought cards hold your intentions for a revision. Choose{" "}
                    <strong>Add thought card</strong> (+) in the tools, then
                    type <em>Use more descriptive words</em> and click outside
                    the card.
                </>
            );
            break;
        case 1:
            title = "Point it at the words";
            body = (
                <>
                    Select “{TUTORIAL_PHRASE}”, open{" "}
                    <strong>More formatting</strong> (⋯) in the toolbar that
                    appears, choose <strong>Connect to thought</strong>, then
                    click your card. A line will join them.
                </>
            );
            action = (
                <button
                    className="text-accent! text-[12px]!"
                    onClick={selectPhrase}
                >
                    Select the phrase for me
                </button>
            );
            break;
        case 2:
            title = "Now rewrite it, your way";
            body =
                "Replace the vague phrase with something specific: what did the place look, sound or smell like? Writely won’t write it for you.";
            break;
        case 3:
            title = done[3] && comparing ? "What changed" : "Keep this version";
            body =
                done[3] && comparing ? (
                    <>
                        Removed words are struck through on the left; your new
                        words are underlined on the right.{" "}
                        <strong>Restore this version</strong> brings back
                        whichever version is on the right, and always keeps your
                        current text as a version first.
                    </>
                ) : done[3] ? (
                    <>
                        Open <strong>Saved drafts</strong> and choose{" "}
                        <strong>Compare</strong> on your version to see the
                        difference.
                    </>
                ) : (
                    <>
                        Press <kbd>Ctrl/⌘ + S</kbd>, or open{" "}
                        <strong>Saved drafts</strong> and choose{" "}
                        <strong>Save named draft</strong>. Writely compares it
                        with the original.
                    </>
                );
            if (done[3] && (comparing || seenComparison))
                action = (
                    <button
                        className={`${PRIMARY_BUTTON} min-h-9! text-[12px]!`}
                        onClick={() => {
                            context.closeComparison();
                            setStep(4);
                        }}
                    >
                        Next
                    </button>
                );
            break;
        default:
            title = "That’s the revision loop";
            body =
                "Name an intention, connect it to the words, revise, then save and compare. That’s all there is to it.";
            action = (
                <div className="flex flex-wrap gap-2">
                    <button
                        className={`${PRIMARY_BUTTON} min-h-9! text-[12px]!`}
                        disabled={busy}
                        onClick={() => onFinish("own")}
                    >
                        Start my own draft
                    </button>
                    <button
                        className="border-line! text-ink! min-h-9! text-[12px]!"
                        disabled={busy}
                        onClick={() => onFinish("save")}
                    >
                        Save this sample to my drafts
                    </button>
                </div>
            );
    }

    return (
        <aside
            aria-label="Tutorial"
            className="tutorial-coach border-line text-ink fixed top-[68px] left-5 z-[60] w-[340px] max-w-[calc(100vw-40px)] rounded-xl border bg-[var(--raised)] p-4 pt-3 shadow-[0_8px_32px_color-mix(in_srgb,var(--shadow)_14%,transparent)] max-sm:top-[60px] max-sm:right-3 max-sm:left-3 max-sm:w-auto"
        >
            <div className="flex items-center gap-2">
                <ol
                    className="m-0 flex flex-1 list-none gap-1 p-0"
                    aria-label={
                        step < 4
                            ? `Progress: step ${step + 1} of 4`
                            : "Progress: finished"
                    }
                >
                    {STEPS.slice(0, 4).map((label, i) => (
                        <li
                            key={label}
                            title={label}
                            aria-current={i === step ? "step" : undefined}
                            className={`h-1 flex-1 rounded-full ${i <= step || step === 4 ? "bg-accent" : "bg-line"}`}
                        >
                            <span className="sr-only">
                                {label}
                                {i < step ? " (done)" : ""}
                            </span>
                        </li>
                    ))}
                </ol>
                <button
                    aria-label="Exit tutorial"
                    title="Exit tutorial"
                    className="-mr-2 size-9! min-h-9! min-w-9! p-0!"
                    onClick={onExit}
                >
                    <X size={15} />
                </button>
            </div>
            <h2
                className="mt-3 flex items-center gap-1.5 text-[15px] font-semibold"
                role="status"
            >
                {step === 4 && (
                    <Check
                        size={16}
                        className="text-success"
                        aria-hidden="true"
                    />
                )}
                {title}
            </h2>
            <p className="text-muted [&_strong]:text-ink mt-1.5 text-[13px] leading-relaxed [&_strong]:font-medium">
                {body}
            </p>
            {action && <div className="mt-3">{action}</div>}
            {error && (
                <p role="alert" className="text-danger mt-2 text-[12px]">
                    {error}
                </p>
            )}
        </aside>
    );
}

/**
 * The tutorial runs the real editor on a sandbox copy of the sample. Progress stays in this
 * browser so a reload resumes it; nothing reaches the account unless the writer saves it.
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
    const stepKey = key + ":step";
    const [initial] = useState(() => readSaved(key) ?? makeTutorialWorkspace());
    const [step, setStepState] = useState(() => {
        try {
            return Math.min(4, Number(localStorage.getItem(stepKey)) || 0);
        } catch {
            return 0;
        }
    });
    const setStep = (next: number) => {
        setStepState((current) => Math.max(current, next));
        try {
            localStorage.setItem(stepKey, String(next));
        } catch {
            /* Progress just won't survive a reload. */
        }
    };
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const create = api.documents.create.useMutation();

    const discard = () => {
        try {
            localStorage.removeItem(key);
            localStorage.removeItem(stepKey);
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
                        step={step}
                        setStep={setStep}
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
