/**
 * How the library lists documents: the sort orders and filters it accepts.
 */

/**
 * What: The ways the library can sort documents. Each name has a matching
 * database ordering and a menu label.
 *
 * Used in:
 * - src/server/documents.ts (the DocumentSort type)
 * - src/server/api/routers/documents.ts (the documents list request)
 *
 * Effect: Only these sorts are accepted from the browser. Adding one also
 * needs an ordering in src/server/documents.ts (ORDER) and a label in
 * src/app/components/library/library.tsx (SORTS).
 */
export const DOCUMENT_SORTS = [
    "updated-desc",
    "updated-asc",
    "created-desc",
    "title-asc",
] as const;

/**
 * What: The filters the library offers in its sidebar. "archived" lists only
 * archived documents; every other filter leaves them out.
 *
 * Used in:
 * - src/server/documents.ts (DocumentFilter, listDocuments, documentCounts)
 * - src/server/api/routers/documents.ts (the documents list request)
 *
 * Effect: Only these filters are accepted from the browser. Adding one also
 * needs a rule in src/server/documents.ts and a label in
 * src/app/components/library/library.tsx (FILTERS).
 */
export const DOCUMENT_FILTERS = ["all", "recent", "pinned", "archived"] as const;

/**
 * What: How many days back the library's "Recent" filter looks.
 *
 * Used in:
 * - src/server/documents.ts (listDocuments)
 *
 * Effect: Raising it makes "Recent" include documents edited longer ago.
 * Lowering it shows only the most recently edited ones.
 */
export const RECENT_DAYS = 14;
