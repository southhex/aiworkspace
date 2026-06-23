import { describe, it, expect } from "vitest";
import { mapRunsEvent } from "../lib/runsEvents";

describe("mapRunsEvent", () => {
  it("maps message.delta to a text event", () => {
    expect(mapRunsEvent('{"event":"message.delta","delta":"hi"}')).toEqual({
      kind: "text",
      text: "hi",
    });
  });

  it("maps reasoning.available to a reasoning event", () => {
    expect(
      mapRunsEvent('{"event":"reasoning.available","text":"let me think"}'),
    ).toEqual({ kind: "reasoning", text: "let me think" });
  });

  it("maps tool.started with a preview", () => {
    expect(
      mapRunsEvent(
        '{"event":"tool.started","tool":"execute_code","preview":"from datetime"}',
      ),
    ).toEqual({
      kind: "tool",
      tool: "execute_code",
      status: "started",
      preview: "from datetime",
    });
  });

  it("maps tool.completed, converting duration seconds to ms", () => {
    expect(
      mapRunsEvent(
        '{"event":"tool.completed","tool":"execute_code","duration":0.105,"error":false}',
      ),
    ).toEqual({
      kind: "tool",
      tool: "execute_code",
      status: "completed",
      durationMs: 105,
      error: false,
    });
  });

  it("flags tool errors", () => {
    const ev = mapRunsEvent(
      '{"event":"tool.completed","tool":"x","error":true}',
    );
    expect(ev).toMatchObject({ kind: "tool", status: "completed", error: true });
  });

  it("maps run.completed to a done event", () => {
    expect(
      mapRunsEvent('{"event":"run.completed","output":"done","usage":{}}'),
    ).toEqual({ kind: "done" });
  });

  it("ignores unknown events, [DONE], empty, and malformed payloads", () => {
    expect(mapRunsEvent('{"event":"run.started"}')).toBeNull();
    expect(mapRunsEvent("[DONE]")).toBeNull();
    expect(mapRunsEvent("")).toBeNull();
    expect(mapRunsEvent("not json")).toBeNull();
    expect(mapRunsEvent('{"event":"message.delta"}')).toBeNull(); // missing delta
  });
});
