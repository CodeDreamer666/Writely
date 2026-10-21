import { z } from "zod";
import {
    DEFAULT_PREFERENCES,
    EDITOR_WIDTHS,
    EXPORT_FONTS,
    EXPORT_PAGE_SIZES,
    FONT_FAMILIES,
    FONT_SIZE_RANGE,
    LINE_SPACINGS,
    PARAGRAPH_SPACINGS,
    THEMES,
} from "../../config/preferences";

type Key<T> = Extract<keyof T, string>;
const keys = <T extends object>(o: T) =>
    Object.keys(o) as [Key<T>, ...Key<T>[]];

export const preferencesSchema = z.object({
    theme: z.enum(THEMES),
    libraryView: z.enum(["cards", "list"]),
    editorWidth: z.enum(keys(EDITOR_WIDTHS)),
    fontSize: z
        .number()
        .int()
        .min(FONT_SIZE_RANGE.min)
        .max(FONT_SIZE_RANGE.max),
    fontFamily: z.enum(keys(FONT_FAMILIES)),
    lineSpacing: z.enum(keys(LINE_SPACINGS)),
    paragraphSpacing: z.enum(keys(PARAGRAPH_SPACINGS)),
    paragraphHighlight: z.boolean(),
    typewriter: z.boolean(),
    spellcheck: z.boolean(),
    smartPunctuation: z.boolean(),
    toolsOpen: z.boolean(),
    exportPageSize: z.enum(keys(EXPORT_PAGE_SIZES)),
    exportFont: z.enum(keys(EXPORT_FONTS)),
    exportTitle: z.boolean(),
});

export type Preferences = z.infer<typeof preferencesSchema>;
export type Theme = Preferences["theme"];

/**
 * What: Old preference values from earlier versions of Settings and the
 * current value each one now means.
 *
 * Used in:
 * - src/lib/writely/preferences.ts (readPreferences)
 *
 * Effect: Keeps writers' old choices working. Removing an entry resets anyone
 * still using that old value to the default.
 */
const LEGACY: Record<string, Record<string, unknown>> = {
    lineSpacing: { standard: "comfortable", airy: "spacious" },
    // Typewriter scrolling was a choice of three; only "centred" kept the line mid-window.
    typewriter: { off: false, gentle: false, centred: true },
};

/** Stored preferences with anything missing or invalid replaced by its default. */
export function readPreferences(stored: unknown): Preferences {
    const source =
        stored && typeof stored === "object"
            ? (stored as Record<string, unknown>)
            : {};
    const result = { ...DEFAULT_PREFERENCES } as Record<string, unknown>;
    for (const [key, field] of Object.entries(preferencesSchema.shape)) {
        const value = source[key];
        const parsed = field.safeParse(
            typeof value === "string" ? (LEGACY[key]?.[value] ?? value) : value,
        );
        if (parsed.success) result[key] = parsed.data;
    }
    return result as Preferences;
}

/** CSS custom properties for the writing column, shared by the editor and the Settings preview. */
export function editorStyle(preferences: Preferences) {
    return {
        "--editor-width": `${EDITOR_WIDTHS[preferences.editorWidth].px}px`,
        "--editor-font-size": `${preferences.fontSize}px`,
        "--editor-font": FONT_FAMILIES[preferences.fontFamily].css,
        "--editor-line-height": String(
            LINE_SPACINGS[preferences.lineSpacing].value,
        ),
        "--editor-paragraph-gap": `${PARAGRAPH_SPACINGS[preferences.paragraphSpacing].value}em`,
    } as React.CSSProperties;
}

/** How exported files are laid out: paper size, font family and whether the title leads the text. */
export type ExportOptions = {
    pageSize: Preferences["exportPageSize"];
    font: Preferences["fontFamily"];
    title: boolean;
};

export function exportOptions(preferences: Preferences): ExportOptions {
    return {
        pageSize: preferences.exportPageSize,
        font:
            preferences.exportFont === "editor"
                ? preferences.fontFamily
                : preferences.exportFont,
        title: preferences.exportTitle,
    };
}
