import { describe, it, expect, vi } from "vitest";
import { generateWithRepair, stripCodeFences } from "../src/lib/repair";

const BAD_CODE = `import _ from "lodash";
export default function C() { return <div/>; }`;

const GOOD_CODE = `export default function C() { return <div>hello</div>; }`;

describe("generateWithRepair", () => {
  it("returns immediately when the first generation is clean", async () => {
    const gen = vi.fn(async () => GOOD_CODE);
    const result = await generateWithRepair("make a card", gen);
    expect(result.code).toBe(GOOD_CODE);
    expect(result.attempts).toBe(0);
    expect(result.report.ok).toBe(true);
    expect(gen).toHaveBeenCalledTimes(1);
    expect(result.trace.map((t) => t.phase)).toEqual(["generate", "critic", "done"]);
  });

  it("repairs when the first generation is bad", async () => {
    const gen = vi
      .fn<(kind: unknown, payload: unknown) => Promise<string>>()
      .mockResolvedValueOnce(BAD_CODE)
      .mockResolvedValueOnce(GOOD_CODE);
    const result = await generateWithRepair("make a card", gen);
    expect(result.code).toBe(GOOD_CODE);
    expect(result.attempts).toBe(1);
    expect(result.report.ok).toBe(true);
    expect(gen).toHaveBeenCalledTimes(2);
    expect(gen.mock.calls[1]?.[0]).toBe("repair");
  });

  it("gives up after maxRepairs", async () => {
    const gen = vi.fn(async () => BAD_CODE);
    const result = await generateWithRepair("x", gen, { maxRepairs: 2 });
    expect(result.attempts).toBe(2);
    expect(result.report.ok).toBe(false);
    expect(gen).toHaveBeenCalledTimes(3); // 1 initial + 2 repairs
    const lastDone = result.trace.at(-1);
    expect(lastDone?.phase).toBe("done");
    expect(lastDone?.note).toMatch(/gave up/);
  });

  it("emits events in order", async () => {
    const gen = vi
      .fn<(kind: unknown, payload: unknown) => Promise<string>>()
      .mockResolvedValueOnce(BAD_CODE)
      .mockResolvedValueOnce(GOOD_CODE);
    const events: string[] = [];
    await generateWithRepair("x", gen, {}, undefined, (e) => events.push(e.phase));
    expect(events).toEqual(["generate", "critic", "repair", "critic", "done"]);
  });

  it("passes feedback from critic into the repair call", async () => {
    const gen = vi
      .fn<(kind: unknown, payload: unknown) => Promise<string>>()
      .mockResolvedValueOnce(BAD_CODE)
      .mockResolvedValueOnce(GOOD_CODE);
    await generateWithRepair("x", gen);
    const repairCall = gen.mock.calls[1]?.[1] as {
      kind: string;
      feedback: string;
      code: string;
    };
    expect(repairCall.kind).toBe("repair");
    expect(repairCall.feedback).toContain("import-not-allowed");
    expect(repairCall.code).toBe(BAD_CODE);
  });
});

describe("stripCodeFences", () => {
  it("removes ```tsx fences", () => {
    expect(stripCodeFences("```tsx\nexport default 1;\n```")).toBe("export default 1;");
  });
  it("removes bare ``` fences", () => {
    expect(stripCodeFences("```\nfoo\n```")).toBe("foo");
  });
  it("leaves un-fenced code alone", () => {
    expect(stripCodeFences("  foo  ")).toBe("foo");
  });
});
