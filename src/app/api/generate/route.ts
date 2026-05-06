import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { generateText, type LanguageModelV1 } from "ai";
import {
  generateWithRepair,
  type GeneratePayload,
  type TraceEvent,
} from "@/lib/repair";

export const runtime = "nodejs";
export const maxDuration = 60;

const INITIAL_SYSTEM = `You are a React component generator. Output ONLY valid JSX/TSX code — no prose, no markdown, no code fences.

Hard rules (a deterministic AST critic will reject anything that violates these):
- Exactly one \`export default\` — a function component.
- No imports from anything except "react".
- No \`dangerouslySetInnerHTML\`.
- Hooks at the top level of the component only; never inside if/ternary/loop.
- Use inline styles only — no CSS imports, no className libraries.
- Component must be self-contained. Good spacing, colors, typography.
- Do NOT import React (globally available in the preview).

Use \`export default function Component() { ... }\` as the signature.`;

const REFINE_SYSTEM = `You are a React component editor. Apply the user's requested change to the existing component.

Preserve overall structure unless told otherwise. Output ONLY the modified code — no markdown, no explanations. Same rules as initial generation (one default export, no unknown imports, no dangerouslySetInnerHTML, hooks at top level, inline styles).`;

const REPAIR_SYSTEM = `You are a React code repair agent. The previous component failed static checks. Fix ONLY the reported issues, preserve everything else.

Output ONLY the corrected code — no prose, no markdown, no code fences.`;

function resolveModel(): LanguageModelV1 {
  const provider = process.env.PROVIDER?.toLowerCase();
  if (provider === "anthropic") {
    return anthropic(process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-20250514");
  }
  return openai(process.env.OPENAI_MODEL ?? "gpt-4o-mini");
}

export async function POST(req: Request) {
  const body = (await req.json()) as {
    prompt: string;
    currentCode?: string;
    isRefinement?: boolean;
  };
  const { prompt, currentCode, isRefinement } = body;

  const model = resolveModel();

  const generate = async (
    kind: "initial" | "repair",
    payload: GeneratePayload
  ): Promise<string> => {
    if (kind === "initial") {
      const system = isRefinement ? REFINE_SYSTEM : INITIAL_SYSTEM;
      const user =
        isRefinement && payload.kind === "initial" && payload.currentCode
          ? `Here is the current component:\n\n${payload.currentCode}\n\nApply this change: ${payload.prompt}`
          : `Generate a React component: ${payload.prompt}`;
      const result = await generateText({
        model,
        system,
        messages: [{ role: "user", content: user }],
        temperature: 0.3,
        maxTokens: 2048,
      });
      return result.text;
    }

    // Repair call
    if (payload.kind !== "repair") {
      throw new Error("repair generator expected repair payload");
    }
    const user = [
      `The following React component failed static checks.`,
      ``,
      `--- component ---`,
      payload.code,
      `--- end component ---`,
      ``,
      `Issues to fix:`,
      payload.feedback,
      ``,
      `Return the corrected component as plain JSX. No prose.`,
    ].join("\n");
    const result = await generateText({
      model,
      system: REPAIR_SYSTEM,
      messages: [{ role: "user", content: user }],
      temperature: 0.1,
      maxTokens: 2048,
    });
    return result.text;
  };

  // Stream trace events as NDJSON so the UI can show the loop live.
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: TraceEvent | { phase: "error"; message: string }) => {
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      };

      try {
        const result = await generateWithRepair(
          prompt,
          generate,
          { maxRepairs: 2 },
          currentCode,
          (event) => send(event)
        );
        send({
          phase: "done",
          attempt: result.attempts,
          code: result.code,
          report: result.report,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        send({ phase: "error", message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
