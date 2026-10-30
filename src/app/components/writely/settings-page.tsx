"use client";
import * as Tooltip from "@radix-ui/react-tooltip";
import {
    ChevronRight,
    FileDown,
    Keyboard,
    ListChecks,
    Mail,
    MessageSquare,
    Palette,
    Pencil,
    PenLine,
    Plus,
    Trash2,
    UserRound,
    type LucideIcon,
} from "lucide-react";
import {
    useEffect,
    useRef,
    useState,
    type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import { uid } from "~/lib/writely/model";
import type { Preferences } from "~/lib/writely/preferences";
import type { RevisionGoal } from "~/lib/writely/types";
import { authClient } from "~/server/better-auth/client";
import { api } from "~/trpc/react";
import {
    AppHeader,
    logOut,
    type AccountUser,
} from "../app-header";
import { EmptyState } from "../empty-state";
import { usePreferences } from "../preferences";
import { AppearanceSettings } from "./appearance-settings";
import { ExportSettings } from "./export-settings";
import { FeedbackSettings } from "./feedback-settings";
import {
    SettingsCard,
    SettingsSection,
} from "./settings-controls";
import { ShortcutList } from "./shortcuts";
import { WritingSettings } from "./writing-settings";
import {
    Button,
    DeleteDialog,
    Dialog,
} from "../ui";
import {
    DANGER_BUTTON,
    DIALOG_ACTIONS,
    PRIMARY_BUTTON,
} from "~/config/ui";

export type { AccountUser };

/**
 * What: The sections listed in the Settings sidebar, as the name used in the
 * address (#name), the label shown and its icon.
 *
 * Used in:
 * - src/app/components/writely/settings-page.tsx (SettingsPage)
 *
 * Effect: Changes the order and labels of the sidebar buttons. The first one
 * opens when no section is named in the address.
 */
const SECTIONS = [
    ["appearance", "Appearance", Palette],
    ["writing", "Writing", PenLine],
    ["export", "Document export", FileDown],
    ["checklist", "Revision checklist", ListChecks],
    ["shortcuts", "Keyboard shortcuts", Keyboard],
    ["feedback", "Feedback", MessageSquare],
    ["account", "Account", UserRound],
] as const satisfies readonly (readonly [string, string, LucideIcon])[];

type Section = (typeof SECTIONS)[number][0];

const sectionFromHash = (): Section | undefined =>
    SECTIONS.find(([value]) => `#${value}` === window.location.hash)?.[0];

export default function SettingsPage({
    user,
    initialPreferences,
    initialGoals,
}: {
    user: AccountUser;
    initialPreferences: Preferences;
    initialGoals: RevisionGoal[];
}) {
    const [preferences, setPreferences] = usePreferences(initialPreferences);
    const heading = useRef<HTMLHeadingElement>(null);
    useEffect(() => {
        heading.current?.focus({ preventScroll: true });
    }, []);

    // The open section lives in the address, so reloads and links land on it. With none named,
    // wide screens show the first section and narrow screens show the list of sections.
    const [section, setSection] = useState<Section | null>(null);
    const shown = section ?? SECTIONS[0][0];
    useEffect(() => {
        const sync = () => {
            const next = sectionFromHash() ?? null;
            setSection(next);
        };
        sync();
        window.addEventListener("hashchange", sync);
        return () => window.removeEventListener("hashchange", sync);
    }, []);
    const openSection = (value: Section) => {
        // From the narrow list, opening a section is a step the phone's back gesture should undo.
        const fromList =
            section === null && window.matchMedia("(max-width: 860px)").matches;
        setSection(value);
        if (fromList) {
            pushedSection.current = true;
            window.history.pushState(null, "", `#${value}`);
        } else window.history.replaceState(null, "", `#${value}`);
    };

    // On a phone, the header's back arrow leaves an open section for the list of sections; from
    // the list (or on a wide screen) it returns to the documents.
    const router = useRouter();
    const pushedSection = useRef(false);
    const [narrow, setNarrow] = useState(false);
    useEffect(() => {
        const query = window.matchMedia("(max-width: 860px)");
        const update = () => setNarrow(query.matches);
        update();
        query.addEventListener("change", update);
        return () => query.removeEventListener("change", update);
    }, []);
    const backToList = narrow && section !== null;
    const goBack = () => {
        if (!backToList) {
            router.push("/");
        } else if (pushedSection.current) {
            pushedSection.current = false;
            window.history.back();
        } else {
            window.history.replaceState(null, "", window.location.pathname);
            setSection(null);
        }
    };

    // Universal goals save straight away; the editor reads them when a document opens.
    const [goals, setGoals] = useState(initialGoals);
    const [goalsError, setGoalsError] = useState("");
    const saveGoals = api.workspace.save.useMutation();
    const changeGoals = (next: RevisionGoal[]) => {
        const previous = goals;
        setGoals(next);
        setGoalsError("");
        saveGoals.mutate(
            { goals: next },
            {
                onError: () => {
                    setGoals(previous);
                    setGoalsError(
                        "Couldn’t save that change. Please try again.",
                    );
                },
            },
        );
    };
    const [goalDialog, setGoalDialog] = useState<{
        goal: RevisionGoal | null;
    } | null>(null);
    const [goalText, setGoalText] = useState("");
    const submitGoal = (e: FormEvent) => {
        e.preventDefault();
        const text = goalText.trim();
        if (!text || !goalDialog) return;
        const editing = goalDialog.goal;
        changeGoals(
            editing
                ? goals.map((g) => (g.id === editing.id ? { ...g, text } : g))
                : [...goals, { id: uid(), text }],
        );
        setGoalDialog(null);
    };

    const [dialog, setDialog] = useState<"delete-account" | null>(null);
    const [goalToDelete, setGoalToDelete] = useState<RevisionGoal | null>(null);
    const [confirmation, setConfirmation] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const deleteAccount = async () => {
        if (confirmation !== "delete") return;
        setBusy(true);
        const { error } = await authClient.deleteUser();
        if (error) {
            setBusy(false);
            setDialog(null);
            setError(
                error.message ??
                    "Couldn’t delete your account. Please try again.",
            );
            return;
        }
        try {
            for (const key of Object.keys(localStorage))
                if (key.startsWith(`writely.unsaved.`) && key.includes(user.id))
                    localStorage.removeItem(key);
        } catch {
            /* Storage may be unavailable. */
        }
        window.location.href = "/sign-in";
    };

    return (
        <Tooltip.Provider delayDuration={450}>
            <div className="bg-paper text-ink min-h-dvh">
                <AppHeader
                    back={{
                        href: backToList ? "/settings" : "/",
                        label: backToList
                            ? "Back to Settings"
                            : "Back to Documents",
                        onClick: goBack,
                    }}
                />
                <main
                    className="grid min-h-[calc(100dvh-76px)] grid-cols-[minmax(240px,300px)_minmax(0,1fr)] max-[860px]:grid-cols-1 max-[860px]:content-start"
                    aria-labelledby="settings-title"
                >
                    {/* On narrow screens the sidebar becomes a list of sections, and a section opens in its own view. */}
                    <aside
                        className={`border-line flex min-w-0 flex-col gap-6 self-stretch border-r px-6 pt-4 pb-10 max-[860px]:gap-3 max-[860px]:border-r-0 max-[860px]:pt-2 max-sm:px-4 ${
                            section ? "max-[860px]:hidden" : ""
                        }`}
                    >
                        <h1
                            id="settings-title"
                            tabIndex={-1}
                            ref={heading}
                            className="sr-only"
                        >
                            Settings
                        </h1>
                        <nav aria-label="Settings sections" className="min-w-0">
                            <ul className="m-0 flex list-none flex-col gap-1 p-0 max-[860px]:gap-0">
                                {SECTIONS.map(([value, label, Icon]) => {
                                    const current = shown === value;
                                    return (
                                        <li
                                            key={value}
                                            className="border-line max-[860px]:border-b max-[860px]:last:border-b-0"
                                        >
                                            <button
                                                aria-current={
                                                    current ? "page" : undefined
                                                }
                                                onClick={() =>
                                                    openSection(value)
                                                }
                                                className={`max-[860px]:text-ink! h-11! min-h-11! w-full! justify-start! gap-3! rounded-xl! border-0! px-3.5! text-[14px]! shadow-none! max-[860px]:h-14! max-[860px]:min-h-14! max-[860px]:rounded-none! max-[860px]:bg-transparent! max-[860px]:px-1! max-[860px]:text-[15px]! max-[860px]:font-normal! ${
                                                    current
                                                        ? "bg-tint! text-ink! font-semibold"
                                                        : "text-muted! hover:text-ink! bg-transparent! hover:bg-[var(--control-hover)]!"
                                                }`}
                                            >
                                                <span className="max-[860px]:bg-surface max-[860px]:border-line contents max-[860px]:flex max-[860px]:size-9 max-[860px]:shrink-0 max-[860px]:items-center max-[860px]:justify-center max-[860px]:rounded-xl max-[860px]:border">
                                                    <Icon
                                                        size={18}
                                                        strokeWidth={1.6}
                                                        aria-hidden="true"
                                                        className={
                                                            current
                                                                ? "text-ink shrink-0"
                                                                : "text-muted max-[860px]:text-ink shrink-0"
                                                        }
                                                    />
                                                </span>
                                                <span className="min-w-0 flex-1 truncate text-left">
                                                    {label}
                                                </span>
                                                <ChevronRight
                                                    size={17}
                                                    strokeWidth={1.6}
                                                    aria-hidden="true"
                                                    className="text-muted hidden shrink-0 max-[860px]:block"
                                                />
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        </nav>
                    </aside>

                    <div
                        className={`flex w-full max-w-[820px] min-w-0 flex-col px-12 pt-4 pb-24 max-[1100px]:px-8 max-[860px]:px-6 max-[860px]:pt-2 max-sm:px-4 ${
                            section ? "" : "max-[860px]:hidden"
                        }`}
                    >
                        {shown === "appearance" && (
                            <SettingsSection
                                id="appearance-title"
                                title="Appearance"
                                hint="How the page looks while you write. Each choice shows its effect, and changes apply to every document straight away."
                            >
                                <AppearanceSettings
                                    preferences={preferences}
                                    setPreferences={setPreferences}
                                />
                            </SettingsSection>
                        )}
                        {shown === "writing" && (
                            <SettingsSection
                                id="writing-title"
                                title="Writing"
                                hint="Aids that change how typing feels, not how the page looks."
                            >
                                <WritingSettings
                                    preferences={preferences}
                                    setPreferences={setPreferences}
                                />
                            </SettingsSection>
                        )}
                        {shown === "export" && (
                            <SettingsSection
                                id="export-title"
                                title="Document export"
                                hint="Exports contain only the text and its formatting: no thought cards, connections or checklists. The original is never changed."
                            >
                                <ExportSettings
                                    preferences={preferences}
                                    setPreferences={setPreferences}
                                />
                            </SettingsSection>
                        )}
                        {shown === "checklist" && (
                            <SettingsSection
                                id="universal-title"
                                title="Revision checklist"
                                hint="Universal goals appear in every draft, in this order. Completion stays with each draft."
                                action={
                                    <button
                                        className="border-line! h-9! min-h-9! gap-1.5! rounded-lg! border! px-3! text-[12.5px]! max-sm:w-full!"
                                        onClick={() => {
                                            setGoalText("");
                                            setGoalDialog({ goal: null });
                                        }}
                                    >
                                        <Plus size={14} aria-hidden="true" />
                                        Add goal
                                    </button>
                                }
                            >
                                {goals.length ? (
                                    <SettingsCard>
                                        <ol className="m-0 list-none p-0">
                                            {goals.map((goal, i) => (
                                                <li
                                                    key={goal.id}
                                                    data-goal={goal.id}
                                                    className="border-line flex min-h-14 items-center gap-0.5 border-b py-1.5 pr-2 pl-5 text-[14px] last:border-b-0"
                                                >
                                                    <span
                                                        aria-hidden="true"
                                                        className="text-muted w-6 shrink-0 text-[12px] tabular-nums"
                                                    >
                                                        {i + 1}
                                                    </span>
                                                    <span className="min-w-0 flex-1 py-2 pr-2">
                                                        {goal.text}
                                                    </span>
                                                    <Button
                                                        icon={Pencil}
                                                        label={`Edit universal goal: ${goal.text}`}
                                                        onClick={() => {
                                                            setGoalText(
                                                                goal.text,
                                                            );
                                                            setGoalDialog({
                                                                goal,
                                                            });
                                                        }}
                                                    />
                                                    <Button
                                                        icon={Trash2}
                                                        label={`Delete universal goal: ${goal.text}`}
                                                        className="hover:text-danger!"
                                                        onClick={() =>
                                                            setGoalToDelete(
                                                                goal,
                                                            )
                                                        }
                                                    />
                                                </li>
                                            ))}
                                        </ol>
                                    </SettingsCard>
                                ) : (
                                    <EmptyState
                                        compact
                                        inlineHeader
                                        icon={ListChecks}
                                        title="No universal goals yet"
                                        body="Use Add goal to create one. Each goal shows up in every draft’s checklist."
                                    />
                                )}
                                {goalsError && (
                                    <p
                                        role="alert"
                                        className="text-danger text-[13px]"
                                    >
                                        {goalsError}
                                    </p>
                                )}
                            </SettingsSection>
                        )}
                        {shown === "shortcuts" && (
                            <SettingsSection
                                id="shortcuts-title"
                                title="Keyboard shortcuts"
                                hint="Press Ctrl/⌘ + / while writing to see these beside the page."
                            >
                                <SettingsCard className="px-5 py-4">
                                    <ShortcutList columns={2} />
                                </SettingsCard>
                            </SettingsSection>
                        )}
                        {shown === "feedback" && (
                            <SettingsSection
                                id="feedback-title"
                                title="Feedback"
                                hint="Tell us what’s working, what isn’t, or what you wish Writely did. Every message is read."
                            >
                                <FeedbackSettings />
                            </SettingsSection>
                        )}
                        {shown === "account" && (
                            <SettingsSection id="account-title" title="Account">
                                <SettingsCard>
                                    <dl className="account-details m-0">
                                        {(
                                            [
                                                [UserRound, "Name", user.name],
                                                [Mail, "Email", user.email],
                                            ] as const
                                        ).map(([Icon, label, value]) => (
                                            <div
                                                key={label}
                                                className="border-line flex min-h-14 items-center gap-3 border-b px-5 text-[14px] last:border-b-0"
                                            >
                                                <Icon
                                                    size={17}
                                                    strokeWidth={1.4}
                                                    className="text-muted shrink-0"
                                                    aria-hidden="true"
                                                />
                                                <dt className="text-muted w-14 shrink-0 text-[12px]">
                                                    {label}
                                                </dt>
                                                <dd className="m-0 min-w-0 truncate">
                                                    {value}
                                                </dd>
                                            </div>
                                        ))}
                                    </dl>
                                    <div className="flex flex-wrap justify-end gap-2 px-5 py-4">
                                        <button
                                            className="border-line! text-ink! h-9! min-h-9! border! px-3.5! text-[13px]!"
                                            onClick={() => void logOut()}
                                        >
                                            Log out
                                        </button>
                                        <button
                                            className="border-line! text-danger! h-9! min-h-9! border! px-3.5! text-[13px]!"
                                            onClick={() => {
                                                setConfirmation("");
                                                setDialog("delete-account");
                                            }}
                                        >
                                            Delete account
                                        </button>
                                    </div>
                                </SettingsCard>
                                {error && (
                                    <p
                                        role="alert"
                                        className="text-danger text-[13px]"
                                    >
                                        {error}
                                    </p>
                                )}
                            </SettingsSection>
                        )}
                    </div>
                </main>

                {goalDialog && (
                    <Dialog
                        title={
                            goalDialog.goal
                                ? "Edit universal goal"
                                : "Add universal goal"
                        }
                        onClose={() => setGoalDialog(null)}
                    >
                        <form onSubmit={submitGoal}>
                            <label htmlFor="universal-goal">Goal</label>
                            <input
                                id="universal-goal"
                                value={goalText}
                                onChange={(e) => setGoalText(e.target.value)}
                                maxLength={240}
                                required
                                placeholder="What would you like to improve?"
                            />
                            <div className={DIALOG_ACTIONS}>
                                <button
                                    type="button"
                                    onClick={() => setGoalDialog(null)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className={PRIMARY_BUTTON}
                                    disabled={!goalText.trim()}
                                >
                                    {goalDialog.goal ? "Save goal" : "Add goal"}
                                </button>
                            </div>
                        </form>
                    </Dialog>
                )}
                {goalToDelete && (
                    <DeleteDialog
                        title="Delete universal goal?"
                        description={
                            <>
                                Delete {goalToDelete.text} from your universal
                                goals?
                            </>
                        }
                        onClose={() => setGoalToDelete(null)}
                        onConfirm={() => {
                            changeGoals(
                                goals.filter(
                                    (goal) => goal.id !== goalToDelete.id,
                                ),
                            );
                            setGoalToDelete(null);
                        }}
                    />
                )}
                {dialog === "delete-account" && (
                    <Dialog
                        title="Delete account"
                        onClose={() => setDialog(null)}
                    >
                        <p>
                            This permanently deletes your account and all of its
                            writing, saved versions, thought cards and goals.
                        </p>
                        <label htmlFor="account-delete-confirmation">
                            Type delete to confirm
                        </label>
                        <input
                            id="account-delete-confirmation"
                            value={confirmation}
                            onChange={(e) => setConfirmation(e.target.value)}
                            autoComplete="off"
                            spellCheck={false}
                        />
                        <div className={DIALOG_ACTIONS}>
                            <button onClick={() => setDialog(null)}>
                                Cancel
                            </button>
                            <button
                                className={DANGER_BUTTON}
                                disabled={confirmation !== "delete" || busy}
                                onClick={() => void deleteAccount()}
                            >
                                Delete Account
                            </button>
                        </div>
                    </Dialog>
                )}
            </div>
        </Tooltip.Provider>
    );
}
