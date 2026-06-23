"use client";

import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChevronRight, Wrench, Check, X } from "lucide-react";
import type { ChatMessage, ToolEvent } from "@/lib/types";
import { Spinner } from "@/components/Spinner";

export function MessageList({
  messages,
  streaming,
}: {
  messages: ChatMessage[];
  streaming: boolean;
}) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, streaming]);

  const visible = messages.filter((m) => m.role !== "system");

  if (visible.length === 0) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center">
        <div className="max-w-md">
          <div className="mb-6 font-mono text-[11px] uppercase tracking-[0.34em] text-lapis">
            ❯ THE MIND IS ITS OWN PLACE
          </div>
          <h1 className="mb-4 font-display text-[46px] font-semibold uppercase tracking-[0.1em] text-marble">
            NIPHATES
          </h1>
          <div
            className="mx-auto mb-5 h-px w-48"
            style={{
              background:
                "linear-gradient(to right, transparent, var(--gold), transparent)",
            }}
          />
          <p className="font-read italic text-[16px] text-parch">
            Summon the agent. Hermes is ready out of the box — add more
            providers in Settings.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-col gap-5 px-6 pt-[26px] pb-8">
      {visible.map((m, i) => {
        const isUser = m.role === "user";
        const isLast = i === visible.length - 1;
        const waiting = !isUser && !m.content && streaming && isLast;

        if (isUser) {
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
        }

        return (
          <div key={i}>
            <div className="mb-1 font-mono text-[10.5px] uppercase tracking-[0.28em] text-porphlbl">
              NIPHATES
            </div>
            {m.reasoning ? <ReasoningBlock text={m.reasoning} /> : null}
            {m.toolCalls && m.toolCalls.length > 0 ? (
              <div className="mb-2 flex flex-col gap-1">
                {m.toolCalls.map((t, ti) => (
                  <ToolCard key={ti} event={t} />
                ))}
              </div>
            ) : null}
            {waiting ? (
              <div className="flex items-center gap-2.5 text-gold">
                <Spinner className="text-[15px]" />
                <span className="font-read italic text-[16px] text-parch">
                  summoning…
                </span>
              </div>
            ) : (
              <div className="msg-content font-read text-[16px] leading-[1.62] text-agentbody">
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
}

/** Collapsible thinking/reasoning preview, folded by default. */
function ReasoningBlock({ text }: { text: string }) {
  return (
    <details className="group mb-2 border-l-2 border-hair pl-3">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.24em] text-mutedlo hover:text-parch">
        <ChevronRight
          size={12}
          className="transition-transform group-open:rotate-90"
        />
        Reasoning
      </summary>
      <div className="mt-1.5 whitespace-pre-wrap font-read text-[14px] italic leading-[1.55] text-parch">
        {text}
      </div>
    </details>
  );
}

/** One tool invocation: name, input preview, and running/done/error state. */
function ToolCard({ event }: { event: ToolEvent }) {
  const running = event.status === "started";
  const icon = running ? (
    <Spinner className="text-[12px]" />
  ) : event.error ? (
    <X size={13} className="text-carnelian" />
  ) : (
    <Check size={13} className="text-malach" />
  );
  return (
    <div className="flex items-start gap-2 border border-hair bg-panel px-2.5 py-1.5">
      <span className="mt-[2px] flex h-4 w-4 shrink-0 items-center justify-center text-gold">
        {running ? icon : <Wrench size={12} />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 font-mono text-[12px] text-marble">
          <span className="truncate">{event.tool || "tool"}</span>
          {!running && (
            <span className="flex items-center gap-1 text-mutedlo">
              {icon}
              {event.durationMs != null && (
                <span className="text-[10.5px]">
                  {event.durationMs < 1000
                    ? `${event.durationMs}ms`
                    : `${(event.durationMs / 1000).toFixed(2)}s`}
                </span>
              )}
            </span>
          )}
        </div>
        {event.preview ? (
          <div className="mt-0.5 truncate font-mono text-[11px] text-mutedlo">
            {event.preview}
          </div>
        ) : null}
      </div>
    </div>
  );
}
