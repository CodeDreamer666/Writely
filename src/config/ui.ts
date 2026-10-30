/**
 * Tailwind class lists shared by many screens, so buttons, tooltips and dialogs look the same
 * everywhere. Changing one restyles every place listed under "Used in".
 */

/**
 * What: The look of hover tooltips (small dark labels that explain a button).
 *
 * Used in:
 * - src/app/components/writely/dock.tsx (DockButton)
 * - src/app/components/writely/editor-toolbar.tsx (FormatButton, the "More" button)
 * - src/app/components/library/library.tsx (Library)
 *
 * Effect: Changes the size, colours and spacing of every tooltip at once.
 */
export const TOOLTIP_CLASS =
    "tooltip [z-index:40] [max-width:240px] [border-radius:4px] [padding:8px_12px] [font-size:11px] [line-height:1.6] [color:var(--bg)] [background:var(--text)] [&_svg]:[fill:var(--text)]";

/**
 * What: The look of main action buttons, filled with the accent colour
 * (for example "Save draft" or "Create").
 *
 * Used in:
 * - src/app/components/writely/writely-app.tsx (WritelyApp)
 * - src/app/components/library/library.tsx (Library)
 * - src/app/components/writely/settings-page.tsx (SettingsPage)
 *
 * Effect: Changes the colour and hover style of every main action button.
 */
export const PRIMARY_BUTTON =
    "primary [color:var(--on-accent)] [background:var(--accent)] [&:hover]:[color:var(--on-accent)]! [&:hover]:[background:var(--hover)]! [&:not(:disabled):active]:[color:var(--on-accent)]";

/**
 * What: The look of buttons that confirm something that cannot be undone,
 * such as deleting a draft, a document or an account.
 *
 * Used in:
 * - src/app/components/writely/writely-app.tsx (delete draft dialog)
 * - src/app/components/library/library.tsx (delete document dialog)
 * - src/app/components/writely/settings-page.tsx (reset and delete account dialogs)
 *
 * Effect: Changes the colour and hover style of every destructive button.
 */
export const DANGER_BUTTON =
    "danger-solid [color:var(--on-accent)]! [background:var(--danger)]! [&:hover]:[color:var(--on-accent)]! [&:hover]:[background:color-mix(in_srgb,_var(--danger)_88%,_var(--text))]!";

/**
 * What: The title row at the top of a dialog (the title and its close button).
 *
 * Used in:
 * - src/app/components/ui.tsx (Dialog)
 * - src/app/components/writely/writely-app.tsx (the editor's own dialogs)
 *
 * Effect: Changes the size and spacing of every dialog title.
 */
export const DIALOG_HEADING =
    "dialog-heading [margin-bottom:8px] flex items-center justify-between [&_button]:[margin-right:-12px] [&_h2]:[font-size:20px] [&_h2]:[font-weight:500] [&_h2]:[letter-spacing:-0.025em]";

/**
 * What: The row of buttons at the bottom of a dialog (such as Cancel and Delete).
 *
 * Used in:
 * - src/app/components/writely/writely-app.tsx (WritelyApp)
 * - src/app/components/library/library.tsx (Library)
 * - src/app/components/writely/settings-page.tsx (SettingsPage)
 *
 * Effect: Changes the alignment of, and the space around and between, dialog buttons.
 */
export const DIALOG_ACTIONS =
    "dialog-actions [margin-top:24px] flex justify-end [gap:8px]";

/**
 * What: The dimmed backdrop that covers the page behind an open dialog.
 *
 * Used in:
 * - src/app/components/ui.tsx (Dialog)
 * - src/app/components/writely/writely-app.tsx (WritelyApp)
 *
 * Effect: Changes how dark the backdrop is and the space kept around dialogs.
 */
export const OVERLAY_CLASS =
    "modal-overlay fixed [inset:0] [z-index:100] box-border grid [grid-template-columns:minmax(0,_1fr)] [place-items:center] justify-center overflow-hidden [padding:24px] [background:color-mix(in_srgb,_var(--shadow)_25%,_transparent)] max-md:[padding:16px]";

/**
 * What: The dialog box itself: its width, border, shadow, padding and
 * opening animation.
 *
 * Used in:
 * - src/app/components/ui.tsx (Dialog)
 * - src/app/components/writely/writely-app.tsx (WritelyApp)
 *
 * Effect: Changes the size and look of every dialog. The width (480px) sets
 * how wide dialogs are on larger screens.
 */
export const DIALOG_CLASS =
    "dialog [width:480px] [max-width:100%] [max-height:calc(100dvh_-_48px)] overflow-y-auto [animation:dialog-fade-in_160ms_ease-out] [border-radius:12px] [border:1px_solid_var(--border)] [padding:24px] [box-shadow:0_16px_48px_color-mix(in_srgb,_var(--shadow)_14%,_transparent)] [background:var(--surface)] [color:var(--text)] [&_label]:[margin-bottom:8px] [&_label]:block [&_label]:[font-size:11px] [&_label]:[font-weight:500] [&_label]:[color:var(--muted)] [&_p]:[margin-bottom:24px] [&_p]:[font-size:13px] [&_p]:[line-height:1.7] [&_p]:[color:var(--muted)] [@media(prefers-reduced-motion:_reduce)]:[animation:none]";
