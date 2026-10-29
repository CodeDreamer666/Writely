"use client";
import * as Tooltip from "@radix-ui/react-tooltip";
import {
    X,
    type LucideIcon,
} from "lucide-react";
import {
    useEffect,
    useRef,
    useState,
    useSyncExternalStore,
    type ReactNode,
    type TouchEvent,
} from "react";
import { Button } from "../ui";
import { useLongPress } from "./long-press-tooltip";
import { TOOLTIP_CLASS } from "~/config/ui";

/**
 * The editor keeps every tool in one slim dock under the page. Each tool opens a drawer that rises
 * from the dock: not a modal, so the page stays readable and Escape or a click outside closes it.
 */

/**
 * What: The look of the tool buttons in the dock under the page.
 *
 * Used in:
 * - src/app/components/writely/dock.tsx (DockButton)
 *
 * Effect: Changes the size, spacing and pressed style of every dock button.
 * On narrow screens the buttons show only their icon.
 */
export const DOCK_BUTTON =
    "dock-button relative h-11! min-h-11! min-w-11! gap-2! rounded-[10px]! border-0! px-3! text-[12.5px]! font-medium text-muted! whitespace-nowrap hover:bg-[color-mix(in_srgb,var(--text)_6%,transparent)]! hover:text-ink! aria-pressed:bg-tint! aria-pressed:text-accent! max-[720px]:px-0! max-[720px]:w-11!";

export function DockButton({
    icon: Icon,
    label,
    text,
    count,
    pressed,
    onClick,
    className = "",
    ...props
}: {
    icon: LucideIcon;
    /** The accessible name; also the tooltip. */
    label: string;
    /** Visible text beside the icon on wider screens. */
    text?: string;
    count?: string | number;
    pressed?: boolean;
    onClick: () => void;
    className?: string;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onClick">) {
    const press = useLongPress(label);
    return (
        <Tooltip.Root open={press.enabled ? false : undefined}>
            <Tooltip.Trigger asChild>
                <button
                    className={`${DOCK_BUTTON} ${className}`}
                    aria-label={label}
                    aria-pressed={pressed}
                    {...press.props}
                    onClick={press.click(onClick)}
                    {...props}
                >
                    <Icon size={17} strokeWidth={1.6} aria-hidden="true" />
                    {text && (
                        <span className="max-[720px]:sr-only">{text}</span>
                    )}
                    {count !== undefined && count !== "" && (
                        <span
                            aria-hidden="true"
                            className="text-[11px] font-normal tabular-nums opacity-75 max-[720px]:absolute max-[720px]:top-1 max-[720px]:right-0.5 max-[720px]:min-w-4 max-[720px]:rounded-full max-[720px]:bg-[var(--bg)] max-[720px]:px-1 max-[720px]:text-[9.5px] max-[720px]:leading-4 max-[720px]:opacity-100"
                        >
                            {count}
                        </span>
                    )}
                </button>
            </Tooltip.Trigger>
            <Tooltip.Portal>
                <Tooltip.Content
                    className={TOOLTIP_CLASS}
                    side="top"
                    sideOffset={10}
                >
                    {label}
                    <Tooltip.Arrow />
                </Tooltip.Content>
            </Tooltip.Portal>
        </Tooltip.Root>
    );
}

export const DockDivider = () => (
    <span aria-hidden="true" className="bg-line mx-1 h-5 w-px shrink-0" />
);

const PHONE = "(max-width: 720px)";
const subscribePhone = (notify: () => void) => {
    const media = window.matchMedia(PHONE);
    media.addEventListener("change", notify);
    return () => media.removeEventListener("change", notify);
};
const phoneSnapshot = () => window.matchMedia(PHONE).matches;

/**
 * A bottom drawer. It stays mounted for its closing animation, moves focus inside when it opens and
 * hands focus back to whatever opened it when it closes.
 */
export function Drawer({
    open,
    title,
    onClose,
    children,
    actions,
    id,
}: {
    open: boolean;
    title: string;
    onClose: () => void;
    children: ReactNode;
    /** Extra controls beside the title. */
    actions?: ReactNode;
    id?: string;
}) {
    const [shown, setShown] = useState(open);
    // On phones it is a sheet: it slides up and down, and a swipe down closes it.
    const sheet = useSyncExternalStore(
        subscribePhone,
        phoneSnapshot,
        () => false,
    );
    const [entered, setEntered] = useState(false);
    const [dragY, setDragY] = useState<number | null>(null);
    const drag = useRef<{ y: number; time: number; active: boolean } | null>(
        null,
    );
    const ref = useRef<HTMLElement>(null);
    const opener = useRef<HTMLElement | null>(null);
    if (open && !shown) setShown(true);
    useEffect(() => {
        if (!open) {
            setEntered(false);
            return;
        }
        setDragY(null);
        // Two frames, so the sheet paints off-screen before it slides up.
        let second = 0;
        const first = requestAnimationFrame(() => {
            second = requestAnimationFrame(() => setEntered(true));
        });
        return () => {
            cancelAnimationFrame(first);
            cancelAnimationFrame(second);
        };
    }, [open]);
    const touchStart = (e: TouchEvent<HTMLElement>) => {
        const body = (e.target as HTMLElement).closest(".drawer-body");
        // Pulling the list down only closes the sheet once the list is at its top.
        drag.current = {
            y: e.touches[0]!.clientY,
            time: e.timeStamp,
            active: !body || body.scrollTop <= 0,
        };
    };
    const touchMove = (e: TouchEvent<HTMLElement>) => {
        const start = drag.current;
        if (!start?.active) return;
        const dy = e.touches[0]!.clientY - start.y;
        if (dy <= 0 && dragY === null) return;
        setDragY(Math.max(0, dy));
    };
    const touchEnd = (e: TouchEvent<HTMLElement>) => {
        const start = drag.current;
        drag.current = null;
        if (!start?.active || dragY === null) return;
        const speed = dragY / Math.max(1, e.timeStamp - start.time);
        if (dragY > 100 || (dragY > 24 && speed > 0.5)) onClose();
        else setDragY(null);
    };
    useEffect(() => {
        if (open) {
            opener.current = document.activeElement as HTMLElement | null;
            requestAnimationFrame(() =>
                (
                    ref.current?.querySelector<HTMLElement>(
                        "[data-autofocus]",
                    ) ??
                    ref.current?.querySelector<HTMLElement>(
                        ".drawer-body input, .drawer-body button",
                    )
                )?.focus({ preventScroll: true }),
            );
            return;
        }
        const timer = setTimeout(() => setShown(false), sheet ? 300 : 200);
        if (ref.current?.contains(document.activeElement))
            opener.current?.focus?.({ preventScroll: true });
        return () => clearTimeout(timer);
    }, [open, sheet]);
    if (!shown) return null;
    return (
        <>
            <button
                aria-label="Close writing panel"
                tabIndex={-1}
                onClick={onClose}
                className={`drawer-scrim fixed! inset-0 z-[17] m-0! h-full! w-full! cursor-default! rounded-none! border-0! bg-[color-mix(in_srgb,var(--shadow)_6%,transparent)]! p-0! transition-opacity duration-300 hover:bg-[color-mix(in_srgb,var(--shadow)_6%,transparent)]! max-[720px]:bg-[color-mix(in_srgb,var(--shadow)_18%,transparent)]! ${open && (!sheet || entered) ? "opacity-100" : "pointer-events-none opacity-0"}`}
            />
            <aside
                ref={ref}
                id={id}
                aria-label={title}
                aria-hidden={!open}
                inert={!open}
                onKeyDown={(e) => {
                    if (e.key === "Escape") {
                        e.stopPropagation();
                        onClose();
                    }
                }}
                onTouchStart={sheet ? touchStart : undefined}
                onTouchMove={sheet ? touchMove : undefined}
                onTouchEnd={sheet ? touchEnd : undefined}
                onTouchCancel={sheet ? () => setDragY(null) : undefined}
                style={
                    sheet
                        ? {
                              transform:
                                  open && entered
                                      ? `translateY(${dragY ?? 0}px)`
                                      : "translateY(100%)",
                              transition:
                                  dragY === null
                                      ? "transform 280ms cubic-bezier(0.32, 0.72, 0, 1)"
                                      : "none",
                          }
                        : undefined
                }
                className={`drawer border-line bg-surface text-ink fixed bottom-[calc(var(--dock-height,64px)+28px)] left-1/2 z-[18] flex max-h-[min(68dvh,620px)] w-[min(560px,calc(100vw-24px))] -translate-x-1/2 flex-col overflow-hidden rounded-[18px] border [box-shadow:0_24px_64px_-12px_color-mix(in_srgb,var(--shadow)_22%,transparent),0_2px_6px_color-mix(in_srgb,var(--shadow)_5%,transparent)] max-[720px]:bottom-0 max-[720px]:z-[21] max-[720px]:max-h-[82dvh] max-[720px]:w-full max-[720px]:rounded-t-[9px] max-[720px]:rounded-b-none max-[720px]:border-b-0 max-[720px]:pb-[env(safe-area-inset-bottom)] max-[720px]:[box-shadow:0_-8px_32px_rgba(0,0,0,0.18)] ${sheet ? "" : "transition-[opacity,translate,clip-path] duration-200 ease-out motion-reduce:transition-none"} ${open ? "translate-y-0 opacity-100 [clip-path:inset(0_0_0_0_round_18px)] max-[720px]:[clip-path:none]" : "pointer-events-none translate-y-3 opacity-0 [clip-path:inset(40%_0_0_0_round_18px)] max-[720px]:translate-y-0 max-[720px]:opacity-100 max-[720px]:[clip-path:none]"}`}
            >
                <span
                    aria-hidden="true"
                    className="bg-line mx-auto mt-2 hidden h-1 w-9 shrink-0 rounded-full max-[720px]:block"
                />
                <header className="flex shrink-0 items-center gap-2 py-3 pr-2 pl-5 max-[720px]:pt-2">
                    <h2 className="mr-auto text-[15px] font-semibold tracking-[-0.01em]">
                        {title}
                    </h2>
                    {actions}
                    <Button icon={X} label="Close panel" onClick={onClose} />
                </header>
                <div className="drawer-body min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5">
                    {children}
                </div>
            </aside>
        </>
    );
}
