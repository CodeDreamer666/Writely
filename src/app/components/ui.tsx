"use client";
import * as Tooltip from "@radix-ui/react-tooltip";
import {
    ChevronLeft,
    ChevronRight,
    FileText,
    MoreHorizontal,
    X,
    type LucideIcon,
} from "lucide-react";
import {
    useEffect,
    useRef,
    useState,
    type ButtonHTMLAttributes,
    type ReactNode,
    type TouchEvent,
} from "react";
import { createPortal } from "react-dom";
import {
    DANGER_BUTTON,
    DIALOG_ACTIONS,
    DIALOG_CLASS,
    DIALOG_HEADING,
    OVERLAY_CLASS,
} from "~/config/ui";

/** Shared controls for the editor, library and settings: tooltip buttons, ⋯ menus and dialogs. */

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
    icon?: LucideIcon;
    label?: string;
};
export function Button({
    icon: Icon,
    children,
    label,
    className = "",
    ...props
}: ButtonProps) {
    return (
        <Tooltip.Root>
            <Tooltip.Trigger asChild>
                <button
                    aria-label={label || undefined}
                    aria-pressed={
                        ["Bold", "Italic", "Bullet list", "Quote"].includes(
                            label ?? "",
                        )
                            ? className === "chosen"
                            : undefined
                    }
                    className={className}
                    {...props}
                >
                    {Icon && <Icon size={16} strokeWidth={1.6} />} {children}
                </button>
            </Tooltip.Trigger>
            {label && (
                <Tooltip.Portal>
                    <Tooltip.Content
                        className={
                            "tooltip [z-index:40] [max-width:240px] [border-radius:4px] [padding:8px_12px] [font-size:11px] [line-height:1.6] [color:var(--bg)] [background:var(--text)] [&_svg]:[fill:var(--text)]"
                        }
                        sideOffset={8}
                    >
                        {label}
                        <Tooltip.Arrow />
                    </Tooltip.Content>
                </Tooltip.Portal>
            )}
        </Tooltip.Root>
    );
}
export function IconButton({
    icon: I,
    label,
    ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
    icon: LucideIcon;
    label: string;
}) {
    return (
        <Tooltip.Root>
            <Tooltip.Trigger asChild>
                <button
                    className={
                        "icon-button [height:44px] [width:44px] shrink-0 [padding:12px] [&[aria-pressed='true']]:[color:var(--accent)] [&[aria-pressed='true']]:[background:var(--tint)] [.workspace-tools_&]:[min-width:44px] [.workspace-tools_&]:[font-size:inherit] [.workspace-tools_&]:[color:var(--text)] [.workspace-tools_&:active]:[border-top-color:var(--control-border)] [.workspace-tools_&:active]:[border-right-color:var(--control-border)] [.workspace-tools_&:active]:[border-bottom-color:var(--control-border)] [.workspace-tools_&:active]:[border-left-color:var(--control-border)] [.workspace-tools_&:active]:[color:var(--accent)] [.workspace-tools_&:active]:[background:var(--tint)] [.workspace-tools_&:hover]:[border-top-color:var(--control-border)] [.workspace-tools_&:hover]:[border-right-color:var(--control-border)] [.workspace-tools_&:hover]:[border-bottom-color:var(--control-border)] [.workspace-tools_&:hover]:[border-left-color:var(--control-border)] [.workspace-tools_&:hover]:[background:var(--control-hover)] [.workspace-tools_&[aria-pressed='true']]:[color:var(--accent)] [.workspace-tools_&[aria-pressed='true']]:[background:var(--tint)] [@media(width_<=_640px)]:[.workspace-tools_&]:[width:44px]"
                    }
                    aria-label={label}
                    {...props}
                >
                    <I size={18} />
                </button>
            </Tooltip.Trigger>
            <Tooltip.Portal>
                <Tooltip.Content
                    className={
                        "tooltip [z-index:40] [max-width:240px] [border-radius:4px] [padding:8px_12px] [font-size:11px] [line-height:1.6] [color:var(--bg)] [background:var(--text)] [&_svg]:[fill:var(--text)]"
                    }
                    sideOffset={8}
                >
                    {label}
                    <Tooltip.Arrow className="tooltip-arrow" />
                </Tooltip.Content>
            </Tooltip.Portal>
        </Tooltip.Root>
    );
}

/**
 * A panel that rises from the bottom of the screen, with the same slide, scrim and swipe-down-to-close
 * as the ⋯ menu on phones.
 */
export function BottomSheet({
    open,
    onClose,
    title,
    children,
}: {
    open: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
}) {
    const [entered, setEntered] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [dragY, setDragY] = useState<number | null>(null);
    const drag = useRef<{ y: number; time: number; active: boolean } | null>(
        null,
    );
    const panel = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (open) {
            // Two frames, so the sheet paints off-screen before it slides up.
            let second = 0;
            const first = requestAnimationFrame(() => {
                setMounted(true);
                second = requestAnimationFrame(() => {
                    setEntered(true);
                    panel.current?.focus({ preventScroll: true });
                });
            });
            return () => {
                cancelAnimationFrame(first);
                cancelAnimationFrame(second);
            };
        }
        // Keep the sheet mounted while it slides away.
        const done = setTimeout(() => {
            setMounted(false);
            setEntered(false);
            setDragY(null);
        }, 300);
        return () => clearTimeout(done);
    }, [open]);
    useEffect(() => {
        const el = panel.current;
        if (!open || !el) return;
        // A downward pull is for closing the sheet: stop the browser turning it into pull-to-refresh.
        const move = (e: globalThis.TouchEvent) => {
            const start = drag.current;
            if (
                start?.active &&
                e.touches[0]!.clientY > start.y &&
                e.cancelable
            )
                e.preventDefault();
        };
        const key = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        el.addEventListener("touchmove", move, { passive: false });
        document.addEventListener("keydown", key);
        const root = document.documentElement.style;
        const before = root.overscrollBehaviorY;
        root.overscrollBehaviorY = "contain";
        return () => {
            el.removeEventListener("touchmove", move);
            document.removeEventListener("keydown", key);
            root.overscrollBehaviorY = before;
        };
    }, [open, onClose]);
    const touchStart = (e: TouchEvent<HTMLDivElement>) => {
        // Only a pull from the top of the sheet closes it; otherwise its content scrolls.
        drag.current = {
            y: e.touches[0]!.clientY,
            time: e.timeStamp,
            active: e.currentTarget.scrollTop <= 0,
        };
    };
    const touchMove = (e: TouchEvent<HTMLDivElement>) => {
        const start = drag.current;
        if (!start?.active) return;
        const dy = e.touches[0]!.clientY - start.y;
        setDragY(dy > 0 ? dy : 0);
    };
    const touchEnd = (e: TouchEvent<HTMLDivElement>) => {
        const start = drag.current;
        drag.current = null;
        if (!start?.active || dragY === null) return;
        const speed = dragY / Math.max(1, e.timeStamp - start.time);
        if (dragY > 100 || (dragY > 24 && speed > 0.5)) onClose();
        else setDragY(null);
    };
    if (!open && !mounted) return null;
    const shown = open && entered;
    return createPortal(
        <>
            <div
                aria-hidden="true"
                onClick={onClose}
                className="fixed inset-0 z-[34] bg-black/40 motion-reduce:transition-none"
                style={{
                    opacity: shown
                        ? dragY === null
                            ? 1
                            : Math.max(0, 1 - dragY / 400)
                        : 0,
                    transition:
                        dragY === null
                            ? "opacity 280ms cubic-bezier(0.32, 0.72, 0, 1)"
                            : "none",
                }}
            />
            <div
                ref={panel}
                role="dialog"
                aria-modal="true"
                aria-label={title}
                tabIndex={-1}
                className="fixed inset-x-0 bottom-0 z-[35] max-h-[85dvh] w-full overflow-y-auto rounded-t-[14px] bg-[var(--surface)] px-4 pt-3 pb-[max(20px,env(safe-area-inset-bottom))] shadow-[0_-8px_32px_rgba(0,0,0,0.18)] outline-none motion-reduce:transition-none"
                onTouchStart={touchStart}
                onTouchMove={touchMove}
                onTouchEnd={touchEnd}
                onTouchCancel={() => setDragY(null)}
                style={{
                    transform: shown
                        ? `translateY(${dragY ?? 0}px)`
                        : "translateY(100%)",
                    transition:
                        dragY === null
                            ? "transform 280ms cubic-bezier(0.32, 0.72, 0, 1)"
                            : "none",
                    overscrollBehavior: "contain",
                }}
            >
                <span
                    aria-hidden="true"
                    className="bg-line mx-auto mb-3 block h-1 w-10 rounded-full"
                />
                <div className="text-ink px-1 pt-1 pb-4 text-[20px] font-medium">
                    {title}
                </div>
                {children}
            </div>
        </>,
        document.body,
    );
}

export type MenuItem = {
    label: string;
    /** Shown beside the label when the menu opens as a bottom sheet on phones. */
    icon?: LucideIcon;
    onSelect?: () => void;
    children?: MenuItem[];
    danger?: boolean;
    separator?: boolean;
};
// A ⋯ trigger with a small keyboard-navigable menu; shared by the document list and saved drafts.
export function ActionMenu({
    label,
    menuLabel,
    items,
    trigger: triggerContent,
    triggerClassName = "",
    menuWidth = 144,
    sheetTitle,
}: {
    label: string;
    menuLabel: string;
    items: MenuItem[];
    /** Heading of the bottom sheet the menu becomes on phones. */
    sheetTitle?: string;
    /** Replaces the ⋯ icon. */
    trigger?: ReactNode;
    /** Extra classes for the trigger, e.g. to keep it visible outside the document list. */
    triggerClassName?: string;
    menuWidth?: number;
}) {
    // On phones the menu rises from the bottom of the screen as a sheet, like Google Docs.
    const [sheet, setSheet] = useState(false);
    const [entered, setEntered] = useState(false);
    const [leaving, setLeaving] = useState(false);
    const [dragY, setDragY] = useState<number | null>(null);
    const drag = useRef<{ y: number; time: number; active: boolean } | null>(
        null,
    );
    const [open, setOpen] = useState(false),
        [submenu, setSubmenu] = useState<MenuItem | null>(null),
        [menuPosition, setMenuPosition] = useState<{
            top?: number;
            left?: number;
        }>({});
    const menu = useRef<HTMLDivElement>(null);
    const container = useRef<HTMLDivElement>(null),
        trigger = useRef<HTMLButtonElement>(null);
    useEffect(() => {
        if (!open) return;
        const dismiss = (e: PointerEvent) => {
            if (
                !container.current?.contains(e.target as Node) &&
                !menu.current?.contains(e.target as Node)
            )
                setOpen(false);
        };
        const anchor = trigger.current?.getBoundingClientRect();
        const dismissScroll = () => {
            const current = trigger.current?.getBoundingClientRect();
            // A click can finish scrolling the trigger into view just as the menu opens.
            // Only dismiss when scrolling actually moves the anchor after opening.
            if (current?.top !== anchor?.top || current?.left !== anchor?.left)
                setOpen(false);
        };
        const dismissResize = () => setOpen(false);
        document.addEventListener("pointerdown", dismiss);
        if (!sheet) {
            document.addEventListener("scroll", dismissScroll, true);
            window.addEventListener("resize", dismissResize);
        }
        return () => {
            document.removeEventListener("pointerdown", dismiss);
            document.removeEventListener("scroll", dismissScroll, true);
            window.removeEventListener("resize", dismissResize);
        };
    }, [open, sheet]);
    useEffect(() => {
        if (open) {
            setLeaving(false);
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
        }
        if (!sheet) return;
        setLeaving(true);
        const done = setTimeout(() => setLeaving(false), 300);
        return () => clearTimeout(done);
    }, [open, sheet]);
    const touchStart = (e: TouchEvent<HTMLDivElement>) => {
        // Only a pull from the top of the sheet closes it; otherwise the list scrolls.
        drag.current = {
            y: e.touches[0]!.clientY,
            time: e.timeStamp,
            active: e.currentTarget.scrollTop <= 0,
        };
    };
    const touchMove = (e: TouchEvent<HTMLDivElement>) => {
        const start = drag.current;
        if (!start?.active) return;
        const dy = e.touches[0]!.clientY - start.y;
        setDragY(dy > 0 ? dy : 0);
    };
    const touchEnd = (e: TouchEvent<HTMLDivElement>) => {
        const start = drag.current;
        drag.current = null;
        if (!start?.active || dragY === null) return;
        const speed = dragY / Math.max(1, e.timeStamp - start.time);
        if (dragY > 100 || (dragY > 24 && speed > 0.5)) setOpen(false);
        else setDragY(null);
    };
    // A downward pull on the sheet is for closing it: stop the browser turning it into
    // pull-to-refresh (it needs a non-passive listener to cancel the scroll).
    useEffect(() => {
        const el = menu.current;
        if (!open || !sheet || !el) return;
        const move = (e: globalThis.TouchEvent) => {
            const start = drag.current;
            if (
                start?.active &&
                e.touches[0]!.clientY > start.y &&
                e.cancelable
            )
                e.preventDefault();
        };
        el.addEventListener("touchmove", move, { passive: false });
        const root = document.documentElement.style;
        const before = root.overscrollBehaviorY;
        root.overscrollBehaviorY = "contain";
        return () => {
            el.removeEventListener("touchmove", move);
            root.overscrollBehaviorY = before;
        };
    }, [open, sheet]);
    const menuItems = () => [
        ...(menu.current?.querySelectorAll<HTMLElement>("[role=menuitem]") ??
            []),
    ];
    const reveal = (last = false) => {
        setSubmenu(null);
        setEntered(false);
        setSheet(window.matchMedia("(max-width: 640px)").matches);
        const rect = trigger.current!.getBoundingClientRect();
        setMenuPosition({
            top: Math.max(
                8,
                rect.bottom + items.length * 48 + 16 <= window.innerHeight
                    ? rect.bottom + 4
                    : rect.top - items.length * 48 - 16,
            ),
            left: Math.max(
                8,
                Math.min(
                    rect.right - menuWidth,
                    window.innerWidth - menuWidth - 8,
                ),
            ),
        });
        setOpen(true);
        requestAnimationFrame(() => {
            const items = menuItems();
            (last ? items.at(-1) : items[0])?.focus({ preventScroll: true });
        });
    };
    const choose = (action: () => void) => {
        setOpen(false);
        trigger.current?.focus();
        action();
    };
    const showSubmenu = (item: MenuItem | null) => {
        setSubmenu(item);
        requestAnimationFrame(() => menuItems()[0]?.focus());
    };
    return (
        <div
            className={
                "document-actions relative shrink-0 [.document-row_&]:[margin-top:0] [.document-row_&]:[align-self:center]"
            }
            ref={container}
            onKeyDown={(e) => {
                if (e.key === "Escape") {
                    e.stopPropagation();
                    if (submenu) showSubmenu(null);
                    else {
                        setOpen(false);
                        trigger.current?.focus();
                    }
                }
                if (e.key === "ArrowLeft" && submenu) {
                    e.preventDefault();
                    showSubmenu(null);
                }
                if (e.key === "ArrowRight" && !submenu) {
                    const current = items.find(
                        (item) =>
                            item.children &&
                            item.label ===
                                document.activeElement?.textContent?.trim(),
                    );
                    if (current) {
                        e.preventDefault();
                        showSubmenu(current);
                    }
                }
                if (e.key === "Tab") setOpen(false);
                if (
                    open &&
                    ["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)
                ) {
                    e.preventDefault();
                    const items = menuItems();
                    const index = items.indexOf(
                        document.activeElement as HTMLElement,
                    );
                    items[
                        e.key === "Home"
                            ? 0
                            : e.key === "End"
                              ? items.length - 1
                              : (index +
                                    (e.key === "ArrowDown"
                                        ? 1
                                        : items.length - 1)) %
                                items.length
                    ]?.focus();
                }
            }}
        >
            <button
                ref={trigger}
                className={`document-menu-trigger pointer-events-none [height:32px] [min-height:32px] [width:32px] [min-width:32px] [padding:8px] [color:inherit] [opacity:0] [&[aria-expanded='true']]:pointer-events-auto [&[aria-expanded='true']]:[opacity:1] [.document-row_&:hover]:[border-color:transparent] [.document-row_&:hover]:[background:transparent] [.document-row:focus-within_&]:pointer-events-auto [.document-row:focus-within_&]:[opacity:1] [.document-row:hover_&]:pointer-events-auto [.document-row:hover_&]:[opacity:1] [.draft-meta_&]:pointer-events-auto [.draft-meta_&]:[height:28px] [.draft-meta_&]:[min-height:28px] [.draft-meta_&]:[width:28px] [.draft-meta_&]:[min-width:28px] [.draft-meta_&]:[padding:6px] [.draft-meta_&]:[color:var(--muted)] [.draft-meta_&]:[opacity:1] [.draft-meta_&:hover]:[color:var(--text)] [.draft-meta_&[aria-expanded='true']]:[color:var(--text)] [@media(hover:_none)]:pointer-events-auto [@media(hover:_none)]:[height:44px] [@media(hover:_none)]:[width:44px] [@media(hover:_none)]:[min-width:44px] [@media(hover:_none)]:[opacity:1] ${triggerClassName}`}
                aria-label={label}
                aria-haspopup="menu"
                aria-expanded={open}
                onClick={() => {
                    if (open) setOpen(false);
                    else reveal();
                }}
                onKeyDown={(e) => {
                    if (!open && ["ArrowDown", "ArrowUp"].includes(e.key)) {
                        e.preventDefault();
                        reveal(e.key === "ArrowUp");
                    }
                }}
            >
                {triggerContent ?? (
                    <MoreHorizontal size={16} strokeWidth={1.6} />
                )}
            </button>
            {(open || leaving) &&
                createPortal(
                    <>
                        {sheet && (
                            <div
                                aria-hidden="true"
                                className="fixed inset-0 z-[34] bg-black/40 motion-reduce:transition-none"
                                style={{
                                    opacity:
                                        open && entered
                                            ? dragY === null
                                                ? 1
                                                : Math.max(0, 1 - dragY / 400)
                                            : 0,
                                    transition:
                                        dragY === null
                                            ? "opacity 280ms cubic-bezier(0.32, 0.72, 0, 1)"
                                            : "none",
                                }}
                            />
                        )}
                        <div
                            ref={menu}
                            className={
                                sheet
                                    ? "document-menu fixed inset-x-0 bottom-0 z-[35] max-h-[85dvh] w-full overflow-y-auto rounded-t-[14px] border-0 bg-[var(--surface)] px-2 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] shadow-[0_-8px_32px_rgba(0,0,0,0.18)] [&_button]:w-full [&_button]:justify-start [&_button]:text-[var(--text)]"
                                    : "document-menu fixed [right:auto] [z-index:35] max-h-[calc(100dvh-16px)] [width:144px] [min-width:144px] overflow-y-auto [border-radius:8px] [border-width:1px] [border-style:solid] [border-top-color:var(--border)] [border-right-color:var(--border)] [border-bottom-color:var(--border)] [border-left-color:var(--border)] [padding:4px] [box-shadow:0_4px_16px_color-mix(in_srgb,_var(--shadow)_7%,_transparent)] [background:var(--surface)] [border-image:none] [&_button]:[width:100%] [&_button]:justify-start [&_button]:[color:var(--text)]"
                            }
                            onTouchStart={sheet ? touchStart : undefined}
                            onTouchMove={sheet ? touchMove : undefined}
                            onTouchEnd={sheet ? touchEnd : undefined}
                            onTouchCancel={
                                sheet ? () => setDragY(null) : undefined
                            }
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
                                          overscrollBehavior: "contain",
                                      }
                                    : {
                                          ...menuPosition,
                                          width: menuWidth,
                                          minWidth: menuWidth,
                                      }
                            }
                            role="menu"
                            aria-label={submenu ? submenu.label : menuLabel}
                        >
                            {sheet && (
                                <>
                                    <span
                                        aria-hidden="true"
                                        className="bg-line mx-auto mb-3 block h-1 w-10 rounded-full"
                                    />
                                    {sheetTitle && (
                                        <div className="text-ink flex items-center gap-4 truncate px-3 pt-1 pb-4 text-[20px] font-medium">
                                            <FileText
                                                size={22}
                                                strokeWidth={1.6}
                                                aria-hidden="true"
                                                className="text-accent shrink-0"
                                            />
                                            <span className="truncate">
                                                {sheetTitle}
                                            </span>
                                        </div>
                                    )}
                                </>
                            )}
                            {submenu && (
                                <button
                                    role="menuitem"
                                    className={
                                        sheet
                                            ? "h-14! min-h-14! gap-5! rounded-xl! border-0! bg-transparent! px-3! text-[16px]! shadow-none!"
                                            : ""
                                    }
                                    onClick={() => showSubmenu(null)}
                                >
                                    <ChevronLeft size={14} aria-hidden="true" />{" "}
                                    Back
                                </button>
                            )}
                            {(submenu?.children ?? items).map((item) => (
                                <button
                                    key={item.label}
                                    role="menuitem"
                                    className={`${item.danger ? "danger [color:var(--danger)] [.account-actions_button&]:[border-top-color:color-mix(in_srgb,_var(--danger)_45%,_transparent)] [.account-actions_button&]:[border-right-color:color-mix(in_srgb,_var(--danger)_45%,_transparent)] [.account-actions_button&]:[border-bottom-color:color-mix(in_srgb,_var(--danger)_45%,_transparent)] [.account-actions_button&]:[border-left-color:color-mix(in_srgb,_var(--danger)_45%,_transparent)] [.account-actions_button&]:[color:var(--danger)] [.account-actions_button&]:[background:color-mix(in_srgb,_var(--danger)_8%,_var(--bg))] [.account-actions_button&:active]:[color:var(--danger)] [.account-actions_button&:active]:[background:color-mix(in_srgb,_var(--danger)_14%,_var(--bg))] [.account-actions_button&:hover]:[color:var(--danger)] [.account-actions_button&:hover]:[background:color-mix(in_srgb,_var(--danger)_14%,_var(--bg))] [.document-menu_button&]:[color:var(--danger)]" : ""} ${sheet ? "h-14! min-h-14! gap-5! rounded-xl! border-0! bg-transparent! px-3! text-[16px]! shadow-none!" : ""} ${item.separator ? "menu-separated [.document-menu_&]:[margin-top:4px] [.document-menu_&]:[border-radius:0_0_4px_4px] [.document-menu_&]:[border-top-width:1px] [.document-menu_&]:[border-top-style:solid] [.document-menu_&]:[border-top-color:var(--border)] [.document-menu_&]:[padding-top:10px]" : ""}`}
                                    aria-haspopup={
                                        item.children ? "menu" : undefined
                                    }
                                    onClick={() =>
                                        item.children
                                            ? showSubmenu(item)
                                            : item.onSelect &&
                                              choose(item.onSelect)
                                    }
                                >
                                    {sheet && item.icon && (
                                        <item.icon
                                            size={22}
                                            strokeWidth={1.6}
                                            aria-hidden="true"
                                            className="shrink-0"
                                        />
                                    )}
                                    {item.label}
                                    {item.children && (
                                        <ChevronRight
                                            size={14}
                                            className="ml-auto"
                                            aria-hidden="true"
                                        />
                                    )}
                                </button>
                            ))}
                        </div>
                    </>,
                    document.body,
                )}
        </div>
    );
}
/**
 * A modal dialog: keeps focus inside, focuses the first field or button, returns focus on close,
 * and closes on Escape or a click on the backdrop.
 */
export function Dialog({
    title,
    onClose,
    children,
    describedBy,
    className = "",
}: {
    title: string;
    onClose: () => void;
    children: ReactNode;
    describedBy?: string;
    className?: string;
}) {
    const ref = useRef<HTMLElement>(null);
    const close = useRef(onClose);
    useEffect(() => {
        close.current = onClose;
    });
    useEffect(() => {
        const prior = document.activeElement as HTMLElement | null;
        requestAnimationFrame(() =>
            ref.current
                ?.querySelector<HTMLElement>(
                    "input, textarea, select, button[data-autofocus], button",
                )
                ?.focus(),
        );
        return () => prior?.focus?.();
    }, []);
    return createPortal(
        <div
            className={OVERLAY_CLASS}
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) close.current();
            }}
        >
            <section
                ref={ref}
                className={`${DIALOG_CLASS} ${className}`}
                role="dialog"
                aria-modal="true"
                aria-labelledby="ui-dialog-title"
                aria-describedby={describedBy}
                onKeyDown={(e) => {
                    if (e.key === "Escape") {
                        e.stopPropagation();
                        close.current();
                    }
                    if (e.key !== "Tab") return;
                    const nodes = [
                        ...ref.current!.querySelectorAll<HTMLElement>(
                            "button:not(:disabled), input, select, textarea, a[href], [tabindex]:not([tabindex='-1'])",
                        ),
                    ];
                    const first = nodes[0],
                        last = nodes.at(-1);
                    if (e.shiftKey && document.activeElement === first) {
                        e.preventDefault();
                        last?.focus();
                    } else if (!e.shiftKey && document.activeElement === last) {
                        e.preventDefault();
                        first?.focus();
                    }
                }}
            >
                <div className={DIALOG_HEADING}>
                    <h2 id="ui-dialog-title">{title}</h2>
                    <Button
                        icon={X}
                        label="Close dialog"
                        type="button"
                        onClick={() => close.current()}
                    />
                </div>
                {children}
            </section>
        </div>,
        document.body,
    );
}

/** Confirm a destructive action only after the user types the required word. */
export function DeleteDialog({
    title,
    description,
    onClose,
    onConfirm,
}: {
    title: string;
    description: ReactNode;
    onClose: () => void;
    onConfirm: () => void;
}) {
    const [confirmation, setConfirmation] = useState("");
    return (
        <Dialog
            title={title}
            onClose={onClose}
            describedBy="delete-dialog-description"
        >
            <form
                onSubmit={(event) => {
                    event.preventDefault();
                    if (confirmation === "delete") onConfirm();
                }}
            >
                <p id="delete-dialog-description">{description}</p>
                <label htmlFor="delete-dialog-confirmation">
                    Type delete to confirm
                </label>
                <input
                    id="delete-dialog-confirmation"
                    value={confirmation}
                    onChange={(event) => setConfirmation(event.target.value)}
                    autoComplete="off"
                    spellCheck={false}
                />
                <div className={DIALOG_ACTIONS}>
                    <button type="button" onClick={onClose}>
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className={DANGER_BUTTON}
                        disabled={confirmation !== "delete"}
                    >
                        Delete
                    </button>
                </div>
            </form>
        </Dialog>
    );
}
