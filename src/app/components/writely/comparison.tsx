"use client";
import {
    ChevronDown,
    ChevronUp,
} from "lucide-react";
import {
    useMemo,
    useRef,
    useState,
    type Dispatch,
    type ReactNode,
    type SetStateAction,
} from "react";
import {
    compareTexts,
    type Block,
    type Piece,
} from "~/lib/writely/compare";
import { plain } from "~/lib/writely/model";
import type {
    Draft,
    WritingDocument,
} from "~/lib/writely/types";
import { Button } from "../ui";
import { PRIMARY_BUTTON } from "~/config/ui";

export type ComparisonState = { left: string; right: string };

/**
 * What: How removed and added text look in the comparison, inline and as whole paragraphs.
 *
 * Used in:
 * - src/app/components/writely/comparison.tsx (Comparison and its parts)
 *
 * Effect: Changes the tint, strikethrough and spacing of every change. Both use the theme's
 * --diff-remove and --diff-add tints, so they follow light and dark mode.
 */
const REMOVED =
    "rounded-[3px] bg-[var(--diff-remove)] [box-decoration-break:clone] px-[2px] text-ink/80 line-through decoration-[color-mix(in_srgb,var(--danger)_70%,transparent)] decoration-1";
const ADDED =
    "rounded-[3px] bg-[var(--diff-add)] [box-decoration-break:clone] px-[2px] text-ink no-underline";
const CURRENT =
    "data-[current]:outline-2 data-[current]:outline-offset-2 data-[current]:outline-[var(--accent)] data-[current]:outline-solid";

const Removed = ({ children, change, current }: Mark) => (
    <del
        data-change={change}
        data-current={change === current || undefined}
        className={`${REMOVED} ${CURRENT}`}
    >
        <span className="sr-only">Removed: </span>
        {children}
    </del>
);
const Added = ({ children, change, current }: Mark) => (
    <ins
        data-change={change}
        data-current={change === current || undefined}
        className={`${ADDED} ${CURRENT}`}
    >
        <span className="sr-only">Added: </span>
        {children}
    </ins>
);
type Mark = { children: ReactNode; change?: number; current: number };

/** A paragraph's text with its changes in place; `side` leaves out the other version's text. */
function Pieces({
    pieces,
    side,
    current,
}: {
    pieces: Piece[];
    side: "before" | "after" | "both";
    current: number;
}) {
    return pieces.map((piece, i) => {
        if (piece.kind === "same") return <span key={i}>{piece.text}</span>;
        if (piece.kind === "removed" && side === "after") return null;
        if (piece.kind === "added" && side === "before") return null;
        // Spacing that differs between versions isn't a change worth marking.
        if (piece.change === undefined)
            return piece.kind === "removed" && side === "both" ? null : (
                <span key={i}>{piece.text}</span>
            );
        const Mark = piece.kind === "removed" ? Removed : Added;
        return (
            <Mark key={i} change={piece.change} current={current}>
                {piece.text}
            </Mark>
        );
    });
}

/** A changed paragraph keeps normal, readable text with a quiet edge and a change label. */
function WholeParagraph({
    block,
    current,
}: {
    block: Extract<Block, { kind: "removed" | "added" }>;
    current: number;
}) {
    const removed = block.kind === "removed";
    return (
        <div
            data-change={block.change}
            data-current={block.change === current || undefined}
            className={`border-l-2 pl-4 ${removed ? "border-[color-mix(in_srgb,var(--danger)_40%,transparent)]" : "border-[color-mix(in_srgb,var(--success)_45%,transparent)]"} ${CURRENT}`}
        >
            <p className={"text-ink/85"}>
                <span
                    className={`mb-2 block font-sans text-[10px] font-medium tracking-wide uppercase ${removed ? "text-danger" : "text-success"}`}
                >
                    {removed ? "Removed paragraph" : "Added paragraph"}
                </span>
                {block.text}
            </p>
        </div>
    );
}

/** One row of the side-by-side view: what the earlier and later versions say here. */
type Row = { before?: ReactNode; after?: ReactNode };

function rowsOf(blocks: Block[], current: number): Row[] {
    const rows: Row[] = [];
    for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i]!;
        if (block.kind === "same") {
            const text = <p>{block.text}</p>;
            rows.push({ before: text, after: text });
        } else if (block.kind === "edited") {
            rows.push({
                before: (
                    <p>
                        <Pieces
                            pieces={block.pieces}
                            side="before"
                            current={current}
                        />
                    </p>
                ),
                after: (
                    <p>
                        <Pieces
                            pieces={block.pieces}
                            side="after"
                            current={current}
                        />
                    </p>
                ),
            });
        } else if (block.kind === "removed") {
            const next = blocks[i + 1];
            const paired =
                next?.kind === "added" && next.change === block.change
                    ? next
                    : undefined;
            if (paired) i++;
            rows.push({
                before: <WholeParagraph block={block} current={current} />,
                after: paired && (
                    <WholeParagraph block={paired} current={current} />
                ),
            });
        } else
            rows.push({
                after: <WholeParagraph block={block} current={current} />,
            });
    }
    return rows;
}

const PROSE =
    "font-serif text-[16px] leading-[1.85] [overflow-wrap:anywhere] [&_p]:m-0 [&_del+ins]:ml-[0.25em]";

/**
 * Two versions of a document compared. Wide screens show them side by side in one scrolling area,
 * so the two sides always line up; phones show one text with each removal followed by what replaced
 * it. Changes are grouped into words, sentences or whole paragraphs, and Previous / Next change
 * step through them.
 */
export default function Comparison({
    doc,
    comparison,
    setComparison,
    onRestore,
}: {
    doc: WritingDocument;
    comparison: ComparisonState;
    setComparison: Dispatch<SetStateAction<ComparisonState | null>>;
    /** Asks before replacing the text with `draft`. */
    onRestore: (draft: Draft) => void;
}) {
    const working = {
        id: "working",
        name: "Current writing",
        html: doc.html,
    };
    const all: (Draft | typeof working)[] = [working, ...doc.drafts];
    const left = all.find((d) => d.id === comparison.left) ?? working,
        right = all.find((d) => d.id === comparison.right) ?? working;
    const result = useMemo(
        () => compareTexts(plain(left.html), plain(right.html)),
        [left.html, right.html],
    );
    const [current, setCurrent] = useState(-1);
    // A different pair of versions starts again from the top.
    const [pairShown, setPairShown] = useState(`${left.id}:${right.id}`);
    if (pairShown !== `${left.id}:${right.id}`) {
        setPairShown(`${left.id}:${right.id}`);
        setCurrent(-1);
    }
    const scroller = useRef<HTMLDivElement>(null);
    const go = (index: number) => {
        setCurrent(index);
        // Only one layout shows at a time; jump to the change in the visible one.
        const target = [
            ...(scroller.current?.querySelectorAll<HTMLElement>(
                `[data-change="${index}"]`,
            ) ?? []),
        ].find((el) => el.getClientRects().length);
        const area = scroller.current;
        if (!target || !area) return;
        // Scroll only the comparison itself (scrollIntoView would also move the page around it),
        // centring the change in it.
        const box = target.getBoundingClientRect(),
            view = area.getBoundingClientRect();
        area.scrollTo({
            top:
                area.scrollTop +
                box.top -
                view.top -
                Math.max(16, (view.height - box.height) / 2),
            behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
                ? "auto"
                : "smooth",
        });
    };
    const rows = rowsOf(result.blocks, current);
    const restoreTarget =
        right.id !== "working" ? right : left.id !== "working" ? left : null;
    const isEmpty = (html: string) => !plain(html).trim();
    const emptyVersion = (working: boolean) => (
        <div className="text-muted border-line flex min-h-24 flex-col items-center justify-center rounded-lg border border-dashed px-6 py-6 text-center font-sans">
            <p className="text-[14px] font-medium">This version is empty</p>
            <p className="mt-2! text-[12px]">
                {working
                    ? "Your current document has no text."
                    : "No writing had been added when it was saved."}
            </p>
        </div>
    );
    const select = (side: "left" | "right", label: string) => (
        <label className="flex min-w-0 flex-col gap-1.5">
            <span className="text-muted text-[11px] font-medium">{label}</span>
            <select
                aria-label={
                    side === "left" ? "Baseline draft" : "Revised draft"
                }
                value={(side === "left" ? left : right).id}
                onChange={(e) =>
                    setComparison((c) => c && { ...c, [side]: e.target.value })
                }
                className="comparison-version border-line! bg-surface! min-h-10! w-full! min-w-0! truncate rounded-lg! py-2! text-[13px]!"
            >
                {all.map((v) => (
                    <option key={v.id} value={v.id}>
                        {v.name}
                    </option>
                ))}
            </select>
        </label>
    );
    return (
        <section
            aria-label="Draft comparison"
            className="comparison m-0 flex h-full min-h-0 flex-col p-0"
        >
            <header className="comparison-top bg-paper shrink-0 px-8 pt-5 pb-4 max-md:px-4 max-md:pt-3">
                <div className="mx-auto flex max-w-[1120px] items-center gap-2">
                    <nav
                        aria-label="Changes"
                        className="border-line bg-surface ml-auto flex shrink-0 items-center gap-0.5 rounded-lg border p-0.5"
                    >
                        <Button
                            icon={ChevronUp}
                            label="Previous change"
                            disabled={current <= 0}
                            onClick={() => go(current - 1)}
                            className="size-10! min-h-10! min-w-10! rounded-lg! p-0!"
                        />
                        <span
                            role="status"
                            className="text-muted min-w-[64px] text-center text-[12.5px] tabular-nums"
                        >
                            {result.changes === 0
                                ? "No changes"
                                : current < 0
                                  ? `${result.changes} ${result.changes === 1 ? "change" : "changes"}`
                                  : `${current + 1} of ${result.changes}`}
                        </span>
                        <Button
                            icon={ChevronDown}
                            label="Next change"
                            disabled={current >= result.changes - 1}
                            onClick={() => go(current + 1)}
                            className="size-10! min-h-10! min-w-10! rounded-lg! p-0!"
                        />
                    </nav>
                </div>
                <div className="mx-auto mt-4 grid max-w-[1120px] gap-3">
                    <div className="grid min-w-0 grid-cols-2 gap-x-8 gap-y-2 max-md:gap-x-3">
                        {select("left", "Version")}
                        {select("right", "Compare with")}
                    </div>
                </div>
            </header>
            <div
                ref={scroller}
                className="comparison-scroll min-h-0 flex-1 overflow-auto overscroll-contain px-8 pb-8 max-md:px-4"
            >
                {/* Side by side, on wider screens. One scrolling area keeps the sides in step. */}
                <div
                    className={`compare-split border-line bg-surface mx-auto max-w-[1120px] overflow-hidden rounded-xl border px-7 pt-6 pb-2 max-md:hidden ${PROSE}`}
                >
                    <div className="grid grid-cols-2 gap-x-12 bg-[linear-gradient(var(--border),var(--border))] bg-[length:1px_100%] [background-position:center] bg-no-repeat">
                        {!rows.length && (
                            <>
                                <div className="pb-6">
                                    {emptyVersion(left.id === "working")}
                                </div>
                                <div className="pb-6">
                                    {emptyVersion(right.id === "working")}
                                </div>
                            </>
                        )}
                        {rows.map((row, i) => (
                            <div key={i} className="contents">
                                <div
                                    data-side="before"
                                    className="min-w-0 pb-6"
                                >
                                    {i === 0 && isEmpty(left.html)
                                        ? emptyVersion(left.id === "working")
                                        : row.before}
                                </div>
                                <div data-side="after" className="min-w-0 pb-6">
                                    {i === 0 && isEmpty(right.html)
                                        ? emptyVersion(right.id === "working")
                                        : row.after}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                {/* One text, on phones: each removal sits right before what replaced it. */}
                <div
                    className={`compare-unified border-line bg-surface mx-auto grid max-w-[680px] gap-5 rounded-xl border p-5 md:hidden ${PROSE}`}
                >
                    {(isEmpty(left.html) || isEmpty(right.html)) && (
                        <p className="text-muted font-sans text-[12px]">
                            {isEmpty(left.html) ? left.name : right.name} is
                            empty. The writing shown below belongs to the other
                            version.
                        </p>
                    )}
                    {result.blocks.map((block, i) =>
                        block.kind === "same" ? (
                            <p key={i}>{block.text}</p>
                        ) : block.kind === "edited" ? (
                            <p key={i}>
                                <Pieces
                                    pieces={block.pieces}
                                    side="both"
                                    current={current}
                                />
                            </p>
                        ) : (
                            <WholeParagraph
                                key={i}
                                block={block}
                                current={current}
                            />
                        ),
                    )}
                </div>
            </div>
            <div className="comparison-bottom border-line bg-paper m-0 shrink-0 border-t px-8 py-3 pb-[max(12px,env(safe-area-inset-bottom))] max-md:px-4">
                <div className="mx-auto flex max-w-[1120px] flex-wrap items-center justify-end gap-2">
                    <Button
                        className="comparison-restore border-line! min-h-10! rounded-lg! border! px-3! text-[12px]! hover:bg-[var(--control-hover)]!"
                        disabled={
                            !restoreTarget || restoreTarget.html === doc.html
                        }
                        onClick={() => {
                            if (restoreTarget)
                                onRestore(restoreTarget as Draft);
                        }}
                    >
                        Restore this version
                    </Button>
                    <Button
                        className={`${PRIMARY_BUTTON} min-h-10! rounded-lg! px-4! text-[12px]!`}
                        onClick={() => setComparison(null)}
                    >
                        Continue editing
                    </Button>
                </div>
            </div>
        </section>
    );
}
