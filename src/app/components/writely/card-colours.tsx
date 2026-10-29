"use client";
import { Check } from "lucide-react";
import {
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
} from "react";
import { createPortal } from "react-dom";
import { CARD_COLOUR_PRESETS } from "~/config/cards";

/** The preset name for a stored card colour, or undefined for a colour saved before the presets. */
export const cardColourName = (bg: string) =>
    CARD_COLOUR_PRESETS.find(
        ([, preset]) => preset.toLowerCase() === bg.toLowerCase(),
    )?.[0];

/**
 * The card colour presets as one radio group: a swatch per pastel, arrow keys move between them.
 * Used on a selected card and in the Thoughts drawer.
 */
export function CardColours({
    label,
    value,
    onChange,
    onPick,
    size = 24,
    className = "gap-1",
}: {
    label: string;
    value: string;
    onChange: (bg: string, fg: string) => void;
    /** Called after a click (or Enter/Space) on a swatch, not after arrow keys. */
    onPick?: () => void;
    size?: number;
    className?: string;
}) {
    const index = CARD_COLOUR_PRESETS.findIndex(
        ([, bg]) => bg.toLowerCase() === value.toLowerCase(),
    );
    return (
        <div
            role="radiogroup"
            aria-label={label}
            className={`flex items-center ${className}`}
            onKeyDown={(e) => {
                const step =
                    e.key === "ArrowRight" || e.key === "ArrowDown"
                        ? 1
                        : e.key === "ArrowLeft" || e.key === "ArrowUp"
                          ? -1
                          : 0;
                if (!step) return;
                e.preventDefault();
                const group = e.currentTarget;
                const count = CARD_COLOUR_PRESETS.length;
                const next = (Math.max(0, index) + step + count) % count;
                const [, bg, fg] = CARD_COLOUR_PRESETS[next]!;
                onChange(bg, fg);
                requestAnimationFrame(() =>
                    group
                        .querySelector<HTMLElement>(`[data-index="${next}"]`)
                        ?.focus(),
                );
            }}
        >
            {CARD_COLOUR_PRESETS.map(([name, bg, fg], i) => {
                const checked = i === index;
                return (
                    <button
                        key={name}
                        type="button"
                        role="radio"
                        aria-checked={checked}
                        aria-label={name}
                        title={name}
                        data-index={i}
                        tabIndex={checked || (index < 0 && i === 0) ? 0 : -1}
                        onClick={() => {
                            onChange(bg, fg);
                            onPick?.();
                        }}
                        className="size-11! min-h-11! min-w-11! shrink-0 rounded-full! border-0! bg-transparent! p-0! focus-visible:[box-shadow:0_0_0_2px_var(--control-focus)]!"
                    >
                        <span
                            aria-hidden="true"
                            className="flex items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--text)_35%,transparent)]"
                            style={{
                                width: size,
                                height: size,
                                background: `color-mix(in srgb, ${bg} var(--card-strength), var(--card-base))`,
                                color: `var(--card-text-override, ${fg})`,
                            }}
                        >
                            {checked && (
                                <Check
                                    size={Math.round(size * 0.65)}
                                    strokeWidth={3}
                                />
                            )}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}

/** Space between the trigger and the popover, and between the popover and the panel's edge. */
const GAP = 6;
const EDGE = 8;

/**
 * The card colours in a small popover under `anchor`, right-aligned to it. It floats above the
 * panel instead of opening inside the row, so no card moves, and flips above the trigger when
 * there is no room below. A pick, Escape or a click outside closes it.
 */
export function CardColourPopover({
    anchor,
    label,
    value,
    onChange,
    onClose,
}: {
    anchor: HTMLElement;
    label: string;
    value: string;
    onChange: (bg: string, fg: string) => void;
    onClose: () => void;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState<{
        top: number;
        left: number;
    } | null>(null);
    const close = useRef(onClose);
    useEffect(() => {
        close.current = onClose;
    });

    useLayoutEffect(() => {
        const place = () => {
            const popover = ref.current;
            if (!popover || !anchor.isConnected) return close.current();
            const trigger = anchor.getBoundingClientRect();
            // Stay inside the panel the trigger lives in, or the window without one.
            const bounds = anchor.closest("aside")?.getBoundingClientRect() ?? {
                top: 0,
                left: 0,
                right: window.innerWidth,
                bottom: window.innerHeight,
            };
            const { width, height } = popover.getBoundingClientRect();
            let top = trigger.bottom + GAP;
            if (top + height > bounds.bottom - EDGE)
                top = Math.max(bounds.top + EDGE, trigger.top - GAP - height);
            const left = Math.min(
                Math.max(bounds.left + EDGE, trigger.right - width),
                bounds.right - EDGE - width,
            );
            setPosition({ top, left });
        };
        place();
        window.addEventListener("resize", place);
        // Capture catches the drawer body scrolling, not just the window.
        window.addEventListener("scroll", place, true);
        return () => {
            window.removeEventListener("resize", place);
            window.removeEventListener("scroll", place, true);
        };
    }, [anchor]);

    useEffect(() => {
        requestAnimationFrame(() =>
            ref.current
                ?.querySelector<HTMLElement>('[role="radio"][tabindex="0"]')
                ?.focus({ preventScroll: true }),
        );
        const outside = (e: PointerEvent) => {
            const target = e.target as Node;
            // The trigger toggles the popover itself.
            if (!ref.current?.contains(target) && !anchor.contains(target))
                close.current();
        };
        document.addEventListener("pointerdown", outside, true);
        return () => document.removeEventListener("pointerdown", outside, true);
    }, [anchor]);

    const dismiss = () => {
        close.current();
        anchor.focus({ preventScroll: true });
    };

    return createPortal(
        <div
            ref={ref}
            role="dialog"
            aria-label={label}
            className="border-line bg-surface fixed z-[30] [animation:appear_120ms_ease-out] rounded-[10px] border p-1.5 [box-shadow:0_10px_28px_-10px_color-mix(in_srgb,var(--shadow)_28%,transparent)] motion-reduce:animate-none"
            style={
                position
                    ? { top: position.top, left: position.left }
                    : { top: 0, left: 0, visibility: "hidden" }
            }
            onKeyDown={(e) => {
                if (e.key === "Escape") {
                    // Keep the drawer open: React bubbles portal events to it.
                    e.stopPropagation();
                    dismiss();
                }
                // The popover sits at the end of the page, so Tab returns to the trigger.
                if (e.key === "Tab") {
                    e.preventDefault();
                    dismiss();
                }
            }}
        >
            <CardColours
                label={label}
                value={value}
                size={24}
                onChange={onChange}
                onPick={dismiss}
                className="gap-0"
            />
        </div>,
        document.body,
    );
}
