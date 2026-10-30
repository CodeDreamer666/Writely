"use client";
import { useSyncExternalStore } from "react";
import { SHORTCUT_GROUPS } from "~/config/shortcuts";
import { Dialog } from "../ui";

/**
 * What: How each key in SHORTCUT_GROUPS is written on a Mac and elsewhere.
 * Keys not listed are shown as they are.
 *
 * Used in:
 * - src/app/components/writely/shortcuts.tsx (ShortcutList)
 *
 * Effect: Changes the key names in the shortcuts sheet and in Settings.
 */
const KEY_NAMES: Record<string, { mac: string; other: string }> = {
    Mod: { mac: "⌘", other: "Ctrl" },
    Alt: { mac: "⌥", other: "Alt" },
    Shift: { mac: "⇧", other: "Shift" },
    Enter: { mac: "Return", other: "Enter" },
};

// The platform never changes while the page is open, so there is nothing to subscribe to.
const noSubscription = () => () => undefined;
const isMac = () => /Mac|iPhone|iPad/.test(navigator.platform);

/** Every shortcut in groups, with key names for the writer's platform. */
export function ShortcutList({ columns = 1 }: { columns?: 1 | 2 }) {
    const mac = useSyncExternalStore(noSubscription, isMac, () => false);
    return (
        <div
            className={`grid gap-x-10 gap-y-6 ${columns === 2 ? "grid-cols-2 max-md:grid-cols-1" : ""}`}
        >
            {SHORTCUT_GROUPS.map((group) => (
                <section key={group.title} aria-label={group.title}>
                    <h3 className="text-muted mb-1.5 text-[12px] font-medium">
                        {group.title}
                    </h3>
                    <dl className="m-0">
                        {group.shortcuts.map((shortcut) => (
                            <div
                                key={shortcut.label}
                                className="border-line flex min-h-9 items-center justify-between gap-3 border-b text-[13px] last:border-b-0"
                            >
                                <dt>{shortcut.label}</dt>
                                <dd className="m-0 flex shrink-0 gap-1">
                                    {shortcut.keys.map((key) => (
                                        <kbd
                                            key={key}
                                            className="border-line bg-paper text-ink! inline-flex min-w-6 justify-center rounded-[5px] border px-1.5 py-0.5 leading-[1.4]"
                                        >
                                            {KEY_NAMES[key]?.[
                                                mac ? "mac" : "other"
                                            ] ?? key}
                                        </kbd>
                                    ))}
                                </dd>
                            </div>
                        ))}
                    </dl>
                </section>
            ))}
        </div>
    );
}

/** The shortcuts sheet the editor opens with Ctrl/⌘ + / or from the ⋯ menu. */
export function ShortcutsDialog({ onClose }: { onClose: () => void }) {
    return (
        <Dialog
            title="Keyboard shortcuts"
            onClose={onClose}
            className="[width:560px]!"
        >
            <ShortcutList />
        </Dialog>
    );
}
