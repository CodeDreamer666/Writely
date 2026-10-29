"use client";
import { X } from "lucide-react";
import {
    useEffect,
    useState,
} from "react";

/**
 * What: How much of the window's height, from the top, counts as the exit zone: pointing at it
 * shows the exit control and clicking or tapping anywhere across its width leaves focus mode.
 *
 * Used in:
 * - src/app/components/writely/focus-exit.tsx (FocusExit)
 *
 * Effect: A larger fraction makes the exit zone taller; a smaller one keeps it out of the way.
 */
const EXIT_ZONE = 0.1;

/**
 * What: How long, in milliseconds, the exit control stays up when focus mode starts and after
 * a tap near the top of a touch screen.
 *
 * Used in:
 * - src/app/components/writely/focus-exit.tsx (FocusExit)
 *
 * Effect: Longer leaves more time to notice it; shorter clears the page sooner.
 */
const LINGER = 2400;

/**
 * The only control in focus mode: an "Exit focus mode" button at the top of the window. It shows
 * briefly when focus mode starts, whenever the pointer is in the top tenth of the window, and
 * whenever it has keyboard focus. Clicking or tapping anywhere in that top tenth, across the full
 * width, leaves focus mode; below it the text stays fully reachable.
 */
export default function FocusExit({ onExit }: { onExit: () => void }) {
    const [shown, setShown] = useState(true);
    useEffect(() => {
        const timer = setTimeout(() => setShown(false), LINGER);
        const move = (e: PointerEvent) => {
            if (e.pointerType === "touch") return;
            clearTimeout(timer);
            setShown(e.clientY <= window.innerHeight * EXIT_ZONE);
        };
        const leave = () => {
            clearTimeout(timer);
            setShown(false);
        };
        document.addEventListener("pointermove", move, { passive: true });
        document.documentElement.addEventListener("mouseleave", leave);
        return () => {
            clearTimeout(timer);
            document.removeEventListener("pointermove", move);
            document.documentElement.removeEventListener("mouseleave", leave);
        };
    }, []);
    return (
        <>
            <div
                aria-hidden="true"
                onClick={onExit}
                className="fixed inset-x-0 top-0 z-[39] h-[10dvh] cursor-pointer"
            />
            <button
                type="button"
                data-shown={shown || undefined}
                aria-keyshortcuts="Escape"
                onMouseDown={(e) => e.preventDefault()}
                onClick={onExit}
                className="focus-exit border-line! bg-surface! text-muted! hover:text-ink! pointer-events-none fixed! top-3 left-1/2 z-[40] h-8! min-h-8! -translate-x-1/2 gap-1.5! rounded-full! border! px-3! text-[12px]! opacity-0 transition-opacity duration-150 focus-visible:pointer-events-auto focus-visible:opacity-100 data-[shown]:pointer-events-auto data-[shown]:opacity-100 motion-reduce:transition-none"
            >
                <X size={13} aria-hidden="true" />
                Exit focus mode
            </button>
        </>
    );
}
