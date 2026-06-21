# Design: Chambers Navigation & Composer Redesign

**Date:** 2026-06-21
**Source handoff:** `design_handoff_niphates/` (README + `prototypes/Niphates.dc.html`, screenshots 1–6)
**Status:** Approved (design); pending spec review → implementation plan.

## Summary

Niphates' first handoff reskinned the app into the Niphates visual identity (assumed
merged). This second handoff is a **layout / information-architecture** change on top of
that skin plus a ground-up **composer** redesign. It introduces a **"Chambers"**
navigation model: the app becomes a persistent workspace shell whose main pane swaps
between five chambers. The standalone `/hermes` Control page folds into a chamber, the
theme toggle moves into Settings, and the composer is rebuilt in a claude.ai-style
stacked layout.

**Scope guard:** presentation + client-side view state only. Do **not** touch `lib/`,
`app/api/`, connectors, stores, streaming, or the Hermes management API. No data-flow
changes. The conversation model, providers, and persistence are unchanged — they are
re-parented under the Dialogue chamber.

**Fidelity:** high. Colors, type, spacing, and interactions in the handoff are final and
exact; the screenshots are the visual source of truth. Recreate with the codebase's
existing tokens/utilities (CSS variables in `app/globals.css`) — do **not** ship the
prototype HTML.

## Decisions (resolved with user)

1. **Delivery:** one comprehensive plan covering all changes (not phased).
2. **Sidebar collapse vs. mobile drawer:** unify on a single `sidebarOpen` boolean.
   Desktop = persistent column the collapse button hides (main reflows full-width);
   mobile = the existing overlay drawer. Default `true`, with a mount effect setting it
   `false` when `(max-width: 767px)` matches, so desktop opens expanded and mobile opens
   closed without a hydration flash.
3. **Routing:** keep `/settings` as a full-screen route opened only by the top-bar gear
   (matches screenshots 4/5). Move the Hermes Control body into an in-pane `CommandView`
   for the Command chamber; redirect the old `/hermes` route to `/` so bookmarks don't
   404 (do not delete the route).
4. **Icons:** add `lucide-react` (handoff recommendation; user confirmed — future icon
   needs + preference for the Lucide family). Icons used now: `Plus`, `Mic`, `Square`,
   `PanelLeft`, `PanelLeftClose`. Render at `currentColor`, ~15px stroke in 30–34px hit
   targets.

## Notes from comparing handoff to current code

- The handoff references `.nxfield` / `--glow-focus`; the actual class in
  `app/globals.css` is **`.term-field`** (1px `--hairlit`, `--void` bg, gold glow on
  `:focus` / `:focus-within`). Reuse `.term-field` for the composer box.
- `lucide-react` is not yet a dependency — adding it is the only new dependency.
- Existing reusable pieces to keep using: `components/Select.tsx` (portal dropdown) for
  the provider + in-composer model selectors; `.status-dot*`, `.btn-gold`,
  `.btn-ghost-gold`, `.glow-pulse` utilities.

## Architecture

### View state (lifted into `app/page.tsx`)

```
activeChamber: 'dialogue' | 'studio' | 'library' | 'council' | 'command'   // default 'dialogue'
sidebarOpen:   boolean                                                      // default true; mount effect → false on mobile
```

Existing state is unchanged: `conversations`, `activeId`, `providers`, `providerId`,
`model`, `streamingId`, `unread`, etc. The Settings view stays a route, so no
`inSettings` state is needed — the gear `Link`s to `/settings`.

Chambers are **in-app views, not routes** — selecting one swaps the main pane and the
sidebar body; it does not navigate.

### Component map

| Component | Change |
|-----------|--------|
| `app/page.tsx` | Persistent shell: `activeChamber` + `sidebarOpen` state; transparent/borderless top bar (provider chip + gear right, reveal button left); main-pane switch by chamber. |
| `components/Sidebar.tsx` | Chamber nav block; Dialogue-scoped list; subsection placeholder; brand collapse button; spacing cleanup; theme toggle + footer links removed. |
| `components/Composer.tsx` | Stacked two-row box; SEND removed; borderless toolbar buttons; in-composer model selector; attach (`+`) + mic; filled `Square` stop while streaming. |
| `components/MessageList.tsx` | Type scaling + 64px user-bubble inset + tightened column. |
| `components/ChamberPlaceholder.tsx` | **New.** Centered empty state for Studio/Library/Council. |
| `components/CommandView.tsx` | **New.** Hermes Control body (Connection/Model/System), in-pane, heading "⚡ Command". |
| `app/settings/page.tsx` | Add Appearance section (theme toggle) above Providers; RETURN → `/`. |
| `app/hermes/page.tsx` | Becomes a redirect to `/`. |
| `app/globals.css` | No token changes; remove any now-dead sidebar-footer / header-border styles if present. |
| `package.json` | Add `lucide-react`. |

## Detailed behavior & styling

### A. Top bar (`app/page.tsx`)
- Transparent, **no** bottom border, **no** background (currently `border-b border-hair
  bg-paneldk`). Keep the safe-area top/left/right insets.
- **Left:** sidebar **reveal** button (`PanelLeft`) — visible only when `!sidebarOpen`.
  Replaces the mobile hamburger entirely.
- **Right group:** provider chip (the `status-dot-malach` + provider `Select`, moved from
  the left) then a **gear** button linking to `/settings`.
- **Model selector removed** from the top bar (relocates into the composer).

### B. Sidebar (`components/Sidebar.tsx`)
New/changed props: `activeChamber`, `onSelectChamber(chamber)`, `sidebarOpen`,
`onCollapse()`. The drawer's `open`/`onClose` semantics fold into `sidebarOpen` (open on
mobile = overlay shown; `onClose` = collapse). Desktop respects `sidebarOpen` for the
column (no longer force-visible via `md:translate-x-0`).

- **Brand row:** padding `13px 16px`; remove the `border-b` divider beneath it. Replace
  the "IV" badge with a **collapse** icon button (`PanelLeftClose`) → `onCollapse()`.
- **Chamber nav** (new block under brand, above New Dialogue):
  - Block padding `4px 9px 9px`; bottom-separated from the Dialogue subsection by one
    `--hair` `border-bottom`.
  - Row: `flex; justify-content:space-between; align-items:center; padding:8px 11px;`
    borderless, transparent.
  - Name: `font-mono`, `11.5px`, `letter-spacing:.2em`, uppercase; color active
    `--marble`, else `--muted`.
  - Numeral (I–V): `font-cinzel`, `14px`, `letter-spacing:.05em`; color active `--gold`
    (+ `text-shadow:0 0 10px rgba(201,162,75,.55)`), else `--mutedlo`.
  - No background fill, no left border on the active row.
- **Dialogue-scoped body:** when `activeChamber === 'dialogue'`, render New Dialogue +
  conversation list + Archived (as today). Otherwise render a subsection placeholder:
  - `<NAME> · SUBSECTIONS` — mono, `9.5px`, `letter-spacing:.24em`, `--mutedlo`.
  - `Not yet built.` — Spectral italic, `13px`, `--muted`.
- **Archived** row: padding `8px 13px 20px` (lifts off the viewport bottom).
- **Removed:** theme toggle, and the footer Control + Settings `Link`s (Command is a
  chamber; Settings is the gear). The theme logic (`localStorage['niphates-theme']` +
  `data-theme`) moves to Settings → Appearance.

### C. Composer (`components/Composer.tsx`)
New props: `providers`, `model`, `onModelChange` (for the in-box selector), plus existing
`disabled`, `streaming`, `onSend`, `onStop`.

- Outer **box**: `.term-field` (1px `--hairlit`, `--void` bg, focus-within gold glow),
  padding `12px 14px`, `gap:11px` between rows, **max-width 720px centered**.
- **Row 1 (input):** `❯` glyph (`--gold`, 14px) + auto-grow `<textarea>` (mono 13.5px,
  `--marble`, transparent, min-height 42px, max-height 200px). Keep existing `onKeyDown`:
  Enter submits, Shift+Enter newline; keep auto-grow logic.
- **Row 2 (toolbar):** flex row, items 30×30px, all **borderless** (transparent bg, hover
  tint only):
  - **Left:** `Plus` attach button — `--parch`, hover → `--goldsoft` bg + `--gold` icon.
    No behavior yet (placeholder handler).
  - **Spacer** (`flex:1`).
  - **Right group:** model selector **chip** (`--panel` bg, no border, `[name ▾]` in
    `--gold`, **no** status dot) using `components/Select.tsx`; then `Mic` button (no
    behavior yet).
- **SEND button removed.** While streaming, a filled `Square` stop button appears at the
  far right (borderless; hover → `--carnelian`), replacing the old text STOP button.

### D. Messages (`components/MessageList.tsx`)
- Column: `max-width:720px` (was 760), `gap:20px` (was ~28), padding `26px 24px 32px`.
- Agent body: **16px** (was 18px), Spectral, line-height 1.62, `--agentbody`.
- User body: **14px**, mono, `--parchdk`.
- User bubble: keep 1px `--hair` + `--panel` bg + 14×16px padding, add
  `margin-left:64px`. Agent turns stay borderless, full-width.
- Labels (`OPERATOR` gold / `NIPHATES` porphyry-light): `margin-bottom:4px`, mono
  10.5px, letter-spacing .28em. Empty-state and "summoning…" waiting state unchanged.

### E. Command chamber (`components/CommandView.tsx`)
- Extract the body of `app/hermes/page.tsx` verbatim (Connection / Model / System
  sections + intro paragraph + the `:global(.hxinp)` styles) into `CommandView`, minus
  the `NIPHATES // CONTROL` + `← RETURN` command bar.
- Heading becomes **"⚡ Command"** (Cinzel, keep the ⚡ glyph). Same intro/sections.
- Rendered in the workspace main pane when `activeChamber === 'command'` (sidebar + top
  bar remain visible). All connection/model/stats logic and `hermesClient` calls move
  with it unchanged.

### F. Chamber placeholder (`components/ChamberPlaceholder.tsx`)
Centered empty state for Studio (II) / Library (III) / Council (IV), props `{ numeral,
title }`:
- Numeral: Cinzel 13px, `--gold`, letter-spacing .34em, `text-shadow:0 0 10px
  rgba(201,162,75,.5)`, margin-bottom 14px.
- Title: Cinzel 600, 40px, `--marble`, letter-spacing .1em.
- Gold hairline: `linear-gradient(90deg,transparent,var(--gold),transparent)`, 1px,
  max-width 240px.
- Line: Spectral italic 16px, `--parch` — "This chamber is not yet built."

### G. Settings (`app/settings/page.tsx`)
- Keep the `NIPHATES // SETTINGS` command bar; **RETURN → `/`** (back to the workspace /
  active chamber).
- Add an **Appearance** section **above** Providers, same header treatment as Providers
  (☾ glyph + Cinzel 32px title). Contains the OBSIDIAN/MARBLE segmented toggle:
  two equal buttons, 1px `--hair` border, active filled `--gold` with `--goldink` text,
  inactive transparent `--muted` text, max-width ~340px. Behavior unchanged:
  writes `localStorage['niphates-theme']`, sets `data-theme` on `<html>`. Read initial
  theme from `localStorage` on mount (as the sidebar did).

### H. Redirect (`app/hermes/page.tsx`)
Replace the page with a redirect to `/` (e.g. `redirect('/')` server component or a
client `useEffect` → `router.replace('/')`). The chat/control logic now lives in
`CommandView`.

## Parked (do NOT implement)
A full-screen background noise/grain texture was explored and pulled. Do not add any
noise overlay (handoff section C).

## Testing / verification

This is presentation + client view-state; the existing vitest suite covers pure logic
(`lib/sse.ts`, `lib/hermesAuth.ts`) and is unaffected. Verify by:
1. `npm run dev` and exercising the prototype flows against screenshots 1–6:
   chamber switching, sidebar collapse/reveal (desktop) + drawer (mobile), Command
   in-pane, placeholder chambers, composer submit/stop/auto-grow, model selector in
   composer, Settings Appearance toggle in both themes, `/hermes` → `/` redirect.
2. `npm run build` to confirm no type/route regressions and that the new dependency and
   `CommandView`/redirect compile.
3. Confirm no leftover references to the removed top-bar model selector, sidebar theme
   toggle, or footer links.

## Files
- **Edit:** `app/page.tsx`, `components/Sidebar.tsx`, `components/Composer.tsx`,
  `components/MessageList.tsx`, `app/settings/page.tsx`, `app/hermes/page.tsx`,
  `app/globals.css` (only if dead styles remain), `package.json`.
- **New:** `components/CommandView.tsx`, `components/ChamberPlaceholder.tsx`.
