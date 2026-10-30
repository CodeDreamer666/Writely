// Plain text derived from a document's HTML, used for search, previews and word counts.

/**
 * What: The HTML character codes (such as &amp;) turned back into ordinary
 * characters when a document's HTML becomes plain text.
 *
 * Used in:
 * - src/lib/writely/plain-text.ts (decode, used by htmlToPlainText)
 *
 * Effect: Adding a code makes it read correctly in search, previews and word
 * counts. Codes that are not listed stay as typed.
 */
const ENTITIES: Record<string, string> = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
};

const decode = (text: string) =>
    text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, code: string) => {
        if (!code.startsWith("#"))
            return ENTITIES[code.toLowerCase()] ?? entity;
        const point =
            code[1] === "x" || code[1] === "X"
                ? parseInt(code.slice(2), 16)
                : parseInt(code.slice(1), 10);
        return Number.isFinite(point) && point > 0 && point <= 0x10ffff
            ? String.fromCodePoint(point)
            : entity;
    });

/** Curly quotes and dashes match their plain keyboard forms in search. */
const normalizeForSearch = (text: string) =>
    text
        .replace(/[‘’‛′]/g, "'")
        .replace(/[“”‟″]/g, '"')
        .replace(/[–—]/g, "-")
        .replace(/\s+/g, " ")
        .trim();

/** One line of readable text: block boundaries become spaces, tags are dropped, entities decoded. */
export function htmlToPlainText(html: string) {
    return normalizeForSearch(
        decode(
            html
                .replace(/<(br|hr)\b[^>]*>/gi, " ")
                .replace(/<\/(p|h[1-6]|li|blockquote|pre|div|td|th)>/gi, " ")
                .replace(/<[^>]*>/g, ""),
        ),
    );
}

export const countWords = (text: string) =>
    text.match(/[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu)?.length ?? 0;

/** Search terms: whitespace-separated, de-duplicated, at most eight. */
export function searchTerms(query: string) {
    const terms = normalizeForSearch(query)
        .toLowerCase()
        .split(" ")
        .filter(Boolean);
    return [...new Set(terms)].slice(0, 8);
}

/** A short excerpt around the first matching term, or the opening of the text. */
export function excerpt(text: string, terms: string[], length = 180) {
    const lower = text.toLowerCase();
    const hit = terms
        .map((term) => lower.indexOf(term))
        .filter((i) => i >= 0)
        .sort((a, b) => a - b)[0];
    if (hit === undefined || hit < length * 0.4) {
        return text.length > length
            ? text
                  .slice(0, text.lastIndexOf(" ", length) + 1 || length)
                  .trimEnd() + "…"
            : text;
    }
    let start = Math.max(0, hit - Math.round(length * 0.3));
    const space = text.indexOf(" ", start);
    if (space >= 0 && space < hit) start = space + 1;
    const end = Math.min(text.length, start + length);
    const cut = end < text.length ? text.lastIndexOf(" ", end) : end;
    return (
        (start > 0 ? "…" : "") +
        text.slice(start, cut > hit ? cut : end).trim() +
        (end < text.length ? "…" : "")
    );
}

/** Splits text into plain and matching parts, for highlighting without HTML. */
export function highlightParts(text: string, terms: string[]) {
    if (!terms.length) return [{ text, match: false }];
    const escaped = terms
        .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
        .sort((a, b) => b.length - a.length);
    const pattern = new RegExp(`(${escaped.join("|")})`, "gi");
    return text
        .split(pattern)
        .filter(Boolean)
        .map((part) => ({
            text: part,
            match: terms.includes(part.toLowerCase()),
        }));
}
