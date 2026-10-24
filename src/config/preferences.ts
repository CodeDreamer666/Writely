import type { Preferences } from "../lib/writely/preferences";

/**
 * The choices offered in Settings → Appearance, and the values a new account starts with.
 * The rules for reading and saving preferences live in src/lib/writely/preferences.ts.
 */

/**
 * What: The colour themes a writer can choose.
 *
 * Used in:
 * - src/lib/writely/preferences.ts (preferencesSchema)
 * - src/app/layout.tsx (serverTheme)
 *
 * Effect: Only these names are accepted when saving or reading the theme.
 * Removing one makes accounts that chose it fall back to the default theme.
 * A new name also needs matching colours in src/styles/globals.css.
 */
export const THEMES = ["light", "dark", "system"] as const;

/**
 * What: The widths of the writing column, with the label Settings shows
 * and the width in pixels. Cards, the dock and panels are not affected.
 *
 * Used in:
 * - src/lib/writely/preferences.ts (preferencesSchema, editorStyle)
 * - src/app/components/writely/appearance-settings.tsx (AppearanceSettings)
 *
 * Effect: Changing a px value makes that column narrower or wider in the
 * editor and in its drawing in Settings. Removing an option makes accounts
 * that chose it fall back to the default width.
 */
export const EDITOR_WIDTHS = {
    narrow: { label: "Narrow", px: 560 },
    standard: { label: "Standard", px: 720 },
    wide: { label: "Wide", px: 900 },
} as const;

/**
 * What: The smallest and largest text size, in pixels, that a writer can
 * choose for the editor.
 *
 * Used in:
 * - src/lib/writely/preferences.ts (preferencesSchema)
 * - src/app/components/writely/appearance-settings.tsx (the text size slider)
 *
 * Effect: Widens or narrows the range of the text size slider. A saved size
 * outside the new range is replaced by the default size.
 */
export const FONT_SIZE_RANGE = { min: 12, max: 24 } as const;

/**
 * What: The fonts a writer can choose for the editor, with the label
 * Settings shows and the CSS font list used to draw text.
 *
 * Used in:
 * - src/lib/writely/preferences.ts (preferencesSchema, editorStyle)
 * - src/app/components/writely/appearance-settings.tsx (AppearanceSettings)
 *
 * Effect: Changing a css value changes the font the editor uses for that
 * choice. Removing an option makes accounts that chose it fall back to the
 * default font.
 */
export const FONT_FAMILIES = {
    sans: { label: "Sans-serif", css: "Inter, system-ui, sans-serif" },
    serif: { label: "Serif", css: "Georgia, 'Times New Roman', serif" },
    mono: {
        label: "Monospace",
        css: "ui-monospace, 'Cascadia Mono', 'SF Mono', Menlo, Consolas, monospace",
    },
} as const;

/**
 * What: The line spacing choices for the editor, with the label Settings
 * shows and the line height as a multiple of the text size.
 *
 * Used in:
 * - src/lib/writely/preferences.ts (preferencesSchema, editorStyle)
 * - src/app/components/writely/appearance-settings.tsx (AppearanceSettings)
 *
 * Effect: A larger value puts more space between lines of the manuscript
 * for that choice; a smaller one packs lines closer together.
 */
export const LINE_SPACINGS = {
    compact: { label: "Tight", value: 1.4 },
    comfortable: { label: "Balanced", value: 1.7 },
    spacious: { label: "Airy", value: 2.0 },
} as const;

/**
 * What: The space between paragraphs of the manuscript, with the label
 * Settings shows and the gap as a multiple of the text size.
 *
 * Used in:
 * - src/lib/writely/preferences.ts (preferencesSchema, editorStyle)
 * - src/app/components/writely/appearance-settings.tsx (AppearanceSettings)
 *
 * Effect: A larger value leaves more room between paragraphs for that
 * choice; a smaller one sets them closer together. Headings, lists and
 * quotes keep their own spacing.
 */
export const PARAGRAPH_SPACINGS = {
    compact: { label: "Tight", value: 0.6 },
    comfortable: { label: "Balanced", value: 1.25 },
    spacious: { label: "Airy", value: 2 },
} as const;

/**
 * What: The paper sizes exported files can use, with the label Settings
 * shows and the page size in points (72 points = 1 inch).
 *
 * Used in:
 * - src/lib/writely/preferences.ts (preferencesSchema)
 * - src/lib/writely/export/pdf.ts (toPdf) and docx.ts (toDocx)
 * - src/app/components/writely/export-settings.tsx (ExportSettings)
 *
 * Effect: Changing a size changes the pages of every export that uses it.
 */
export const EXPORT_PAGE_SIZES = {
    a4: { label: "A4", width: 595.28, height: 841.89 },
    letter: { label: "US Letter", width: 612, height: 792 },
} as const;

/**
 * What: The font choices for exported files. "editor" follows the font
 * chosen under Appearance.
 *
 * Used in:
 * - src/lib/writely/preferences.ts (preferencesSchema, exportOptions)
 * - src/app/components/writely/export-settings.tsx (ExportSettings)
 *
 * Effect: Removing an option makes accounts that chose it fall back to the
 * default. The fonts each family uses are set in
 * src/lib/writely/export/docx.ts and pdf.ts.
 */
export const EXPORT_FONTS = {
    sans: { label: "Sans-serif" },
    serif: { label: "Serif" },
    editor: { label: "Match editor" },
} as const;

/**
 * What: The preferences a new account starts with. They also replace any
 * saved preference that is missing or no longer valid.
 *
 * Used in:
 * - src/lib/writely/preferences.ts (readPreferences)
 * - src/config/preferences.ts (EDITOR_DEFAULTS)
 * - tests/unit/preferences.test.ts
 *
 * Effect: Changes how the app looks and behaves for new writers (theme,
 * library layout, editor text and width, writing aids, whether the dock
 * starts open and how files export). Writers who already chose a value
 * keep it.
 */
export const DEFAULT_PREFERENCES: Preferences = {
    theme: "system",
    libraryView: "cards",
    editorWidth: "standard",
    fontSize: 16,
    fontFamily: "sans",
    lineSpacing: "comfortable",
    paragraphSpacing: "comfortable",
    paragraphHighlight: true,
    typewriter: false,
    spellcheck: true,
    smartPunctuation: true,
    toolsOpen: true,
    exportPageSize: "a4",
    exportFont: "sans",
    exportTitle: false,
};

/**
 * What: What "Reset to defaults" in Settings → Appearance restores: the
 * editor's look only, never the theme or the library layout.
 *
 * Used in:
 * - src/app/components/writely/appearance-settings.tsx (AppearanceSettings)
 * - tests/unit/preferences.test.ts
 *
 * Effect: Adding a preference here makes the reset button restore it too.
 * The values come from DEFAULT_PREFERENCES, so change them there.
 */
export const EDITOR_DEFAULTS = {
    fontFamily: DEFAULT_PREFERENCES.fontFamily,
    fontSize: DEFAULT_PREFERENCES.fontSize,
    lineSpacing: DEFAULT_PREFERENCES.lineSpacing,
    paragraphSpacing: DEFAULT_PREFERENCES.paragraphSpacing,
    editorWidth: DEFAULT_PREFERENCES.editorWidth,
} satisfies Partial<Preferences>;
