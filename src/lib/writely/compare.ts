/**
 * Works out what changed between two versions of a document's plain text (paragraphs separated by
 * blank lines), grouped the way a reader thinks about revisions: whole paragraphs, then sentences,
 * and only for small edits individual words. A rewritten sentence or paragraph is shown as one
 * removal followed by one addition instead of dozens of scattered word changes.
 */

export type Piece = {
    kind: "same" | "removed" | "added";
    text: string;
    /** Which change this piece belongs to (removed and added pieces of one edit share it). */
    change?: number;
};

export type Block =
    /** A paragraph found unchanged in both versions. */
    | { kind: "same"; text: string }
    /** A paragraph kept but edited: its unchanged text with the changes in place. */
    | { kind: "edited"; pieces: Piece[] }
    /** A paragraph only in the earlier version, or the old side of a rewritten one. */
    | { kind: "removed"; text: string; change: number }
    /** A paragraph only in the later version, or the new side of a rewritten one. */
    | { kind: "added"; text: string; change: number };

type Comparison = { blocks: Block[]; changes: number };

/**
 * What: How alike two paragraphs (or sentences) must be, from 0 to 1, to be compared as an
 * edited version of each other rather than shown as one removed and one added.
 *
 * Used in:
 * - src/lib/writely/compare.ts (compareTexts)
 *
 * Effect: Raising it shows more passages as rewritten wholesale; lowering it compares more of them
 * word by word.
 */
const COMPARE_THRESHOLDS = {
    paragraph: 0.5,
    sentence: 0.5,
    /**
     * When more than this share of a sentence's words changed, the whole sentence is shown as
     * removed and re-added instead of word by word.
     */
    rewrite: 0.55,
};

type Op = { type: "same" | "del" | "ins"; a?: number; b?: number };

/** A longest-common-subsequence alignment of two lists, as keep/delete/insert steps in order. */
function align<T>(a: T[], b: T[], same: (x: T, y: T) => boolean): Op[] {
    let start = 0;
    while (start < a.length && start < b.length && same(a[start]!, b[start]!))
        start++;
    let endA = a.length,
        endB = b.length;
    while (endA > start && endB > start && same(a[endA - 1]!, b[endB - 1]!)) {
        endA--;
        endB--;
    }
    const ops: Op[] = [];
    for (let i = 0; i < start; i++) ops.push({ type: "same", a: i, b: i });
    const n = endA - start,
        m = endB - start;
    if (n * m > 4_000_000) {
        // Too large to align closely: everything between the shared ends changed.
        for (let i = start; i < endA; i++) ops.push({ type: "del", a: i });
        for (let j = start; j < endB; j++) ops.push({ type: "ins", b: j });
    } else {
        const table = Array.from(
            { length: n + 1 },
            () => new Uint32Array(m + 1),
        );
        for (let i = n - 1; i >= 0; i--)
            for (let j = m - 1; j >= 0; j--)
                table[i]![j] = same(a[start + i]!, b[start + j]!)
                    ? table[i + 1]![j + 1]! + 1
                    : Math.max(table[i + 1]![j]!, table[i]![j + 1]!);
        let i = 0,
            j = 0;
        while (i < n || j < m) {
            if (i < n && j < m && same(a[start + i]!, b[start + j]!)) {
                ops.push({ type: "same", a: start + i++, b: start + j++ });
            } else if (
                j < m &&
                (i === n || table[i]![j + 1]! > table[i + 1]![j]!)
            ) {
                ops.push({ type: "ins", b: start + j++ });
            } else {
                ops.push({ type: "del", a: start + i++ });
            }
        }
    }
    for (let k = 0; k < a.length - endA; k++)
        ops.push({ type: "same", a: endA + k, b: endB + k });
    return ops;
}

const words = (text: string) =>
    text.toLowerCase().match(/[\p{L}\p{N}']+/gu) ?? [];

/** How much two passages share, from 0 to 1, counting words regardless of order. */
function similarity(x: string, y: string) {
    const a = words(x),
        b = words(y);
    if (!a.length && !b.length) return 1;
    const counts = new Map<string, number>();
    for (const word of a) counts.set(word, (counts.get(word) ?? 0) + 1);
    let shared = 0;
    for (const word of b) {
        const left = counts.get(word) ?? 0;
        if (left) {
            shared++;
            counts.set(word, left - 1);
        }
    }
    return (2 * shared) / (a.length + b.length);
}

/**
 * Pairs removed passages with added ones in order, matching each to the most similar partner above
 * `threshold`. Returns the steps in reading order: pairs, and passages left on one side.
 */
function pair(
    removed: string[],
    added: string[],
    threshold: number,
): ({ a: number; b: number } | { a: number } | { b: number })[] {
    const n = removed.length,
        m = added.length;
    const score = removed.map((x) => added.map((y) => similarity(x, y)));
    // best[i][j]: the most similarity reachable pairing removed[i..] with added[j..] in order.
    const best = Array.from({ length: n + 1 }, () => new Float64Array(m + 1));
    for (let i = n - 1; i >= 0; i--)
        for (let j = m - 1; j >= 0; j--) {
            const s = score[i]![j]!;
            best[i]![j] = Math.max(
                best[i + 1]![j]!,
                best[i]![j + 1]!,
                s >= threshold ? s + best[i + 1]![j + 1]! : 0,
            );
        }
    const steps: ({ a: number; b: number } | { a: number } | { b: number })[] =
        [];
    let i = 0,
        j = 0;
    while (i < n || j < m) {
        if (i === n) steps.push({ b: j++ });
        else if (j === m) steps.push({ a: i++ });
        else {
            const s = score[i]![j]!;
            if (s >= threshold && best[i]![j] === s + best[i + 1]![j + 1]!)
                steps.push({ a: i++, b: j++ });
            else if (best[i]![j] === best[i + 1]![j]) steps.push({ a: i++ });
            else steps.push({ b: j++ });
        }
    }
    return steps;
}

/**
 * Splits a paragraph into sentences, each keeping the space after it, so they join back exactly.
 * A sentence ends at . ! ? or … (and any closing quote) followed by a space and a capital, a digit
 * or an opening quote, so “Really?” she asked stays one sentence.
 */
export function sentences(text: string) {
    const out: string[] = [];
    let start = 0;
    for (const match of text.matchAll(
        /[.!?…]+["'”’)\]]*(\s+)(?=[\p{Lu}\p{N}"'“‘(\[])/gu,
    )) {
        const end = match.index + match[0].length;
        out.push(text.slice(start, end));
        start = end;
    }
    if (start < text.length) out.push(text.slice(start));
    return out;
}

const trailingSpace = (text: string) => /\s*$/.exec(text)![0];
const withoutTrailingSpace = (text: string) =>
    text.slice(0, text.length - trailingSpace(text).length);

/**
 * Ends a change whose two sides end in `before` and `after` spacing: shared spacing is unchanged
 * text, otherwise each side keeps its own.
 */
function endChange(out: Pieces, before: string, after: string, change: number) {
    if (before === after) out.push("same", after);
    else {
        out.push("removed", before, change);
        out.push("added", after, change);
    }
}

/** Collects pieces, merging neighbours of the same kind and change. */
class Pieces {
    list: Piece[] = [];
    push(kind: Piece["kind"], text: string, change?: number) {
        if (!text) return;
        const last = this.list.at(-1);
        if (last?.kind === kind && last.change === change) last.text += text;
        else
            this.list.push(
                change === undefined ? { kind, text } : { kind, text, change },
            );
    }
}

/**
 * Word-by-word changes inside one sentence, tidied for reading: a lone short word left unchanged
 * between two edits joins them, each edit shows what was removed before what was added, and a
 * sentence that mostly changed becomes one replacement.
 */
function compareSentence(
    before: string,
    after: string,
    out: Pieces,
    next: () => number,
) {
    const a = before.split(/(\s+)/).filter(Boolean),
        b = after.split(/(\s+)/).filter(Boolean);
    const ops = align(a, b, (x, y) => x === y);
    // Runs of kept tokens and of changes, in order.
    type Run =
        | { same: true; text: string }
        | { same: false; removed: string; added: string };
    const runs: Run[] = [];
    for (const op of ops) {
        const last = runs.at(-1);
        if (op.type === "same") {
            if (last?.same) last.text += a[op.a!]!;
            else runs.push({ same: true, text: a[op.a!]! });
        } else {
            const removed = op.type === "del" ? a[op.a!]! : "",
                added = op.type === "ins" ? b[op.b!]! : "";
            if (last && !last.same) {
                last.removed += removed;
                last.added += added;
            } else runs.push({ same: false, removed, added });
        }
    }
    // A short unchanged stretch between two changes (spaces, punctuation or one small word) is
    // folded into them, so "the [big] [red] dog" reads as one edit instead of two.
    for (let k = 1; k < runs.length - 1; k++) {
        const run = runs[k]!,
            prev = runs[k - 1]!,
            next = runs[k + 1]!;
        if (
            run.same &&
            !prev.same &&
            !next.same &&
            words(run.text).length <= 1 &&
            run.text.trim().length <= 4
        ) {
            prev.removed += run.text + next.removed;
            prev.added += run.text + next.added;
            runs.splice(k, 2);
            k--;
        }
    }
    // Spaces at the edges of a change belong to the unchanged text beside it.
    const tidy: Run[] = [];
    for (const run of runs) {
        if (run.same) {
            const last = tidy.at(-1);
            if (last?.same) last.text += run.text;
            else tidy.push({ ...run });
            continue;
        }
        const lead = /^\s*/.exec(run.removed || run.added)![0];
        const shared =
            run.removed.startsWith(lead) && run.added.startsWith(lead)
                ? lead
                : "";
        const trail = /\s*$/.exec(run.removed || run.added)![0];
        const sharedTrail =
            run.removed.endsWith(trail) && run.added.endsWith(trail)
                ? trail
                : "";
        if (shared) {
            const last = tidy.at(-1);
            if (last?.same) last.text += shared;
            else tidy.push({ same: true, text: shared });
        }
        tidy.push({
            same: false,
            removed: run.removed.slice(
                shared.length,
                run.removed.length - sharedTrail.length,
            ),
            added: run.added.slice(
                shared.length,
                run.added.length - sharedTrail.length,
            ),
        });
        if (sharedTrail) tidy.push({ same: true, text: sharedTrail });
    }
    const changedWords = tidy.reduce(
        (sum, run) =>
            run.same
                ? sum
                : sum + words(run.removed).length + words(run.added).length,
        0,
    );
    const total = words(before).length + words(after).length;
    if (total && changedWords / total > COMPARE_THRESHOLDS.rewrite) {
        // Mostly rewritten: one removal and one addition read far better than a patchwork.
        const change = next();
        out.push("removed", withoutTrailingSpace(before), change);
        out.push("added", withoutTrailingSpace(after), change);
        endChange(out, trailingSpace(before), trailingSpace(after), change);
        return;
    }
    for (const run of tidy) {
        if (run.same) out.push("same", run.text);
        else {
            const change = next();
            out.push("removed", run.removed, change);
            out.push("added", run.added, change);
        }
    }
}

/** Sentence-by-sentence changes inside one edited paragraph. */
function compareParagraph(before: string, after: string, next: () => number) {
    const out = new Pieces();
    const a = sentences(before),
        b = sentences(after);
    const ops = align(a, b, (x, y) => x.trim() === y.trim());
    let k = 0;
    while (k < ops.length) {
        const op = ops[k]!;
        if (op.type === "same") {
            // Unchanged words; spacing that differs (say, a sentence that moved to the end) is
            // kept per side without counting as a change.
            const x = a[op.a!]!,
                y = b[op.b!]!;
            out.push("same", withoutTrailingSpace(y));
            if (trailingSpace(x) === trailingSpace(y))
                out.push("same", trailingSpace(y));
            else {
                out.push("removed", trailingSpace(x));
                out.push("added", trailingSpace(y));
            }
            k++;
            continue;
        }
        const removed: string[] = [],
            added: string[] = [];
        while (k < ops.length && ops[k]!.type !== "same") {
            const step = ops[k++]!;
            if (step.type === "del") removed.push(a[step.a!]!);
            else added.push(b[step.b!]!);
        }
        const steps = pair(removed, added, COMPARE_THRESHOLDS.sentence);
        if (!steps.some((step) => "a" in step && "b" in step)) {
            // Nothing here was edited in place: the old sentences, then the new, as one change.
            const before = removed.join(""),
                after = added.join("");
            const change = next();
            out.push("removed", withoutTrailingSpace(before), change);
            out.push("added", withoutTrailingSpace(after), change);
            endChange(out, trailingSpace(before), trailingSpace(after), change);
            continue;
        }
        for (const step of steps) {
            if ("a" in step && "b" in step)
                compareSentence(removed[step.a]!, added[step.b]!, out, next);
            else if ("a" in step) out.push("removed", removed[step.a]!, next());
            else out.push("added", added[step.b]!, next());
        }
    }
    // A removal straight before an addition of a different edit still reads as one change.
    const pieces = out.list;
    for (let i = 1; i < pieces.length; i++) {
        const prev = pieces[i - 1]!,
            piece = pieces[i]!;
        if (
            prev.kind === "removed" &&
            piece.kind === "added" &&
            prev.change !== piece.change
        )
            piece.change = prev.change;
    }
    return pieces;
}

const paragraphsOf = (text: string) =>
    text
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter(Boolean);

/** Compares two versions' plain text and numbers each change from 0, in reading order. */
export function compareTexts(before: string, after: string): Comparison {
    const a = paragraphsOf(before),
        b = paragraphsOf(after);
    let count = 0;
    const next = () => count++;
    const blocks: Block[] = [];
    const ops = align(a, b, (x, y) => x === y);
    let k = 0;
    while (k < ops.length) {
        const op = ops[k]!;
        if (op.type === "same") {
            blocks.push({ kind: "same", text: b[op.b!]! });
            k++;
            continue;
        }
        const removed: string[] = [],
            added: string[] = [];
        while (k < ops.length && ops[k]!.type !== "same") {
            const step = ops[k++]!;
            if (step.type === "del") removed.push(a[step.a!]!);
            else added.push(b[step.b!]!);
        }
        for (const step of pair(removed, added, COMPARE_THRESHOLDS.paragraph)) {
            if ("a" in step && "b" in step) {
                const pieces = compareParagraph(
                    removed[step.a]!,
                    added[step.b]!,
                    next,
                );
                blocks.push(
                    pieces.some((p) => p.kind !== "same")
                        ? { kind: "edited", pieces }
                        : { kind: "same", text: added[step.b]! },
                );
            } else if ("a" in step)
                blocks.push({
                    kind: "removed",
                    text: removed[step.a]!,
                    change: next(),
                });
            else
                blocks.push({
                    kind: "added",
                    text: added[step.b]!,
                    change: next(),
                });
        }
    }
    // A removed paragraph straight before an added one is one rewrite: one change, read together.
    for (let i = 1; i < blocks.length; i++) {
        const prev = blocks[i - 1]!,
            block = blocks[i]!;
        if (prev.kind === "removed" && block.kind === "added")
            block.change = prev.change;
    }
    // Renumber so changes count up from 0 with no gaps.
    const ids = new Map<number, number>();
    const renumber = (id: number) => {
        if (!ids.has(id)) ids.set(id, ids.size);
        return ids.get(id)!;
    };
    for (const block of blocks) {
        if (block.kind === "removed" || block.kind === "added")
            block.change = renumber(block.change);
        else if (block.kind === "edited")
            for (const piece of block.pieces)
                if (piece.change !== undefined)
                    piece.change = renumber(piece.change);
    }
    return { blocks, changes: ids.size };
}
