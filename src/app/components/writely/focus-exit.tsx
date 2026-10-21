"use client";
import { X } from "lucide-react";
import {
    useEffect,
    useState,
} from "react";

/**
 * What: How close, in pixels, the pointer has to come to the top of the window before the
 * focus mode exit control appears.
 *
 * Used in:
 * - src/app/components/writely/focus-exit.tsx (FocusExit)
 *
 * Effect: A larger value shows the control sooner; a smaller one keeps it out of the way.
 */
const REVEAL_EDGE = 72;

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
 * The only control in focus mode: a small exit button at the top of the window. It shows briefly
 * when focus mode starts, whenever the pointer nears the top edge (or a finger taps there), and
 * whenever it has keyboard focus. While hidden it takes no clicks, so the text under it stays
 * reachable.
 */
export default function FocusExit({ onExit }: { onExit: () => void }) {
    const [shown, setShown] = useState(true);
    useEffect(() => {
        let timer = setTimeout(() => setShown(false), LINGER);
        const move = (e: PointerEvent) => {
            if (e.pointerType === "touch") return;
            clearTimeout(timer);
            setShown(e.clientY <= REVEAL_EDGE);
        };
        const tap = (e: PointerEvent) => {
            if (e.pointerType !== "touch" || e.clientY > REVEAL_EDGE) return;
            clearTimeout(timer);
            setShown(true);
            timer = setTimeout(() => setShown(false), LINGER);
        };
        const leave = () => {
            clearTimeout(timer);
            setShown(false);
        };
        document.addEventListener("pointermove", move, { passive: true });
        document.addEventListener("pointerdown", tap, { passive: true });
        document.documentElement.addEventListener("mouseleave", leave);
        return () => {
            clearTimeout(timer);
            document.removeEventListener("pointermove", move);
            document.removeEventListener("pointerdown", tap);
            document.documentElement.removeEventListener("mouseleave", leave);
        };
    }, []);
    return (
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
    );
}
