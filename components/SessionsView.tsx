// components/SessionsView.tsx
// Hermes session browser — summary stats + list of all sessions.
"use client";

import { useEffect, useMemo, useState } from "react";
import { hermesApi } from "@/lib/hermesClient";

// The Hermes /api/sessions response is loosely typed on the wire; define
// the fields we actually use so the UI isn't flying blind.
interface HermesSession {
  id?: string;
  session_id?: string;
  title?: string;
  /** Platform/source of the session: "tui", "webui", "whatsapp", "cli", "api_server", etc. */
  source?: string;
  /** Active/inactive flag — only present on some sessions. */
  is_active?: boolean;
  /** Some sessions use `active` instead. */
  active?: boolean;
  started_at?: string | number;
  ended_at?: string | number;
  /** Last activity timestamp. */
  last_active?: string | number;
  created_at?: string | number;
  updated_at?: string | number;
  model?: string;
  provider?: string;
  profile?: string;
  /** Token usage stats. */
  input_tokens?: number;
  output_tokens?: number;
  estimated_cost_usd?: number;
  /** Number of messages in the session. */
  message_count?: number;
  /** Preview of the last message. */
  preview?: string;
  /** Whether the session is archived. */
  archived?: boolean;
  [k: string]: unknown;
}

interface SessionsResponse {
  sessions?: HermesSession[];
}

function sessionName(s: HermesSession): string {
  return s.title || s.id || s.session_id || "untitled";
}

function sessionPlatform(s: HermesSession): string {
  return (s.source || "unknown").toLowerCase();
}

/** Human-friendly label for a session source/platform. */
function platformLabel(source: string): string {
  const map: Record<string, string> = {
    api_server: "API",
    tui: "TUI",
    webui: "WebUI",
    whatsapp: "WhatsApp",
    cli: "CLI",
    telegram: "Telegram",
    discord: "Discord",
    slack: "Slack",
  };
  return map[String(source).toLowerCase()] ?? String(source);
}

function formatTime(ts?: string | number): string {
  if (!ts) return "—";
  const d = typeof ts === "number" ? new Date(ts) : new Date(ts);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function SessionsView() {
  const [sessions, setSessions] = useState<HermesSession[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    hermesApi
      .sessions()
      .then((res) => {
        if (cancelled) return;
        if (!res.ok) {
          setError(res.error || `HTTP ${res.status}`);
          setSessions([]);
          return;
        }
        const data = res.data as SessionsResponse | HermesSession[] | null;
        if (!data) {
          setSessions([]);
          return;
        }
        // The endpoint returns { sessions: [...] } or a bare array.
        const list = Array.isArray(data)
          ? (data as HermesSession[])
          : (data as SessionsResponse)?.sessions ?? [];
        setSessions(list);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
        setSessions([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const summary = useMemo(() => {
    if (!sessions) return null;
    const total = sessions.length;
    const activeCount = sessions.filter((s) => s.is_active || s.active).length;
    const byPlatform: Record<string, number> = {};
    for (const s of sessions) {
      const p = sessionPlatform(s);
      byPlatform[p] = (byPlatform[p] || 0) + 1;
    }
    return { total, activeCount, byPlatform };
  }, [sessions]);

  if (loading) {
    return (
      <div className="border border-hair bg-paneldk p-6 font-mono text-[12px] text-mutedlo">
        Loading sessions…
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-hair bg-paneldk p-6 font-mono text-[12px] text-carnelian">
        Failed to load sessions: {error}
      </div>
    );
  }

  if (!sessions || sessions.length === 0) {
    return (
      <div className="border border-hair bg-paneldk p-6 font-mono text-[12px] text-mutedlo">
        No sessions found.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary block */}
      {summary && (
        <div className="border border-hair bg-paneldk p-4">
          <div className="mb-3 font-mono text-[10.5px] uppercase tracking-[0.22em] text-muted">
            ⌁ SUMMARY
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <Stat label="Total sessions" value={summary.total} />
            <Stat label="Active" value={summary.activeCount} />
            <Stat
              label="Inactive"
              value={summary.total - summary.activeCount}
            />
          </div>
          {Object.keys(summary.byPlatform).length > 0 && (
            <div className="mt-4 border-t border-hair pt-3">
              <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-mutedlo">
                BY PLATFORM
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(summary.byPlatform)
                  .sort((a, b) => b[1] - a[1])
                  .map(([platform, count]) => (
                    <span
                      key={platform}
                      className="border border-hair bg-panel px-2 py-1 font-mono text-[11px] text-parch"
                    >
                      {platformLabel(platform)}
                      <span className="ml-1 text-gold">{count}</span>
                    </span>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Session list */}
      <div className="border border-hair bg-paneldk">
        <div className="border-b border-hair px-4 py-2 font-mono text-[10.5px] uppercase tracking-[0.22em] text-muted">
          ⌁ SESSIONS · {sessions.length}
        </div>
        <ul className="divide-y divide-hair">
          {sessions.map((s, i) => {
            const id = s.id || s.session_id || String(i);
            const platform = sessionPlatform(s);
            const name = sessionName(s);
            return (
              <li
                key={id}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-panel"
              >
                <span
                  className={`status-dot ${
                    (s.is_active || s.active)
                      ? "status-dot-gold"
                      : "status-dot-muted"
                  }`}
                  title={s.is_active || s.active ? "active" : "inactive"}
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-mono text-[13px] text-marble">
                    {name}
                  </div>
                  <div className="mt-0.5 font-mono text-[10.5px] text-mutedlo">
                    {platformLabel(platform)}
                    {s.model ? ` · ${s.model}` : ""}
                    {s.provider ? ` · ${s.provider}` : ""}
                  </div>
                </div>
                <div className="shrink-0 font-mono text-[10.5px] text-mutedlo">
                  {formatTime(s.last_active ?? s.updated_at ?? s.started_at ?? s.created_at)}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-hair bg-panel px-3 py-2">
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-mutedlo">
        {label}
      </div>
      <div className="mt-1 font-display text-[20px] font-semibold text-gold">
        {value}
      </div>
    </div>
  );
}
