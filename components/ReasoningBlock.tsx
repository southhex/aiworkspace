"use client";

import { useState } from "react";
import { CopyButton } from "./CopyButton";

/**
 * Reasoning/thinking block. Collapsed by default (matching the attachment) —
 * a dimmed "Thinking" caption sits above its output; clicking it reveals the
 * italic prose body. While `streaming` is true the label gets a soft
 * glow-pulse so the user can see the agent is still thinking.
 */
export function ReasoningBlock({
  text,
  streaming = false,
}: {
  text: string;
  streaming?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-1.5">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`font-mono text-[12px] text-mutedlo transition-colors hover:text-parch ${
          streaming ? "glow-pulse" : ""
        }`}
      >
        Thinking
      </button>
      {open && (
        <div className="group/reasoning relative mt-1 border-l-2 border-hair pl-3">
          <div className="whitespace-pre-wrap font-read text-[14px] italic leading-[1.55] text-parch pr-16">
            {text}
          </div>
          <div className="mt-1.5">
            <CopyButton text={text} />
          </div>
        </div>
      )}
    </div>
  );
}
