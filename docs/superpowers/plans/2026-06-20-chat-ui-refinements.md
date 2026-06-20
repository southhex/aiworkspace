# Chat UI Refinements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Five client-side refinements to the Niphates chat surface: full-width boxed
operator messages, a sidebar-pinned archived list, a home/landing view, Escape-to-home,
and sidebar "summoning"/"unseen reply" indicators.

**Architecture:** Pure React/Tailwind changes across three files (`components/MessageList.tsx`,
`components/Sidebar.tsx`, `app/page.tsx`). No API, connector, schema, or persistence-format
changes. The global `streaming` boolean in `app/page.tsx` becomes `streamingId: string | null`
so a reply can be tracked while its chat is out of focus; an ephemeral in-memory `unread`
`Set<string>` tracks chats whose finished reply the user hasn't viewed.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Tailwind. Existing design
tokens in `app/globals.css` (`status-dot`, `status-dot-gold`, `glow-pulse`, `bg-panel`,
`border-hair`, etc.).

**Verification model:** This repo's tests (`tests/`, vitest) cover only pure logic in
server-adjacent modules; there is no component-test harness, and we are not adding one.
Each task is verified by `npm run build` (typecheck + production build), `npm run test`
(existing suite must stay green), and dev-preview observation (`npm run dev`).

---

## Pre-flight: branch

- [ ] **Step 0: Create a feature branch** (we are on `main`)

Run:
```bash
git checkout -b chat-ui-refinements
```

---

## Task 1: Full-width boxed operator messages, borderless agent

**Files:**
- Modify: `components/MessageList.tsx:49-101`

The shared column wrapper (`<div className="mx-auto flex w-full max-w-[760px] flex-col gap-7 px-6 py-[34px] pb-10">`) and the empty-state hero (lines 23-47) are unchanged. Only the per-message render changes: operator becomes a full-width box; agent loses its left edge border and alignment wrapper.

- [ ] **Step 1: Replace the operator and agent message JSX**

Replace the block from `return (` on line 49 through the closing `);` on line 100 (the `return (...)` that renders the list) with:

```tsx
  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-col gap-7 px-6 py-[34px] pb-10">
      {visible.map((m, i) => {
        const isUser = m.role === "user";
        const isLast = i === visible.length - 1;
        const waiting = !isUser && !m.content && streaming && isLast;

        if (isUser) {
          return (
            <div key={i} className="border border-hair bg-panel px-4 py-3">
              <div className="mb-1 font-mono text-[10.5px] uppercase tracking-[0.28em] text-gold">
                OPERATOR
              </div>
              <div className="whitespace-pre-wrap break-words font-mono text-[14px] text-parchdk">
                {m.content}
              </div>
            </div>
          );
        }

        return (
          <div key={i}>
            <div className="mb-1 font-mono text-[10.5px] uppercase tracking-[0.28em] text-porphlbl">
              NIPHATES
            </div>
            {waiting ? (
              <div className="flex items-center gap-3">
                <span
                  className="status-dot status-dot-gold glow-pulse"
                  aria-hidden="true"
                />
                <span className="font-read italic text-[16px] text-parch">
                  summoning…
                </span>
              </div>
            ) : (
              <div className="msg-content font-read text-[18px] leading-[1.62] text-agentbody">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {m.content}
                </ReactMarkdown>
              </div>
            )}
          </div>
        );
      })}
      <div ref={endRef} />
    </div>
  );
```

- [ ] **Step 2: Typecheck + build**

Run: `npm run build`
Expected: build succeeds, no TypeScript errors.

- [ ] **Step 3: Verify in preview**

Run `npm run dev`, open `http://localhost:3000`, send a message.
Expected: your message is a full-width box (`bg-panel` fill, single hairline border, square corners), gold `OPERATOR` caption; the reply is borderless prose with the `NIPHATES` caption; neither has a coloured left/right edge bar.

- [ ] **Step 4: Commit**

```bash
git add components/MessageList.tsx
git commit -m "$(cat <<'EOF'
feat(chat): full-width boxed operator messages, borderless agent

Operator turns render as a full-width bg-panel box; remove the gold
right border and porphyry left border from both roles.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Pin the archived list to the bottom of the sidebar

**Files:**
- Modify: `components/Sidebar.tsx:83-125`

Move the archived `<details>` out of the scrolling `<nav>` so it sits in a static slot directly above the footer. ChatRow props are unchanged in this task.

- [ ] **Step 1: Replace the `<nav>` block (lines 83-125)**

Replace the entire `<nav ...> ... </nav>` element (lines 83-125) with the following — a `<nav>` containing only the active list, followed by a sibling archived block:

```tsx
        {/* Conversation list (active) */}
        <nav className="mt-2 flex-1 overflow-y-auto px-2 pb-2">
          {active.length === 0 && archived.length === 0 && (
            <p className="px-2 py-4 font-mono text-[11px] text-mutedlo">
              No dialogues yet.
            </p>
          )}

          {active.map((c) => (
            <ChatRow
              key={c.id}
              c={c}
              activeId={activeId}
              onSelect={onSelect}
              onArchive={onArchive}
              onUnarchive={onUnarchive}
              onDelete={onDelete}
            />
          ))}
        </nav>

        {/* Archived — pinned above the footer */}
        {archived.length > 0 && (
          <details className="group/arch border-t border-hair">
            <summary className="cursor-pointer list-none px-3 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted hover:text-parch">
              <span className="inline-block transition group-open/arch:rotate-90">
                ▸
              </span>{" "}
              ARCHIVED · {archived.length}
            </summary>
            <div className="max-h-48 overflow-y-auto px-2 pb-2">
              {archived.map((c) => (
                <ChatRow
                  key={c.id}
                  c={c}
                  activeId={activeId}
                  onSelect={onSelect}
                  onArchive={onArchive}
                  onUnarchive={onUnarchive}
                  onDelete={onDelete}
                />
              ))}
            </div>
          </details>
        )}
```

- [ ] **Step 2: Typecheck + build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Verify in preview**

Archive a chat (row `⋯` → ARCHIVE). Expected: the `ARCHIVED · N` toggle sits at the bottom of the sidebar, directly above the Control/Settings/theme footer. Expanding it scrolls within a capped area and never pushes the footer off-screen. The active list above scrolls independently.

- [ ] **Step 4: Commit**

```bash
git add components/Sidebar.tsx
git commit -m "$(cat <<'EOF'
feat(sidebar): pin archived list to the bottom above the footer

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Open to a home/landing view

**Files:**
- Modify: `app/page.tsx:32-36`

`MessageList` already renders the hero when `messages` is empty. With no chat auto-selected, `active` is null and `active?.messages || []` is empty, so the home view is the existing hero. The only change is to stop auto-selecting on load.

- [ ] **Step 1: Remove the auto-select on initial load**

In the `loadConversations().then(...)` callback (lines 32-36), delete the line that selects the first conversation. The block becomes:

```tsx
    loadConversations().then((convos) => {
      if (cancelled) return;
      setConversations(convos);
    });
```

(Remove `if (convos[0]) setActiveId(convos[0].id);`.)

- [ ] **Step 2: Typecheck + build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Verify in preview**

Reload `http://localhost:3000` with existing conversations present.
Expected: the app opens to the NIPHATES hero (no chat selected), header chips and composer visible. Typing a message and pressing Send creates a new chat and transitions into it. Clicking a sidebar chat opens it.

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "$(cat <<'EOF'
feat(chat): open to a home/landing view instead of a conversation

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Escape returns to the home view

**Files:**
- Modify: `app/page.tsx` (add an effect near the existing effects, ~after line 56)

- [ ] **Step 1: Add a global Escape keydown effect**

Add this effect immediately after the initial-load `useEffect` (after its closing `}, []);` around line 56):

```tsx
  // Escape returns to the home view (and closes the mobile sidebar first if open).
  // Does not abort an in-flight stream — it keeps summoning in the background.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (sidebarOpen) {
        setSidebarOpen(false);
        return;
      }
      setActiveId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sidebarOpen]);
```

- [ ] **Step 2: Typecheck + build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Verify in preview**

Open a chat, press Escape. Expected: returns to the home hero; the chat remains in the sidebar. On a narrow viewport, open the mobile sidebar and press Escape — it closes the sidebar first, a second Escape returns home. A half-typed composer message survives the transition.

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "$(cat <<'EOF'
feat(chat): Escape returns from an open chat to the home view

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Sidebar "summoning" and "unseen reply" indicators

**Files:**
- Modify: `app/page.tsx` (state, handlers, Composer + Sidebar wiring)
- Modify: `components/Sidebar.tsx` (Sidebar + ChatRow props and indicator render)

This task spans both files because the indicators must change together to compile and to deliver the feature. `streaming: boolean` becomes `streamingId: string | null`; an ephemeral `unread: Set<string>` tracks finished-but-unviewed replies.

### Part A — `app/page.tsx`

- [ ] **Step 1: Replace the `streaming` state with `streamingId` + `unread`, and add an activeId ref**

Replace line 24 (`const [streaming, setStreaming] = useState(false);`) with:

```tsx
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [unread, setUnread] = useState<Set<string>>(() => new Set());
  const streaming = streamingId !== null;
  const activeIdRef = useRef<string | null>(activeId);
```

Then keep `activeIdRef` in sync. Add this effect right after the line where `active` is derived (after line 61, the `useMemo` for `active`):

```tsx
  // Mirror activeId into a ref so stream-completion callbacks read the latest value.
  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);
```

- [ ] **Step 2: Mark/clear unread on select; set streamingId in handleSend/handleStop**

In the `<Sidebar ... onSelect={...}>` prop (around lines 229-232), replace the `onSelect` handler with one that also clears the unread flag:

```tsx
        onSelect={(id) => {
          setActiveId(id);
          setSidebarOpen(false);
          setUnread((prev) => {
            if (!prev.has(id)) return prev;
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        }}
```

In `handleSend`, replace `setStreaming(true);` (line 162) with:

```tsx
    setStreamingId(id);
```

In `handleSend`, replace the completion block `setStreaming(false);` (line 209) with:

```tsx
    setStreamingId(null);
    // If the reply landed in a chat the user isn't currently viewing, flag it unseen.
    if (activeIdRef.current !== id) {
      setUnread((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
    }
```

In `handleStop`, replace `setStreaming(false);` (line 218) with:

```tsx
    setStreamingId(null);
```

- [ ] **Step 3: Wire the Composer to one-stream-at-a-time semantics**

Replace the `<Composer .../>` element (lines 307-312) with:

```tsx
        <Composer
          disabled={noProviders || (streaming && active?.id !== streamingId)}
          streaming={streaming && active?.id === streamingId}
          onSend={handleSend}
          onStop={handleStop}
        />
```

- [ ] **Step 4: Pass the active-stream flag to MessageList, and pass indicators to Sidebar**

Replace the `<MessageList .../>` element (lines 299-302) with:

```tsx
            <MessageList
              messages={active?.messages || []}
              streaming={streaming && active?.id === streamingId}
            />
```

Add `streamingId` and `unread` props to the `<Sidebar ...>` element. Insert them just after `activeId={activeId}` (line 227):

```tsx
        streamingId={streamingId}
        unread={unread}
```

### Part B — `components/Sidebar.tsx`

- [ ] **Step 5: Accept the new props on Sidebar and forward them to ChatRow**

In the `Sidebar` function signature, add the two props. Change the destructured params (lines 8-17) to include them and add their types (lines 18-27). Specifically add `streamingId,` and `unread,` to the destructure, and to the type object:

```tsx
  streamingId,
  unread,
```
```tsx
  streamingId: string | null;
  unread: Set<string>;
```

Then add `streamingId={streamingId}` and `unread={unread}` to **both** `<ChatRow .../>` usages — the active-list map and the archived map.

- [ ] **Step 6: Accept the new props on ChatRow and render the indicator**

In the `ChatRow` function signature (lines 171-185), add the props to the destructure and type:

```tsx
  streamingId,
  unread,
```
```tsx
  streamingId: string | null;
  unread: Set<string>;
```

Inside `ChatRow`, after `const isActive = c.id === activeId;` (line 188), add:

```tsx
  const summoning = c.id === streamingId;
  const unseen = unread.has(c.id);
  const showIndicator = summoning || unseen;
```

Replace the `⋯` options button (lines 231-241) with a right-side slot holding the indicator dot (visible at rest, fades on hover) and the `⋯` button (appears on hover):

```tsx
      <span className="relative ml-auto flex h-5 w-5 shrink-0 items-center justify-center">
        {showIndicator && (
          <span
            className={`status-dot status-dot-gold transition-opacity group-hover:opacity-0 ${
              summoning ? "glow-pulse" : ""
            }`}
            title={summoning ? "summoning" : "unseen reply"}
          />
        )}
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className={`absolute inset-0 flex items-center justify-center text-muted transition hover:text-marble ${
            menuOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
          aria-label="Conversation options"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
        >
          ⋯
        </button>
      </span>
```

(The `flex-1` title button on lines 224-230 and the dropdown menu on lines 243-279 are unchanged.)

- [ ] **Step 7: Typecheck + build**

Run: `npm run build`
Expected: build succeeds, no TypeScript errors (in particular, `streamingId`/`unread` are threaded through Sidebar → both ChatRow call sites).

- [ ] **Step 8: Run the existing test suite**

Run: `npm run test`
Expected: all existing tests pass (unchanged — this task adds no pure-logic modules).

- [ ] **Step 9: Verify in preview**

1. Send a message in chat A, then press Escape to go home (or open chat B) before the reply finishes.
   Expected: chat A's sidebar row shows a **pulsing gold dot** while it streams.
2. When A's reply completes while you're away: the dot becomes a **steady gold dot** (unseen).
3. Open chat A: the steady dot clears.
4. While a stream is running and you're not viewing it, the composer is disabled; on the streaming chat it shows STOP.
5. Hovering a row replaces the dot with the `⋯` options button.

- [ ] **Step 10: Commit**

```bash
git add app/page.tsx components/Sidebar.tsx
git commit -m "$(cat <<'EOF'
feat(sidebar): summoning + unseen-reply indicators on chat rows

Track the streaming chat by id (streamingId) so a reply keeps summoning
while out of focus; an ephemeral unread Set flags chats whose finished
reply the user hasn't viewed. One concurrent stream is preserved.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Final verification

- [ ] **Step 1: Full build + tests**

Run:
```bash
npm run build && npm run test
```
Expected: build succeeds; all tests pass.

- [ ] **Step 2: End-to-end preview pass**

Walk the spec's verification checklist in one session: home hero on load → send (boxed operator / borderless agent) → Escape to home mid-stream → pulsing then steady sidebar dot → open chat clears it → archive a chat and confirm the archived block sits pinned above the footer.

---

## Self-review notes

- **Spec coverage:** #1 → Task 1; #2 → Task 2; #3 → Task 3; #4 → Task 4; #5 → Task 5. All five requirements map to a task.
- **Type consistency:** `streamingId: string | null` and `unread: Set<string>` are defined identically in `app/page.tsx` (state), passed to `Sidebar` (Step 4/5), and consumed in `ChatRow` (Step 6). The derived `streaming` boolean keeps existing call sites (`noProviders` region, Composer/MessageList) valid.
- **No placeholders:** every code step shows complete JSX/TS. Verification uses `npm run build` / `npm run test` / preview because the repo has no component-test harness (documented in the header).
