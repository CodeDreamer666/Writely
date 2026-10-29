"use client";
import {
    useCallback,
    useEffect,
    useRef,
    useState,
    useSyncExternalStore,
} from "react";
import {
    readPreferences,
    type Preferences,
} from "~/lib/writely/preferences";
import { api } from "~/trpc/react";

// One copy of the signed-in user's preferences for every page in this tab. A page's server-rendered
// preferences seed it, but once this tab has changed something the local copy wins, so Back to a
// cached editor page still shows what was just chosen in Settings. Other tabs hear about changes.
let shared: Preferences | null = null;
let changedHere = false;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
};
/**
 * What: The name of the browser channel that tells other open Writely tabs
 * when preferences change.
 *
 * Used in:
 * - src/app/components/preferences.tsx (connect)
 *
 * Effect: Renaming it has no visible effect, as long as every tab runs the
 * same version. Tabs on different versions stop syncing.
 */
const CHANNEL = "writely.preferences";
let channel: BroadcastChannel | null = null;
function publish(next: Preferences, broadcast: boolean) {
    shared = next;
    listeners.forEach((listener) => listener());
    if (broadcast) channel?.postMessage(next);
}
function connect() {
    if (channel || typeof BroadcastChannel === "undefined") return;
    channel = new BroadcastChannel(CHANNEL);
    channel.onmessage = (event: MessageEvent) => {
        changedHere = true;
        const next = readPreferences(event.data);
        publish(next, false);
    };
}

/**
 * What: How long, in milliseconds, preferences wait after the last change
 * before they are saved to the account. Continuous controls (the text
 * size slider) send many changes; only the settled value is saved.
 *
 * Used in:
 * - src/app/components/preferences.tsx (usePreferences)
 *
 * Effect: Raising it sends fewer saves while a slider is dragged, but leaves
 * changes unsaved for longer. Lowering it saves sooner and more often.
 * Changes always appear on screen straight away.
 */
const SAVE_DELAY = 400;

export type PreferenceSaveState = "idle" | "saving" | "error";

/**
 * The signed-in user's preferences. Changes apply immediately everywhere in the app and are saved
 * in the background; a failed save is retried with the next change, and the page can say so.
 * Only the changed keys are sent, so a page with an older copy never overwrites a choice made
 * elsewhere.
 */
export function usePreferences(initial: Preferences) {
    const preferences = useSyncExternalStore(
        subscribe,
        () => (changedHere && shared ? shared : initial),
        () => initial,
    );
    const { mutate } = api.account.updatePreferences.useMutation();
    const [saveState, setSaveState] = useState<PreferenceSaveState>("idle");
    const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
    const pending = useRef<Partial<Preferences> | null>(null);
    const save = useCallback(() => {
        clearTimeout(timer.current);
        const next = pending.current;
        if (!next) return;
        pending.current = null;
        setSaveState("saving");
        mutate(next, {
            onSuccess: () => setSaveState(pending.current ? "saving" : "idle"),
            onError: () => {
                // Keep the unsaved keys so the next change retries them.
                pending.current = { ...next, ...pending.current };
                setSaveState("error");
            },
        });
    }, [mutate]);
    useEffect(() => {
        connect();
        window.addEventListener("pagehide", save);
        return () => {
            window.removeEventListener("pagehide", save);
            save();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const update = (changes: Partial<Preferences>) => {
        const next = { ...preferences, ...changes };
        changedHere = true;
        publish(next, true);
        pending.current = { ...pending.current, ...changes };
        setSaveState("saving");
        clearTimeout(timer.current);
        timer.current = setTimeout(save, SAVE_DELAY);
    };
    return [preferences, update, saveState] as const;
}
