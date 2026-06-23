// components/Spinner.tsx
"use client";

import { useEffect, useState } from "react";

// Box braille spinner — the classic 8-frame rotating cell.
const BRAILLE_FRAMES = ["⣾", "⣽", "⣻", "⢿", "⡿", "⣟", "⣯", "⣷"];

/**
 * Unicode braille spinner. Cycles a single glyph in place — no SVG, no CSS
 * animation, just text. Inherits color/size from its container via `currentColor`
 * and `1em`, so drop it next to any label (e.g. "summoning…").
 */
export function Spinner({
  className = "",
  intervalMs = 80,
  title,
}: {
  className?: string;
  intervalMs?: number;
  title?: string;
}) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const id = setInterval(
      () => setFrame((f) => (f + 1) % BRAILLE_FRAMES.length),
      intervalMs,
    );
    return () => clearInterval(id);
  }, [intervalMs]);

  return (
    <span
      aria-hidden="true"
      title={title}
      className={`inline-block select-none font-mono leading-none ${className}`}
    >
      {BRAILLE_FRAMES[frame]}
    </span>
  );
}
