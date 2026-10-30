/**
 * Names under which Writely keeps data in the browser. Changing a name makes the app lose track
 * of anything already stored under the old one.
 */

/**
 * What: The browser storage key where the old browser-only version of
 * Writely kept its documents. They are moved into a new account once.
 *
 * Used in:
 * - src/app/components/library/home-notes.tsx (readLegacyDocuments, LegacyImport)
 * - tests/e2e/*.spec.js (to seed test data)
 *
 * Effect: Must match the key the old version used. Changing it means
 * writing saved by that version is no longer found or imported.
 */
export const LEGACY_STORAGE_KEY = "writely.local.v1";
