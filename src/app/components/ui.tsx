"use client";
import * as Tooltip from "@radix-ui/react-tooltip";
import {
    ChevronLeft,
    ChevronRight,
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

export type MenuItem = {
    label: string;
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
}: {
    label: string;
    menuLabel: string;
    items: MenuItem[];
    /** Replaces the ⋯ icon. */
    trigger?: ReactNode;
    /** Extra classes for the trigger, e.g. to keep it visible outside the document list. */
    triggerClassName?: string;
    menuWidth?: number;
}) {
    const [open, setOpen] = useState(false),
        [submenu, setSubmenu] = useState<MenuItem | null>(null),
        [menuPosition, setMenuPosition] = useState<{
            top?: number;
            left?: number;
        }>({});
    const container = useRef<HTMLDivElement>(null),
        trigger = useRef<HTMLButtonElement>(null);
    useEffect(() => {
        if (!open) return;
        const dismiss = (e: PointerEvent) => {
            if (!container.current?.contains(e.target as Node)) setOpen(false);
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
        document.addEventListener("scroll", dismissScroll, true);
        window.addEventListener("resize", dismissResize);
        return () => {
            document.removeEventListener("pointerdown", dismiss);
            document.removeEventListener("scroll", dismissScroll, true);
            window.removeEventListener("resize", dismissResize);
        };
    }, [open]);
    const menuItems = () => [
        ...(container.current?.querySelectorAll<HTMLElement>(
            "[role=menuitem]",
        ) ?? []),
    ];
    const reveal = (last = false) => {
        setSubmenu(null);
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
            {open && (
                <div
                    className={
                        "document-menu fixed [top:100%] [right:auto] [z-index:15] max-h-[calc(100dvh-16px)] [width:144px] [min-width:144px] overflow-y-auto [border-radius:8px] [border-width:1px] [border-style:solid] [border-top-color:var(--border)] [border-right-color:var(--border)] [border-bottom-color:var(--border)] [border-left-color:var(--border)] [padding:4px] [box-shadow:0_4px_16px_color-mix(in_srgb,_var(--shadow)_7%,_transparent)] [background:var(--surface)] [border-image:none] [&_button]:[width:100%] [&_button]:justify-start [&_button]:[color:var(--text)] [.draft-meta_&]:absolute [.draft-meta_&]:[top:calc(100%_+_4px)]! [.draft-meta_&]:[right:0] [.draft-meta_&]:[left:auto]! [.draft-meta_&]:[z-index:30] [.draft-meta_&]:[width:144px]"
                    }
                    style={{
                        ...menuPosition,
                        width: menuWidth,
                        minWidth: menuWidth,
                    }}
                    role="menu"
                    aria-label={submenu ? submenu.label : menuLabel}
                >
                    {submenu && (
                        <button
                            role="menuitem"
                            onClick={() => showSubmenu(null)}
                        >
                            <ChevronLeft size={14} aria-hidden="true" /> Back
                        </button>
                    )}
                    {(submenu?.children ?? items).map((item) => (
                        <button
                            key={item.label}
                            role="menuitem"
                            className={`${item.danger ? "danger [color:var(--danger)] [.account-actions_button&]:[border-top-color:color-mix(in_srgb,_var(--danger)_45%,_transparent)] [.account-actions_button&]:[border-right-color:color-mix(in_srgb,_var(--danger)_45%,_transparent)] [.account-actions_button&]:[border-bottom-color:color-mix(in_srgb,_var(--danger)_45%,_transparent)] [.account-actions_button&]:[border-left-color:color-mix(in_srgb,_var(--danger)_45%,_transparent)] [.account-actions_button&]:[color:var(--danger)] [.account-actions_button&]:[background:color-mix(in_srgb,_var(--danger)_8%,_var(--bg))] [.account-actions_button&:active]:[color:var(--danger)] [.account-actions_button&:active]:[background:color-mix(in_srgb,_var(--danger)_14%,_var(--bg))] [.account-actions_button&:hover]:[color:var(--danger)] [.account-actions_button&:hover]:[background:color-mix(in_srgb,_var(--danger)_14%,_var(--bg))] [.document-menu_button&]:[color:var(--danger)]" : ""} ${item.separator ? "menu-separated [.document-menu_&]:[margin-top:4px] [.document-menu_&]:[border-radius:0_0_4px_4px] [.document-menu_&]:[border-top-width:1px] [.document-menu_&]:[border-top-style:solid] [.document-menu_&]:[border-top-color:var(--border)] [.document-menu_&]:[padding-top:10px]" : ""}`}
                            aria-haspopup={item.children ? "menu" : undefined}
                            onClick={() =>
                                item.children
                                    ? showSubmenu(item)
                                    : item.onSelect && choose(item.onSelect)
                            }
                        >
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
