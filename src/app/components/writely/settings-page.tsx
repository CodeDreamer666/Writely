"use client";
import * as Tooltip from "@radix-ui/react-tooltip";
import {
    CircleHelp,
    FileDown,
    Keyboard,
    ListChecks,
    Mail,
    Palette,
    Pencil,
    PenLine,
    Plus,
    Sparkles,
    Trash2,
    UserRound,
    type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import {
    useEffect,
    useRef,
    useState,
    type FormEvent,
} from "react";
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
import {
    SettingsCard,
    SettingsSection,
} from "./settings-controls";
import { ShortcutList } from "./shortcuts";
import { WritingSettings } from "./writing-settings";
import {
    Button,
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
    ["help", "Help", CircleHelp],
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

    // The open section lives in the address, so reloads and links land on it.
    const [section, setSection] = useState<Section>(SECTIONS[0][0]);
    useEffect(() => {
        const sync = () => setSection(sectionFromHash() ?? SECTIONS[0][0]);
        sync();
        window.addEventListener("hashchange", sync);
        return () => window.removeEventListener("hashchange", sync);
    }, []);
    const openSection = (value: Section) => {
        setSection(value);
        window.history.replaceState(null, "", `#${value}`);
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
                <AppHeader />
                <main
                    className="grid min-h-[calc(100dvh-76px)] grid-cols-[minmax(240px,300px)_minmax(0,1fr)] max-[860px]:grid-cols-1 max-[860px]:content-start"
                    aria-labelledby="settings-title"
                >
                    <aside className="border-line flex min-w-0 flex-col gap-7 self-stretch border-r px-6 pt-9 pb-10 max-[860px]:gap-4 max-[860px]:border-r-0 max-[860px]:border-b max-[860px]:pt-5 max-[860px]:pb-5 max-sm:px-4">
                        <h1
                            id="settings-title"
                            tabIndex={-1}
                            ref={heading}
                            className="px-2 font-serif text-[36px] leading-none font-normal tracking-[-0.03em] outline-none focus-visible:border-transparent! focus-visible:shadow-none! max-[860px]:text-[30px]"
                        >
                            Settings
                        </h1>
                        <nav aria-label="Settings sections" className="min-w-0">
                            <ul className="m-0 flex list-none flex-col gap-1 p-0 max-[860px]:grid max-[860px]:grid-cols-4 max-[860px]:gap-1.5 max-sm:grid-cols-2">
                                {SECTIONS.map(([value, label, Icon]) => {
                                    const current = section === value;
                                    return (
                                        <li key={value}>
                                            <button
                                                aria-current={
                                                    current ? "page" : undefined
                                                }
                                                onClick={() =>
                                                    openSection(value)
                                                }
                                                className={`h-11! min-h-11! w-full! justify-start! gap-3! rounded-xl! border-0! px-3.5! text-[14px]! shadow-none! max-[860px]:h-10! max-[860px]:min-h-10! max-[860px]:gap-2! max-[860px]:px-2.5! max-[860px]:text-[13px]! ${
                                                    current
                                                        ? "bg-tint! text-ink! font-semibold"
                                                        : "text-muted! hover:text-ink! bg-transparent! hover:bg-[var(--control-hover)]!"
                                                }`}
                                            >
                                                <Icon
                                                    size={18}
                                                    strokeWidth={1.6}
                                                    aria-hidden="true"
                                                    className={
                                                        current
                                                            ? "text-ink shrink-0"
                                                            : "text-muted shrink-0"
                                                    }
                                                />
                                                <span className="min-w-0 flex-1 truncate text-left">
                                                    {label}
                                                </span>
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        </nav>
                    </aside>

                    <div className="w-full max-w-[820px] min-w-0 px-12 pt-10 pb-24 max-[1100px]:px-8 max-[860px]:px-6 max-[860px]:pt-7 max-sm:px-4">
                        {section === "appearance" && (
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
                        {section === "writing" && (
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
                        {section === "export" && (
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
                        {section === "checklist" && (
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
                                                            changeGoals(
                                                                goals.filter(
                                                                    (g) =>
                                                                        g.id !==
                                                                        goal.id,
                                                                ),
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
                        {section === "shortcuts" && (
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
                        {section === "help" && (
                            <SettingsSection id="help-title" title="Help">
                                <Link
                                    href="/tutorial"
                                    className="border-line bg-surface text-ink flex items-center gap-3 rounded-2xl border px-5 py-4 no-underline hover:border-[var(--control-focus)]"
                                >
                                    <Sparkles
                                        size={18}
                                        strokeWidth={1.5}
                                        className="text-accent shrink-0"
                                        aria-hidden="true"
                                    />
                                    <span className="flex flex-col gap-1.5">
                                        <span className="block text-[14px] font-medium">
                                            How Writely works
                                        </span>
                                        <span className="text-muted block text-[13px]">
                                            A two-minute sample: thought cards,
                                            connections, saving and comparing.
                                            Your documents aren’t touched.
                                        </span>
                                    </span>
                                </Link>
                            </SettingsSection>
                        )}
                        {section === "account" && (
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
