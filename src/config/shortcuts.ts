/**
 * What: The keyboard shortcuts listed in the shortcuts sheet (Ctrl/⌘ + /) and
 * under Settings → Keyboard shortcuts, grouped as they are shown. "Mod" is
 * Ctrl, or ⌘ on a Mac; "Alt" is ⌥ and "Shift" is ⇧ there.
 *
 * Used in:
 * - src/app/components/writely/shortcuts.tsx (ShortcutList)
 *
 * Effect: Only changes what the list says. The shortcuts themselves come
 * from the editor (Tiptap's defaults) and from src/app/components/writely/
 * writely-app.tsx and editor-toolbar.tsx, so a change there needs a
 * matching change here.
 */
export const SHORTCUT_GROUPS: {
    title: string;
    shortcuts: { label: string; keys: string[] }[];
}[] = [
    {
        title: "Writing",
        shortcuts: [
            { label: "Save a named draft", keys: ["Mod", "S"] },
            { label: "Focus mode on or off", keys: ["Mod", "Shift", "F"] },
            { label: "Undo", keys: ["Mod", "Z"] },
            { label: "Redo", keys: ["Mod", "Shift", "Z"] },
            { label: "Line break in a paragraph", keys: ["Shift", "Enter"] },
            { label: "Close a panel or dialog", keys: ["Esc"] },
            { label: "Show keyboard shortcuts", keys: ["Mod", "/"] },
        ],
    },
    {
        title: "Text",
        shortcuts: [
            { label: "Bold", keys: ["Mod", "B"] },
            { label: "Italic", keys: ["Mod", "I"] },
            { label: "Underline", keys: ["Mod", "U"] },
            { label: "Strikethrough", keys: ["Mod", "Shift", "S"] },
            { label: "Inline code", keys: ["Mod", "E"] },
            { label: "Add or edit a link", keys: ["Mod", "K"] },
        ],
    },
    {
        title: "Blocks",
        shortcuts: [
            { label: "Normal text", keys: ["Mod", "Alt", "0"] },
            { label: "Heading 1", keys: ["Mod", "Alt", "1"] },
            { label: "Heading 2", keys: ["Mod", "Alt", "2"] },
            { label: "Heading 3", keys: ["Mod", "Alt", "3"] },
            { label: "Numbered list", keys: ["Mod", "Shift", "7"] },
            { label: "Bullet list", keys: ["Mod", "Shift", "8"] },
            { label: "Checklist", keys: ["Mod", "Shift", "9"] },
            { label: "Quote", keys: ["Mod", "Shift", "B"] },
            { label: "Code block", keys: ["Mod", "Alt", "C"] },
        ],
    },
];
