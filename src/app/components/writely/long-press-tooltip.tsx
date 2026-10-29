"use client";
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
    type HTMLAttributes,
    type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { TOOLTIP_CLASS } from "~/config/ui";

/**
 * Touch screens have no hover, so toolbar buttons inside <LongPressTooltips> show their name when
 * held. A short tap runs the button as usual; after a hold, the release is swallowed.
 */

/** How long a finger must rest on a button before its tooltip appears. */
const LONG_PRESS_MS = 500;
/** A finger that travels further than this is scrolling, not holding. */
const MOVE_TOLERANCE = 10;
/** Space kept between a tooltip and the screen edge, and between it and its button. */
const EDGE = 8;

type Tip = { label: string; rect: DOMRect };
type Tips = {
    show: (label: string, el: HTMLElement) => void;
    hide: () => void;
};

const TipContext = createContext<Tips | null>(null);

export function LongPressTooltips({ children }: { children: ReactNode }) {
    const [tip, setTip] = useState<Tip | null>(null);
    const node = useRef<HTMLDivElement>(null);
    const show = useCallback(
        (label: string, el: HTMLElement) =>
            setTip({ label, rect: el.getBoundingClientRect() }),
        [],
    );
    const hide = useCallback(() => setTip(null), []);
    const tips = useRef<Tips>({ show, hide }).current;

    // Releasing, cancelling, scrolling or touching elsewhere all dismiss it.
    useEffect(() => {
        if (!tip) return;
        const events = ["pointerup", "pointercancel", "pointerdown"] as const;
        for (const name of events) window.addEventListener(name, hide);
        window.addEventListener("scroll", hide, true);
        // The keyboard moving means the button the tooltip points at has moved too.
        const viewport = window.visualViewport;
        viewport?.addEventListener("resize", hide);
        return () => {
            viewport?.removeEventListener("resize", hide);
            for (const name of events) window.removeEventListener(name, hide);
            window.removeEventListener("scroll", hide, true);
        };
    }, [tip, hide]);

    // Centre over the button, then slide back inside the visible viewport if it overhangs.
    useLayoutEffect(() => {
        const el = node.current;
        if (!tip || !el) return;
        const viewport = window.visualViewport;
        const start = viewport?.offsetLeft ?? 0;
        const width = viewport?.width ?? window.innerWidth;
        const x = tip.rect.left + tip.rect.width / 2 - el.offsetWidth / 2;
        el.style.left = `${Math.max(start + EDGE, Math.min(x, start + width - el.offsetWidth - EDGE))}px`;
        el.style.top = `${tip.rect.top - EDGE}px`;
    }, [tip]);

    return (
        <TipContext.Provider value={tips}>
            {children}
            {tip &&
                createPortal(
                    <div
                        ref={node}
                        role="tooltip"
                        className={`${TOOLTIP_CLASS} pointer-events-none fixed -translate-y-full [padding:6px_10px] whitespace-nowrap`}
                    >
                        {tip.label}
                    </div>,
                    document.body,
                )}
        </TipContext.Provider>
    );
}

/**
 * Press handlers for one toolbar button. Outside <LongPressTooltips> (desktop) they do nothing and
 * `enabled` is false, so the hover tooltip stays in charge.
 */
export function useLongPress(label: string) {
    const tips = useContext(TipContext);
    const timer = useRef<number | undefined>(undefined);
    const origin = useRef<{ x: number; y: number } | null>(null);
    const held = useRef(false);
    const prior = useRef<Element | null>(null);
    // Holding a button can pull focus (and the keyboard) away from the editor; hand it back.
    const restoreFocus = () => {
        const before = prior.current;
        if (
            before instanceof HTMLElement &&
            before.isContentEditable &&
            document.activeElement !== before
        )
            before.focus({ preventScroll: true });
    };
    const clear = () => {
        window.clearTimeout(timer.current);
        timer.current = undefined;
        origin.current = null;
    };
    useEffect(() => () => window.clearTimeout(timer.current), []);

    if (!tips)
        return {
            enabled: false,
            props: {} as HTMLAttributes<HTMLElement>,
            click: <A extends unknown[]>(run: (...args: A) => void) => run,
        };
    return {
        enabled: true,
        props: {
            onPointerDown: (event) => {
                if (event.pointerType === "mouse") return;
                held.current = false;
                prior.current = document.activeElement;
                origin.current = { x: event.clientX, y: event.clientY };
                const el = event.currentTarget;
                timer.current = window.setTimeout(() => {
                    held.current = true;
                    restoreFocus();
                    tips.show(label, el);
                }, LONG_PRESS_MS);
            },
            onPointerMove: (event) => {
                const start = origin.current;
                if (
                    start &&
                    Math.hypot(
                        event.clientX - start.x,
                        event.clientY - start.y,
                    ) > MOVE_TOLERANCE
                )
                    clear();
            },
            onPointerUp: () => {
                clear();
                if (held.current) restoreFocus();
            },
            onPointerCancel: () => {
                clear();
                if (held.current) restoreFocus();
                tips.hide();
            },
            onContextMenu: (event) => event.preventDefault(),
        } satisfies HTMLAttributes<HTMLElement>,
        click:
            <A extends unknown[]>(run: (...args: A) => void) =>
            (...args: A) => {
                if (held.current) {
                    held.current = false;
                    return;
                }
                run(...args);
            },
    };
}
