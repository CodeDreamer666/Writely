import { Fragment } from "react";
import type { DiffChunk } from "~/lib/writely/model";

/** One row per paragraph, with a gutter mark for rows that added or removed text. */
export default function DiffText({ chunks }: { chunks: DiffChunk[] }) {
    const rows: DiffChunk[][] = [[]];
    for (const chunk of chunks) {
        const pieces = chunk.value.split("\n\n");
        pieces.forEach((value, i) => {
            if (i) rows.push([]);
            if (value) rows.at(-1)!.push({ ...chunk, value });
        });
    }
    return rows.map((row, i) => {
        const change = row.find((p) => p.added || p.removed);
        return (
            <div
                className={
                    "diff-row [&_del]:text-danger [&_ins]:text-success mb-6 grid grid-cols-[24px_1fr] last:mb-0 [&_del]:rounded-[2px] [&_del]:bg-[var(--diff-remove)] [&_del]:decoration-1 [&_ins]:rounded-[2px] [&_ins]:bg-[var(--diff-add)] [&_ins]:[text-decoration-line:underline] [&_ins]:no-underline [&_ins]:decoration-1 [&_ins]:underline-offset-4"
                }
                key={i}
            >
                <span
                    className={
                        "diff-gutter text-muted [font:13px/1.7_Inter,_sans-serif] [.diff-prose_&]:leading-[30.6px]"
                    }
                    aria-label={
                        change
                            ? change.removed
                                ? "Removed text"
                                : "Added text"
                            : undefined
                    }
                >
                    {change ? (change.removed ? "−" : "+") : ""}
                </span>
                <p>
                    {row.map((p, j) =>
                        p.removed ? (
                            <del key={j}>{p.value}</del>
                        ) : p.added ? (
                            <ins key={j}>{p.value}</ins>
                        ) : (
                            <Fragment key={j}>{p.value}</Fragment>
                        ),
                    )}
                </p>
            </div>
        );
    });
}
