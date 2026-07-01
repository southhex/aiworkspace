// Pure helpers for working with `ChatBlock[]` and the streaming reducers that
// build it. Kept framework-agnostic so the same code is reachable from the
// client (`page.tsx` streaming handler, `MessageList` renderer) and from unit
// tests under `tests/`.

import type { ChatBlock, ChatMessage, ToolEvent } from "./types";

/**
 * Shallow-merge `patch` onto `base`, skipping `patch` keys whose value is
 * `undefined`. Used to settle a `tool.completed` event onto its `started`
 * block without the client's always-present `preview: undefined` clobbering
 * the command captured at start time.
 */
function mergeDefined<T extends object>(base: T, patch: Partial<T>): T {
  const out = { ...base };
  for (const k in patch) {
    const v = patch[k];
    if (v !== undefined) out[k] = v as T[Extract<keyof T, string>];
  }
  return out;
}

/** A tool block within the block list (narrowed from the `ChatBlock` union). */
export type ToolBlock = Extract<ChatBlock, { type: "tool" }>;

/**
 * A render-only shape: either a plain `ChatBlock`, or a run of ≥2 consecutive
 * tool blocks collapsed into one group so the UI can cluster them tightly.
 * Produced by `groupToolRuns`; never persisted.
 */
export type RenderBlock = ChatBlock | { type: "tool-group"; items: ToolBlock[] };

/**
 * Format a millisecond duration for display: sub-second as whole `ms`,
 * otherwise seconds to two decimals. Shared by the live per-tool/turn timers
 * and the settled `durationMs` so a running timer snaps to an identically
 * formatted final value on completion.
 */
export function formatDuration(ms: number): string {
  return ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Cluster runs of ≥2 consecutive tool blocks into a single `tool-group` so the
 * renderer can lay them out tightly. A lone tool block (not part of a run), and
 * every non-tool block, passes through unchanged. A text/reasoning block breaks
 * the run. Pure and render-only — mirrors `mergeAdjacentText`; apply it after.
 */
export function groupToolRuns(blocks: ChatBlock[]): RenderBlock[] {
  const out: RenderBlock[] = [];
  let run: ToolBlock[] = [];

  const flush = () => {
    if (run.length >= 2) {
      out.push({ type: "tool-group", items: run });
    } else if (run.length === 1) {
      out.push(run[0]);
    }
    run = [];
  };

  for (const block of blocks) {
    if (block.type === "tool") {
      run.push(block);
    } else {
      flush();
      out.push(block);
    }
  }
  flush();
  return out;
}

/**
 * Ensure reasoning renders above the output it produced: within each maximal
 * run of non-tool blocks, all `reasoning` blocks are pulled ahead of the
 * `text` blocks (relative order preserved within each kind). Tool blocks act as
 * barriers, so the chronological position of tool calls is never disturbed —
 * only a step's "Thinking" and its answer text are ordered thinking-first.
 *
 * This matters because Hermes can emit a step's `reasoning.available` after its
 * `message.delta` text, which would otherwise render "Thinking" below its
 * answer. Pure and render-only; apply before `mergeAdjacentText`.
 */
export function hoistReasoning(blocks: ChatBlock[]): ChatBlock[] {
  const out: ChatBlock[] = [];
  let reasoning: ChatBlock[] = [];
  let text: ChatBlock[] = [];

  const flush = () => {
    out.push(...reasoning, ...text);
    reasoning = [];
    text = [];
  };

  for (const block of blocks) {
    if (block.type === "tool") {
      flush();
      out.push(block);
    } else if (block.type === "reasoning") {
      reasoning.push(block);
    } else {
      text.push(block);
    }
  }
  flush();
  return out;
}

/**
 * Collapse runs of adjacent text blocks into a single block whose `text` is
 * the concatenation of all of them. The plan explicitly asks for this so
 * ReactMarkdown re-renders one accumulated answer (matches the pre-blocks
 * behavior) instead of N tiny paragraphs. Other block types pass through.
 */
export function mergeAdjacentText(blocks: ChatBlock[]): ChatBlock[] {
  const merged: ChatBlock[] = [];
  for (const block of blocks) {
    if (
      block.type === "text" &&
      merged.length > 0 &&
      merged[merged.length - 1].type === "text"
    ) {
      const last = merged[merged.length - 1] as Extract<ChatBlock, { type: "text" }>;
      merged[merged.length - 1] = {
        type: "text",
        text: last.text + block.text,
      };
    } else {
      merged.push({ ...block });
    }
  }
  return merged;
}

/**
 * Append a streamed text delta to an in-flight assistant message. Adjacent
 * deltas merge into the trailing text block so the block list doesn't grow
 * one entry per token. The flat `content` field is also kept in sync for
 * backward-compat read paths (search, persistence, legacy renderer).
 */
export function appendTextDelta(last: ChatMessage, delta: string): ChatMessage {
  const blocks = [...(last.blocks ?? [])];
  const lastBlock = blocks[blocks.length - 1];
  if (lastBlock?.type === "text") {
    blocks[blocks.length - 1] = {
      type: "text",
      text: lastBlock.text + delta,
    };
  } else {
    blocks.push({ type: "text", text: delta });
  }
  return { ...last, content: last.content + delta, blocks };
}

/**
 * Append a streamed reasoning delta. Mirrors `appendTextDelta` but for
 * reasoning blocks, and updates the legacy `reasoning` flat field.
 */
export function appendReasoningDelta(last: ChatMessage, text: string): ChatMessage {
  const blocks = [...(last.blocks ?? [])];
  const lastBlock = blocks[blocks.length - 1];
  if (lastBlock?.type === "reasoning") {
    blocks[blocks.length - 1] = {
      type: "reasoning",
      text: lastBlock.text + text,
    };
  } else {
    blocks.push({ type: "reasoning", text });
  }
  return {
    ...last,
    reasoning: (last.reasoning ?? "") + text,
    blocks,
  };
}

/**
 * Apply a `tool.started` / `tool.completed` event to the in-flight assistant
 * message. Walks `blocks` (and `toolCalls`) backwards to settle the most
 * recent matching `started` event — this mirrors how Hermes' run-events API
 * emits the pair, and the plan accepts that the first matching open call
 * wins. Returns a new `ChatMessage`; never mutates `last`.
 */
export function applyToolEvent(last: ChatMessage, event: ToolEvent): ChatMessage {
  const blocks = [...(last.blocks ?? [])];
  const calls = [...(last.toolCalls ?? [])];

  if (event.status === "completed") {
    // Settle the most recent matching `started` tool block.
    let blockUpdated = false;
    for (let i = blocks.length - 1; i >= 0; i--) {
      const b = blocks[i];
      if (b.type === "tool" && b.tool === event.tool && b.status === "started") {
        blocks[i] = mergeDefined(b, event);
        blockUpdated = true;
        break;
      }
    }
    if (!blockUpdated) blocks.push({ type: "tool", ...event });

    // Mirror against the flat toolCalls array for backward-compat read paths.
    for (let i = calls.length - 1; i >= 0; i--) {
      if (calls[i].tool === event.tool && calls[i].status === "started") {
        calls[i] = mergeDefined(calls[i], event);
        return { ...last, toolCalls: calls, blocks };
      }
    }
  } else {
    // tool.started — push a fresh block
    blocks.push({ type: "tool", ...event });
  }
  calls.push(event);
  return { ...last, toolCalls: calls, blocks };
}
