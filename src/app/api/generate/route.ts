import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { NextResponse } from "next/server";

const SYSTEM_PROMPT = `You are a React component generator. You output ONLY valid JSX/TSX code, nothing else.

Rules:
- Output a single default-exported React functional component
- Use inline styles (no CSS imports, no Tailwind classes)
- The component must be self-contained — no external imports except React hooks
- Use modern React patterns (hooks, functional components)
- Make the component visually polished with good spacing, colors, and typography
- Use a clean, modern design aesthetic (subtle shadows, rounded corners, good contrast)
- If the user asks for interactivity, implement it with useState/useEffect
- The component should look good on a white background
- Do NOT include any markdown formatting, code fences, or explanation — output ONLY the code
- Do NOT import React (it's available globally in the preview environment)
- Use \`export default function Component()\` as the component signature`;

const REFINE_PROMPT = `You are a React component editor. The user has an existing component and wants to modify it.

Rules:
- Take the existing code and apply the requested changes
- Preserve the overall structure unless the user explicitly asks to change it
- Output ONLY the modified code, no explanations
- Follow the same rules as before: inline styles, self-contained, default export
- Do NOT include markdown formatting or code fences`;

export async function POST(req: Request) {
  const { prompt, currentCode, isRefinement } = await req.json();

  const messages = isRefinement
    ? [
        { role: "system" as const, content: REFINE_PROMPT },
        {
          role: "user" as const,
          content: `Here is the current component:\n\n${currentCode}\n\nPlease make this change: ${prompt}`,
        },
      ]
    : [
        { role: "system" as const, content: SYSTEM_PROMPT },
        {
          role: "user" as const,
          content: `Generate a React component: ${prompt}`,
        },
      ];

  const result = await generateText({
    model: openai("gpt-4o-mini"),
    messages,
    temperature: 0.3,
    maxTokens: 2048,
  });

  // Strip any markdown code fences if the model includes them
  let code = result.text.trim();
  code = code.replace(/^```(?:tsx?|jsx?|javascript|typescript)?\n?/i, "");
  code = code.replace(/\n?```$/i, "");

  return NextResponse.json({ code });
}
