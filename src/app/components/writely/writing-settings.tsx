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
        <SettingsCard>
            <SettingRow
                id="setting-paragraph-highlight"
                label="Paragraph highlighting"
                hint="In focus mode, fades every paragraph except the one you’re writing in. Start focus mode from the editor’s ⋯ menu, or Ctrl/⌘ + Shift + F."
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
                hint="Keeps the line you’re typing near the middle of the window."
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
                hint="Turns straight quotes into curly ones, -- into an em dash and ... into an ellipsis as you type."
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
                hint="Your browser underlines words it doesn’t know, in its own language settings."
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
