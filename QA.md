# Verification — 4 October 2026

84 browser checks passed in Chrome, plus a successful production build.

- `verify.mjs`: 43 checks covering custom checklist selection, baseline preservation, autosave and reload, revision persistence, naming, comparison, separate finish, protection of unsaved final edits, card opacity and presets, contrast warnings, pointer/keyboard movement, hide/show positions, restoration preserving current text, version-independent cards, command palette, paragraph focus, theme switching, document list/create/reopen, formatting, reduced motion, runtime errors and responsive overflow at 320, 390, 768, 1024 and 1440px.
- `verify-extra.mjs`: 28 checks covering precise typography, column and toolbar dimensions, colour tokens, all six card preset pairs, underlying text click-through, vertical movement, zero-opacity recovery, persistence, draft renaming, dialog focus, palette navigation, mobile card overflow, additions/removals and gutter markers, revision metadata and visible storage failure.
- `verify-touch.mjs`: 9 checks in a mobile touch context covering visible formatting controls, hide/show, card capture and recovery, writing, revision, comparison, completion and explicit card deletion.
- `verify-layout.mjs`: 4 checks covering fully visible comparison actions and no horizontal overflow at 320, 390, 768 and 1440px after fixing footer clipping identified during visual review.

Rendered light, dark, mobile writing and comparison views were inspected. All nine source PDF pages were read before implementation; card preset colours were extracted from the PDF vector and text colours.

The test browser contexts are isolated from the interactive preview. Tests use this machine's bundled Playwright runtime and installed Chrome.

Prototype limitations: local storage only; no server sync or backup. Card coordinates are workspace-based, not paragraph-linked. On small screens cards can overlap the prose; Hide all cards clears the view without moving the text. Click-through bodies, opaque handles, card recovery and 8px snapping are decisions for usability testing. Comparison highlights text changes; formatting changes are retained in drafts but are not separately annotated in the text diff. Very large comparisons use whole-text change marking to bound memory.
