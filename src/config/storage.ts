/**
 * Names under which Writely keeps data in the browser. Changing a name makes the app lose track
 * of anything already stored under the old one.
 */

/**
 * What: The name of the cookie that remembers the chosen theme, so the
 * server can draw the page in the right colours before any script runs.
 *
 * Used in:
 * - src/app/layout.tsx (serverTheme)
 * - src/app/components/preferences.tsx (applyTheme)
 *
 * Effect: Renaming it makes the server ignore existing cookies. Signed-in
 * writers still get their saved theme (read from the database instead),
 * and signed-out visitors get the system theme until the new cookie is set.
 */
export const THEME_COOKIE = "writely-theme";

/**
 * What: The browser storage key where the old browser-only version of
 * Writely kept its documents. They are moved into a new account once.
 *
 * Used in:
 * - src/app/welcome/welcome.tsx (readLegacyDocuments, Welcome)
 * - tests/e2e/*.spec.js (to seed test data)
 *
 * Effect: Must match the key the old version used. Changing it means
 * writing saved by that version is no longer found or imported.
 */
export const LEGACY_STORAGE_KEY = "writely.local.v1";
