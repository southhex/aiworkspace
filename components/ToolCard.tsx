"use client";

import { useEffect, useRef, useState } from "react";
import { Wrench, X, FileText, Terminal, Search } from "lucide-react";
import type { ToolEvent } from "@/lib/types";
import { formatDuration } from "@/lib/blocks";
import { Spinner } from "./Spinner";
import { CopyButton } from "./CopyButton";

// File-edit tools where the preview is typically a file path
const FILE_TOOLS = new Set(["write_file", "patch", "read_file", "search_files"]);
const TERMINAL_TOOLS = new Set(["terminal", "execute_code"]);
const SEARCH_TOOLS = new Set(["web_search", "web_extract"]);

function detectIcon(tool: string) {
  if (FILE_TOOLS.has(tool)) return FileText;
  if (TERMINAL_TOOLS.has(tool)) return Terminal;
  if (SEARCH_TOOLS.has(tool)) return Search;
  return Wrench;
}

function toolLabel(tool: string): string {
  const labels: Record<string, string> = {
    write_file: "Write",
    patch: "Patch",
    read_file: "Read",
    search_files: "Search",
    terminal: "Terminal",
    execute_code: "Execute",
    web_search: "Web Search",
    web_extract: "Extract",
    browser_navigate: "Browse",
    browser_click: "Click",
    browser_type: "Type",
    image_generate: "Image",
    text_to_speech: "Speech",
    delegate_task: "Delegate",
    skill_view: "Skill",
    skill_manage: "Skill",
    todo: "Todo",
    cronjob: "Cron",
  };
  return labels[tool] || tool;
}

/**
 * One dimmed mono line per tool invocation: glyph, tool label, a truncated
 * one-line preview, and the duration/live timer, left-to-right. Successful
 * completions carry no checkmark — just their run details. When the tool has a
 * command preview and/or captured output the line is clickable and expands a
 * full-width code-styled view (command, then output when available) with a copy
 * button.
 *
 * While a tool is running we tick a local timer showing browser-perceived
 * elapsed time (from receipt of the `started` event to now). That includes
 * stream latency so it reads slightly high, then snaps to the server's
 * authoritative `event.durationMs` on completion. The `streaming` prop is
 * reserved for callers wanting a live indicator; the spinner already covers it.
 */
export function ToolCard({
  event,
  streaming: _streaming = false,
}: {
  event: ToolEvent;
  streaming?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const running = event.status === "started";
  const Icon = detectIcon(event.tool);
  const hasDetail = Boolean(event.preview || event.output);

  // Local live timer — captures the first render where the tool is running as
  // the start instant, ticks while running, and is discarded once settled.
  const startedAtRef = useRef<number | null>(null);
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!running) return;
    if (startedAtRef.current == null) startedAtRef.current = performance.now();
    const id = setInterval(() => setTick((t) => t + 1), 100);
    return () => clearInterval(id);
  }, [running]);

  const liveMs =
    running && startedAtRef.current != null
      ? performance.now() - startedAtRef.current
      : null;

  return (
    <div className="group/tool">
      <button
        type="button"
        onClick={() => (hasDetail ? setOpen(!open) : undefined)}
        className={`flex w-full items-center gap-2 py-0.5 pr-2.5 text-left font-mono text-[12px] ${
          event.error ? "text-carnelian" : "text-mutedlo"
        } ${hasDetail ? "cursor-pointer hover:text-parch" : "cursor-default"}`}
      >
        <span className="flex h-4 w-4 shrink-0 items-center justify-center">
          {running ? <Spinner className="text-[12px]" /> : <Icon size={12} />}
        </span>
        <span className="shrink-0">{toolLabel(event.tool)}</span>
        {event.preview && !open && (
          <span className="min-w-0 flex-1 truncate text-[11px]">
            {event.preview}
          </span>
        )}
        <span className="ml-auto flex shrink-0 items-center gap-1 pl-2">
          {running && liveMs != null && (
            <span className="text-[10.5px]">{formatDuration(liveMs)}</span>
          )}
          {!running && event.durationMs != null && (
            <span className="text-[10.5px]">
              {formatDuration(event.durationMs)}
            </span>
          )}
          {!running && event.error && <X size={13} className="text-carnelian" />}
        </span>
      </button>
      {open && hasDetail && (
        <div className="relative ml-[24px] border-l border-hair px-2.5 py-1.5">
          <div className="absolute right-1.5 top-1">
            <CopyButton text={event.output || event.preview || ""} />
          </div>
          {event.preview && (
            <pre className="overflow-x-auto whitespace-pre-wrap break-all font-mono text-[11px] text-mutedlo pr-16">
              {event.preview}
            </pre>
          )}
          {event.output && (
            <pre
              className={`overflow-x-auto whitespace-pre-wrap break-all font-mono text-[11px] text-parch pr-16 ${
                event.preview ? "mt-1.5 border-t border-hair pt-1.5" : ""
              }`}
            >
              {event.output}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
