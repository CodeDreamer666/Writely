"use client";
import {
    ArrowRight,
    type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

/** A hint card inside an empty state; with an action it becomes a button or link. */
export type EmptyCard = {
    icon: LucideIcon;
    title: string;
    text: string;
    onClick?: () => void;
    href?: string;
};

/**
 * What: The look of the suggestion cards inside an empty state (for example
 * "Create a document" when the library has nothing in it).
 *
 * Used in:
 * - src/app/components/empty-state.tsx (Card, used by EmptyState)
 *
 * Effect: Changes the border, padding and layout of every suggestion card
 * in the library, Settings and editor empty states.
 */
const CARD =
    "group flex! h-auto! w-full! min-w-0! items-start! justify-start! gap-3! rounded-xl! border! border-line! bg-paper! p-3.5! text-left! font-normal! text-ink! no-underline shadow-none! transition-[border-color,background-color,transform] duration-150";
/**
 * What: Extra styles for suggestion cards that can be clicked: the pointer
 * cursor and the hover and focus highlight.
 *
 * Used in:
 * - src/app/components/empty-state.tsx (Card)
 *
 * Effect: Changes how clickable suggestion cards react to hover and keyboard
 * focus. Cards that only show text are not affected.
 */
const CARD_ACTION =
    "cursor-pointer hover:border-[var(--control-focus)]! hover:bg-surface! focus-visible:border-[var(--control-focus)]! motion-safe:hover:-translate-y-px";

function Card({ icon: Icon, title, text, onClick, href }: EmptyCard) {
    const body = (
        <>
            <span
                aria-hidden="true"
                className="bg-tint text-accent flex size-8 shrink-0 items-center justify-center rounded-lg"
            >
                <Icon size={16} strokeWidth={1.7} />
            </span>
            <span className="min-w-0 flex-1">
                <span className="block text-[13px] leading-[1.4] font-medium">
                    {title}
                </span>
                <span className="text-muted mt-0.5 block text-[12px] leading-[1.5]">
                    {text}
                </span>
            </span>
            {(onClick ?? href) && (
                <ArrowRight
                    size={14}
                    aria-hidden="true"
                    className="text-muted mt-1 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                />
            )}
        </>
    );
    if (href)
        return (
            <Link href={href} className={`${CARD} ${CARD_ACTION}`}>
                {body}
            </Link>
        );
    if (onClick)
        return (
            <button
                type="button"
                onClick={onClick}
                className={`${CARD} ${CARD_ACTION}`}
            >
                {body}
            </button>
        );
    return <div className={CARD}>{body}</div>;
}

/**
 * The shared empty state: an icon, a short title and line, optional calls to action, and hint
 * cards that show what the space is for. `compact` fits drawers and settings sections.
 */
export function EmptyState({
    icon: Icon,
    title,
    body,
    actions,
    cards,
    compact = false,
    className = "",
}: {
    icon: LucideIcon;
    title: string;
    body?: ReactNode;
    actions?: ReactNode;
    cards?: EmptyCard[];
    compact?: boolean;
    className?: string;
}) {
    return (
        <div
            className={`empty-state border-line flex [animation:appear_200ms_ease-out] flex-col items-center rounded-2xl border bg-[color-mix(in_srgb,var(--surface)_60%,transparent)] text-center motion-reduce:animate-none ${compact ? "px-4 py-6" : "px-6 py-12 max-sm:px-4 max-sm:py-8"} ${className}`}
        >
            <span
                aria-hidden="true"
                className={`bg-tint text-accent flex items-center justify-center rounded-2xl ${compact ? "mb-3 size-11" : "mb-4 size-14"}`}
            >
                <Icon size={compact ? 20 : 24} strokeWidth={1.6} />
            </span>
            <p
                className={`text-ink m-0! font-serif leading-[1.3] ${compact ? "text-[17px]" : "text-[24px] tracking-[-0.01em]"}`}
            >
                {title}
            </p>
            {body && (
                <p
                    className={`text-muted m-0! mt-1.5! max-w-[42ch] leading-[1.6] ${compact ? "text-[12.5px]" : "text-[14px]"}`}
                >
                    {body}
                </p>
            )}
            {actions && (
                <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                    {actions}
                </div>
            )}
            {!!cards?.length && (
                <div
                    className={`mt-6 grid w-full gap-2 ${compact ? "grid-cols-1" : "max-w-[760px] grid-cols-3 max-md:grid-cols-1"}`}
                >
                    {cards.map((card) => (
                        <Card key={card.title} {...card} />
                    ))}
                </div>
            )}
        </div>
    );
}
