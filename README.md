# Writely V2

A calm, writing-first workspace for essays, stories, and unfinished thoughts. This repository contains the OpenCode Writely prototype: a manuscript-centered editor with quiet navigation, spatial thought cards, and intentional revision tools.

## Features

- Minimal writing canvas with a collapsible manuscript sidebar and floating writing tools.
- Autosave in browser storage, with a saving spinner and retry feedback when saving fails.
- New writing starts as **A new piece** and remains freely renameable.
- A visual-only empty editor prompt: **Begin anywhere. Every thought has somewhere to go.**
- Always-on Flow Anchor keeps continuous writing within a comfortable focus band while respecting deliberate navigation and reduced motion.
- Named draft versions, side-by-side comparison, and restoration that preserves the previous working text.
- Universal revision goals managed in Settings, with independent completion for each manuscript and separate manuscript-specific goals.
- Movable thought cards, collapsed leaf markers, live appearance previews, and defaults for newly created cards.
- Logical text connections, matching connector dots, and temporary highlights that support multiple overlapping thoughts.
- A full-page Settings view with demo account details and a confirmed **Reset prototype** action.

Thought cards appear when the writing sidebar is closed and can be moved within the side regions around the manuscript. The toolbar overlays the canvas and can collapse to a small corner launcher.

## Run locally

Use Node.js **22.12 or newer** and npm.

```sh
npm ci
npm run dev -- --port 5192
```

Open [http://localhost:5192](http://localhost:5192).

## Production build

```sh
npm run build
```

The compiled app is written to `dist/`. Serve that directory with a static web host.

## Data and account behavior

This is a local frontend prototype, with no authentication or server database. Writing, saved versions, revision progress, and card preferences are stored in this browser's `localStorage` under `writely.local.v1`. The account name and email in Settings are fictional demo details; real logout and account deletion are not connected.

**Reset prototype** restores the original sample manuscripts, thought cards, goals, and preferences after confirmation. It replaces this browser's prototype data. Sample writing is fictional.

The empty editor prompt and annotation highlights are visual decorations, not manuscript text, and do not enter saved versions or writing statistics.

## Keyboard shortcuts

- **Ctrl/Cmd + K**: open the command palette.
- **Ctrl/Cmd + S**: save a named draft version.
- **Escape**: close the current dialog or temporary interaction.

## Verification

Browser checks use Playwright with an installed Google Chrome browser. Start the development server first, then run selected current regression checks:

```sh
npx playwright test tests/settings-reset-delete.spec.js tests/quiet-sidebar.spec.js tests/empty-placeholder.spec.js tests/flow-anchor.spec.js tests/shared-highlights.spec.js
```

Set `WRITELY_TEST_URL=http://127.0.0.1:5192/` to target the server above; the test configuration otherwise defaults to port 5173. Tests use isolated browser contexts.

Pure model checks can run without a browser:

```sh
node tests/universal-revisions.test.mjs
node tests/cardHighlights.test.mjs
node tests/wordConnections.test.mjs
```

## Project structure

- `src/main.jsx`: app navigation, editor, dialogs, and revision workflows.
- `src/SettingsPage.jsx`: full-page Settings interface.
- `src/model.js`, `src/revisionModel.js`: manuscript data and revision behavior.
- `src/Annotations.jsx`: thought-card interactions and connector rendering.
- `src/flowAnchor.js`: caret-following behavior and editor lifecycle handling.
- `src/useAutosave.js`: browser persistence and save feedback.
- `public/`: Writely favicon and bundled font license notices.
- `tests/`: model and browser regressions, including historical prototype tests.

The app uses React, Vite, Tiptap, Radix tooltips, Lucide icons, and locally bundled Inter and Source Serif 4 fonts. Font licenses are included in `public/licenses/`. The design documents in the repository capture the initial prototype planning; this README describes the current interface.
