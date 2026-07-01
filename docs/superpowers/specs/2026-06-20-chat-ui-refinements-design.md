# Chat UI Refinements — Design

**Date:** 2026-06-20
**Status:** Approved

## Overview

Five visual/behavioural refinements to the Niphates chat surface. All changes are
client-side (React components + page state); no API routes, connectors, or on-disk
schemas change. Work stays within the established design language (mostly-sharp
corners with selective rounding on a few elements, gold/porphyry palette, mono +
read fonts, hairline borders).

Files touched:

- `components/MessageList.tsx` — message layout (#1) and the home hero (#3)
- `components/Sidebar.tsx` — archived list pinning (#2) and row indicators (#5)
- `app/page.tsx` — landing/home routing (#3), Escape handling (#4), stream/unseen
  state (#5)

No new `lib/` modules, no schema changes, no new dependencies.

## Goals

1. Operator (user) messages render as a full-width boxed entry; remove the coloured
   edge border from both operator and agent messages.
2. The archived-chats list is pinned to the bottom of the sidebar, above the footer.
3. The app opens to a home/landing view instead of auto-selecting a conversation.
4. Escape returns from an open chat to the home view.
5. Sidebar chat rows show a "summoning" indicator while their reply is streaming
   (even out of focus) and an "unseen reply" indicator once a reply lands in a chat
   the user isn't currently viewing.

## Non-goals

- No concurrent streaming. Exactly one stream runs at a time (single
  `AbortController`), matching current behaviour.
- Unseen-reply state is **not** persisted to disk or synced across devices.
- No changes to providers, connectors, the Hermes control plane, or conversation
  persistence wire format.

---

## 1. Message layout — `components/MessageList.tsx`

**Operator (role `user`):** a full-width box spanning the existing `max-w-[760px]`
message column.

- Remove right-alignment (`flex justify-end`), the `max-w-[75%]` clamp, and the
  `border-r-2 border-gold pr-4` edge border.
- Container: `bg-panel border border-hair px-4 py-3` (square corners are already
  enforced globally).
- Keep the gold `OPERATOR` caption (mono, uppercase, tracking) at the top-left
  inside the box, then the mono body (`text-parchdk`), `whitespace-pre-wrap`.

**Agent (role `assistant`):** open, borderless prose at full column width.

- Remove `border-l-2 border-porphyry pl-4` and the `max-w-[75%]` clamp; drop the
  `flex justify-start` alignment wrapper.
- Keep the porphyry `NIPHATES` caption and the `read`-font body
  (`.msg-content`, markdown via `react-markdown`).
- The in-focus "summoning…" waiting state (gold `glow-pulse` dot + italic
  "summoning…") is unchanged.

The visual contrast is intentional: operator turns are discrete boxed entries; the
agent answers as flowing prose beneath.

## 2. Archived list pinned to bottom — `components/Sidebar.tsx`

- The active-chat list keeps `flex-1 overflow-y-auto` and scrolls.
- Move the archived `<details>` block **out** of the scrolling `nav` into a static
  slot directly above the footer, separated by a `border-t border-hair` divider.
- Collapsed by default. When expanded, the archived sublist gets a capped
  `max-height` with its own `overflow-y-auto`, so it never pushes the footer
  (Control / Settings / theme toggle) off-screen.
- The block renders only when `archived.length > 0` (unchanged condition).

## 3. Landing / home page — `app/page.tsx` + `components/MessageList.tsx`

- On initial load, **stop auto-selecting** `convos[0]`. Remove
  `if (convos[0]) setActiveId(convos[0].id);`. Start with `activeId = null`.
- When `activeId` is null (or there is no matching active conversation), render the
  home hero. Reuse the existing empty-state hero already in `MessageList`
  (the `❯ THE MIND IS ITS OWN PLACE` tagline, NIPHATES title, gold rule, italic
  invitation), shown full-height.
- The header (provider/model chips) and the composer remain visible on home, so the
  user can pick a model and start typing immediately.
- Sending from home creates a fresh conversation via the existing "no active convo"
  branch in `handleSend`, which already sets `activeId`, transitioning into the chat.
- The "no providers configured" state is unchanged and takes precedence over the
  hero.

Implementation note: `MessageList` already shows the hero when `messages` is empty.
On home, `active` is null, so passing `active?.messages || []` (already the case)
yields the hero. The only change in `page.tsx` is not auto-selecting on load.

## 4. Escape → home — `app/page.tsx`

- Add a global `keydown` listener (effect with cleanup) handling `Escape`:
  - If the mobile sidebar is open (`sidebarOpen`), close it first and stop.
  - Otherwise set `activeId = null` to return to the home view.
- Escape does **not** abort an in-flight stream. A reply that is summoning keeps
  streaming in the background and surfaces via the sidebar indicator (#5).
- The composer stays mounted across the home/chat transition, so any half-typed
  input is preserved.
- Row `⋯` menus already handle their own Escape-to-close locally; that listener is
  scoped to when a menu is open and is unaffected.

## 5. Sidebar status indicators — `app/page.tsx` + `Sidebar`/`ChatRow`

### State changes (`app/page.tsx`)

- Replace the global `streaming: boolean` with `streamingId: string | null`. The
  derived `streaming` value (for the composer) is `streamingId !== null`.
- The stream loop in `handleSend` already updates conversations by id via functional
  `setConversations`, so replies continue to arrive after the user navigates away —
  no change required there.
- Add ephemeral unseen state: `unread: Set<string>` (React state, in-memory only).
  - When a stream **completes** for a conversation whose id `!== activeId`, add that
    id to `unread`.
  - When a conversation is opened via `onSelect`, remove its id from `unread`.
- `handleSend` sets `streamingId = convo.id` at start and clears it
  (`streamingId = null`) on completion; `handleStop` aborts and clears `streamingId`.

### Indicators (`Sidebar` → `ChatRow`)

- `Sidebar` receives `streamingId` and `unread` and forwards the relevant flags to
  each `ChatRow`.
- In each row's right slot (currently the `⋯` button, shown on hover):
  - **Summoning:** if `c.id === streamingId`, show a pulsing gold dot
    (`status-dot status-dot-gold glow-pulse`), visible at rest even when the row is
    out of focus.
  - **Unseen reply:** else if `unread.has(c.id)`, show a steady gold dot
    (`status-dot status-dot-gold`, no pulse).
  - The `⋯` options button still takes over the slot on hover
    (`group-hover:opacity-100`); the indicator dot occupies the slot at rest.
- Accessibility: indicator dots get `aria-hidden` plus an adjacent visually-hidden
  label ("summoning" / "unseen reply") or an `aria-label`/`title` on the row.

### Composer behaviour

- One concurrent stream. While `streamingId` is set:
  - On the streaming chat (`activeId === streamingId`): composer shows STOP.
  - Elsewhere (home or a different chat): the composer's Send is disabled, as today.

### Resolved judgement calls

- **Unseen state is ephemeral** (in-memory `Set`, lost on reload). It is a
  "looked away" session signal; persisting it would widen the `Conversation` schema
  + zod for marginal gain. A mid-stream reload loses the stream anyway (no resume),
  so ephemeral is internally consistent.
- **Indicator colour is gold** for both states — pulse = summoning, steady = unseen.
  Gold reads as "attention here" and matches the agent/active accent.

---

## Testing & verification

- The project's vitest suite covers pure logic in server-adjacent modules
  (`lib/sse.ts`, `lib/hermesAuth.ts`). These changes introduce no new pure-logic
  modules, so no new unit tests are added; the existing suite must stay green
  (`npm run test`).
- Behavioural verification via the dev preview (`npm run dev`):
  1. App opens to the home hero (no chat auto-selected).
  2. Operator message renders as a full-width box; agent reply as borderless prose;
     neither has a coloured edge border.
  3. Archived block sits at the bottom above the footer; expanding it scrolls within
     a cap and never displaces the footer.
  4. Escape from an open chat returns to home; from home with the mobile sidebar
     open, Escape closes the sidebar first.
  5. Start a reply, Escape to home (or open another chat): the originating row shows
     a pulsing gold dot while streaming, then a steady gold dot once done; opening
     that chat clears the steady dot.

## Risks / edge cases

- **Escape vs. text entry:** Escape returns to home even with focus in the composer;
  composer text is preserved (component stays mounted). Acceptable and intentional.
- **Stream completes while viewing the chat:** id `=== activeId`, so it is not added
  to `unread` — correct (the user saw it).
- **Deleting/archiving a chat with a pending unread/summoning flag:** stale ids in
  the `unread` set are harmless (rows no longer render); `streamingId` is cleared on
  completion/stop regardless.
