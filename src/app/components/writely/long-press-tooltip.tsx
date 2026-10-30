"use client";
import {
    createContext,
    useContext,
    useEffect,
    useRef,
    useState,
    type HTMLAttributes,
    type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { TOOLTIP_CLASS } from "~/config/ui";

/**
 * Touch screens have no hover, so toolbar buttons inside <LongPressTooltips> show their name when
 * held, in a strip fixed above the toolbar where a resting thumb cannot cover it. A short tap runs the button as usual; after a hold, the release does nothing.
 *
 * The whole gesture is handled here rather than left to the browser. A finger resting on a button
 * would otherwise make the browser move focus out of the editor (dropping and re-raising the
 * keyboard), so touches that start on a toolbar button are claimed at once: taps are turned into
 * clicks, and sideways drags scroll the toolbar row by hand.
 */

/** How long a finger must rest on a button before its tooltip appears. */
const LONG_PRESS_MS = 500;
/** A finger that travels further than this is scrolling, not holding. */
const MOVE_TOLERANCE = 10;
/** Per-frame fraction of speed a flick keeps while the row coasts to a stop. */
const FRICTION = 0.95;

type Tip = { label: string };

const Active = createContext(false);

/** The button a touch landed on, if it is a plain toolbar button (not a menu or the link form). */
const pressTarget = (target: EventTarget | null) => {
    const button = target instanceof Element ? target.closest("button") : null;
    return button && !button.closest('[role="menu"], form') ? button : null;
};

type Gesture = {
    button: HTMLButtonElement;
    row: HTMLElement | null;
    x: number;
    scroll: number;
    lastX: number;
    lastTime: number;
    velocity: number;
    moved: boolean;
    held: boolean;
};

export function LongPressTooltips({ children }: { children: ReactNode }) {
    const [tip, setTip] = useState<Tip | null>(null);
    const area = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = area.current;
        if (!el) return;
        let timer: number | undefined;
        let frame = 0;
        let gesture: Gesture | null = null;
        const stop = () => {
            window.clearTimeout(timer);
            timer = undefined;
        };
        const coast = (row: HTMLElement, velocity: number) => {
            cancelAnimationFrame(frame);
            const step = () => {
                velocity *= FRICTION;
                if (Math.abs(velocity) < 0.02) return;
                row.scrollLeft += velocity * 16;
                frame = requestAnimationFrame(step);
            };
            frame = requestAnimationFrame(step);
        };
        const start = (event: TouchEvent) => {
            const button = pressTarget(event.target);
            const touch = event.touches[0];
            if (!button || !touch || event.touches.length > 1) return;
            // Claiming the touch keeps focus (and the keyboard) exactly where it was.
            event.preventDefault();
            cancelAnimationFrame(frame);
            const row = button.closest<HTMLElement>(".editor-toolbar-shell");
            const current: Gesture = {
                button,
                row,
                x: touch.clientX,
                scroll: row?.scrollLeft ?? 0,
                lastX: touch.clientX,
                lastTime: event.timeStamp,
                velocity: 0,
                moved: false,
                held: false,
            };
            gesture = current;
            timer = window.setTimeout(() => {
                if (gesture !== current || current.moved) return;
                current.held = true;
                setTip({
                    label:
                        current.button.getAttribute("aria-label") ??
                        current.button.textContent?.trim() ??
                        "",
                });
            }, LONG_PRESS_MS);
        };
        const move = (event: TouchEvent) => {
            const touch = event.touches[0];
            if (!gesture || !touch) return;
            event.preventDefault();
            const dx = touch.clientX - gesture.x;
            if (!gesture.moved && Math.abs(dx) > MOVE_TOLERANCE) {
                gesture.moved = true;
                stop();
                setTip(null);
            }
            if (!gesture.moved || !gesture.row) return;
            gesture.row.scrollLeft = gesture.scroll - dx;
            const dt = event.timeStamp - gesture.lastTime;
            if (dt > 0)
                gesture.velocity = (gesture.lastX - touch.clientX) / dt;
            gesture.lastX = touch.clientX;
            gesture.lastTime = event.timeStamp;
        };
        const end = (event: TouchEvent) => {
            const done = gesture;
            gesture = null;
            stop();
            setTip(null);
            if (!done) return;
            event.preventDefault();
            if (done.moved) {
                if (done.row) coast(done.row, done.velocity);
            } else if (!done.held && !done.button.disabled) done.button.click();
        };
        const cancel = () => {
            gesture = null;
            stop();
            setTip(null);
        };
        // preventDefault only counts on listeners that are not passive.
        const options = { passive: false } as const;
        el.addEventListener("touchstart", start, options);
        el.addEventListener("touchmove", move, options);
        el.addEventListener("touchend", end, options);
        el.addEventListener("touchcancel", cancel);
        return () => {
            stop();
            cancelAnimationFrame(frame);
            el.removeEventListener("touchstart", start);
            el.removeEventListener("touchmove", move);
            el.removeEventListener("touchend", end);
            el.removeEventListener("touchcancel", cancel);
        };
    }, []);

    // The keyboard moving means the button the tooltip points at has moved too.
    useEffect(() => {
        if (!tip) return;
        const hide = () => setTip(null);
        const viewport = window.visualViewport;
        viewport?.addEventListener("resize", hide);
        window.addEventListener("scroll", hide, true);
        return () => {
            viewport?.removeEventListener("resize", hide);
            window.removeEventListener("scroll", hide, true);
        };
    }, [tip]);

    return (
        <Active.Provider value={true}>
            {/* No box of its own: it only gives the touch listeners something to sit on. */}
            <div ref={area} className="contents">
                {children}
            </div>
            {tip &&
                createPortal(
                    <div
                        role="tooltip"
                        className="bg-ink text-paper pointer-events-none fixed inset-x-0 [bottom:var(--tb-bottom,52px)] z-[19] flex h-10 items-center justify-center text-[14px] font-medium"
                    >
                        {tip.label}
                    </div>,
                    document.body,
                )}
        </Active.Provider>
    );
}

const NO_PROPS: HTMLAttributes<HTMLElement> = {};
const BLOCK_MENU: HTMLAttributes<HTMLElement> = {
    onContextMenu: (event) => event.preventDefault(),
};
const same = <A extends unknown[]>(run: (...args: A) => void) => run;

/**
 * Props for one toolbar button. Outside <LongPressTooltips> (desktop) they do nothing and
 * `enabled` is false, so the hover tooltip stays in charge. Inside it, the provider drives the
 * touches and this only stops the browser's own long-press menu.
 */
export function useLongPress(_label?: string) {
    const enabled = useContext(Active);
    return {
        enabled,
        props: enabled ? BLOCK_MENU : NO_PROPS,
        click: same,
    };
}
