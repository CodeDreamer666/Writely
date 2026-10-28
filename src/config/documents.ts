/**
 * How the library lists documents: the filters it accepts.
 */

/**
 * What: The filters the library offers. "archived" lists only archived
 * documents; every other filter leaves them out. Documents are always listed
 * by when they were last edited, newest first.
 *
 * Used in:
 * - src/server/documents.ts (DocumentFilter, listDocuments, documentCounts)
 * - src/server/api/routers/documents.ts (the documents list request)
 *
 * Effect: Only these filters are accepted from the browser. Adding one also
 * needs a rule in src/server/documents.ts and a label in
 * src/app/components/library/library.tsx (FILTERS).
 */
export const DOCUMENT_FILTERS = ["all", "pinned", "archived"] as const;
