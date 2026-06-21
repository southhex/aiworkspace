# Chambers Navigation & Composer Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn Niphates into a persistent "Chambers" workspace shell — a sidebar chamber switcher (Dialogue/Studio/Library/Council/Command), an in-pane Command view replacing the standalone `/hermes` page, Settings behind a top-bar gear with a new Appearance section, and a claude.ai-style stacked composer.

**Architecture:** Presentation + client view-state only. A new `activeChamber` and unified `sidebarOpen` live in `app/page.tsx`; the main pane swaps components by chamber. No changes to `lib/` data/connector logic, `app/api/`, streaming, or stores — chat is simply re-parented under the Dialogue chamber. Source of truth: `design_handoff_niphates/` (README + `prototypes/Niphates.dc.html` + screenshots 1–6). Spec: `docs/superpowers/specs/2026-06-21-chambers-navigation-composer-redesign-design.md`.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Tailwind 3 (tokens → CSS vars in `app/globals.css`), `lucide-react` (new), existing `components/Select.tsx`.

**Verification model:** This codebase tests pure logic only (vitest in `tests/`); there is no React component-test harness, and the handoff scope is pure presentation — so per-task verification is `npx tsc --noEmit` (typecheck) plus a dev-server visual check against the relevant screenshot, with a full `npm run build` + `npm run test` at the end. We do **not** add a component-test framework (out of scope / against the codebase pattern).

**Known limitations (accepted):**
- Settings is a route (gear → `/settings`). RETURN navigates back to `/`, which remounts the workspace, so the active chamber resets to **Dialogue** rather than the exact chamber you left. Preserving it would require Settings as an in-app overlay (deferred by decision).
- `sidebarOpen` defaults `true` (clean desktop first paint); on mobile a mount effect closes it, causing a brief sidebar flash on first load. Acceptable.

---

## File Structure

| File | Responsibility | Action |
|------|----------------|--------|
| `components/chambers.ts` | Shared chamber list + `ChamberId` type | **Create** |
| `components/ChamberPlaceholder.tsx` | Centered "not yet built" empty state (Studio/Library/Council) | **Create** |
| `components/CommandView.tsx` | Hermes Control body (Connection/Model/System) rendered in-pane | **Create** |
| `app/page.tsx` | Workspace shell: state, transparent top bar, main-pane chamber switch | Modify |
| `components/Sidebar.tsx` | Chamber nav, Dialogue-scoped list, collapse, spacing; theme toggle removed | Modify |
| `components/Composer.tsx` | Stacked two-row box, in-composer model selector, attach/mic/stop | Modify |
| `components/MessageList.tsx` | Type scaling + 64px user-bubble inset | Modify |
| `app/settings/page.tsx` | Appearance section + relocated theme toggle | Modify |
| `app/hermes/page.tsx` | Redirect to `/` | Modify |
| `package.json` | Add `lucide-react` | Modify |

---

## Task 0: Branch + add lucide-react

**Files:** Modify `package.json` (+ lockfile)

- [ ] **Step 1: Create a feature branch**

Run:
```bash
git checkout -b feat/chambers-redesign
```

- [ ] **Step 2: Install lucide-react**

Run:
```bash
npm install lucide-react
```
Expected: `package.json` gains `"lucide-react"` under dependencies; `package-lock.json` updates; exit 0.

- [ ] **Step 3: Verify it resolves**

Run:
```bash
node -e "require.resolve('lucide-react'); console.log('ok')"
```
Expected: `ok`

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "build: add lucide-react for chamber/composer icons" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 1: Shared chambers module

**Files:** Create `components/chambers.ts`

- [ ] **Step 1: Create the module**

```ts
// components/chambers.ts
// Pure shared metadata for the Chambers navigation. No "server-only" — imported
// by client components (Sidebar, page, ChamberPlaceholder).

export type ChamberId = "dialogue" | "studio" | "library" | "council" | "command";

export interface ChamberDef {
  id: ChamberId;
  name: string; // uppercase display name
  numeral: string; // Roman numeral shown on the right of each row
}

export const CHAMBERS: ChamberDef[] = [
  { id: "dialogue", name: "DIALOGUE", numeral: "I" },
  { id: "studio", name: "STUDIO", numeral: "II" },
  { id: "library", name: "LIBRARY", numeral: "III" },
  { id: "council", name: "COUNCIL", numeral: "IV" },
  { id: "command", name: "COMMAND", numeral: "V" },
];
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS (no errors).

- [ ] **Step 3: Commit**

```bash
git add components/chambers.ts
git commit -m "feat(chambers): shared chamber list + ChamberId type" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: ChamberPlaceholder component

**Files:** Create `components/ChamberPlaceholder.tsx`

Renders the centered empty state for Studio/Library/Council (screenshot `3-chamber-placeholder-obsidian.png`).

- [ ] **Step 1: Create the component**

```tsx
// components/ChamberPlaceholder.tsx
import { CHAMBERS, type ChamberId } from "@/components/chambers";

export function ChamberPlaceholder({ chamber }: { chamber: ChamberId }) {
  const def = CHAMBERS.find((c) => c.id === chamber);
  if (!def) return null;

  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <div
        className="mb-[14px] font-display text-[13px] tracking-[0.34em] text-gold"
        style={{ textShadow: "0 0 10px rgba(201,162,75,0.5)" }}
      >
        {def.numeral}
      </div>
      <h2 className="font-display text-[40px] font-semibold tracking-[0.1em] text-marble">
        {def.name}
      </h2>
      <div
        className="my-5 h-px w-full max-w-[240px]"
        style={{
          background:
            "linear-gradient(90deg,transparent,var(--gold),transparent)",
        }}
      />
      <p className="font-read italic text-[16px] text-parch">
        This chamber is not yet built.
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/ChamberPlaceholder.tsx
git commit -m "feat(chambers): ChamberPlaceholder empty state for unbuilt chambers" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: CommandView component

**Files:** Create `components/CommandView.tsx`

This is the body of `app/hermes/page.tsx` lifted out — same state, handlers, and `hermesClient` calls — minus the `min-h-screen` wrapper and the `NIPHATES // CONTROL` + `← RETURN` command bar. The heading becomes a `⚡` glyph + Cinzel "Command" (matches screenshot `2-command-obsidian.png`), and the intro copy matches the prototype. `app/hermes/page.tsx` is left intact until Task 8 so nothing breaks meanwhile.

- [ ] **Step 1: Create the component**

```tsx
// components/CommandView.tsx
"use client";

import { useEffect, useState } from "react";
import {
  getConnection,
  saveConnection,
  testConnection,
  hermesApi,
  type PublicHermesConnection,
  type ModelOptions,
} from "@/lib/hermesClient";

function modelIds(opts: ModelOptions | null): string[] {
  if (!opts?.models) return [];
  return opts.models
    .map((m) => (typeof m === "string" ? m : m.id || m.name || ""))
    .filter(Boolean) as string[];
}

export function CommandView() {
  const [conn, setConn] = useState<PublicHermesConnection | null>(null);
  const [adminBaseUrl, setAdminBaseUrl] = useState("");
  const [authMode, setAuthMode] = useState("auto");
  const [token, setToken] = useState("");
  const [status, setStatus] = useState("");
  const [connected, setConnected] = useState(false);

  const [currentModel, setCurrentModel] = useState<string | null>(null);
  const [currentProvider, setCurrentProvider] = useState<string | null>(null);
  const [options, setOptions] = useState<ModelOptions | null>(null);
  const [pickModel, setPickModel] = useState("");
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    getConnection().then((c) => {
      if (!c) return;
      setConn(c);
      setAdminBaseUrl(c.adminBaseUrl);
      setAuthMode(c.authMode);
    });
  }, []);

  const refreshLive = async () => {
    const [info, opts, sys] = await Promise.all([
      hermesApi.modelInfo(),
      hermesApi.modelOptions(),
      hermesApi.systemStats(),
    ]);
    if (info.ok && info.data) {
      setCurrentModel((info.data.model as string) ?? null);
      setCurrentProvider((info.data.provider as string) ?? null);
      setPickModel((info.data.model as string) ?? "");
    }
    if (opts.ok) setOptions(opts.data);
    if (sys.ok) setStats(sys.data);
  };

  const onSaveAndTest = async () => {
    setStatus("Saving…");
    const saved = await saveConnection({ adminBaseUrl, authMode, token });
    if (!saved.ok) {
      setStatus(`❌ ${saved.error}`);
      return;
    }
    setToken("");
    if (saved.connection) setConn(saved.connection);
    setStatus("Testing connection…");
    const t = await testConnection();
    if (t.ok) {
      setConnected(true);
      setStatus(
        `✅ Connected${t.loopback ? " (loopback, no auth)" : ""}. Current model: ${
          t.model ?? "?"
        }`,
      );
      await refreshLive();
    } else {
      setConnected(false);
      setStatus(`❌ ${t.error || `HTTP ${t.status}`}`);
    }
  };

  const onSetModel = async () => {
    if (!pickModel || pickModel === currentModel) return;
    setStatus(`Switching to ${pickModel}…`);
    const res = await hermesApi.setModel(pickModel);
    if (res.ok) {
      setStatus(`✅ Active model is now ${pickModel}`);
      await refreshLive();
    } else {
      setStatus(`❌ ${res.error}`);
    }
  };

  const available = modelIds(options);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Title */}
      <div className="mb-2 flex items-center gap-3">
        <span className="font-display text-[13px] tracking-[0.3em] text-gold">
          ⚡
        </span>
        <h1 className="font-display text-[32px] font-semibold tracking-[0.06em] text-marble">
          Command
        </h1>
      </div>
      <p className="mb-8 font-read text-[16px] text-parch">
        Command the Hermes agent over its management API. Every request is
        proxied server-side — your token never reaches the browser.
      </p>

      {/* Status message */}
      {status && (
        <div className="mb-4 break-words border border-hair bg-panel px-3 py-2 font-mono text-[13px] text-parch">
          {status}
        </div>
      )}

      {/* Connection section */}
      <section className="mb-4 border border-hair bg-paneldk p-4">
        <div className="mb-3 font-mono text-[10.5px] uppercase tracking-[0.22em] text-muted">
          ⌁ CONNECTION
        </div>
        <label className="mb-3 block">
          <span className="mb-1 block font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
            Management base URL (Hermes dashboard, default :9119)
          </span>
          <input
            className="hxinp"
            value={adminBaseUrl}
            onChange={(e) => setAdminBaseUrl(e.target.value)}
            placeholder="http://127.0.0.1:9119"
          />
        </label>
        <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
              Auth mode
            </span>
            <select
              className="hxinp"
              value={authMode}
              onChange={(e) => setAuthMode(e.target.value)}
            >
              <option value="auto">auto (none on loopback, else bearer)</option>
              <option value="none">none</option>
              <option value="bearer">bearer token</option>
              <option value="cookie">session cookie</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
              Token / cookie {conn?.hasToken ? "(set — blank keeps it)" : ""}
            </span>
            <input
              className="hxinp"
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder={authMode === "cookie" ? "session=…" : "token…"}
            />
          </label>
        </div>
        {conn && (
          <p className="mb-3 font-mono text-[11px] text-mutedlo">
            {conn.isLoopback
              ? "Loopback URL detected — Hermes serves /api/* without auth here."
              : "Non-loopback URL — Hermes requires auth; set a token above."}
          </p>
        )}
        <div className="flex items-center gap-2">
          <button
            onClick={onSaveAndTest}
            className="btn-gold px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em]"
          >
            SAVE & TEST
          </button>
          {conn && (
            <span className="flex items-center gap-1.5">
              <span
                className={`status-dot ${
                  connected ? "status-dot-malach" : "status-dot-carnelian"
                }`}
              />
              <span className="font-mono text-[11px] text-muted">
                {connected ? "connected" : "not connected"}
              </span>
            </span>
          )}
        </div>
      </section>

      {/* Model section */}
      {connected && (
        <section className="mb-4 border border-hair bg-paneldk p-4">
          <div className="mb-3 font-mono text-[10.5px] uppercase tracking-[0.22em] text-muted">
            ⌁ MODEL
          </div>
          <p className="mb-3 font-mono text-[12px] text-parch">
            Current:{" "}
            <span className="text-gold">{currentModel ?? "unknown"}</span>
            {currentProvider ? (
              <span className="text-muted"> · {currentProvider}</span>
            ) : null}
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <label className="block">
              <span className="mb-1 block font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
                Switch model
              </span>
              {available.length > 0 ? (
                <select
                  className="hxinp min-w-[16rem]"
                  value={pickModel}
                  onChange={(e) => setPickModel(e.target.value)}
                >
                  {available.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  className="hxinp min-w-[16rem]"
                  value={pickModel}
                  onChange={(e) => setPickModel(e.target.value)}
                  placeholder="model id"
                />
              )}
            </label>
            <button
              onClick={onSetModel}
              disabled={!pickModel || pickModel === currentModel}
              className="border border-hair px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-parch hover:border-malach hover:text-malach disabled:opacity-40"
            >
              SET ACTIVE
            </button>
            <button
              onClick={refreshLive}
              className="border border-hair px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-parch hover:border-lapis hover:text-lapis"
            >
              REFRESH
            </button>
          </div>
        </section>
      )}

      {/* System stats */}
      {connected && stats && (
        <section className="mb-4 border border-hair bg-paneldk p-4">
          <div className="mb-3 font-mono text-[10.5px] uppercase tracking-[0.22em] text-muted">
            ⌁ SYSTEM
          </div>
          <pre className="max-h-60 overflow-auto border border-hair bg-void p-3 font-mono text-[12px] text-parch">
            {JSON.stringify(stats, null, 2)}
          </pre>
        </section>
      )}

      <p className="mt-6 font-mono text-[11px] text-mutedlo">
        Next to plug in: cron jobs, sessions browser, config/env editor, MCP &
        webhook management — all over the same proxy.
      </p>

      <style jsx>{`
        :global(.hxinp) {
          width: 100%;
          background: var(--void);
          border: 1px solid var(--hairlit);
          padding: 0.5rem 0.75rem;
          font-family: var(--font-mono), ui-monospace, monospace;
          font-size: 0.8125rem;
          color: var(--marble);
          outline: none;
        }
        :global(.hxinp:focus) {
          border-color: var(--gold);
          box-shadow: 0 0 0 1px var(--gold), 0 0 18px rgba(201, 162, 75, 0.18);
        }
        :global(.hxinp::placeholder) {
          color: var(--mutedlo);
        }
      `}</style>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/CommandView.tsx
git commit -m "feat(command): in-pane CommandView extracted from /hermes body" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: MessageList — type scaling + user-bubble inset

**Files:** Modify `components/MessageList.tsx`

Four targeted edits to the rendered-message branch (the empty state and "summoning…" waiting state are unchanged).

- [ ] **Step 1: Tighten the message column**

Replace the column wrapper opening tag (currently around line 50):
```tsx
    <div className="mx-auto flex w-full max-w-[760px] flex-col gap-6 px-4 py-6 pb-8 md:gap-7 md:px-6 md:py-[34px] md:pb-10">
```
with:
```tsx
    <div className="mx-auto flex w-full max-w-[720px] flex-col gap-5 px-6 pt-[26px] pb-8">
```

- [ ] **Step 2: Inset + rescale the user bubble**

Replace the user-message block (currently the `if (isUser) { return ( ... ); }` JSX, around lines 57–65):
```tsx
          return (
            <div key={i} className="border border-hair bg-panel px-4 py-3">
              <div className="mb-1 font-mono text-[12px] uppercase tracking-[0.28em] text-gold md:text-[10.5px]">
                OPERATOR
              </div>
              <div className="whitespace-pre-wrap break-words font-mono text-[16px] text-parchdk md:text-[14px]">
                {m.content}
              </div>
            </div>
          );
```
with:
```tsx
          return (
            <div key={i} className="ml-16 border border-hair bg-panel px-4 py-3.5">
              <div className="mb-1 font-mono text-[10.5px] uppercase tracking-[0.28em] text-gold">
                OPERATOR
              </div>
              <div className="whitespace-pre-wrap break-words font-mono text-[14px] text-parchdk">
                {m.content}
              </div>
            </div>
          );
```

- [ ] **Step 3: Rescale the agent label**

Replace the agent label (currently around line 71):
```tsx
            <div className="mb-1 font-mono text-[12px] uppercase tracking-[0.28em] text-porphlbl md:text-[10.5px]">
              NIPHATES
            </div>
```
with:
```tsx
            <div className="mb-1 font-mono text-[10.5px] uppercase tracking-[0.28em] text-porphlbl">
              NIPHATES
            </div>
```

- [ ] **Step 4: Rescale the agent body**

Replace the agent body wrapper (currently around line 85):
```tsx
              <div className="msg-content font-read text-[18px] leading-[1.62] text-agentbody">
```
with:
```tsx
              <div className="msg-content font-read text-[16px] leading-[1.62] text-agentbody">
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add components/MessageList.tsx
git commit -m "feat(messages): tighten column, scale type, inset operator bubble 64px" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: Settings — Appearance section + relocated theme toggle

**Files:** Modify `app/settings/page.tsx`

Adds theme state/handlers (moved from the sidebar) and an Appearance section above Providers (screenshots `4-settings-obsidian.png`, `5-settings-marble.png`). RETURN already links to `/` — no change needed there.

- [ ] **Step 1: Add theme state + handler**

Inside `SettingsPage`, just after the existing `const [status, setStatus] = useState<string>("");` line, add:
```tsx
  const [theme, setTheme] = useState<"obsidian" | "marble">("obsidian");

  useEffect(() => {
    const stored = localStorage.getItem("niphates-theme") as
      | "obsidian"
      | "marble"
      | null;
    if (stored) setTheme(stored);
  }, []);

  const toggleTheme = (t: "obsidian" | "marble") => {
    setTheme(t);
    localStorage.setItem("niphates-theme", t);
    document.documentElement.setAttribute("data-theme", t);
  };
```
(`useEffect` and `useState` are already imported at the top of the file.)

- [ ] **Step 2: Render the Appearance section above Providers**

Find the Providers title block:
```tsx
        {/* Title */}
        <div className="mb-8 flex items-center gap-3">
          <span className="font-display text-[20px] text-gold">§</span>
          <h1 className="font-display text-[32px] font-semibold uppercase tracking-[0.08em] text-marble">
            Providers
          </h1>
        </div>
```
Insert **before** it:
```tsx
        {/* Appearance */}
        <div className="mb-10">
          <div className="mb-6 flex items-center gap-3">
            <span className="font-display text-[20px] text-gold">☾</span>
            <h1 className="font-display text-[32px] font-semibold uppercase tracking-[0.08em] text-marble">
              Appearance
            </h1>
          </div>
          <div className="flex max-w-[340px] border border-hair">
            <button
              onClick={() => toggleTheme("obsidian")}
              className={`flex-1 px-3 py-2 font-mono text-[12px] uppercase tracking-[0.16em] transition-colors ${
                theme === "obsidian"
                  ? "bg-gold text-goldink"
                  : "text-muted hover:text-marble"
              }`}
            >
              ☾ OBSIDIAN
            </button>
            <button
              onClick={() => toggleTheme("marble")}
              className={`flex-1 border-l border-hair px-3 py-2 font-mono text-[12px] uppercase tracking-[0.16em] transition-colors ${
                theme === "marble"
                  ? "bg-gold text-goldink"
                  : "text-muted hover:text-marble"
              }`}
            >
              ☀ MARBLE
            </button>
          </div>
        </div>
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Visual check**

Run `npm run dev`, open `http://localhost:3000/settings`. Confirm: Appearance section with ☾/☀ segmented toggle sits above Providers; clicking MARBLE flips the whole app to the marble theme and persists on reload; RETURN goes to `/`.

- [ ] **Step 5: Commit**

```bash
git add app/settings/page.tsx
git commit -m "feat(settings): Appearance section with relocated theme toggle" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: Composer — claude.ai-style stacked box (+ wire model selector in `page.tsx`)

**Files:** Modify `components/Composer.tsx`, `app/page.tsx`

The composer becomes one bordered box with two stacked rows; the model selector moves out of the top bar into the composer toolbar. This task makes the matching interim edit to `app/page.tsx` (pass the new props, drop the header model chip) so the build stays green; Task 7 rewrites the rest of `page.tsx`.

- [ ] **Step 1: Replace `components/Composer.tsx` entirely**

```tsx
// components/Composer.tsx
"use client";

import { useRef, useState } from "react";
import { Plus, Mic, Square } from "lucide-react";
import { Select } from "@/components/Select";

export function Composer({
  disabled,
  streaming,
  onSend,
  onStop,
  models,
  model,
  onModelChange,
}: {
  disabled: boolean;
  streaming: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
  models: string[];
  model: string;
  onModelChange: (m: string) => void;
}) {
  const [value, setValue] = useState("");
  const taRef = useRef<HTMLTextAreaElement>(null);

  const grow = () => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
  };

  const submit = () => {
    const text = value.trim();
    if (!text || streaming) return;
    onSend(text);
    setValue("");
    requestAnimationFrame(() => {
      if (taRef.current) taRef.current.style.height = "auto";
    });
  };

  // 30×30 borderless toolbar button: transparent, gold-soft tint on hover.
  const iconBtn =
    "flex h-[30px] w-[30px] items-center justify-center text-parch transition-colors hover:bg-[var(--goldsoft)] hover:text-gold";

  return (
    <div className="pl-[calc(1rem+env(safe-area-inset-left))] pr-[calc(1rem+env(safe-area-inset-right))] pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
      <div className="mx-auto w-full max-w-[720px]">
        {/* Outer box — term-field gives the 1px hairlit border + gold focus glow */}
        <div className="term-field flex flex-col gap-[11px] px-[14px] py-3">
          {/* Row 1 — input */}
          <div className="flex items-start gap-2">
            <span
              className="mt-0.5 select-none font-mono text-[16px] text-gold md:text-[14px]"
              aria-hidden="true"
            >
              ❯
            </span>
            <textarea
              ref={taRef}
              value={value}
              disabled={disabled}
              rows={1}
              style={{ minHeight: 42 }}
              placeholder={
                disabled
                  ? "Add a provider in Settings first…"
                  : "summon the agent…"
              }
              onChange={(e) => {
                setValue(e.target.value);
                grow();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              // Keep 16px on mobile so iOS doesn't zoom on focus; 13.5px on desktop.
              className="max-h-[200px] flex-1 resize-none bg-transparent font-mono text-[16px] text-marble outline-none placeholder:text-mutedlo disabled:opacity-50 md:text-[13.5px]"
            />
          </div>

          {/* Row 2 — toolbar */}
          <div className="flex items-center gap-1">
            <button type="button" className={iconBtn} aria-label="Attach document">
              <Plus size={15} />
            </button>

            <div className="flex-1" />

            {/* Model selector chip — panel bg, no border, no status dot */}
            <div className="flex items-center bg-panel px-2.5 py-1">
              <Select
                value={model}
                onChange={onModelChange}
                options={models.map((m) => ({ value: m, label: m }))}
                disabled={models.length === 0}
                valueClassName="text-gold"
              />
            </div>

            {streaming ? (
              <button
                type="button"
                onClick={onStop}
                className="flex h-[30px] w-[30px] items-center justify-center text-parch transition-colors hover:text-carnelian"
                aria-label="Stop"
              >
                <Square size={14} fill="currentColor" />
              </button>
            ) : (
              <button type="button" className={iconBtn} aria-label="Dictate">
                <Mic size={15} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Pass the new props from `app/page.tsx`**

In `app/page.tsx`, replace the existing `<Composer .../>` usage:
```tsx
        <Composer
          disabled={noProviders || (streaming && active?.id !== streamingId)}
          streaming={streaming && active?.id === streamingId}
          onSend={handleSend}
          onStop={handleStop}
        />
```
with:
```tsx
        <Composer
          disabled={noProviders || (streaming && active?.id !== streamingId)}
          streaming={streaming && active?.id === streamingId}
          onSend={handleSend}
          onStop={handleStop}
          models={currentProvider?.models ?? []}
          model={model}
          onModelChange={onModelChange}
        />
```

- [ ] **Step 3: Remove the now-duplicate model chip from the top bar**

In `app/page.tsx`, delete the model-chip block from the header (it now lives in the composer):
```tsx
            {/* Model chip */}
            <div className="flex items-center gap-1 border border-hair bg-panel px-3 py-2 md:px-2.5 md:py-1.5">
              <Select
                value={model}
                onChange={onModelChange}
                options={(currentProvider?.models ?? []).map((m) => ({ value: m, label: m }))}
                disabled={!currentProvider || currentProvider.models.length === 0}
                valueClassName="text-gold min-w-[8rem]"
              />
            </div>
```
(Leave the provider chip in place for now; Task 7 reorganizes the bar.)

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Visual check**

Run `npm run dev`, open `/`. Confirm the composer is a single bordered box: `❯` + textarea on top; a toolbar below with `+` (left), model-name chip + mic (right). Enter sends; while streaming the mic becomes a filled square stop (hover turns it carnelian). Shift+Enter inserts a newline; the box grows to ~200px then scrolls.

- [ ] **Step 6: Commit**

```bash
git add components/Composer.tsx app/page.tsx
git commit -m "feat(composer): stacked box, in-composer model selector, attach/mic/stop, drop SEND" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7: Sidebar chamber nav + workspace shell wiring

**Files:** Modify `components/Sidebar.tsx`, `app/page.tsx`

The big integration step: Sidebar gains the chamber switcher, Dialogue-scoping, and the collapse button (theme toggle + footer links removed); `app/page.tsx` becomes the persistent shell with `activeChamber` + unified `sidebarOpen`, a transparent/borderless top bar (provider chip + gear on the right, reveal button on the left), and a main pane that swaps by chamber. Both files change together so the build is green at the end.

- [ ] **Step 1: Replace `components/Sidebar.tsx` entirely**

```tsx
// components/Sidebar.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { PanelLeftClose } from "lucide-react";
import { CHAMBERS, type ChamberId } from "@/components/chambers";
import type { Conversation } from "@/lib/types";

export function Sidebar({
  conversations,
  activeId,
  streamingId,
  unread,
  activeChamber,
  onSelectChamber,
  sidebarOpen,
  onCollapse,
  onSelect,
  onNew,
  onArchive,
  onUnarchive,
  onDelete,
}: {
  conversations: Conversation[];
  activeId: string | null;
  streamingId: string | null;
  unread: Set<string>;
  activeChamber: ChamberId;
  onSelectChamber: (id: ChamberId) => void;
  sidebarOpen: boolean;
  onCollapse: () => void;
  onSelect: (id: string) => void;
  onNew: () => void;
  onArchive: (id: string) => void;
  onUnarchive: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const active = conversations.filter((c) => !c.archived);
  const archived = conversations.filter((c) => c.archived);
  const inDialogue = activeChamber === "dialogue";
  const chamberDef = CHAMBERS.find((c) => c.id === activeChamber)!;

  return (
    <>
      {/* Mobile drawer backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 md:hidden"
          onClick={onCollapse}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-[264px] flex-col border-r border-hair bg-paneldk pl-[env(safe-area-inset-left)] transition-all md:static md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } ${
          sidebarOpen ? "md:w-[264px]" : "md:w-0 md:overflow-hidden md:border-r-0"
        }`}
      >
        {/* Brand row — no divider; top inset clears the notch */}
        <div className="flex items-center justify-between px-4 pb-[13px] pt-[calc(13px+env(safe-area-inset-top))]">
          <span className="font-display text-[18px] font-semibold uppercase tracking-[0.14em] text-marble">
            NIPHATES
          </span>
          <button
            onClick={onCollapse}
            aria-label="Collapse sidebar"
            className="flex h-7 w-7 items-center justify-center text-muted hover:text-marble"
          >
            <PanelLeftClose size={16} />
          </button>
        </div>

        {/* Chamber nav — type-only active indicator */}
        <nav className="border-b border-hair px-[9px] pb-[9px] pt-1">
          {CHAMBERS.map((c) => {
            const isActive = c.id === activeChamber;
            return (
              <button
                key={c.id}
                onClick={() => onSelectChamber(c.id)}
                className="flex w-full items-center justify-between px-[11px] py-2"
              >
                <span
                  className={`font-mono text-[11.5px] uppercase tracking-[0.2em] ${
                    isActive ? "text-marble" : "text-muted"
                  }`}
                >
                  {c.name}
                </span>
                <span
                  className={`font-display text-[14px] tracking-[0.05em] ${
                    isActive ? "text-gold" : "text-mutedlo"
                  }`}
                  style={
                    isActive
                      ? { textShadow: "0 0 10px rgba(201,162,75,0.55)" }
                      : undefined
                  }
                >
                  {c.numeral}
                </span>
              </button>
            );
          })}
        </nav>

        {inDialogue ? (
          <>
            {/* New dialogue */}
            <div className="px-3 pt-3">
              <button
                onClick={onNew}
                className="btn-ghost-gold w-full px-3 py-2.5 font-mono text-[12px] uppercase tracking-[0.18em] md:py-2 md:text-[10.5px]"
              >
                ❯ NEW DIALOGUE
              </button>
            </div>

            {/* Conversation list (active) — flex-1 pushes Archived to the bottom */}
            <nav className="mt-2 flex-1 overflow-y-auto overscroll-contain px-2 pb-2">
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
                  streamingId={streamingId}
                  unread={unread}
                  onSelect={onSelect}
                  onArchive={onArchive}
                  onUnarchive={onUnarchive}
                  onDelete={onDelete}
                />
              ))}
            </nav>

            {/* Archived — pinned above the bottom edge (8px 13px 20px) */}
            {archived.length > 0 && (
              <details className="group/arch border-t border-hair">
                <summary className="cursor-pointer list-none px-[13px] pb-5 pt-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted hover:text-parch">
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
                      streamingId={streamingId}
                      unread={unread}
                      onSelect={onSelect}
                      onArchive={onArchive}
                      onUnarchive={onUnarchive}
                      onDelete={onDelete}
                    />
                  ))}
                </div>
              </details>
            )}
          </>
        ) : (
          /* Subsection placeholder for non-Dialogue chambers */
          <div className="px-4 pt-4">
            <div className="font-mono text-[9.5px] uppercase tracking-[0.24em] text-mutedlo">
              {chamberDef.name} · SUBSECTIONS
            </div>
            <p className="mt-2 font-read italic text-[13px] text-muted">
              Not yet built.
            </p>
          </div>
        )}
      </aside>
    </>
  );
}

function ChatRow({
  c,
  activeId,
  streamingId,
  unread,
  onSelect,
  onArchive,
  onUnarchive,
  onDelete,
}: {
  c: Conversation;
  activeId: string | null;
  streamingId: string | null;
  unread: Set<string>;
  onSelect: (id: string) => void;
  onArchive: (id: string) => void;
  onUnarchive: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isActive = c.id === activeId;
  const summoning = c.id === streamingId;
  const unseen = unread.has(c.id);
  const showIndicator = summoning || unseen;

  useEffect(() => {
    if (!menuOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const handleDelete = () => {
    setMenuOpen(false);
    if (window.confirm(`Delete "${c.title}"? This can't be undone.`)) {
      onDelete(c.id);
    }
  };

  return (
    <div
      ref={ref}
      className={`group relative flex items-center gap-1 border-l-2 px-2 ${
        isActive
          ? "border-gold bg-panel text-marble"
          : "border-transparent text-muted hover:text-parch"
      }`}
    >
      <button
        onClick={() => onSelect(c.id)}
        className="flex-1 truncate py-2.5 text-left font-mono text-[15px] md:py-2 md:text-[12.5px]"
        title={c.title}
      >
        {c.title}
      </button>
      <span className="flex shrink-0 items-center gap-1">
        {showIndicator && (
          <span
            className={`status-dot status-dot-gold ${
              summoning ? "glow-pulse" : ""
            }`}
            title={summoning ? "summoning" : "unseen reply"}
          />
        )}
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className={`px-2 py-1 text-[18px] leading-none text-muted transition hover:text-marble md:px-1 md:text-base ${
            menuOpen
              ? "opacity-100"
              : "opacity-100 md:opacity-0 md:group-hover:opacity-100"
          }`}
          aria-label="Conversation options"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
        >
          ⋯
        </button>
      </span>

      {menuOpen && (
        <div
          role="menu"
          className="absolute right-1 top-9 z-40 w-36 overflow-hidden border border-hairlit bg-panel py-1 text-sm shadow-lg"
        >
          {c.archived ? (
            <button
              role="menuitem"
              onClick={() => {
                setMenuOpen(false);
                onUnarchive(c.id);
              }}
              className="block w-full px-3 py-2.5 text-left font-mono text-[14px] uppercase tracking-[0.1em] md:py-1.5 md:text-[12px] text-parchdk hover:bg-panel2"
            >
              UNARCHIVE
            </button>
          ) : (
            <button
              role="menuitem"
              onClick={() => {
                setMenuOpen(false);
                onArchive(c.id);
              }}
              className="block w-full px-3 py-2.5 text-left font-mono text-[14px] uppercase tracking-[0.1em] md:py-1.5 md:text-[12px] text-parchdk hover:bg-panel2"
            >
              ARCHIVE
            </button>
          )}
          <button
            role="menuitem"
            onClick={handleDelete}
            className="block w-full px-3 py-2.5 text-left font-mono text-[14px] uppercase tracking-[0.1em] md:py-1.5 md:text-[12px] text-carnelian hover:bg-panel2"
          >
            DELETE
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Replace `app/page.tsx` entirely**

```tsx
// app/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { PanelLeft, Settings as SettingsIcon } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { MessageList } from "@/components/MessageList";
import { Composer } from "@/components/Composer";
import { CommandView } from "@/components/CommandView";
import { ChamberPlaceholder } from "@/components/ChamberPlaceholder";
import { Select } from "@/components/Select";
import { type ChamberId } from "@/components/chambers";
import { streamChatRequest } from "@/lib/client";
import {
  loadConversations,
  saveConversations,
  flushConversations,
  newConversation,
  titleFrom,
} from "@/lib/storage";
import type { Conversation, PublicProvider } from "@/lib/types";

export default function Home() {
  const [providers, setProviders] = useState<PublicProvider[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [providerId, setProviderId] = useState<string>("");
  const [model, setModel] = useState<string>("");
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [unread, setUnread] = useState<Set<string>>(() => new Set());
  const [activeChamber, setActiveChamber] = useState<ChamberId>("dialogue");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const streaming = streamingId !== null;
  const activeIdRef = useRef<string | null>(activeId);
  const abortRef = useRef<AbortController | null>(null);

  // Close the drawer on small screens after first mount. Runs once so the
  // SSR default (open) doesn't desync hydration; desktop stays expanded.
  useEffect(() => {
    if (window.matchMedia("(max-width: 767px)").matches) setSidebarOpen(false);
  }, []);

  const closeOnMobile = () => {
    if (window.matchMedia("(max-width: 767px)").matches) setSidebarOpen(false);
  };

  // --- Initial load ------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    loadConversations().then((convos) => {
      if (cancelled) return;
      setConversations(convos);
    });

    fetch("/api/providers")
      .then((r) => r.json())
      .then((d: { providers: PublicProvider[] }) => {
        if (cancelled) return;
        const enabled = d.providers.filter((p) => p.enabled !== false);
        setProviders(enabled);
        if (enabled[0]) {
          setProviderId(enabled[0].id);
          setModel(enabled[0].defaultModel || enabled[0].models[0] || "");
        }
      })
      .catch(() => {
        if (!cancelled) setProviders([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Escape returns to the Dialogue home view; on mobile it closes the drawer first.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (sidebarOpen && window.matchMedia("(max-width: 767px)").matches) {
        setSidebarOpen(false);
        return;
      }
      setActiveId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sidebarOpen]);

  const active = useMemo(
    () => conversations.find((c) => c.id === activeId) || null,
    [conversations, activeId],
  );

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  const currentProvider = providers.find((p) => p.id === providerId);

  useEffect(() => {
    if (active) {
      setProviderId(active.providerId);
      setModel(active.model);
    }
  }, [activeId]); // eslint-disable-line react-hooks/exhaustive-deps

  const persist = useCallback((list: Conversation[]) => {
    setConversations(list);
    saveConversations(list);
  }, []);

  const handleNew = () => {
    if (!providerId) return;
    const c = newConversation(providerId, model);
    const list = [c, ...conversations];
    persist(list);
    setActiveId(c.id);
    closeOnMobile();
  };

  const handleDelete = (id: string) => {
    if (streamingId === id) {
      abortRef.current?.abort();
      abortRef.current = null;
      setStreamingId(null);
    }
    const list = conversations.filter((c) => c.id !== id);
    persist(list);
    setUnread((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    if (activeId === id) {
      const next = list.find((c) => !c.archived) ?? list[0];
      setActiveId(next?.id ?? null);
    }
  };

  const setArchived = (id: string, archived: boolean) => {
    const list = conversations.map((c) =>
      c.id === id ? { ...c, archived, updatedAt: Date.now() } : c,
    );
    persist(list);
    if (archived && activeId === id) {
      const next = list.find((c) => !c.archived);
      setActiveId(next?.id ?? null);
    }
  };

  const handleArchive = (id: string) => setArchived(id, true);
  const handleUnarchive = (id: string) => setArchived(id, false);

  const applyModelToActive = (nextProviderId: string, nextModel: string) => {
    if (!activeId) return;
    persist(
      conversations.map((c) =>
        c.id === activeId
          ? { ...c, providerId: nextProviderId, model: nextModel }
          : c,
      ),
    );
  };

  const onProviderChange = (id: string) => {
    setProviderId(id);
    const p = providers.find((x) => x.id === id);
    const m = p?.defaultModel || p?.models[0] || "";
    setModel(m);
    applyModelToActive(id, m);
  };

  const onModelChange = (m: string) => {
    setModel(m);
    applyModelToActive(providerId, m);
  };

  // --- Send a message ----------------------------------------------------
  const handleSend = async (text: string) => {
    if (!providerId || !model) return;

    let convo = active;
    let list = conversations;
    if (!convo) {
      convo = newConversation(providerId, model);
      list = [convo, ...conversations];
      setActiveId(convo.id);
    }

    const id = convo.id;
    const userMsg = { role: "user" as const, content: text };
    const withUser: Conversation = {
      ...convo,
      providerId,
      model,
      title: convo.messages.length === 0 ? titleFrom(text) : convo.title,
      messages: [...convo.messages, userMsg, { role: "assistant", content: "" }],
      updatedAt: Date.now(),
    };
    list = list.map((c) => (c.id === id ? withUser : c));
    persist(list);

    setStreamingId(id);
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const messagesForApi = withUser.messages.slice(0, -1);

    await streamChatRequest(
      { providerId, model, messages: messagesForApi },
      {
        onDelta: (delta) => {
          setConversations((prev) => {
            const next = prev.map((c) => {
              if (c.id !== id) return c;
              const msgs = [...c.messages];
              const last = msgs[msgs.length - 1];
              msgs[msgs.length - 1] = {
                ...last,
                content: last.content + delta,
              };
              return { ...c, messages: msgs, updatedAt: Date.now() };
            });
            saveConversations(next);
            return next;
          });
        },
        onError: (message) => {
          setConversations((prev) => {
            const next = prev.map((c) => {
              if (c.id !== id) return c;
              const msgs = [...c.messages];
              const last = msgs[msgs.length - 1];
              msgs[msgs.length - 1] = {
                ...last,
                content:
                  (last.content ? last.content + "\n\n" : "") + `⚠️ ${message}`,
              };
              return { ...c, messages: msgs };
            });
            saveConversations(next);
            return next;
          });
        },
      },
      ctrl.signal,
    );

    setStreamingId(null);
    if (!ctrl.signal.aborted && activeIdRef.current !== id) {
      setUnread((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
    }
    abortRef.current = null;
    void flushConversations();
  };

  const handleStop = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStreamingId(null);
  };

  const noProviders = providers.length === 0;

  return (
    <div className="fixed inset-0 flex overflow-hidden">
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        streamingId={streamingId}
        unread={unread}
        activeChamber={activeChamber}
        onSelectChamber={(ch) => {
          setActiveChamber(ch);
          closeOnMobile();
        }}
        sidebarOpen={sidebarOpen}
        onCollapse={() => setSidebarOpen(false)}
        onSelect={(id) => {
          setActiveId(id);
          setActiveChamber("dialogue");
          closeOnMobile();
          setUnread((prev) => {
            if (!prev.has(id)) return prev;
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        }}
        onNew={handleNew}
        onArchive={handleArchive}
        onUnarchive={handleUnarchive}
        onDelete={handleDelete}
      />

      <main className="flex min-w-0 flex-1 flex-col">
        {/* Top bar — transparent, borderless; insets clear the notch */}
        <header className="flex items-center gap-2 pb-2 pl-[calc(0.75rem+env(safe-area-inset-left))] pr-[calc(0.75rem+env(safe-area-inset-right))] pt-[calc(0.5rem+env(safe-area-inset-top))]">
          {!sidebarOpen && (
            <button
              className="-ml-1 flex h-9 w-9 items-center justify-center text-parch hover:text-marble"
              onClick={() => setSidebarOpen(true)}
              aria-label="Show sidebar"
            >
              <PanelLeft size={18} />
            </button>
          )}

          <div className="flex flex-1 items-center justify-end gap-2 overflow-x-auto">
            {/* Provider chip */}
            <div className="flex items-center gap-1.5 border border-hair bg-panel px-3 py-2 md:px-2.5 md:py-1.5">
              <span className="status-dot status-dot-malach" />
              <Select
                value={providerId}
                onChange={onProviderChange}
                options={providers.map((p) => ({ value: p.id, label: p.name }))}
                disabled={noProviders}
                placeholder="No providers"
                valueClassName="text-marble"
              />
            </div>

            {/* Settings gear — sole entry point to Settings */}
            <Link
              href="/settings"
              aria-label="Settings"
              className="flex h-9 w-9 items-center justify-center text-parch hover:text-marble"
            >
              <SettingsIcon size={18} />
            </Link>
          </div>
        </header>

        {/* Main pane — swaps by active chamber */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {activeChamber === "dialogue" ? (
            noProviders ? (
              <div className="flex h-full items-center justify-center px-6 text-center">
                <div className="max-w-md">
                  <div className="mb-4 font-display text-[36px] font-semibold uppercase tracking-[0.1em] text-marble">
                    NIPHATES
                  </div>
                  <p className="font-mono text-[13px] text-parch">
                    No providers configured. Open{" "}
                    <Link
                      href="/settings"
                      className="text-gold underline underline-offset-2 hover:text-goldbri"
                    >
                      Settings
                    </Link>{" "}
                    to connect Hermes Agent or another API.
                  </p>
                </div>
              </div>
            ) : (
              <MessageList
                messages={active?.messages || []}
                streaming={streaming && active?.id === streamingId}
              />
            )
          ) : activeChamber === "command" ? (
            <CommandView />
          ) : (
            <ChamberPlaceholder chamber={activeChamber} />
          )}
        </div>

        {/* Composer — Dialogue chamber only */}
        {activeChamber === "dialogue" && (
          <Composer
            disabled={noProviders || (streaming && active?.id !== streamingId)}
            streaming={streaming && active?.id === streamingId}
            onSend={handleSend}
            onStop={handleStop}
            models={currentProvider?.models ?? []}
            model={model}
            onModelChange={onModelChange}
          />
        )}
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS. (If it complains about an unused `useState` import in Sidebar, confirm `ChatRow` still uses it — it does.)

- [ ] **Step 4: Visual check (desktop)**

Run `npm run dev`, open `/` at desktop width. Verify against screenshots 1–3:
- Chamber list (DIALOGUE I … COMMAND V) under the brand; active row = marble name + glowing gold numeral, others dimmed; no fill/border on the active row.
- Clicking **Command** swaps the main pane to the in-pane CommandView (sidebar + top bar still visible) and the sidebar body to `COMMAND · SUBSECTIONS / Not yet built.`
- Clicking **Library** shows the centered placeholder; **Dialogue** restores the chat + composer.
- The brand collapse icon hides the whole sidebar and a reveal icon appears top-left of the bar; clicking it restores the sidebar.
- Top bar is transparent/borderless with the provider chip + gear on the right; the gear opens `/settings`.

- [ ] **Step 5: Visual check (mobile)**

Run `preview_resize` / browser devtools to ~390px. Verify: sidebar starts closed; the reveal (PanelLeft) button opens it as an overlay with a backdrop; selecting a chat or chamber closes it.

- [ ] **Step 6: Commit**

```bash
git add components/Sidebar.tsx app/page.tsx
git commit -m "feat(chambers): workspace shell — chamber nav, collapse, in-pane chamber switch" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 8: Retire the standalone /hermes route

**Files:** Modify `app/hermes/page.tsx`

The Control body now lives in `CommandView` (Task 3) and renders as the Command chamber (Task 7). Replace the page with a redirect so old bookmarks land in the workspace.

- [ ] **Step 1: Replace `app/hermes/page.tsx` entirely**

```tsx
// app/hermes/page.tsx
// The Hermes Control panel moved into the Command chamber (components/CommandView.tsx,
// rendered by app/page.tsx). This route now redirects so old bookmarks still work.
import { redirect } from "next/navigation";

export default function HermesRedirect() {
  redirect("/");
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Verify the redirect**

With `npm run dev` running, open `http://localhost:3000/hermes`. Expected: immediate redirect to `/` (the workspace).

- [ ] **Step 4: Commit**

```bash
git add app/hermes/page.tsx
git commit -m "feat(command): redirect retired /hermes route into the workspace" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 9: Cleanup + full verification

**Files:** Possibly `app/globals.css` (only if dead styles surface); otherwise verification only.

- [ ] **Step 1: Scan for dead styles / stale references**

Run:
```bash
cd /Users/michael/Git/niphates
grep -rn "CONTROL\|☾ OBSIDIAN\|☀ MARBLE\|niphates-theme" components/Sidebar.tsx app/page.tsx || echo "clean"
grep -n "term-field\|btn-gold\|btn-ghost-gold\|status-dot" app/globals.css
```
Expected: the first grep prints `clean` (the theme toggle and CONTROL link are gone from the sidebar/page). The second confirms the utilities the new components rely on still exist. If `app/globals.css` has any sidebar-footer- or header-border-specific rules that are now unused, delete them; the round-one utilities above must stay.

- [ ] **Step 2: Full production build**

Run: `npm run build`
Expected: build succeeds; `/`, `/settings`, and `/hermes` all compile (the latter as a redirect). No type errors, no missing-module errors for `lucide-react` / `CommandView` / `ChamberPlaceholder`.

- [ ] **Step 3: Run the existing test suite (must be unaffected)**

Run: `npm run test`
Expected: PASS — pure-logic tests in `tests/` (SSE parsing, Hermes auth) are untouched by this presentation work.

- [ ] **Step 4: Full visual sweep against all six screenshots**

With `npm run dev`, walk the prototype flows and compare to `design_handoff_niphates/screenshots/`:
1. `1-dialogue-obsidian.png` — Dialogue landing, obsidian.
2. `2-command-obsidian.png` — Command chamber in-pane.
3. `3-chamber-placeholder-obsidian.png` — a placeholder chamber.
4. `4-settings-obsidian.png` — Settings with Appearance above Providers.
5. `5-settings-marble.png` — Settings in marble (toggle MARBLE).
6. `6-dialogue-marble.png` — Dialogue in marble.
Confirm composer submit/stop/auto-grow, model selector inside the composer, sidebar collapse/reveal, and `/hermes` → `/` all behave.

- [ ] **Step 5: Commit any cleanup**

```bash
git add -A
git commit -m "chore(chambers): remove dead styles; final build/test verification" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```
(If Step 1 found nothing to remove and nothing else changed, skip this commit.)

---

## Self-review checklist (run before declaring done)

- [ ] **Spec coverage:** A1 chamber nav (Task 7), A2 Command in-pane (Tasks 3+7), A3 Dialogue-scoped list + subsection placeholder (Task 7), A4 Settings gear + Appearance (Tasks 5+7), A5 theme relocated (Tasks 5+7), A6 sidebar collapse (Task 7), A7 top bar reorg (Tasks 6+7), B1 composer (Task 6), B2 message scaling/inset (Task 4), B3 sidebar spacing (Task 7), C parked grain — not implemented (correct). `/hermes` retired (Task 8). lucide-react added (Task 0).
- [ ] **No leftover `STOP`/`SEND` text buttons, header model chip, sidebar theme toggle, or footer Control/Settings links.**
- [ ] **Prop names consistent:** Sidebar consumes `activeChamber`/`onSelectChamber`/`sidebarOpen`/`onCollapse`; Composer consumes `models`/`model`/`onModelChange`; `ChamberId` imported from `@/components/chambers` everywhere.
- [ ] **No token typos:** `bg-[var(--goldsoft)]` (not a Tailwind utility); all other classes map to `tailwind.config.ts` colors.
