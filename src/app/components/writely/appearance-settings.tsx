"use client";
import { RotateCcw } from "lucide-react";
import type { Preferences } from "~/lib/writely/preferences";
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

/** Lines of text drawn as bars; the last one stops short, like the end of a paragraph. */
function Lines({ count, gap }: { count: number; gap: number }) {
    return (
        <span className="flex w-full flex-col" style={{ gap }}>
            {Array.from({ length: count }, (_, i) => (
                <span
                    key={i}
                    className={`h-[2px] rounded-full bg-current opacity-60 ${i === count - 1 ? "w-2/3" : "w-full"}`}
                />
            ))}
        </span>
    );
}

/**
 * Appearance: the writing column's font, size, spacing and width. Each choice carries a
 * small drawing of its effect, so the writer can see it without a separate preview.
 */
export function AppearanceSettings({
    preferences,
    setPreferences,
}: {
    preferences: Preferences;
    setPreferences: (changes: Partial<Preferences>) => void;
}) {
    const isDefault = entries(EDITOR_DEFAULTS).every(
        ([key, value]) => preferences[key] === value,
    );
    return (
        <SettingsCard>
            <SettingRow id="setting-font" label="Font">
                <Segmented
                    labelledBy="setting-font"
                    value={preferences.fontFamily}
                    options={entries(FONT_FAMILIES).map(([value, font]) => ({
                        value,
                        label: font.label,
                        style: { fontFamily: font.css },
                        preview: (
                            <span className="text-[18px] leading-none">Aa</span>
                        ),
                    }))}
                    onChange={(fontFamily) => setPreferences({ fontFamily })}
                />
            </SettingRow>
            <SettingRow id="setting-size" label="Font size" stacked>
                <div className="flex items-center gap-3">
                    <span aria-hidden="true" className="text-muted text-[11px]">
                        A
                    </span>
                    <input
                        type="range"
                        min={FONT_SIZE_RANGE.min}
                        max={FONT_SIZE_RANGE.max}
                        step={1}
                        value={preferences.fontSize}
                        aria-labelledby="setting-size"
                        aria-describedby="setting-size-sample"
                        onChange={(e) =>
                            setPreferences({
                                fontSize: Number(e.target.value),
                            })
                        }
                        className="h-6! min-h-6! min-w-0 flex-1 cursor-pointer border-0! bg-transparent! p-0! [accent-color:var(--accent)] shadow-none! focus-visible:outline-2! focus-visible:outline-offset-4! focus-visible:outline-[var(--control-focus)]!"
                    />
                    <span aria-hidden="true" className="text-muted text-[17px]">
                        A
                    </span>
                </div>
                {/* Drawn at the chosen size and font, so the slider needs no number. */}
                <p
                    id="setting-size-sample"
                    className="bg-paper mt-2 truncate rounded-lg px-3 py-1.5 leading-snug"
                    style={{
                        fontFamily: FONT_FAMILIES[preferences.fontFamily].css,
                        fontSize: preferences.fontSize,
                    }}
                >
                    The art of writing
                </p>
            </SettingRow>
            <SettingRow id="setting-spacing" label="Line spacing">
                <Segmented
                    labelledBy="setting-spacing"
                    value={preferences.lineSpacing}
                    options={entries(LINE_SPACINGS).map(([value, spacing]) => ({
                        value,
                        label: spacing.label,
                        // Three lines, further apart as the line height grows.
                        preview: (
                            <span className="w-9">
                                <Lines
                                    count={3}
                                    gap={Math.round((spacing.value - 1) * 10)}
                                />
                            </span>
                        ),
                    }))}
                    onChange={(lineSpacing) => setPreferences({ lineSpacing })}
                />
            </SettingRow>
            <SettingRow id="setting-paragraphs" label="Paragraph spacing">
                <Segmented
                    labelledBy="setting-paragraphs"
                    value={preferences.paragraphSpacing}
                    options={entries(PARAGRAPH_SPACINGS).map(
                        ([value, spacing]) => ({
                            value,
                            label: spacing.label,
                            // Two short paragraphs, with the gap between them growing.
                            preview: (
                                <span
                                    className="flex w-9 flex-col"
                                    style={{
                                        gap: 2 + Math.round(spacing.value * 6),
                                    }}
                                >
                                    <Lines count={2} gap={2} />
                                    <Lines count={2} gap={2} />
                                </span>
                            ),
                        }),
                    )}
                    onChange={(paragraphSpacing) =>
                        setPreferences({ paragraphSpacing })
                    }
                />
            </SettingRow>
            <SettingRow id="setting-width" label="Editor width">
                <Segmented
                    labelledBy="setting-width"
                    value={preferences.editorWidth}
                    options={entries(EDITOR_WIDTHS).map(([value, option]) => ({
                        value,
                        label: option.label,
                        // A page with the writing column drawn in proportion to the widest choice.
                        preview: (
                            <span className="flex h-7 w-11 justify-center rounded-[4px] border border-[color-mix(in_srgb,currentColor_40%,transparent)] px-1 py-1.5">
                                <span
                                    style={{
                                        width: `${(option.px / EDITOR_WIDTHS.wide.px) * 100}%`,
                                    }}
                                >
                                    <Lines count={3} gap={3} />
                                </span>
                            </span>
                        ),
                    }))}
                    onChange={(editorWidth) => setPreferences({ editorWidth })}
                />
            </SettingRow>
            <div className="flex justify-end px-5 py-4">
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
    );
}
