import { describe, it, expect } from "vitest";
import {
  applyToolEvent,
  appendReasoningDelta,
  appendTextDelta,
  formatDuration,
  groupToolRuns,
  hoistReasoning,
  mergeAdjacentText,
} from "../lib/blocks";
import type { ChatBlock, ChatMessage } from "../lib/types";

function assistant(blocks?: ChatBlock[]): ChatMessage {
  return {
    role: "assistant",
    content: "",
    ...(blocks ? { blocks } : {}),
  };
}

describe("mergeAdjacentText", () => {
  it("returns an empty array unchanged", () => {
    expect(mergeAdjacentText([])).toEqual([]);
  });

  it("passes a single text block through with a fresh copy", () => {
    const input = { type: "text" as const, text: "hi" };
    const out = mergeAdjacentText([input]);
    expect(out).toEqual([{ type: "text", text: "hi" }]);
    // The function spreads each non-merged block, so the output is a copy —
    // mutating one must not affect the other.
    expect(out[0]).not.toBe(input);
  });

  it("merges two adjacent text blocks into one", () => {
    const out = mergeAdjacentText([
      { type: "text", text: "hello " },
      { type: "text", text: "world" },
    ]);
    expect(out).toEqual([{ type: "text", text: "hello world" }]);
  });

  it("merges three adjacent text blocks into one", () => {
    const out = mergeAdjacentText([
      { type: "text", text: "a" },
      { type: "text", text: "b" },
      { type: "text", text: "c" },
    ]);
    expect(out).toEqual([{ type: "text", text: "abc" }]);
  });

  it("does not merge text blocks separated by a reasoning block", () => {
    const out = mergeAdjacentText([
      { type: "text", text: "before " },
      { type: "reasoning", text: "thinking" },
      { type: "text", text: "after" },
    ]);
    expect(out).toHaveLength(3);
    expect(out[0]).toEqual({ type: "text", text: "before " });
    expect(out[1]).toEqual({ type: "reasoning", text: "thinking" });
    expect(out[2]).toEqual({ type: "text", text: "after" });
  });

  it("merges interleaved text runs but leaves tool blocks alone", () => {
    const out = mergeAdjacentText([
      { type: "text", text: "a " },
      { type: "text", text: "b " },
      { type: "tool", tool: "x", status: "started" },
      { type: "text", text: "c " },
      { type: "text", text: "d" },
    ]);
    expect(out).toEqual([
      { type: "text", text: "a b " },
      { type: "tool", tool: "x", status: "started" },
      { type: "text", text: "c d" },
    ]);
  });

  it("does not mutate the input array or its blocks", () => {
    const input: ChatBlock[] = [
      { type: "text", text: "a" },
      { type: "text", text: "b" },
    ];
    const snapshot = JSON.parse(JSON.stringify(input));
    mergeAdjacentText(input);
    expect(input).toEqual(snapshot);
  });
});

describe("formatDuration", () => {
  it("renders sub-second values as whole milliseconds", () => {
    expect(formatDuration(0)).toBe("0ms");
    expect(formatDuration(42)).toBe("42ms");
    expect(formatDuration(999)).toBe("999ms");
  });

  it("rounds fractional milliseconds", () => {
    expect(formatDuration(42.6)).toBe("43ms");
  });

  it("renders one second and above as seconds with two decimals", () => {
    expect(formatDuration(1000)).toBe("1.00s");
    expect(formatDuration(1500)).toBe("1.50s");
    expect(formatDuration(12345)).toBe("12.35s");
  });
});

describe("hoistReasoning", () => {
  it("returns an empty array unchanged", () => {
    expect(hoistReasoning([])).toEqual([]);
  });

  it("moves a trailing reasoning block above the text it follows", () => {
    const out = hoistReasoning([
      { type: "text", text: "answer" },
      { type: "reasoning", text: "why" },
    ]);
    expect(out).toEqual([
      { type: "reasoning", text: "why" },
      { type: "text", text: "answer" },
    ]);
  });

  it("leaves already thinking-first order unchanged", () => {
    const input: ChatBlock[] = [
      { type: "reasoning", text: "why" },
      { type: "text", text: "answer" },
    ];
    expect(hoistReasoning(input)).toEqual(input);
  });

  it("hoists per tool-bounded segment without moving tools", () => {
    const out = hoistReasoning([
      { type: "text", text: "a" },
      { type: "reasoning", text: "r1" },
      { type: "tool", tool: "x", status: "completed" },
      { type: "text", text: "b" },
      { type: "reasoning", text: "r2" },
    ]);
    expect(out).toEqual([
      { type: "reasoning", text: "r1" },
      { type: "text", text: "a" },
      { type: "tool", tool: "x", status: "completed" },
      { type: "reasoning", text: "r2" },
      { type: "text", text: "b" },
    ]);
  });

  it("preserves relative order among same-kind blocks in a segment", () => {
    const out = hoistReasoning([
      { type: "text", text: "t1" },
      { type: "reasoning", text: "r1" },
      { type: "text", text: "t2" },
      { type: "reasoning", text: "r2" },
    ]);
    expect(out).toEqual([
      { type: "reasoning", text: "r1" },
      { type: "reasoning", text: "r2" },
      { type: "text", text: "t1" },
      { type: "text", text: "t2" },
    ]);
  });
});

describe("groupToolRuns", () => {
  it("returns an empty array unchanged", () => {
    expect(groupToolRuns([])).toEqual([]);
  });

  it("leaves a lone tool block ungrouped", () => {
    const out = groupToolRuns([
      { type: "text", text: "a" },
      { type: "tool", tool: "x", status: "started" },
      { type: "text", text: "b" },
    ]);
    expect(out).toEqual([
      { type: "text", text: "a" },
      { type: "tool", tool: "x", status: "started" },
      { type: "text", text: "b" },
    ]);
  });

  it("groups two or more consecutive tool blocks", () => {
    const out = groupToolRuns([
      { type: "tool", tool: "read_file", status: "completed" },
      { type: "tool", tool: "read_file", status: "completed" },
      { type: "tool", tool: "terminal", status: "started" },
    ]);
    expect(out).toEqual([
      {
        type: "tool-group",
        items: [
          { type: "tool", tool: "read_file", status: "completed" },
          { type: "tool", tool: "read_file", status: "completed" },
          { type: "tool", tool: "terminal", status: "started" },
        ],
      },
    ]);
  });

  it("breaks a run on an intervening non-tool block", () => {
    const out = groupToolRuns([
      { type: "tool", tool: "a", status: "completed" },
      { type: "tool", tool: "b", status: "completed" },
      { type: "reasoning", text: "hmm" },
      { type: "tool", tool: "c", status: "completed" },
      { type: "tool", tool: "d", status: "completed" },
    ]);
    expect(out).toEqual([
      {
        type: "tool-group",
        items: [
          { type: "tool", tool: "a", status: "completed" },
          { type: "tool", tool: "b", status: "completed" },
        ],
      },
      { type: "reasoning", text: "hmm" },
      {
        type: "tool-group",
        items: [
          { type: "tool", tool: "c", status: "completed" },
          { type: "tool", tool: "d", status: "completed" },
        ],
      },
    ]);
  });

  it("flushes a trailing single tool as a lone block, not a group", () => {
    const out = groupToolRuns([
      { type: "reasoning", text: "x" },
      { type: "tool", tool: "solo", status: "started" },
    ]);
    expect(out).toEqual([
      { type: "reasoning", text: "x" },
      { type: "tool", tool: "solo", status: "started" },
    ]);
  });
});

describe("appendTextDelta", () => {
  it("starts a new text block on an empty message", () => {
    const m = assistant();
    const out = appendTextDelta(m, "hello");
    expect(out.content).toBe("hello");
    expect(out.blocks).toEqual([{ type: "text", text: "hello" }]);
  });

  it("merges consecutive deltas into the trailing text block", () => {
    const m = assistant([{ type: "text", text: "hel" }]);
    const out = appendTextDelta(m, "lo");
    expect(out.content).toBe("lo"); // content was empty, so first delta gives "lo" only — verify
    // Actually content starts as "" then gets +delta appended
    expect(out.content).toBe("lo");
    expect(out.blocks).toEqual([{ type: "text", text: "hello" }]);
  });

  it("starts a new text block when the trailing block is reasoning", () => {
    const m = assistant([{ type: "reasoning", text: "hmm" }]);
    const out = appendTextDelta(m, "answer");
    expect(out.blocks).toEqual([
      { type: "reasoning", text: "hmm" },
      { type: "text", text: "answer" },
    ]);
  });

  it("does not mutate the original message", () => {
    const m = assistant([{ type: "text", text: "a" }]);
    appendTextDelta(m, "b");
    expect(m).toEqual(assistant([{ type: "text", text: "a" }]));
  });
});

describe("appendReasoningDelta", () => {
  it("initializes reasoning and blocks on a bare message", () => {
    const m = assistant();
    const out = appendReasoningDelta(m, "thinking…");
    expect(out.reasoning).toBe("thinking…");
    expect(out.blocks).toEqual([{ type: "reasoning", text: "thinking…" }]);
  });

  it("merges consecutive reasoning deltas", () => {
    const m = assistant([{ type: "reasoning", text: "thin" }]);
    const out = appendReasoningDelta(m, "king");
    expect(out.reasoning).toBe("king"); // reasoning was undefined
    expect(out.blocks).toEqual([{ type: "reasoning", text: "thinking" }]);
  });

  it("starts a new reasoning block when the trailing block is text", () => {
    const m = assistant([{ type: "text", text: "answer" }]);
    const out = appendReasoningDelta(m, "hmm");
    expect(out.blocks).toEqual([
      { type: "text", text: "answer" },
      { type: "reasoning", text: "hmm" },
    ]);
  });
});

describe("applyToolEvent", () => {
  it("appends a fresh tool block on tool.started", () => {
    const m = assistant();
    const out = applyToolEvent(m, { tool: "web_search", status: "started" });
    expect(out.blocks).toEqual([
      { type: "tool", tool: "web_search", status: "started" },
    ]);
    expect(out.toolCalls).toEqual([{ tool: "web_search", status: "started" }]);
  });

  it("settles a previously-started tool block on tool.completed", () => {
    const m = assistant([
      { type: "tool", tool: "web_search", status: "started" },
    ]);
    const out = applyToolEvent(m, {
      tool: "web_search",
      status: "completed",
      durationMs: 42,
    });
    expect(out.blocks).toEqual([
      {
        type: "tool",
        tool: "web_search",
        status: "completed",
        durationMs: 42,
      },
    ]);
    expect(out.toolCalls).toEqual([
      { tool: "web_search", status: "completed", durationMs: 42 },
    ]);
  });

  it("settles the most recent matching open call (LIFO), not the first", () => {
    const m = assistant([
      { type: "tool", tool: "web_search", status: "started" },
      { type: "text", text: "interim" },
      { type: "tool", tool: "web_search", status: "started" },
    ]);
    const out = applyToolEvent(m, {
      tool: "web_search",
      status: "completed",
    });
    expect(out.blocks?.[0]).toMatchObject({
      tool: "web_search",
      status: "started",
    }); // first stays open
    expect(out.blocks?.[1]).toEqual({ type: "text", text: "interim" });
    expect(out.blocks?.[2]).toMatchObject({
      tool: "web_search",
      status: "completed",
    });
  });

  it("appends a new tool block on tool.completed when no matching open call exists", () => {
    const m = assistant();
    const out = applyToolEvent(m, {
      tool: "web_search",
      status: "completed",
      error: true,
    });
    expect(out.blocks).toEqual([
      { type: "tool", tool: "web_search", status: "completed", error: true },
    ]);
  });

  it("does not mutate the input message", () => {
    const m = assistant();
    applyToolEvent(m, { tool: "x", status: "started" });
    expect(m.blocks).toBeUndefined();
    expect(m.toolCalls).toBeUndefined();
  });

  it("preserves the started preview when completion omits it (preview: undefined)", () => {
    const m = assistant([
      { type: "tool", tool: "terminal", status: "started", preview: "ls -la" },
    ]);
    // The client always sends a `preview` key, undefined on completion — it
    // must not clobber the command captured at start time.
    const out = applyToolEvent(m, {
      tool: "terminal",
      status: "completed",
      preview: undefined,
      durationMs: 12,
    });
    expect(out.blocks).toEqual([
      {
        type: "tool",
        tool: "terminal",
        status: "completed",
        preview: "ls -la",
        durationMs: 12,
      },
    ]);
  });

  it("settles output from a completion onto the started block", () => {
    const m = assistant([
      { type: "tool", tool: "read_file", status: "started", preview: "SOUL.md" },
    ]);
    const out = applyToolEvent(m, {
      tool: "read_file",
      status: "completed",
      output: "file contents",
    });
    expect(out.blocks?.[0]).toEqual({
      type: "tool",
      tool: "read_file",
      status: "completed",
      preview: "SOUL.md",
      output: "file contents",
    });
  });
});
