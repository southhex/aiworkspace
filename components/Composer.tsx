// components/Composer.tsx
"use client";

import { useRef, useState } from "react";
import { Plus, Mic, Square } from "lucide-react";
import { Select } from "@/components/Select";
import { ComposerModelSwitch } from "@/components/ComposerModelSwitch";

export function Composer({
  disabled,
  streaming,
  onSend,
  onStop,
  models,
  model,
  onModelChange,
  gatewayProfile,
}: {
  disabled: boolean;
  streaming: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
  models: string[];
  model: string;
  onModelChange: (m: string) => void;
  /** When set (Gateway provider active), shows the inline model switcher for
   *  this profile. The composer `model` above is the *profile*; this switches
   *  that profile's underlying LLM. */
  gatewayProfile?: string;
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
      {/* zoom 0.9 — scale the whole composer down ~10% (reflows cleanly on WebKit) */}
      <div className="mx-auto w-full max-w-[720px]" style={{ zoom: 0.9 }}>
        {/* Outer box — term-field gives the 1px hairlit border + gold focus glow */}
        <div className="term-field flex flex-col gap-[11px] px-[14px] py-3">
          {/* Row 1 — input. items-start keeps the prompt on the first line when the
              textarea grows; the leading-[20px] on the caret matches the textarea's
              line box so they share a baseline. */}
          <div className="flex items-start gap-2">
            <span
              className="select-none font-mono text-[16px] leading-[20px] text-gold md:text-[14px]"
              aria-hidden="true"
            >
              ❯
            </span>
            <textarea
              ref={taRef}
              value={value}
              disabled={disabled}
              rows={1}
              style={{ minHeight: 20 }}
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

            {gatewayProfile ? (
              /* Gateway: the model switcher IS the picker — it swaps the
                 (default) profile's underlying LLM. No separate profile chip. */
              <ComposerModelSwitch profile={gatewayProfile} />
            ) : (
              /* Direct providers: pick from the curated model list. */
              <div className="flex items-center bg-panel px-2.5 py-1">
                <Select
                  value={model}
                  onChange={onModelChange}
                  options={models.map((m) => ({ value: m, label: m }))}
                  disabled={models.length === 0}
                  valueClassName="text-gold"
                />
              </div>
            )}

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
