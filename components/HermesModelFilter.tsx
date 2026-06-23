// components/HermesModelFilter.tsx
"use client";

// Curate which gateway models appear in the composer model picker. Checkbox
// allowlist with select/deselect-all at the full-list and per-provider level,
// mirroring the Providers model curation (components/ModelCuration.tsx). The
// saved list lives in the Gateway connection (data/hermes.json → allowedModels);
// an empty list means "no filter — show all".

import { useEffect, useMemo, useState } from "react";
import type { ModelOptions } from "@/lib/hermesClient";

export function HermesModelFilter({
  options,
  allowed,
  saving,
  onSave,
}: {
  options: ModelOptions | null;
  allowed: string[] | undefined;
  saving?: boolean;
  onSave: (models: string[]) => void;
}) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [dirty, setDirty] = useState(false);

  const groups = useMemo(
    () => (options?.providers ?? []).filter((u) => u.total_models > 0),
    [options],
  );
  // Unique model ids across providers (the same id can be offered by several
  // upstreams). The allowlist is id-keyed, so we count/compare uniques.
  const universe = useMemo(
    () => [...new Set(groups.flatMap((u) => u.models))],
    [groups],
  );

  // (Re)sync local selection when the catalog loads or the saved list changes.
  // No saved filter (empty/undefined) means everything is allowed → all checked.
  useEffect(() => {
    if (!options) return;
    setSel(new Set(allowed && allowed.length ? allowed : universe));
    setDirty(false);
  }, [options, allowed, universe]);

  const mutate = (fn: (s: Set<string>) => void) =>
    setSel((prev) => {
      const next = new Set(prev);
      fn(next);
      setDirty(true);
      return next;
    });

  const toggle = (m: string) =>
    mutate((s) => (s.has(m) ? s.delete(m) : s.add(m)));
  const setMany = (models: string[], on: boolean) =>
    mutate((s) => models.forEach((m) => (on ? s.add(m) : s.delete(m))));

  const save = () => {
    // If everything is selected, persist [] to mean "no filter" (future-proof:
    // models added to the catalog later stay visible).
    const all = universe.length > 0 && universe.every((m) => sel.has(m));
    onSave(all ? [] : [...sel]);
  };

  if (!options?.providers?.length) {
    return (
      <p className="font-mono text-[12px] text-mutedlo">
        No catalog — connect with a session token to load available models.
      </p>
    );
  }

  const needle = q.trim().toLowerCase();
  const allOn = universe.length > 0 && universe.every((m) => sel.has(m));

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="font-mono text-[11px] text-muted">
          {sel.size} of {universe.length} shown in composer
        </span>
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={() => setMany(universe, true)}
            disabled={allOn}
            className="border border-hair px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[0.16em] text-parch hover:border-lapis hover:text-lapis disabled:opacity-40"
          >
            ALL
          </button>
          <button
            type="button"
            onClick={() => setMany(universe, false)}
            disabled={sel.size === 0}
            className="border border-hair px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[0.16em] text-parch hover:border-lapis hover:text-lapis disabled:opacity-40"
          >
            NONE
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!dirty || saving}
            className="border border-gold px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[0.16em] text-gold hover:bg-[var(--goldsoft)] disabled:opacity-40"
          >
            {saving ? "…" : "SAVE"}
          </button>
        </div>
      </div>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="search models…"
        className="mb-3 w-full border border-hairlit bg-void px-2.5 py-1.5 font-mono text-[12px] text-marble outline-none placeholder:text-mutedlo focus:border-gold"
      />

      <div className="max-h-[440px] space-y-4 overflow-y-auto">
        {groups.map((u) => {
          const shown = u.models.filter(
            (m) => !needle || m.toLowerCase().includes(needle),
          );
          if (shown.length === 0) return null;
          const on = u.models.filter((m) => sel.has(m)).length;
          return (
            <div key={u.slug}>
              <div className="mb-1.5 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
                <span>{u.name}</span>
                {u.is_current && <span className="text-malach">· current</span>}
                <span className="text-mutedlo">
                  {on}/{u.models.length}
                </span>
                <div className="ml-auto flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setMany(u.models, true)}
                    className="text-mutedlo hover:text-lapis"
                  >
                    all
                  </button>
                  <span className="text-mutedlo">·</span>
                  <button
                    type="button"
                    onClick={() => setMany(u.models, false)}
                    className="text-mutedlo hover:text-lapis"
                  >
                    none
                  </button>
                </div>
              </div>
              <div className="flex flex-col gap-0.5">
                {shown.map((m) => (
                  <label
                    key={m}
                    className="flex cursor-pointer items-center gap-2 px-1 font-mono text-[12px]"
                  >
                    <input
                      type="checkbox"
                      checked={sel.has(m)}
                      onChange={() => toggle(m)}
                      className="accent-gold"
                    />
                    <span className={sel.has(m) ? "text-marble" : "text-muted"}>
                      {m}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
