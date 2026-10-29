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
    type ReactNode,
} from "react";
import { Button } from "../ui";
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
    return (
        <Tooltip.Root>
            <Tooltip.Trigger asChild>
                <button
                    className={`${DOCK_BUTTON} ${className}`}
                    aria-label={label}
                    aria-pressed={pressed}
                    onClick={onClick}
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
    const ref = useRef<HTMLElement>(null);
    const opener = useRef<HTMLElement | null>(null);
    if (open && !shown) setShown(true);
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
        const timer = setTimeout(() => setShown(false), 200);
        if (ref.current?.contains(document.activeElement))
            opener.current?.focus?.({ preventScroll: true });
        return () => clearTimeout(timer);
    }, [open]);
    if (!shown) return null;
    return (
        <>
            <button
                aria-label="Close writing panel"
                tabIndex={-1}
                onClick={onClose}
                className={`drawer-scrim fixed! inset-0 z-[17] m-0! h-full! w-full! cursor-default! rounded-none! border-0! bg-[color-mix(in_srgb,var(--shadow)_6%,transparent)]! p-0! transition-opacity duration-200 hover:bg-[color-mix(in_srgb,var(--shadow)_6%,transparent)]! max-[720px]:bg-[color-mix(in_srgb,var(--shadow)_18%,transparent)]! ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
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
                className={`drawer border-line bg-surface text-ink fixed bottom-[calc(var(--dock-height,64px)+28px)] left-1/2 z-[18] flex max-h-[min(68dvh,620px)] w-[min(560px,calc(100vw-24px))] -translate-x-1/2 flex-col overflow-hidden rounded-[18px] border [box-shadow:0_24px_64px_-12px_color-mix(in_srgb,var(--shadow)_22%,transparent),0_2px_6px_color-mix(in_srgb,var(--shadow)_5%,transparent)] transition-[opacity,translate,clip-path] duration-200 ease-out motion-reduce:transition-none max-[720px]:bottom-0 max-[720px]:z-[21] max-[720px]:max-h-[82dvh] max-[720px]:w-full max-[720px]:rounded-t-[9px] max-[720px]:rounded-b-none max-[720px]:border-b-0 max-[720px]:pb-[env(safe-area-inset-bottom)] ${open ? "translate-y-0 opacity-100 [clip-path:inset(0_0_0_0_round_18px)] max-[720px]:[clip-path:inset(0_0_0_0_round_9px_9px_0_0)]" : "pointer-events-none translate-y-3 opacity-0 [clip-path:inset(40%_0_0_0_round_18px)] max-[720px]:[clip-path:inset(40%_0_0_0_round_9px_9px_0_0)]"}`}
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
