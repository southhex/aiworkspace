# Handoff: Niphates — Chambers Navigation & Composer Redesign

## Overview

This is the **second** Niphates handoff. The first round reskinned the existing
**Hermes Chat** app (Next.js 15 / React 19 / TypeScript / Tailwind PWA) into the
Niphates visual identity — that work is assumed **already merged**. This round is
a **layout / information-architecture change** on top of that skin, plus a
ground-up redesign of the message composer.

It introduces a **"Chambers"** navigation model (the app is now a persistent
workspace shell whose main pane swaps between sections), folds the old
standalone `/hermes` Control page into a chamber, moves the theme toggle into
Settings, and rebuilds the composer in a claude.ai-style stacked layout.

**Scope:** presentation + client-side view state only. Do **not** touch `lib/`,
`app/api/`, the connectors, the stores, streaming, or the Hermes management API.
No data flow changes. The conversation model, providers, and persistence stay
exactly as they are — they just get re-parented under the Dialogue chamber.

## About the Design Files

The files in `prototypes/` are **design references written in HTML** (single-file
Design Components), not production code to copy verbatim. They encode the
intended look, spacing, copy, and interaction. **Recreate them in the existing
Next.js/React/Tailwind codebase using its established components and patterns** —
do not ship the HTML. Tailwind class names referenced below already exist in the
current app (they map to the CSS variables in `app/globals.css`).

- `prototypes/Niphates.dc.html` — the full interactive prototype (all chambers,
  settings, composer, sidebar collapse, theme switch). This is the source of truth.
- `prototypes/Niphates Visual Language.dc.html` — the type/color/component spec
  sheet from round one (unchanged; for reference).
- `screenshots/` — current-state renders (see list at the bottom).

## Fidelity

**High-fidelity.** Colors, typography, spacing, and interactions are final.
Recreate pixel-faithfully using the codebase's existing tokens/utilities. All
values below are exact.

---

# What changed (vs. the current codebase)

Everything below is a **delta** against the repo as it stands today. Each item
names the file(s) to edit.

## A. Structural changes

### A1. New "Chambers" navigation model  ·  `components/Sidebar.tsx`, `app/page.tsx`
The app becomes a **persistent shell**: the sidebar and the top bar stay mounted;
the **main pane swaps content by active chamber**. Five chambers, shown as a list
at the top of the sidebar (directly under the brand, **above** the New Dialogue
button):

| Chamber  | Numeral | Content |
|----------|---------|---------|
| Dialogue | I       | The current chat interface (messages + composer) |
| Studio   | II      | Placeholder — "not yet built" |
| Library  | III     | Placeholder — "not yet built" |
| Council  | IV      | Placeholder — "not yet built" |
| Command  | V       | The former `/hermes` Control panel, rendered in-pane |

Each row: chamber name (left, mono, uppercase) + Roman numeral (right, Cinzel).
**Active indicator is subtle and type-only** — the active row's title goes to
`--marble` and its numeral lights to `--gold` with a soft glow; all other rows
are dimmed (`--muted` title, `--mutedlo` numeral). **No background fill, no left
border** on the active row.

Recommended implementation: introduce a client state value
`activeChamber: 'dialogue' | 'studio' | 'library' | 'council' | 'command'`
(e.g. in `app/page.tsx` or a small context). Chambers are **in-app views, not
routes** — clicking a chamber swaps the main pane, it does not navigate.

### A2. Command (V) replaces the standalone Control page  ·  `app/hermes/page.tsx` → in-pane view
The old `/hermes` route rendered a **full-screen** page with its own command bar
(`NIPHATES // CONTROL` + `← RETURN`). That chrome is **removed**. Its body — the
**Connection**, **Model**, and **System** sections plus the intro paragraph — now
renders inside the workspace main pane (sidebar + top bar still visible) when the
**Command** chamber is active. Heading becomes **"Command"** (Cinzel, ⚡ glyph),
same intro/sections otherwise.
Move the markup out of `app/hermes/page.tsx` into a `CommandView` component
rendered by the workspace. The `/hermes` route can be retired or left as a
redirect into the workspace.

### A3. Chat list is Dialogue-scoped  ·  `components/Sidebar.tsx`
The **New Dialogue** button, the **conversation list**, and the **Archived** group
render **only when the Dialogue chamber is active**. For any other chamber the
sidebar shows a subsection placeholder instead:
```
<NAME> · SUBSECTIONS      (mono, 9.5px, letter-spacing .24em, --mutedlo)
Not yet built.            (Spectral italic, 13px, --muted)
```
This area is reserved for each chamber's future sub-navigation.

### A4. Settings moved behind a top-bar icon + gains Appearance  ·  `app/page.tsx`, `app/settings/page.tsx`
- Settings is **no longer a sidebar link**. It opens from a **gear icon** in the
  top-right of the top bar. (Keep `app/settings/page.tsx` as the settings view;
  it can stay a route reached by the gear, or become an in-app view — your call,
  but the gear is the only entry point now.)
- The settings page gets a new **Appearance** section **above Providers**,
  containing the theme toggle (see A5). Section header uses the same treatment as
  "Providers": a ☾ glyph + Cinzel 32px title.
- The settings command bar keeps `NIPHATES // SETTINGS` + `← RETURN`; RETURN now
  returns to the workspace (whatever chamber was active).

### A5. Theme toggle relocated  ·  `components/Sidebar.tsx` → `app/settings/page.tsx`
The ☾ OBSIDIAN / ☀ MARBLE segmented toggle is **removed from the sidebar footer**
and placed in Settings → Appearance. Behavior is unchanged (writes
`localStorage['niphates-theme']` and sets `data-theme` on `<html>`). Segmented
control: two equal buttons, 1px `--hair` border, active button filled `--gold`
with `--goldink` text, inactive transparent with `--muted` text; max-width ~340px.

### A6. Sidebar collapse  ·  `components/Sidebar.tsx`, `app/page.tsx`
- The brand row's **"IV" badge is replaced by a collapse-sidebar icon button**
  (a panel/rectangle-with-left-rail glyph — e.g. lucide `PanelLeftClose`).
  Clicking it hides the entire `<aside>`.
- When collapsed, a **reveal button** (same panel glyph, e.g. lucide `PanelLeft`)
  appears at the **top-left of the top bar**.
- New client state: `sidebarOpen: boolean` (default true). (This subsumes the
  existing mobile drawer `open` prop — unify them.)

### A7. Top bar reorganised  ·  `app/page.tsx`
- The **provider selector moves to the top-right** of the top bar; the **gear**
  (settings) sits to its right.
- The **model selector is removed from the top bar** — it now lives inside the
  composer (see B1).
- The header **loses its bottom border and background** (transparent, borderless).
- Mobile hamburger is replaced by the sidebar reveal button (A6) on the left.

## B. Visual changes

### B1. Composer redesign — claude.ai-style stacked box  ·  `components/Composer.tsx`
The composer changes from a single horizontal row (`❯ … [textarea] [SEND]`) to a
**single bordered box with two stacked rows**:

- **Row 1 (input):** `❯` prompt glyph (`--gold`, 14px) + auto-growing `<textarea>`
  (mono 13.5px, `--marble`, transparent, min-height 42px, max-height 200px).
- **Row 2 (toolbar):** a flex row, items 30×30px:
  - **Left:** `+` **attach** icon button (for attaching documents). Borderless,
    transparent, `--parch`, hover → `--goldsoft` bg + `--gold` icon. (lucide `Plus`)
  - **Spacer** (flex:1).
  - **Right group:** the **model selector** chip, then a **dictation/TTS** mic
    icon button. (lucide `Mic`)

Key rules:
- **The SEND button is removed.** Submit on **Enter**; **Shift+Enter** inserts a
  newline. (This logic already exists in `Composer.tsx`'s `onKeyDown` — just drop
  the button.)
- **Stop control:** while streaming, a small **square stop** icon button (lucide
  `Square`, filled) appears at the far right in place of nothing. Borderless,
  hover → `--carnelian`. (Replaces the old text "STOP" button.)
- **All composer buttons are borderless** (no 1px border) — transparent bg, hover
  tint only.
- The **model selector** keeps a **`--panel` background** (no border) and shows
  `[model name ▾]` in `--gold` — **no green status dot** (the dot the header
  version had is removed here).
- Outer box: 1px `--hairlit` border, `--void` bg, 12×14px padding, `gap:11px`
  between rows. Focus-within glows gold (existing `.nxfield` behavior /
  `--glow-focus`).

The container max-width matches the message column: **720px**, centered.

### B2. Message scaling & user-bubble inset  ·  `components/MessageList.tsx`
The message column is tightened:
- Column: `max-width:720px` (was 760), `gap:20px` (was ~28), padding `26px 24px 32px`.
- **Agent** body text: **16px** (was 18px), Spectral, line-height 1.62, `--agentbody`.
- **User** body text: **14px**, mono, `--parchdk`.
- **User message bubble is inset**: keep its 1px `--hair` border + `--panel`
  bg + 14×16px padding, and add **`margin-left: 64px`** so the operator turn is
  offset from the left rather than full-width. Agent turns remain borderless and
  full-width.
- Labels (`OPERATOR` gold / `NIPHATES` porphyry-light) sit tight above content
  (`margin-bottom:4px`), mono 10.5px, letter-spacing .28em.

### B3. Sidebar spacing cleanup  ·  `components/Sidebar.tsx`
- **Remove the divider** (border-bottom) between the brand row and the chamber
  list; tighten the brand row padding to `13px 16px` to recover vertical space.
- Chamber nav block: padding `4px 9px 9px`, rows `8px 11px`, separated from the
  Dialogue subsection below by a single `--hair` border-bottom.
- **Archived** row gets extra bottom padding (`padding: 8px 13px 20px`) so it
  lifts off the very bottom edge of the viewport.

## C. Parked (do NOT implement)
A full-screen **background noise/grain texture** was explored this round and
**pulled**. It is intentionally not in the current prototype. Do not add any
noise overlay — it's a future consideration.

---

# Reference

## Chambers — exact active/inactive styling
- Row: `display:flex; justify-content:space-between; align-items:center;
  padding:8px 11px;` borderless, transparent bg.
- Name: `font-family: var(--font-mono); font-size:11.5px; letter-spacing:.2em;
  text-transform:uppercase;` color = active `--marble`, else `--muted`.
- Numeral: `font-family: var(--font-cinzel); font-size:14px; letter-spacing:.05em;`
  color = active `--gold`, else `--mutedlo`; active also
  `text-shadow: 0 0 10px rgba(201,162,75,.55)`.

## Placeholder chamber main pane (Studio / Library / Council)
Centered empty state:
- Numeral: Cinzel 13px, `--gold`, letter-spacing .34em, `text-shadow:0 0 10px rgba(201,162,75,.5)`, margin-bottom 14px.
- Title: Cinzel 600, 40px, `--marble`, letter-spacing .1em.
- Gold hairline divider (`linear-gradient(90deg,transparent,var(--gold),transparent)`, 1px, max-width 240px).
- Line: Spectral italic 16px, `--parch` — copy: *"This chamber is not yet built."*

## Interactions & behavior
- **Chamber select:** sets `activeChamber`; lights that numeral; swaps main pane;
  swaps sidebar body (Dialogue list vs. subsection placeholder). Does not navigate.
- **Sidebar collapse:** brand icon hides `<aside>`; reveal icon in top bar restores it.
- **Settings:** gear opens settings; RETURN goes back to the active chamber.
- **Composer:** Enter submits, Shift+Enter newline; textarea auto-grows to 200px;
  Stop (square) shows only while streaming; attach (`+`) and mic are present but
  need no behavior yet (wire to real handlers when those features land).
- **Theme:** OBSIDIAN/MARBLE toggle in Settings → Appearance; persists to
  `localStorage['niphates-theme']`, applied via `data-theme` on `<html>`.

## State (new client-side view state)
- `activeChamber: 'dialogue' | 'studio' | 'library' | 'council' | 'command'` (default `'dialogue'`)
- `sidebarOpen: boolean` (default `true`; unify with the existing mobile drawer state)
- `inSettings` (or a `/settings` route reached only via the gear)
- Existing state is unchanged: `conversations`, `activeId`, `providerId`, `model`,
  `streamingId`, `theme`, etc.

## Design tokens (unchanged — already in `app/globals.css`)
Use the existing CSS variables / Tailwind tokens. Key ones referenced above:
- Surfaces: `--void #08070A`, `--ground #100E14`, `--paneldk #0C0A10`, `--panel #18151D`, `--panel2 #1F1B25`
- Lines: `--hair #2E2833`, `--hairlit #463C4E`
- Ink: `--marble #ECE6D8`, `--parch #B8B0A0`, `--parchdk #D6CFC0`, `--muted #847C70`, `--mutedlo #6F6760`, `--agentbody #E3DDD0`
- Accent: `--gold #C9A24B`, `--goldbri #E3C06A`, `--goldink #100E14`, `--goldsoft rgba(201,162,75,.10)`
- Gems: `--lapis #4F74E0`, `--malach #3A9D6E`, `--carnelian #C0504A`, `--porphyry #8A5BB0`, `--porphlbl #A87FD0`
- (Marble theme provides the same variables with inverted values — see `[data-theme="marble"]` in `globals.css`.)
- Fonts: Cinzel (display), IBM Plex Mono (UI/terminal), Spectral (reading/agent).
- Corners are **sharp** everywhere (existing global `border-radius:0` rule).

## Icons
The prototype draws inline SVGs; in the app use the existing icon set (lucide-react recommended):
- Attach → `Plus`
- Dictation/TTS → `Mic`
- Stop (while streaming) → `Square` (filled)
- Sidebar collapse / reveal → `PanelLeftClose` / `PanelLeft`
All render at currentColor, ~15px stroke icons in 30–34px hit targets.

## Files to edit
- `app/page.tsx` — workspace shell, `activeChamber` + `sidebarOpen` state, top bar (provider right + gear), main-pane chamber switch.
- `components/Sidebar.tsx` — chamber nav, Dialogue-scoped list, subsection placeholder, collapse icon, spacing cleanup, theme toggle removed.
- `components/Composer.tsx` — stacked redesign, remove SEND, borderless buttons, in-composer model selector, attach + mic, square stop.
- `components/MessageList.tsx` — type scaling + user-bubble 64px inset + tightened column.
- `app/settings/page.tsx` — Appearance section (theme toggle) above Providers; RETURN → workspace.
- `app/hermes/page.tsx` — move Connection/Model/System body into a `CommandView` rendered in-pane; retire the standalone page chrome.
- `app/globals.css` — no token changes expected; verify no leftover sidebar-footer / header-border styles.

## Screenshots (current prototype state)
- `1-dialogue-obsidian.png` — Dialogue chamber, obsidian theme (default landing)
- `2-command-obsidian.png` — Command chamber (former Control), in-pane
- `3-chamber-placeholder-obsidian.png` — Library chamber placeholder ("not yet built")
- `4-settings-obsidian.png` — Settings with new Appearance section above Providers
- `5-settings-marble.png` — Settings, marble theme
- `6-dialogue-marble.png` — Dialogue chamber, marble theme
