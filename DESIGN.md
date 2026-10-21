---
name: Writely
description: A quiet place to write, rethink and refine; the page alone in the middle, every tool in one dock beneath it.
colors:
  paper: "#FAF8F5"
  surface: "#FFFFFF"
  ink: "#1F1D1A"
  muted: "#6B665F"
  line: "#E7E2DA"
  accent: "#2F5D62"
  accent-hover: "#3E7A80"
  tint: "#DCE9EA"
  on-accent: "#FFFFFF"
  danger: "#B3402A"
  success: "#3F7D4E"
  mark: "#FCEFB5"
  night-paper: "#1A1917"
  night-surface: "#22211E"
  night-raised: "#2A2825"
  night-ink: "#E8E4DC"
  night-muted: "#A39D93"
  night-line: "#36332E"
  night-accent: "#7FB3B8"
  night-accent-hover: "#9CCACF"
  night-tint: "#2A3B3D"
  night-on-accent: "#142224"
  night-danger: "#E08A76"
  night-success: "#8FC29B"
  night-selection: "#34504F"
  field-sky: "#D9E6F2"
  field-butter: "#FBEFB5"
  field-sage: "#DDEBDD"
  slate: "#2B2926"
  slate-ink: "#F4F1EC"
typography:
  display:
    fontFamily: "Source Serif 4, Georgia, serif"
    fontSize: "clamp(46px, 6.4vw, 92px)"
    fontWeight: 400
    lineHeight: 0.98
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Source Serif 4, Georgia, serif"
    fontSize: "clamp(40px, 5.4vw, 76px)"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "-0.035em"
  page-title:
    fontFamily: "Source Serif 4, Georgia, serif"
    fontSize: "44px"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Source Serif 4, Georgia, serif"
    fontSize: "19px"
    fontWeight: 400
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  prose:
    fontFamily: "Source Serif 4, Georgia, serif"
    fontSize: "18px"
    fontWeight: 400
    lineHeight: 1.7
  thought:
    fontFamily: "Source Serif 4, Georgia, serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
  panel-title:
    fontFamily: "Inter, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    letterSpacing: "-0.01em"
  dialog-title:
    fontFamily: "Inter, sans-serif"
    fontSize: "20px"
    fontWeight: 500
    letterSpacing: "-0.025em"
  dock-label:
    fontFamily: "Inter, sans-serif"
    fontSize: "12.5px"
    fontWeight: 500
  control:
    fontFamily: "Inter, sans-serif"
    fontSize: "12px"
    fontWeight: 400
  field:
    fontFamily: "Inter, sans-serif"
    fontSize: "13px"
    fontWeight: 400
  label:
    fontFamily: "Inter, sans-serif"
    fontSize: "11px"
    fontWeight: 500
    lineHeight: 1.6
  keyboard:
    fontFamily: "ui-monospace, monospace"
    fontSize: "11px"
rounded:
  hairline: "2px"
  tooltip: "4px"
  page: "6px"
  control: "8px"
  cta: "10px"
  row: "12px"
  dock: "16px"
  drawer: "18px"
  pill: "9999px"
spacing:
  xxs: "4px"
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "20px"
  xl: "24px"
  xxl: "32px"
  paper-top: "56px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.control}"
    padding: "8px 12px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
    textColor: "{colors.on-accent}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    typography: "{typography.control}"
    rounded: "{rounded.control}"
    padding: "8px 12px"
    height: "44px"
  button-ghost-hover:
    textColor: "{colors.ink}"
  button-ghost-active:
    backgroundColor: "{colors.tint}"
    textColor: "{colors.accent}"
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.control}"
  button-cta:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.cta}"
    padding: "0 20px"
    height: "48px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.field}"
    rounded: "{rounded.control}"
    padding: "12px"
    height: "44px"
  dock:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.dock}"
    padding: "6px"
  dock-button:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    typography: "{typography.dock-label}"
    rounded: "{rounded.cta}"
    padding: "0 12px"
    height: "44px"
  dock-button-pressed:
    backgroundColor: "{colors.tint}"
    textColor: "{colors.accent}"
  revision-strip:
    backgroundColor: "{colors.tint}"
    textColor: "{colors.accent}"
    padding: "6px 6px 6px 16px"
  drawer:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.drawer}"
    padding: "0 20px 20px"
    width: "560px"
  dialog:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.row}"
    padding: "24px"
    width: "480px"
  menu:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "4px"
    width: "144px"
  tooltip:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.label}"
    rounded: "{rounded.tooltip}"
    padding: "8px 12px"
  list-row:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.row}"
    padding: "12px"
  library-page:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.page}"
    padding: "24px 20px 0"
    height: "248px"
  thought-card:
    backgroundColor: "{colors.field-butter}"
    textColor: "{colors.ink}"
    typography: "{typography.thought}"
  landing-closing-band:
    backgroundColor: "{colors.slate}"
    textColor: "{colors.slate-ink}"
---

# Design System: Writely

## Overview

**Creative North Star: "The Page and Its Dock"**

The writing sits alone in the middle of a warm paper ground, and everything else waits beneath it. The editor has one slim floating dock at the bottom centre: Documents, Thoughts, Checklist, Drafts and Stats as Inter labels with line icons, on a white surface with a hairline border. Each tool opens a drawer that rises out of the dock. There is no document rail, side panel or floating tool pill. When a revision is open, the dock gets a teal-tinted strip on top that names the goal and holds Save draft and Finish revision, so the dock always shows where the revision stands.

Serif writes and sans operates. Source Serif 4 carries everything a person wrote or reads as writing: the essay, thoughts, document titles, library page excerpts, statistics numerals, and display lines on the landing, welcome and sign-in pages. Inter carries every control. Colour stays quiet. Teal marks action and the active tool, and the PDF thought-card pastels are the only warm colour. In the app they sit on thought cards. On the landing page they grow into page-wide colour fields (sky, butter, sage), and a slate band closes the page.

Depth is soft and tinted, never hard. Surfaces lift with long, negative-spread shadows mixed from the theme's shadow colour. Dark mode only redefines tokens; components read the same variables in both themes.

**Key Characteristics:**
- One centred serif column (680px standard; 600 / 800 by preference) with nothing beside it but the writer's own thoughts.
- One bottom dock; drawers rise from it (200ms) and close on Escape or a click outside.
- Teal only for primary actions, the pressed tool, the open revision, links and the caret.
- Pastels belong to thoughts and landing fields, never to controls.
- Hairline borders, soft tinted lift, ring-style focus, 44px targets.

## Colors

Warm paper neutrals, one deep teal, and a small set of pale pastels from the product brief.

### Primary
- **Harbour Teal** (accent): primary buttons, the pressed dock tool's text, the revision dot and strip text, links, blockquote rule and the editor caret. Hover deepens to **Lit Teal** (accent-hover), which also drives the landing CTA focus ring and input carets.
- **Teal Mist** (tint): the pressed dock tool's background, the revision strip, active library navigation, pressed toolbar toggles, inline code and code blocks. The default text selection uses the same value.

### Secondary
- **Brief Pastels** (field-sky, field-butter, field-sage): the landing page's full-width section fields and the thought-card colours in landing, sign-in and welcome demos. In dark mode each field is mixed 16% into the night paper. App thought cards store their own pastel (Butter Yellow, Sage Green, Powder Blue, Soft Blush presets). Dark mode blends that pastel at 26% into a dark card base and switches card text to night ink.
- **Slate** with **Slate Ink**: the landing page's closing band only. Its CTA inverts to a slate-ink fill with slate text.

### Tertiary
- **Brick** (danger) and **Garden** (success): removal and addition in diffs (as 12% / 14% washes behind struck and underlined text), destructive menu items and buttons, and the not-saved state.
- **Highlighter** (mark): highlights search matches and the phrase a thought is connected to.

### Neutral
- **Paper** (paper): the page ground everywhere, including the editor header and the fade behind the dock.
- **Surface** (surface): dock, drawers, dialogs, menus, fields, library pages, list rows.
- **Ink** (ink): text; also the tooltip fill, inverted.
- **Stone** (muted): secondary text, idle controls, placeholders, metadata.
- **Hairline** (line): every 1px border and divider. Control borders use it at 65% strength. Hover on a ghost button gives a 6% teal wash. Focus borders mix 55% teal into the hairline.
- **Night** set (night-*): the dark theme's matching values for every role above, used under `prefers-color-scheme: dark` unless the user picks light, and under an explicit dark choice.

### Named Rules
**The Teal Means Act Rule.** Teal appears only where something can be done or is in progress: primary buttons, the pressed tool, the open revision, links, the caret. Decoration, headings and empty states never use it.

**The Pastel Belongs to Thought Rule.** Pastels colour thoughts and the landing fields that demonstrate them. Never use them for a control, a status or a navigation state.

**The Token Theme Rule.** Theme colours come from the shared variables (`--bg`, `--surface`, `--text`, `--accent`, ...). Dark mode redefines the variables and nothing else. A component that needs a tone mixes it from those variables with `color-mix`.

## Typography

**Display Font:** Source Serif 4 (with Georgia, serif)
**Body Font:** Source Serif 4 for writing; Inter (with sans-serif) for interface
**Label/Mono Font:** Inter; keyboard hints and code in ui-monospace

**Character:** A bookish serif for anything that is writing, and a small, plain Inter for anything you click. Display lines are large and set tight; controls are small and quiet.

### Hierarchy
- **Display** (400, clamp(46px, 6.4vw, 92px), 0.98, -0.035em): landing hero line only. Welcome uses clamp(38px, 6vw, 64px) and sign-in clamp(36px, 3.6vw, 54px) in the same spirit.
- **Headline** (400, clamp(40px, 5.4vw, 76px), 1, -0.035em): landing field headings and the closing band (which goes larger, clamp(80px, 11vw, 144px)).
- **Page title** (400, 44px, 1, -0.03em; 36px on phones): the library's "Documents". The draft comparison heading uses 26px.
- **Title** (400, 19px, 1.25): library page titles. Drawer rows (thoughts, drafts) set their serif text at 15px.
- **Prose** (400, 18px, 1.7; paragraph gap 24px): the essay. Size (16–22px), family (serif / sans / mono), line height (1.5 / 1.7 / 1.9) and width are user preferences. Headings in prose are 34px/600 (h1), 28px/600 (h2) and 22px (h3).
- **Thought** (400, 15px, 1.5): thought-card text.
- **Panel title** (Inter 600, 15px, -0.01em): drawer headers. **Dialog title** (Inter 500, 20px, -0.025em).
- **Dock label** (Inter 500, 12.5px), **control** (Inter 12px), **field** (Inter 13px), **label** (Inter 500, 11px, muted). Counts in the dock are 11px tabular figures.

### Named Rules
**The Serif Writes, Sans Operates Rule.** If a person wrote it or will read it as writing, it is Source Serif 4. If it is a control, a label or a status, it is Inter.

**The Quiet Label Rule.** Labels are sentence case Inter in Stone. The system has no uppercase tracked labels or eyebrows above headings.

## Layout

**Editor.** A full-height column: a 56px header (back to Documents, divider, title, save state, Commands with its `Ctrl K` hint), then the scrolling workspace. Its bottom border appears only once the page is scrolled. The paper is centred and capped at the editor width (680px standard). It is `100% - 384px` wide on large screens, `- 128px` at ≤1119px, `- 96px` at ≤1000px and `- 40px` at ≤760px. Top padding is 56px (32px on phones). The bottom padding leaves room for half a viewport of scroll past the end. A short 24px hairline end mark closes the text. A 112px fade from paper sits under the dock so text slides out of sight behind it.

**Dock and drawers.** The dock is fixed 20px above the bottom edge (12px at ≤720px), centred, sized to its contents, and never wider than the viewport minus 16px. Drawers float centred above the dock (dock height + 28px), at most 560px wide and min(68dvh, 620px) tall. At ≤720px a drawer becomes a full-width bottom sheet up to 82dvh tall, with a grab bar and safe-area padding, and dock buttons go icon-only.

**Library.** A left column (page title, weekly writing dots, New document, All / Recent / Pinned, sort and view switch) beside a search field and a grid of page cards. At ≤1023px the navigation becomes a segmented row.

**Landing.** Full-bleed fields with a 1280px inner width, 24px side padding (16px on phones) and clamp(72px, 10vw, 128px) vertical padding. Content sits on a 12-column grid with a 40px column gap. The heading takes six columns and the copy starts at column 8. Everything collapses to one column at ≤960px.

**Rhythm.** Spacing steps of 4, 8, 12, 16, 20, 24 and 32px. Drawer bodies use 20px side padding; dialogs 24px.

## Elevation & Depth

Depth is a hybrid: flat hairline-bordered surfaces at rest, plus a few soft, tinted lifts for things that float over the page. Every shadow is mixed from the theme's `--shadow` colour with `color-mix`, and most use a negative spread, so the shadow pools under the surface instead of outlining it. Scrims are faint: 6% behind a desktop drawer, 18% on phones, 25% behind a dialog.

### Shadow Vocabulary
- **Dock** (`0 12px 32px -8px` at 16% + `0 1px 2px` at 6%): the floating dock and its collapsed launcher pill.
- **Drawer** (`0 24px 64px -12px` at 22% + `0 2px 6px` at 5%): drawers rising from the dock.
- **Dialog** (`0 16px 48px` at 14%): modal dialogs.
- **Page** (`0 14px 28px -22px` at 40%, deepening on hover): library page cards, which also lift 2px.
- **Menu / toast** (`0 4px 16px` at 7–10%): the ⋯ menu and library notices.
- **Thought** (drop-shadow `0 4px 8px` at 2%): thought cards keep only the faintest separation from the prose.

### Named Rules
**The Soft Lift Rule.** Shadows are long, blurred and tinted from the theme's shadow colour. Hard offset or solid-colour shadows are not part of this world.

**The Hairline First Rule.** Lists, rows, fields and stat grids are separated by a 1px hairline, not a shadow. Lift is reserved for what floats: dock, drawer, dialog, menu, library pages.

## Shapes

Gentle, nested rounding that grows with the size of the surface: 2px for diff and highlight marks, 4px for tooltips, 6px for library pages (sheets of paper, almost square), 8px for buttons, fields and menus, 10px for dock buttons and landing CTAs, 12px for list rows, stat grids, the search field and dialogs, 16px for the dock and 18px for drawers. Pills (fully round) are kept for the collapsed dock launcher, status dots, count badges and the grab bar (36×4px). All borders are 1px. Empty states use a dashed hairline.

## Components

### Buttons
Small and quiet; most buttons are ghosts until touched.
- **Shape:** gently rounded (8px); every button is at least 44×44px with 8px 12px padding and 12px Inter.
- **Primary:** teal fill, on-accent text; hover moves to Lit Teal. Used for one main action per drawer or dialog (New thought, Save named draft, Finish revision, New document).
- **Ghost (default):** transparent, Stone text, transparent border. Hover shows ink text, a 6% teal wash and a 65% hairline border. Active shows Teal Mist with teal text. Disabled is 45% opacity with a not-allowed cursor.
- **Danger:** Brick fill; hover mixes 12% ink into it. Destructive menu items are Brick text only.
- **Landing CTA:** 48px tall, 10px radius, 15px Inter 500; it moves down 1px when pressed. The quiet companion link underlines on hover.
- **Transitions:** background, border, shadow and colour over 140ms.

### Inputs / Fields
- **Style:** surface fill, 65% hairline border, 8px radius, 12px padding, 13px Inter, at least 44px tall; carets are teal.
- **Hover:** the border mixes 20% teal into the hairline.
- **Focus:** the border turns to the focus mix (55% teal) with a 2px soft teal ring (12%). Outlines are suppressed in favour of this ring everywhere, including buttons, `tabindex` elements and the editor.
- **Search (library):** 48px tall, 12px radius, 15px text, with a leading icon.

### Navigation
- **Editor header:** 56px tall, on paper; 36px-tall compact buttons (back, title, Commands); the title renames inline.
- **Library sidebar:** stacked list items with Teal Mist for the active filter; becomes a bordered segmented row on narrow screens.

### The Dock (signature)
A floating 16px-radius surface with a hairline border and the dock shadow. Its buttons are 44px tall, 10px radius, 12.5px Inter 500 in Stone, with a 17px line icon and an optional count in 11px tabular figures. Hover shows ink text on a 6% ink wash. Pressed shows Teal Mist with teal text. Dividers are 1×20px hairlines. At ≤720px the buttons become 44×44 icons and the count moves into a small badge at the top corner. During a revision, a Teal Mist strip sits on top: an 8px teal dot, **Revising** · goal (the goal hides under 480px), a ghost Save draft and a primary Finish revision, both 36px tall. The dock can collapse into a 40px pill launcher.

### Drawers (signature)
Non-modal panels that rise from the dock: surface, 18px radius, hairline border, drawer shadow. The header has a 15px/600 title, optional actions and a close button, and the body scrolls on its own. Opening animates over 200ms ease-out: opacity, a 12px rise, and a clip-path that grows from the bottom 60%. Focus moves inside on open and returns to the opener on close. Escape or a click on the scrim closes the drawer. On phones it docks to the bottom edge with square bottom corners and a grab bar. Rows inside are 12px-radius bordered surfaces. Stats use a two-by-two hairline grid with 28px serif numerals.

### Cards / Containers
- **Library page:** a 248px sheet of paper (6px radius, surface, hairline) showing a 19px serif title and a 12.5px serif excerpt at 70% ink, with date and word count below in Inter. Hover lifts it 2px, deepens the shadow and tints the border.
- **Dialog:** 480px, 12px radius, 24px padding, 160ms fade; focus is trapped and restored on close.
- **Menu:** 144px, 8px radius, 4px padding; full-width ink items, Brick for destructive, a hairline separator before the last group.
- **Tooltip:** inverted (ink fill, paper text), 4px radius, 11px, 8px 12px padding, 8–10px from the trigger.

### Thought Cards (signature)
The writer's own coloured notes, placed anywhere on the page and optionally connected to a phrase (shown with a Highlighter mark). The text is 15px/1.5 serif on the stored pastel with ink text, and the card has only the faint thought shadow. Small circular surface handles (collapse, edit) appear on hover, focus or selection. A 12px anchor ring starts a connection. Bodies are keyboard-focusable and can be dragged or moved with the arrow keys. The Thoughts drawer lists every card with a small swatch, so cards can still be edited when hidden or on small screens.

### Diff
Comparison prose is 18px/1.7 serif in two columns with a 24px Inter gutter. Removed text is Brick, struck through, on a 12% Brick wash. Added text is Garden, underlined at a 4px offset, on a 14% Garden wash. Changed rows get a − or + gutter mark, so a difference never depends on colour.

## Do's and Don'ts

### Do:
- **Do** keep every editor tool in the dock and open it as a drawer that rises from the dock (200ms ease-out, Escape to close, focus returned).
- **Do** keep the paper centred at the editor width (680px standard) with nothing but thought cards beside it.
- **Do** set writing in Source Serif 4 and every control in Inter (The Serif Writes, Sans Operates Rule).
- **Do** use the ring focus treatment: focus-mix border plus a 2px 12% teal ring, outline suppressed.
- **Do** keep targets at 44px minimum and honour `prefers-reduced-motion` by removing all animation and transition.
- **Do** mark diffs with strike-through, underline and −/+ gutter marks as well as colour.
- **Do** mix tones from the shared variables with `color-mix` so dark mode keeps working unchanged.

### Don't:
- **Don't** add a left document rail, a right side panel or a floating tool pill to the editor; the dock replaces all three.
- **Don't** use teal for decoration, headings or empty states (The Teal Means Act Rule).
- **Don't** use pastels for controls, statuses or navigation (The Pastel Belongs to Thought Rule).
- **Don't** add uppercase tracked labels or eyebrows above headings.
- **Don't** use hard offset or solid-colour shadows; lift is soft and tinted (The Soft Lift Rule).
- **Don't** hard-code theme colours in app components; redefine tokens, not components (The Token Theme Rule).
