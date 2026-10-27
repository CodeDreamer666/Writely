"use client";
import {
    ArrowLeft,
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

/** A whole paragraph that was removed or added, as a tinted section of its own. */
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
            className={`-mx-3 rounded-lg px-3 py-2 ${removed ? "bg-[var(--diff-remove)]" : "bg-[var(--diff-add)]"} ${CURRENT}`}
        >
            <p
                className={
                    removed
                        ? "text-ink/80 line-through decoration-[color-mix(in_srgb,var(--danger)_70%,transparent)] decoration-1"
                        : ""
                }
            >
                <span className="sr-only">
                    {removed ? "Removed paragraph: " : "Added paragraph: "}
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
    "font-serif text-[18px] leading-[1.7] [overflow-wrap:anywhere] max-[760px]:text-[17px] [&_p]:m-0 [&_del+ins]:ml-[0.25em]";

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
        name: "Working text (autosaved)",
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
    const select = (side: "left" | "right", label: string) => (
        <label className="flex min-w-0 items-center gap-2 max-[760px]:flex-col max-[760px]:items-stretch max-[760px]:gap-0.5">
            <span className="text-muted shrink-0 text-[12px] font-semibold max-[760px]:text-[11px]">
                {label}
            </span>
            <select
                aria-label={
                    side === "left" ? "Baseline draft" : "Revised draft"
                }
                value={(side === "left" ? left : right).id}
                onChange={(e) =>
                    setComparison((c) => c && { ...c, [side]: e.target.value })
                }
                className="min-h-10! w-full min-w-0 truncate py-2! text-[13px]!"
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
            <header className="comparison-top border-line bg-paper shrink-0 border-b px-8 pt-4 pb-3 max-[760px]:px-3 max-[760px]:pt-1 max-[760px]:pb-2">
                <div className="mx-auto flex max-w-[1100px] items-center gap-2">
                    <Button
                        icon={ArrowLeft}
                        label="Back to editing"
                        onClick={() => setComparison(null)}
                        className="size-10! min-h-10! min-w-10! shrink-0 rounded-lg! p-0!"
                    />
                    <h2 className="min-w-0 flex-1 truncate font-serif text-[24px] leading-tight font-normal tracking-[-0.02em] max-[760px]:text-[19px]">
                        Draft comparison
                    </h2>
                    <nav
                        aria-label="Changes"
                        className="flex shrink-0 items-center gap-1"
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
                <div className="mx-auto mt-2 flex max-w-[1100px] flex-wrap items-center gap-x-6 gap-y-1.5 pl-12 max-[760px]:mt-1 max-[760px]:pl-0">
                    <div className="grid min-w-0 flex-1 grid-cols-2 gap-x-4 gap-y-2 max-[760px]:basis-full max-[760px]:gap-x-2">
                        {select("left", "Before")}
                        {select("right", "After")}
                    </div>
                    <p
                        aria-label="Legend"
                        className="text-muted m-0 flex shrink-0 items-center gap-4 text-[12px]"
                    >
                        <span className="flex items-center gap-1.5">
                            <span
                                aria-hidden="true"
                                className="inline-block h-3 w-5 rounded-[3px] bg-[var(--diff-remove)] [background-image:linear-gradient(transparent_45%,color-mix(in_srgb,var(--danger)_70%,transparent)_45%,color-mix(in_srgb,var(--danger)_70%,transparent)_55%,transparent_55%)]"
                            />
                            Removed
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span
                                aria-hidden="true"
                                className="inline-block h-3 w-5 rounded-[3px] bg-[var(--diff-add)]"
                            />
                            Added
                        </span>
                    </p>
                </div>
            </header>
            <div
                ref={scroller}
                className="comparison-scroll min-h-0 flex-1 overflow-auto overscroll-contain px-8 pb-16 max-[760px]:px-5"
            >
                {result.changes === 0 && (
                    <p className="text-muted mx-auto mt-6 mb-0 max-w-[680px] text-center text-[13.5px]">
                        These two versions are the same.
                    </p>
                )}
                {/* Side by side, on wider screens. One scrolling area keeps the sides in step. */}
                <div
                    className={`compare-split mx-auto max-w-[1100px] max-[760px]:hidden ${PROSE}`}
                >
                    <div className="bg-paper sticky top-0 z-[1] grid grid-cols-2 gap-x-12 pt-6 pb-3">
                        {(
                            [
                                ["Before", left.name],
                                ["After", right.name],
                            ] as const
                        ).map(([label, name]) => (
                            <p
                                key={label}
                                className="border-line truncate border-b pb-2 font-sans text-[12px]"
                            >
                                <span className="text-muted font-semibold">
                                    {label}
                                </span>{" "}
                                <span className="text-muted">· {name}</span>
                            </p>
                        ))}
                    </div>
                    <div className="grid grid-cols-2 gap-x-12 bg-[linear-gradient(var(--border),var(--border))] bg-[length:1px_100%] [background-position:center] bg-no-repeat">
                        {rows.map((row, i) => (
                            <div key={i} className="contents">
                                <div
                                    data-side="before"
                                    className="min-w-0 pb-6"
                                >
                                    {row.before}
                                </div>
                                <div data-side="after" className="min-w-0 pb-6">
                                    {row.after}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                {/* One text, on phones: each removal sits right before what replaced it. */}
                <div
                    className={`compare-unified mx-auto grid max-w-[680px] gap-5 pt-5 min-[761px]:hidden ${PROSE}`}
                >
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
            <div className="comparison-bottom border-line bg-paper m-0 flex min-h-[64px] shrink-0 flex-row items-center justify-end gap-2 border-t px-8 py-3 pb-[max(12px,env(safe-area-inset-bottom))] max-[760px]:px-4">
                <Button
                    className="comparison-restore border-line! border! hover:bg-[var(--control-hover)]!"
                    disabled={right.id === "working"}
                    onClick={() => {
                        if (right.id !== "working") onRestore(right as Draft);
                    }}
                >
                    Restore this version
                </Button>
                <Button
                    className={PRIMARY_BUTTON}
                    onClick={() => setComparison(null)}
                >
                    Continue editing
                </Button>
            </div>
        </section>
    );
}
