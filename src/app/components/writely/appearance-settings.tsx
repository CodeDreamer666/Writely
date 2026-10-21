"use client";
import { RotateCcw } from "lucide-react";
import { EDITOR_TEXT_CLASS } from "~/config/editor";
import {
    editorStyle,
    type Preferences,
} from "~/lib/writely/preferences";
import {
    EDITOR_DEFAULTS,
    EDITOR_WIDTHS,
    FONT_FAMILIES,
    FONT_SIZE_RANGE,
    LINE_SPACINGS,
    PARAGRAPH_SPACINGS,
} from "~/config/preferences";
import {
    entries,
    Segmented,
    SettingRow,
    SettingsCard,
} from "./settings-controls";

/** What "Reset to defaults" restores, in words, built from the defaults so the two never disagree. */
const RESET_SUMMARY = `Reset restores ${FONT_FAMILIES[EDITOR_DEFAULTS.fontFamily].label}, ${EDITOR_DEFAULTS.fontSize} px, ${LINE_SPACINGS[EDITOR_DEFAULTS.lineSpacing].label.toLowerCase()} line spacing, ${PARAGRAPH_SPACINGS[EDITOR_DEFAULTS.paragraphSpacing].label.toLowerCase()} paragraph spacing and the ${EDITOR_WIDTHS[EDITOR_DEFAULTS.editorWidth].label.toLowerCase()} width. Your theme stays as it is.`;

/**
 * Appearance: theme and the writing column's font, size, spacing and width, with a live preview
 * that uses the editor's own typography rules.
 */
export function AppearanceSettings({
    preferences,
    setPreferences,
}: {
    preferences: Preferences;
    setPreferences: (changes: Partial<Preferences>) => void;
}) {
    const width = EDITOR_WIDTHS[preferences.editorWidth];
    const isDefault = entries(EDITOR_DEFAULTS).every(
        ([key, value]) => preferences[key] === value,
    );
    return (
        <>
            <SettingsCard>
                <SettingRow id="setting-theme" label="Theme">
                    <Segmented
                        labelledBy="setting-theme"
                        value={preferences.theme}
                        options={[
                            { value: "light", label: "Light" },
                            { value: "dark", label: "Dark" },
                            { value: "system", label: "System" },
                        ]}
                        onChange={(theme) => setPreferences({ theme })}
                    />
                </SettingRow>
                <SettingRow id="setting-font" label="Font">
                    <Segmented
                        labelledBy="setting-font"
                        value={preferences.fontFamily}
                        options={entries(FONT_FAMILIES).map(
                            ([value, font]) => ({
                                value,
                                label: font.label,
                                style: { fontFamily: font.css },
                            }),
                        )}
                        onChange={(fontFamily) =>
                            setPreferences({ fontFamily })
                        }
                    />
                </SettingRow>
                <SettingRow
                    id="setting-size"
                    label="Font size"
                    value={
                        <output
                            htmlFor="setting-size-input"
                            className="text-muted text-[12.5px] tabular-nums"
                        >
                            {preferences.fontSize} px
                        </output>
                    }
                >
                    <div className="flex w-[260px] items-center gap-3 max-sm:w-auto">
                        <span
                            aria-hidden="true"
                            className="text-muted text-[11px]"
                        >
                            A
                        </span>
                        <input
                            id="setting-size-input"
                            type="range"
                            min={FONT_SIZE_RANGE.min}
                            max={FONT_SIZE_RANGE.max}
                            step={1}
                            value={preferences.fontSize}
                            aria-labelledby="setting-size"
                            aria-valuetext={`${preferences.fontSize} pixels`}
                            onChange={(e) =>
                                setPreferences({
                                    fontSize: Number(e.target.value),
                                })
                            }
                            className="h-6! min-h-6! flex-1 cursor-pointer border-0! bg-transparent! p-0! [accent-color:var(--accent)] shadow-none! focus-visible:outline-2! focus-visible:outline-offset-4! focus-visible:outline-[var(--control-focus)]!"
                        />
                        <span
                            aria-hidden="true"
                            className="text-muted text-[17px]"
                        >
                            A
                        </span>
                    </div>
                </SettingRow>
                <SettingRow id="setting-spacing" label="Line spacing">
                    <Segmented
                        labelledBy="setting-spacing"
                        value={preferences.lineSpacing}
                        options={entries(LINE_SPACINGS).map(
                            ([value, spacing]) => ({
                                value,
                                label: spacing.label,
                                detail: spacing.value.toFixed(1),
                            }),
                        )}
                        onChange={(lineSpacing) =>
                            setPreferences({ lineSpacing })
                        }
                    />
                </SettingRow>
                <SettingRow
                    id="setting-paragraphs"
                    label="Paragraph spacing"
                    hint="The gap after each paragraph."
                >
                    <Segmented
                        labelledBy="setting-paragraphs"
                        value={preferences.paragraphSpacing}
                        options={entries(PARAGRAPH_SPACINGS).map(
                            ([value, spacing]) => ({
                                value,
                                label: spacing.label,
                                detail: `${spacing.value} em`,
                            }),
                        )}
                        onChange={(paragraphSpacing) =>
                            setPreferences({ paragraphSpacing })
                        }
                    />
                </SettingRow>
                <SettingRow
                    id="setting-width"
                    label="Editor width"
                    hint="The writing column only; cards and tools keep their place."
                >
                    <Segmented
                        labelledBy="setting-width"
                        value={preferences.editorWidth}
                        options={entries(EDITOR_WIDTHS).map(
                            ([value, option]) => ({
                                value,
                                label: option.label,
                                detail: `${option.px} px`,
                            }),
                        )}
                        onChange={(editorWidth) =>
                            setPreferences({ editorWidth })
                        }
                    />
                </SettingRow>
                <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 py-4">
                    <p className="text-muted max-w-[420px] text-[12px] leading-relaxed">
                        {RESET_SUMMARY}
                    </p>
                    <button
                        type="button"
                        className="border-line! h-9! min-h-9! gap-1.5! rounded-lg! border! px-3! text-[12.5px]! disabled:opacity-50!"
                        disabled={isDefault}
                        onClick={() => setPreferences(EDITOR_DEFAULTS)}
                    >
                        <RotateCcw size={14} aria-hidden="true" />
                        Reset to defaults
                    </button>
                </div>
            </SettingsCard>

            <figure className="m-0 min-w-0" aria-labelledby="preview-caption">
                <figcaption
                    id="preview-caption"
                    className="text-muted mb-2 flex items-baseline justify-between px-1 text-[12px]"
                >
                    <span className="text-ink font-medium">Preview</span>
                    <span className="tabular-nums">
                        {width.label} · {width.px} px column
                    </span>
                </figcaption>
                <div
                    style={editorStyle(preferences)}
                    className="border-line bg-paper overflow-hidden rounded-2xl border px-[6%] py-8 transition-colors duration-200"
                >
                    {/* The column keeps its proportion to the widest preset, so widths reflow the text at full size. */}
                    <div
                        className="paper mx-auto border-x border-dashed border-[color-mix(in_srgb,var(--border)_80%,transparent)] px-[4%] transition-[width] duration-200 ease-out motion-reduce:transition-none"
                        style={{
                            width: `${(width.px / EDITOR_WIDTHS.wide.px) * 100}%`,
                        }}
                    >
                        <div
                            className={`${EDITOR_TEXT_CLASS} min-h-0! [&>h1:first-child]:mt-0! [&>p:last-child]:mb-0!`}
                            aria-label="Sample text in your editor settings"
                        >
                            <h1>Finding the Right Words</h1>
                            <p>
                                Writing is often a process of discovering what
                                we really want to say. Sometimes the first draft
                                is only the beginning.
                            </p>
                            <p>
                                A quiet place to think can make even the
                                simplest ideas feel clearer. Every sentence
                                gives us another opportunity to improve.
                            </p>
                        </div>
                    </div>
                </div>
            </figure>
        </>
    );
}
