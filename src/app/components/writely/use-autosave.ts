"use client";
import {
    useEffect,
    useRef,
    useState,
} from "react";
import SuperJSON from "superjson";
import {
    isWritingActivity,
    localDay,
    workspaceChanges,
    type WorkspaceChanges,
} from "~/lib/writely/sync";
import type { WorkspaceData } from "~/lib/writely/types";
import { api } from "~/trpc/react";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

/** Unsaved changes are kept per document, since the editor opens one document at a time. */
export const unsavedKey = (userId: string, documentId: string) =>
    `writely.unsaved.v2:${userId}:${documentId}`;
// Before documents had their own pages, the whole workspace was kept under one key.
const workspaceUnsavedKey = (userId: string) => `writely.unsaved.v1:${userId}`;

const readStored = (key: string) => {
    try {
        const data = JSON.parse(
            localStorage.getItem(key) ?? "null",
        ) as WorkspaceData | null;
        if (data?.docs?.length && Array.isArray(data.defaultRevisionGoals))
            return data;
    } catch {
        /* Unreadable leftovers are ignored. */
    }
    return null;
};

/**
 * Changes the server hasn't confirmed yet for one document. They stay in this browser until a
 * save succeeds, so a reload, a closed tab or a dropped connection never loses writing.
 */
export function readUnsavedWorkspace(
    userId: string,
    documentId: string,
): WorkspaceData | null {
    const data = readStored(unsavedKey(userId, documentId));
    if (data?.docs.some((doc) => doc.id === documentId))
        return { ...data, active: documentId };
    // Leftovers from the single-page workspace: only this document's part applies.
    const old = readStored(workspaceUnsavedKey(userId));
    const doc = old?.docs.find((d) => d.id === documentId);
    return old && doc ? { ...old, docs: [doc], active: documentId } : null;
}

export function forgetUnsavedWorkspace(userId: string, documentId?: string) {
    try {
        if (documentId) localStorage.removeItem(unsavedKey(userId, documentId));
        localStorage.removeItem(workspaceUnsavedKey(userId));
    } catch {
        /* Storage may be unavailable. */
    }
}

/**
 * Saves the workspace shortly after each change, sending only what differs from the last
 * successful save. Continuous typing saves at least every five seconds; failures retry with backoff.
 */
export function useAutosave(
    data: WorkspaceData,
    saved: WorkspaceData,
    {
        userId,
        onSaved,
    }: {
        userId: string;
        onSaved?: () => void;
    },
) {
    // This hook owns recovery. React Query's default offline pause would otherwise
    // leave the header showing Saving indefinitely instead of reporting an unsaved copy.
    const { mutateAsync: saveToServer } = api.workspace.save.useMutation({
        networkMode: "always",
        retry: false,
    });
    const documentId = saved.active;
    const storageKey = unsavedKey(userId, documentId);
    const mutateAsync = (changes: WorkspaceChanges) => saveToServer(changes);
    const forget = () => forgetUnsavedWorkspace(userId, documentId);
    const [status, setStatus] = useState<SaveStatus>("idle");
    const latest = useRef(data),
        lastSaved = useRef(saved),
        callbacks = useRef({ mutateAsync, onSaved });
    latest.current = data;
    callbacks.current = { mutateAsync, onSaved };
    const inFlight = useRef<Promise<void> | null>(null),
        queued = useRef(false),
        alive = useRef(true);
    const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined),
        maxTimer = useRef<ReturnType<typeof setTimeout>>(undefined),
        retryTimer = useRef<ReturnType<typeof setTimeout>>(undefined),
        fadeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
    const failures = useRef(0);

    const keepLocally = useRef(() => {
        try {
            localStorage.setItem(storageKey, JSON.stringify(latest.current));
        } catch {
            /* Without storage, the server save is the only copy. */
        }
    });

    const attempt = useRef((): Promise<void> => {
        clearTimeout(saveTimer.current);
        clearTimeout(maxTimer.current);
        maxTimer.current = undefined;
        clearTimeout(retryTimer.current);
        if (inFlight.current) {
            queued.current = true;
            return inFlight.current;
        }
        const finish = () => {
            if (alive.current) {
                setStatus("saved");
                fadeTimer.current = setTimeout(() => setStatus("idle"), 1400);
            }
        };
        const target = latest.current,
            changes = withActivity(lastSaved.current, target);
        if (!changes) {
            forget();
            finish();
            return Promise.resolve();
        }
        keepLocally.current();
        if (alive.current) setStatus("saving");
        const request = callbacks.current.mutateAsync(changes).then(
            () => {
                lastSaved.current = target;
                failures.current = 0;
                inFlight.current = null;
                callbacks.current.onSaved?.();
                // Follow an in-flight request with any newer edits before reporting Saved.
                if (
                    queued.current ||
                    workspaceChanges(target, latest.current)
                ) {
                    queued.current = false;
                    return attempt.current();
                }
                forget();
                finish();
            },
            () => {
                inFlight.current = null;
                queued.current = false;
                keepLocally.current();
                if (alive.current) {
                    setStatus("error");
                    retryTimer.current = setTimeout(
                        () => void attempt.current(),
                        Math.min(
                            30_000,
                            1000 * 2 ** Math.min(failures.current++, 5),
                        ),
                    );
                }
            },
        );
        inFlight.current = request;
        return request;
    });

    useEffect(() => {
        clearTimeout(saveTimer.current);
        clearTimeout(fadeTimer.current);
        if (!workspaceChanges(lastSaved.current, data)) return;
        // Keep each edit immediately, even if typing never pauses or iOS suspends the tab.
        keepLocally.current();
        setStatus((old) => (old === "error" ? old : "saving"));
        if (!maxTimer.current)
            maxTimer.current = setTimeout(() => void attempt.current(), 5000);
        saveTimer.current = setTimeout(() => void attempt.current(), 350);
    }, [data]);

    useEffect(() => {
        alive.current = true;
        // A closing page can't wait for a response: unsaved changes are kept locally and also sent
        // as a keepalive request.
        const flush = () => {
            const changes = withActivity(lastSaved.current, latest.current);
            if (!changes) return;
            keepLocally.current();
            void fetch("/api/trpc/workspace.save", {
                method: "POST",
                keepalive: true,
                headers: { "content-type": "application/json" },
                body: JSON.stringify(SuperJSON.serialize(changes)),
            }).catch(() => undefined);
        };
        window.addEventListener("pagehide", flush);
        const visibility = () => {
            if (document.visibilityState === "hidden") flush();
            else if (workspaceChanges(lastSaved.current, latest.current))
                void attempt.current();
        };
        const online = () => void attempt.current();
        document.addEventListener("visibilitychange", visibility);
        window.addEventListener("online", online);
        return () => {
            alive.current = false;
            window.removeEventListener("pagehide", flush);
            document.removeEventListener("visibilitychange", visibility);
            window.removeEventListener("online", online);
            clearTimeout(saveTimer.current);
            clearTimeout(maxTimer.current);
            maxTimer.current = undefined;
            clearTimeout(retryTimer.current);
            clearTimeout(fadeTimer.current);
        };
    }, []);

    return {
        status,
        retry: () => void attempt.current(),
        /** Saves pending changes now; resolves to whether everything is saved. */
        flush: async () => {
            const unsaved = () =>
                workspaceChanges(lastSaved.current, latest.current);
            await attempt.current();
            // An in-flight save may have finished without the newest edits.
            if (unsaved()) await attempt.current();
            return !unsaved();
        },
    };
}

/** Saves count as a day of writing when they change the text, keep a version or finish a revision. */
function withActivity(prev: WorkspaceData, next: WorkspaceData) {
    const changes = workspaceChanges(prev, next);
    if (changes && isWritingActivity(prev, next))
        changes.activityDay = localDay();
    return changes;
}
