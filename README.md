# Writely

A calm, writing-first workspace for essays, stories, and unfinished thoughts: a manuscript-centered editor with quiet navigation, spatial thought cards, and intentional revision tools.

Built on the [T3 stack](https://create.t3.gg): Next.js (App Router), TypeScript, tRPC, Prisma, Better Auth and Tailwind CSS.

## Features

- Minimal writing canvas with a collapsible manuscript sidebar and floating writing tools.
- Email and password accounts. Each account's writing is stored in the database and autosaved, with a saving spinner and retry feedback when saving fails.
- New writing starts as **A new piece** and remains freely renameable.
- A visual-only empty editor prompt: **Begin anywhere. Every thought has somewhere to go.**
- Always-on Flow Anchor keeps continuous writing within a comfortable focus band while respecting deliberate navigation and reduced motion.
- Named draft versions, side-by-side comparison, and restoration that preserves the previous working text.
- Universal revision goals managed in Settings, with independent completion for each manuscript and separate manuscript-specific goals.
- Movable thought cards with inline editing, collapsed leaf markers, and automatic pastel colours that cycle Yellow → Blue → Green → Pink. Double-click card text or use its pencil button to edit; click outside to save, or press Escape to cancel.
- Select manuscript text and choose **Connect to thought**, then click a card to connect it. Each card has one visible connection; multiple cards can share a text range, with accurate arrows and overlapping highlights that follow edits.
- A full-page Settings view with account details, log out, account deletion and a confirmed **Reset prototype** action.

## Run locally

Use Node.js **24 or newer** and npm (Node 24 LTS is recommended).

```sh
npm install
cp .env.example .env   # then set BETTER_AUTH_SECRET and your PostgreSQL DATABASE_URL
npm run db:migrate     # creates the tables in your PostgreSQL database
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and create an account. A new account starts with the sample manuscripts.

The stack uses Next.js 16, React 19, Prisma 7 with its PostgreSQL driver adapter, Zod 4,
Tailwind CSS 4, ESLint 10 and Vitest 5. TypeScript stays on the latest supported 6.0
release because `typescript-eslint` currently requires TypeScript below 6.1. Prisma
uses the newest stable 7.x release rather than the Prisma 8 release candidate.

Create a PostgreSQL database before starting the app. Set `DATABASE_URL` to its
connection string, for example `postgresql://USER:PASSWORD@HOST:5432/writely?schema=public`.
URL-encode special characters in credentials and use the TLS settings required by
your database provider. If the runtime connection uses a pooler, optionally set
`DIRECT_URL` to the direct connection for Prisma migrations.

Prisma configuration lives in `prisma7.config.ts`. Run `npm run db:migrate` to apply
the PostgreSQL migrations. For subsequent schema changes, use `npm run db:generate`
to create a migration, then `npx prisma generate` to refresh the generated client.

Switching providers does not transfer existing SQLite data. The old
`.data/db.sqlite` file is preserved; accounts and writing need a separate export
and import if you want to move them to PostgreSQL.

## Production build

```sh
npm run build
npm run start
```

`BETTER_AUTH_SECRET` is required in production, and `BETTER_AUTH_URL` should be the app's public URL.

## Data and accounts

Writing, saved versions, thought cards, revision goals and preferences belong to the signed-in account. Autosave sends only what changed since the last successful save. Until the server confirms a save, the latest changes are also kept in the browser, so a reload or a dropped connection doesn't lose writing.

Writing created in the earlier browser-only prototype (stored in `localStorage` under `writely.local.v1`) moves into the first account created in that browser.

**Reset prototype** restores the original sample manuscripts, thought cards, goals, and preferences in the account after confirmation. **Delete account** permanently removes the account and all of its writing.

The empty editor prompt and annotation highlights are visual decorations, not manuscript text, and do not enter saved versions or writing statistics.

## Keyboard shortcuts

- **Ctrl/Cmd + K**: open the command palette.
- **Ctrl/Cmd + S**: save a named draft version.
- **Escape**: close the current dialog or temporary interaction.

## Verification

```sh
npm run typecheck
npm run lint
npm test            # Vitest unit tests for the editor models
npm run test:e2e    # Playwright browser tests (uses an installed Google Chrome)
```

The browser tests start `npm run dev` unless a server is already running; set `WRITELY_TEST_URL` to target another one. Each test signs up its own account. They run against the development server because production applies Better Auth's sign-up rate limit.

## Project structure

- `src/app/`: Next.js routes: the editor (`page.tsx`), `sign-in/`, and the Better Auth and tRPC API handlers.
- `src/app/components/writely/`: the editor interface — app shell, thought cards, settings, autosave.
- `src/config/`: shared settings grouped by feature (cards, documents, editor, preferences, revisions, storage, ui). Each constant's comment says what it controls, where it is used and what changing it does.
- `src/lib/writely/`: editor models shared by client and server (manuscripts, revisions, card layout, connections) and the Tiptap extensions in `editor/`.
- `src/server/`: tRPC routers, Better Auth configuration, Prisma client and workspace persistence.
- `src/styles/globals.css`: Tailwind setup, shared design tokens, and keyframes. Interface and editor styles are Tailwind classes in the components and editor attributes.
- `prisma/schema.prisma`: database schema.
- `prisma7.config.ts`: Prisma CLI configuration and database URL resolution.
- `tests/unit/`, `tests/e2e/`: Vitest and Playwright tests.
- `public/`: Writely favicon and bundled font license notices.

The editor uses Tiptap, Radix tooltips, Lucide icons, and locally bundled Inter and Source Serif 4 fonts. Font licenses are included in `public/licenses/`.
