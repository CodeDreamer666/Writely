---
name: Writely
description: A quiet writing workspace, pinned to the nine-page product brief.
colors:
  light-bg: "#FAF8F5"
  light-surface: "#FFFFFF"
  light-text: "#1F1D1A"
  light-muted: "#6B665F"
  light-border: "#E7E2DA"
  dark-bg: "#181715"
  dark-surface: "#221F1C"
  dark-text: "#E8E4DD"
  dark-muted: "#9A948B"
  dark-border: "#33302B"
  accent: "#2F5D62"
  hover: "#3E7A80"
  tint: "#DCE9EA"
  danger: "#B3402A"
  success: "#3F7D4E"
  butter: "#FBEFB5"
  sage: "#DDEBDD"
  sky: "#D9E6F2"
  blush: "#F5DCD6"
  lilac: "#E6DFF0"
  slate: "#2B2926"
  slate-text: "#F4F1EC"
typography:
  title:
    fontFamily: "Source Serif 4, serif"
    fontSize: "40px"
    fontWeight: 400
    lineHeight: 1.25
    letterSpacing: "-0.035em"
  body:
    fontFamily: "Source Serif 4, serif"
    fontSize: "18px"
    lineHeight: 1.7
  thought:
    fontFamily: "Source Serif 4, serif"
    fontSize: "15px"
    lineHeight: 1.6
  control:
    fontFamily: "Inter, sans-serif"
    fontSize: "12px"
  field:
    fontFamily: "Inter, sans-serif"
    fontSize: "13px"
  thought-label:
    fontFamily: "Inter, sans-serif"
    fontSize: "9px"
    fontWeight: 600
    letterSpacing: "0.06em"
  keyboard:
    fontFamily: "ui-monospace, monospace"
    fontSize: "11px"
rounded:
  small: "4px"
  control: "8px"
  dialog: "12px"
spacing:
  four: "4px"
  eight: "8px"
  twelve: "12px"
  sixteen: "16px"
  twenty-four: "24px"
  thirty-two: "32px"
  forty-eight: "48px"
  sixty-four: "64px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.light-surface}"
    rounded: "{rounded.control}"
    padding: "8px 12px"
  button-primary-hover:
    backgroundColor: "{colors.hover}"
    textColor: "{colors.light-surface}"
  thought-butter:
    backgroundColor: "{colors.butter}"
    textColor: "{colors.light-text}"
    rounded: "{rounded.control}"
    padding: "12px"
    width: "224px"
---

# Design System: Writely

## Overview
The prose owns the screen. Warm paper, restrained teal actions and serif writing preserve the exact system pinned by all nine pages of `Downloads/Writely-Product-Brief.pdf`; this is documentation of the build, not a new visual direction. `PRODUCT.md` and `SURFACE.md` establish the authority; `src/style.css`, `src/responsive.css`, `src/main.jsx` and `src/model.js` supply implementation facts.

**Key Characteristics:** quiet controls, centred prose, independent coloured thoughts, explicit revision state.

## Colors
Primary teal serves actions, selection and goals; hover teal also supplies caret and focus treatment. Tint marks chosen controls, active light-theme navigation and the goal bar. Danger and success distinguish removal/addition and status.

Neutral tokens map directly to `--bg`, `--surface`, `--text`, `--muted` and `--border` in each theme. Dark mode overrides only those five tokens: accent, hover, tint, danger and success remain unchanged. Dark active navigation uses surface/text; dark diff text and contrast warnings use text. Selection always uses tint with light text.

Thought presets are PDF vector-fill extractions, not approximations: Butter, Sage, Sky, Blush and Lilac pair with light text; Slate pairs with slate-text. Presets do not change with theme. Custom card colours expose a 4.5:1 warning at full opacity; low opacity can still reduce readability.

## Typography
Self-hosted Inter (400/500/600) controls; Source Serif 4 (400/400 italic/600) prose and titles. Font licence copies live at `public/licenses/Inter-OFL.txt` and `public/licenses/Source-Serif-4-OFL.txt` and ship in `dist/licenses/` on build. Keyboard hints use system monospace. Title becomes (32px) at mobile; prose remains (18px/1.7), with (24px) paragraph gaps. Prose headings use (28px/600) and (22px); comparison headline uses (32px), then (28px) on mobile. Thought prose becomes (13px) at ≤1000px. Uppercase thought labels use the frontmatter tracking; working-draft metadata uses (0.08em). Final responsive overrides set desktop document links to (13px), metadata/status to (11px), and mobile metadata/status to (10px).

## Layout
Full-height shell (100dvh), independently scrolling workspace, centred writing column (max 680px; padding 64px 0 48px). Desktop rail (232px), top bar (64px), bottom bar (min 64px), utility panel (320px), formatting toolbar (48px), prose minimum height (320px). Dialog (480px), commands (560px), comparison (max 1100px; two equal columns, 32px gap). Common spacing is recorded above, extracted from literals rather than a pre-existing spacing-variable scale.

- ≥1400px: rail (248px).
- ≤1250px: rail (208px), panel (288px), paper width `calc(100% - 128px)`.
- ≤1000px: rail (192px), overlay panel (320px; top/bottom 64px; top 116px with goal), paper width `calc(100% - 96px)`; thoughts (192px, min body 96px).
- ≤760px: rail hidden unless opened as a fixed (288px) drawer; paper width `calc(100% - 48px)`, top padding (48px); panel full-width (top 164px with goal); diff columns stack with (24px) gaps. Floating thoughts hide; the Thoughts list/editor remains the mobile fallback. Toolbar stays visible; word count hides.

Prototype decision: thoughts use fixed **workspace positions**, not viewport-fixed or paragraph-attached positions. Stored x is a 0–1 horizontal fraction; y is workspace pixels. Placement/drag calculations retain a (224px) width basis even when rendered cards shrink. Pointer drag and arrow keys move on an (8px) grid. These decisions require user testing.

## Elevation & Depth
Most structure uses thin borders and tonal surfaces. Small thought/handle shadows separate overlays from prose; dialogs, toast and mobile drawer have structural lift. Exact shadow and overlay values live in the sidecar. No decorative imagery is part of this workspace.

## Shapes
Controls, fields and thought bodies have gently rounded (8px) corners; dialogs (12px); tooltip, checkbox and colour inputs (4px). Borders are (1px). Small status dots are circular (4px); selected thoughts add two square (8px) corner markers.

## Components
- **Buttons/fields:** minimum targets (44×44px for buttons; fields min-height 44px); ghost buttons use muted text, border/text on hover, tint/accent on active. Primary buttons use accent/white and hover/white; their active state inherits the general button rule. Disabled buttons use (0.45) opacity and not-allowed cursor. Fields use surface/text, border, (12px) padding.
- **Focus:** general keyboard outline (2px hover teal, 4px offset); prose editor `:focus-visible` overrides its outline reset (2px hover teal `!important`, 8px offset); command-search container `:focus-within` supplies an inset outline (2px hover teal, −4px offset). Selected card (1px, 4px offset), active preset (2px, 2px offset). Dialogs focus the first input/button, trap Tab and restore prior focus. Escape closes dialogs, clears card selection and exits comparison.
- **Thoughts:** click-through bodies (`pointer-events:none`); only handles accept pointer interaction. Handles reveal on hover/focus/selection, stay visible on touch, and offer move/edit. Labels, text, opacity, colours and deletion are edited in the panel. List selection reveals cards and scrolls toward their workspace y; “Bring into view” repositions the card. Hidden/zero-opacity thoughts remain in the list.
- **Revision:** one whole-document goal at a time. Starting preserves a baseline; saving a named draft does not finish the goal. Finish explicitly completes the check. Restore preserves current text first. Diff uses underlining/strike-through and +/− markers, not colour alone.
- **Motion:** state transitions (180ms ease-out), paragraph/focus chrome (200ms ease-out), dialog/toast entrance (200ms ease-out; opacity and translateY 8px→0). Reduced-motion CSS removes transitions/animations and CSS smooth scrolling. Card list navigation uses `src/scroll.js`: instant scrolling under `prefers-reduced-motion: reduce`, smooth otherwise. Tooltip delay (450ms); autosave debounce (350ms); notices (3500ms).
- **Focus mode:** rail disappears, thoughts hide, other paragraphs dim to (0.35), metadata to (0.5), chrome to (0.45) until hover/focus; mobile chrome stays fully visible. Commands: Ctrl/Cmd+K; named draft: Ctrl/Cmd+S; command search supports arrows and Enter.

## Do's and Don'ts
- **Do** preserve the PDF-pinned palette, font pairing and quiet hierarchy.
- **Do** keep thought editing available through the list on mobile and when bodies are hidden.
- **Do** retain non-colour diff cues and explicit save/finish/restore semantics.
- **Don't** attach thoughts to paragraphs or make their bodies intercept writing clicks without revisiting the prototype decision.
- **Don't** invent product capabilities or replace this writing workspace with a dashboard.
- **Don't** claim AA verification from target sizes or full-opacity card contrast alone.
