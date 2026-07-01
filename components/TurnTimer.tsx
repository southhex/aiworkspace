"use client";

import { useEffect, useRef, useState } from "react";
import { formatDuration } from "@/lib/blocks";
import { Spinner } from "@/components/Spinner";

/**
 * Total-elapsed-time line for a single assistant turn. Replaces the old
 * "summoning…" spinner: it appears the moment a turn starts (showing `0.0s`),
 * ticks every 100ms while `active`, then freezes at the final total when
 * `active` goes false — it does not disappear.
 *
 * Local state only (never persisted), so it measures browser-perceived elapsed
 * time from the first render where `active` was true — includes stream latency,
 * same caveat as the per-tool timer. A message that was never the live
 * streaming turn this session (e.g. loaded from disk on reload) renders nothing,
 * so old messages don't show a bogus frozen `0.0s`.
 */
export function TurnTimer({ active }: { active: boolean }) {
  const startedAtRef = useRef<number | null>(null);
  const everActiveRef = useRef(false);
  const [elapsed, setElapsed] = useState(0);

  if (active) everActiveRef.current = true;

  useEffect(() => {
    if (!active) return;
    if (startedAtRef.current == null) startedAtRef.current = performance.now();
    const tick = () =>
      setElapsed(performance.now() - (startedAtRef.current ?? performance.now()));
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [active]);

  // Never streamed live this session → nothing to show.
  if (!everActiveRef.current) return null;

  return (
    <div className="mt-1 flex items-center gap-1.5 font-mono text-[10.5px] text-mutedlo">
      {active ? (
        <Spinner className="text-[10.5px]" />
      ) : (
        <span aria-hidden="true">▩</span>
      )}
      <span>{formatDuration(elapsed)}</span>
    </div>
  );
}
