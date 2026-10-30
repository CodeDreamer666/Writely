"use client";
import {
    useEffect,
    useSyncExternalStore,
} from "react";

// Phones and tablets: below 1024px. From 1024px on, every device gets the desktop layout.
export const COMPACT_LAYOUT = "(max-width: 1023.98px)";

const subscribe = (notify: () => void) => {
    const media = window.matchMedia(COMPACT_LAYOUT);
    media.addEventListener("change", notify);
    return () => media.removeEventListener("change", notify);
};
const snapshot = () => window.matchMedia(COMPACT_LAYOUT).matches;

export function useCompactLayout() {
    const compact = useSyncExternalStore(subscribe, snapshot, () => false);
    useEffect(() => {
        if (!compact || !window.visualViewport) return;
        const viewport = window.visualViewport;
        const sync = () => {
            if (viewport.scale === 1)
                document.documentElement.style.setProperty(
                    "--visual-height",
                    `${viewport.height}px`,
                );
        };
        sync();
        viewport.addEventListener("resize", sync);
        return () => {
            viewport.removeEventListener("resize", sync);
            document.documentElement.style.removeProperty("--visual-height");
        };
    }, [compact]);
    return compact;
}
