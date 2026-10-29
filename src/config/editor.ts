/**
 * The writing surface: how manuscript text looks and what an empty draft says.
 */

/**
 * What: The typography of the writing surface: spacing, headings, lists,
 * quotes, code and checklists. The font, text size, line height, paragraph
 * gap and width come from the writer's preferences (see editorStyle in
 * src/lib/writely/preferences.ts). With paragraph highlighting on in focus mode
 * (a .paragraph-highlight ancestor), every block but the ones holding the
 * caret or selection fades back. Sizes are relative (em), so headings keep
 * their proportions at every text size.
 *
 * Used in:
 * - src/app/components/writely/writely-app.tsx (the editor)
 * - src/app/components/writely/appearance-settings.tsx (the Settings preview)
 *
 * Effect: Changes how manuscript text looks in the editor. The Settings
 * preview uses the same classes, so it always matches the editor.
 */
export const EDITOR_TEXT_CLASS =
    "tiptap [font-family:var(--editor-font)] [font-size:var(--editor-font-size)] [line-height:var(--editor-line-height)] [min-height:320px] [color:var(--text)] [caret-color:var(--accent)] [outline:none]! [&_p]:[margin:0_0_var(--editor-paragraph-gap,1.25em)] [&>*]:[transition:opacity_200ms_ease-out] motion-reduce:[&>*]:[transition:none] [.paragraph-highlight_&:has(>.has-focus)>:not(.has-focus)]:[opacity:0.32] [&_h2]:[font-size:1.55em] [&_h2]:[margin:1.4em_0_0.6em] [&_h2]:[line-height:1.3] [&_h2]:[font-weight:600] [&_h3]:[font-size:1.25em] [&_h3]:[margin:1.2em_0_0.5em] [&_h3]:[line-height:1.35] [&_ul]:[padding-left:24px] [&_ol]:[padding-left:24px] [&_blockquote]:[border-left-width:1px] [&_blockquote]:[border-left-style:solid] [&_blockquote]:[border-left-color:var(--accent)] [&_blockquote]:[padding-left:24px] [&_blockquote]:[margin:24px_0] [&_blockquote]:[font-style:italic] [&_a]:[color:var(--accent)] [&.tiptap:focus-visible]:[box-shadow:none] [&.tiptap:focus-visible]:[border:0] [&.tiptap:focus-visible]:[outline:none]! [:is(.paper,_.cloud-text)_&_h1]:[margin:1.4em_0_0.6em] [.paper_&_>_:is(h1,h2,h3):first-child]:[margin-top:0] [:is(.paper,_.cloud-text)_&_h1]:[font-size:1.9em] [:is(.paper,_.cloud-text)_&_h1]:[font-weight:600] [:is(.paper,_.cloud-text)_&_h1]:[line-height:1.25] [:is(.paper,_.cloud-text)_&_li_>_p]:[margin-bottom:4px] [:is(.paper,_.cloud-text)_&_ul]:[list-style-type:disc] [:is(.paper,_.cloud-text)_&_ol]:[list-style-type:decimal] [:is(.paper,_.cloud-text)_&_ul_ul]:[list-style-type:circle] [:is(.paper,_.cloud-text)_&_hr]:[border-width:1px_0px_0px] [:is(.paper,_.cloud-text)_&_hr]:[border-style:solid_none_none] [:is(.paper,_.cloud-text)_&_hr]:[border-right-color:currentcolor] [:is(.paper,_.cloud-text)_&_hr]:[border-bottom-color:currentcolor] [:is(.paper,_.cloud-text)_&_hr]:[border-left-color:currentcolor] [:is(.paper,_.cloud-text)_&_hr]:[border-image:none] [:is(.paper,_.cloud-text)_&_hr]:[border-top-color:var(--border)] [:is(.paper,_.cloud-text)_&_hr]:[margin:32px_0] [:is(.paper,_.cloud-text)_&_code]:[font:0.85em/1.6_ui-monospace,_monospace] [:is(.paper,_.cloud-text)_&_code]:[background:var(--tint)] [:is(.paper,_.cloud-text)_&_code]:[border-radius:3px] [:is(.paper,_.cloud-text)_&_code]:[padding:1px_4px] [:is(.paper,_.cloud-text)_&_pre]:whitespace-pre-wrap [:is(.paper,_.cloud-text)_&_pre]:[overflow-wrap:anywhere] [:is(.paper,_.cloud-text)_&_pre]:[margin:20px_0] [:is(.paper,_.cloud-text)_&_pre]:[padding:16px] [:is(.paper,_.cloud-text)_&_pre]:[border-radius:6px] [:is(.paper,_.cloud-text)_&_pre]:[background:var(--tint)] [:is(.paper,_.cloud-text)_&_pre]:[font:0.875em/1.6_ui-monospace,_monospace] [:is(.paper,_.cloud-text)_&_pre_code]:[padding:0] [:is(.paper,_.cloud-text)_&_pre_code]:[background:transparent] [:is(.paper,_.cloud-text)_&_pre_code]:[font:inherit] [:is(.paper,_.cloud-text)_&_ul[data-type='taskList']]:[list-style:none] [:is(.paper,_.cloud-text)_&_ul[data-type='taskList']]:[padding-left:0] [:is(.paper,_.cloud-text)_&_li[data-type='taskItem']]:flex [:is(.paper,_.cloud-text)_&_li[data-type='taskItem']]:items-start [:is(.paper,_.cloud-text)_&_li[data-type='taskItem']]:[gap:10px] [:is(.paper,_.cloud-text)_&_li[data-type='taskItem']_>_label]:[flex:0_0_auto] [:is(.paper,_.cloud-text)_&_li[data-type='taskItem']_>_label]:[padding-top:4px] [:is(.paper,_.cloud-text)_&_li[data-type='taskItem']_>_label]:select-none [:is(.paper,_.cloud-text)_&_li[data-type='taskItem']_input]:[width:15px] [:is(.paper,_.cloud-text)_&_li[data-type='taskItem']_input]:[height:15px] [:is(.paper,_.cloud-text)_&_li[data-type='taskItem']_input]:[min-height:0] [:is(.paper,_.cloud-text)_&_li[data-type='taskItem']_input]:[margin:0] [:is(.paper,_.cloud-text)_&_li[data-type='taskItem']_input]:[accent-color:var(--accent)] [:is(.paper,_.cloud-text)_&_li[data-type='taskItem']_input]:cursor-pointer [:is(.paper,_.cloud-text)_&_li[data-type='taskItem']_>_div]:[flex:1] [:is(.paper,_.cloud-text)_&_li[data-type='taskItem']_>_div]:[min-width:0] [:is(.paper,_.cloud-text)_&_li[data-type='taskItem'][data-checked='true']_>_div_>_p]:[text-decoration:line-through] [:is(.paper,_.cloud-text)_&_li[data-type='taskItem'][data-checked='true']_>_div_>_p]:[color:var(--muted)] [&.tiptap:focus]:[box-shadow:none] [&.tiptap:focus]:[border:0] [&.tiptap:focus]:[outline:none]! [.cloud-text_&]:[min-height:1.5em] [.cloud-text_&]:[font:inherit] [.cloud-text_&]:[color:inherit] [.cloud-text_&_p]:[margin:0] [.cloud-text_&.tiptap_h1]:[margin:8px_0] [.cloud-text_&.tiptap_h1]:[line-height:1.4] [.cloud-text_&.tiptap_h1]:[font-size:20px] [.cloud-text_&_h2]:[margin:8px_0] [.cloud-text_&_h2]:[line-height:1.4] [.cloud-text_&_h2]:[font-size:18px] [.cloud-text_&_h3]:[margin:8px_0] [.cloud-text_&_h3]:[line-height:1.4] [.cloud-text_&_h3]:[font-size:16px] [.cloud-text_&_ul]:[margin:0] [.cloud-text_&_ul]:[padding-left:20px] [.cloud-text_&_ol]:[margin:0] [.cloud-text_&_ol]:[padding-left:20px] [.cloud-text_&_blockquote]:[margin:0] [.cloud-text_&_blockquote]:[padding-left:12px] [.cloud-text_&_blockquote]:[border-color:currentColor]";

/**
 * What: The faint prompt shown on the first line of an empty draft. It is
 * only displayed, never saved as part of the document.
 *
 * Used in:
 * - src/lib/writely/editor/empty-draft-placeholder.ts (EmptyDraftPlaceholder)
 *
 * Effect: Changes the words a writer sees when they open a new, empty draft.
 */
export const EMPTY_DRAFT_PLACEHOLDER =
    "Begin anywhere. Every thought has somewhere to go.";
