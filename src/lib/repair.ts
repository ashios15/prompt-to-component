import { critique, formatIssuesForRepair, type CriticReport } from "./critic";

export type TracePhase = "generate" | "critic" | "repair" | "done";

export interface TraceEvent {
  phase: TracePhase;
  /** 0-based index; increments on each repair attempt. */
  attempt: number;
  code?: string;
  report?: CriticReport;
  note?: string;
}

export interface RepairOptions {
  /** Maximum repair attempts after the initial generation. Default: 2. */
  maxRepairs?: number;
}

export interface GenerateFn {
  (kind: "initial" | "repair", payload: GeneratePayload): Promise<string>;
}

export type GeneratePayload =
  | { kind: "initial"; prompt: string; currentCode?: string }
  | { kind: "repair"; prompt: string; code: string; feedback: string };

export interface LoopResult {
  code: string;
  report: CriticReport;
  attempts: number;
  trace: TraceEvent[];
}

/**
 * Generator → Critic → (Repair → Critic)* loop.
 *
 * Pure orchestration: takes a `generate` function that does the actual LLM
 * calls. The loop itself is fully deterministic and unit-testable with a
 * stubbed generator.
 */
export async function generateWithRepair(
  prompt: string,
  generate: GenerateFn,
  options: RepairOptions = {},
  currentCode?: string,
  onEvent?: (e: TraceEvent) => void
): Promise<LoopResult> {
  const maxRepairs = options.maxRepairs ?? 2;
  const trace: TraceEvent[] = [];

  const emit = (event: TraceEvent) => {
    trace.push(event);
    onEvent?.(event);
  };

  // --- Initial generation --------------------------------------------------
  let code = stripCodeFences(
    await generate("initial", { kind: "initial", prompt, currentCode })
  );
  let report = critique(code);
  emit({ phase: "generate", attempt: 0, code });
  emit({ phase: "critic", attempt: 0, report });

  // --- Repair loop ---------------------------------------------------------
  let attempt = 0;
  while (!report.ok && attempt < maxRepairs) {
    attempt++;
    const feedback = formatIssuesForRepair(report.issues);
    const repaired = stripCodeFences(
      await generate("repair", {
        kind: "repair",
        prompt,
        code,
        feedback,
      })
    );
    emit({ phase: "repair", attempt, code: repaired, note: feedback });
    code = repaired;
    report = critique(code);
    emit({ phase: "critic", attempt, report });
  }

  emit({
    phase: "done",
    attempt,
    note: report.ok ? "clean" : "gave up after max repairs",
  });

  return { code, report, attempts: attempt, trace };
}

/**
 * Strip markdown code fences the model sometimes adds despite being told not to.
 */
export function stripCodeFences(raw: string): string {
  let code = raw.trim();
  code = code.replace(/^```(?:tsx?|jsx?|javascript|typescript)?\r?\n?/i, "");
  code = code.replace(/\r?\n?```\s*$/i, "");
  return code.trim();
}
