"use client";
import type { Preferences } from "~/lib/writely/preferences";
import {
    EXPORT_FONTS,
    EXPORT_PAGE_SIZES,
    FONT_FAMILIES,
} from "~/config/preferences";
import {
    entries,
    Segmented,
    SettingRow,
    SettingsCard,
    Switch,
} from "./settings-controls";

/** Document Export: how every export is laid out (paper size, font and whether the title leads). */
export function ExportSettings({
    preferences,
    setPreferences,
}: {
    preferences: Preferences;
    setPreferences: (changes: Partial<Preferences>) => void;
}) {
    return (
        <SettingsCard>
            <SettingRow id="setting-page-size" label="Paper size">
                <Segmented
                    labelledBy="setting-page-size"
                    value={preferences.exportPageSize}
                    options={entries(EXPORT_PAGE_SIZES).map(
                        ([value, size]) => ({ value, label: size.label }),
                    )}
                    onChange={(exportPageSize) =>
                        setPreferences({ exportPageSize })
                    }
                />
            </SettingRow>
            <SettingRow
                id="setting-export-font"
                label="Font"
                hint={
                    preferences.exportFont === "editor"
                        ? `Follows your editor font, now ${FONT_FAMILIES[preferences.fontFamily].label.toLowerCase()}.`
                        : undefined
                }
            >
                <Segmented
                    labelledBy="setting-export-font"
                    value={preferences.exportFont}
                    options={entries(EXPORT_FONTS).map(([value, font]) => ({
                        value,
                        label: font.label,
                    }))}
                    onChange={(exportFont) => setPreferences({ exportFont })}
                />
            </SettingRow>
            <SettingRow
                id="setting-export-title"
                label="Start with the title"
                hint="Include the title unless it’s already in the text."
                compact
            >
                <Switch
                    labelledBy="setting-export-title"
                    describedBy="setting-export-title-hint"
                    checked={preferences.exportTitle}
                    onChange={(exportTitle) => setPreferences({ exportTitle })}
                />
            </SettingRow>
        </SettingsCard>
    );
}
