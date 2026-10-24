"use client";
import type { Preferences } from "~/lib/writely/preferences";
import {
    SettingRow,
    SettingsCard,
    Switch,
} from "./settings-controls";

/** Writing: the aids that change how typing feels, rather than how the page looks. */
export function WritingSettings({
    preferences,
    setPreferences,
}: {
    preferences: Preferences;
    setPreferences: (changes: Partial<Preferences>) => void;
}) {
    return (
        <SettingsCard className="rounded-xl">
            <SettingRow
                id="setting-paragraph-highlight"
                label="Paragraph highlighting"
                hint="Fade other paragraphs so the current one stands out."
                compact
            >
                <Switch
                    labelledBy="setting-paragraph-highlight"
                    describedBy="setting-paragraph-highlight-hint"
                    checked={preferences.paragraphHighlight}
                    onChange={(paragraphHighlight) =>
                        setPreferences({ paragraphHighlight })
                    }
                />
            </SettingRow>
            <SettingRow
                id="setting-typewriter"
                label="Typewriter scrolling"
                hint="Keep the active line near the middle of the screen."
                compact
            >
                <Switch
                    labelledBy="setting-typewriter"
                    describedBy="setting-typewriter-hint"
                    checked={preferences.typewriter}
                    onChange={(typewriter) => setPreferences({ typewriter })}
                />
            </SettingRow>
            <SettingRow
                id="setting-punctuation"
                label="Smart punctuation"
                hint="Use curly quotes, em dashes, and ellipses automatically."
                compact
            >
                <Switch
                    labelledBy="setting-punctuation"
                    describedBy="setting-punctuation-hint"
                    checked={preferences.smartPunctuation}
                    onChange={(smartPunctuation) =>
                        setPreferences({ smartPunctuation })
                    }
                />
            </SettingRow>
            <SettingRow
                id="setting-spellcheck"
                label="Check spelling"
                hint="Underline possible spelling mistakes using browser support."
                compact
            >
                <Switch
                    labelledBy="setting-spellcheck"
                    describedBy="setting-spellcheck-hint"
                    checked={preferences.spellcheck}
                    onChange={(spellcheck) => setPreferences({ spellcheck })}
                />
            </SettingRow>
        </SettingsCard>
    );
}
