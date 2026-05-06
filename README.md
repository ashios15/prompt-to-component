# @ashios15/prompt-to-component

> **Prompt → React component, with a closed feedback loop.** The LLM writes JSX, a deterministic AST critic checks it, and any failures are fed back to the model for a targeted fix — all without a human in the loop. Live preview via Sandpack, editable in Monaco.

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![AI SDK](https://img.shields.io/badge/AI%20SDK-v4-purple)
![Tests](https://img.shields.io/badge/tests-21%20passing-green)
![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)

## The angle

Most "prompt → code" demos you've seen are one-shot: prompt in, whatever-the-model-said out. They break silently on malformed JSX, hallucinated imports, or `dangerouslySetInnerHTML` footguns.

This one runs a **generate → critique → repair** loop:

```
 ┌──────────┐       ┌────────────────┐       ┌──────────┐
 │  Model   │──JSX─▶│ Static critic  │──ok──▶│  Render  │
 │ (stream) │       │  (Babel AST)   │       └──────────┘
 └──────────┘       └───────┬────────┘
       ▲                    │ issues
       │  "fix these"       ▼
       └─────────────┐ ┌────────────┐
                     └─│   Repair   │  (up to N iterations)
                       └────────────┘
```

The critic is **pure TypeScript, zero API calls, 21 unit tests**. That's the defensible part: the loop can demonstrate reliability without needing the LLM at all in CI.

## What the critic catches

Implemented in [`src/lib/critic.ts`](src/lib/critic.ts) using `@babel/parser` + a `@babel/traverse` pass:

| Check | Severity | Example that fails |
|---|---|---|
| Syntax / balanced JSX | error | `<div><span></div>` |
| Exactly one default export | error | No `export default` / multiple defaults |
| No imports from non-allowlisted packages | error | `import { chart } from "victory-native"` |
| No `dangerouslySetInnerHTML` | error | XSS footgun |
| Hooks only at top level | error | `if (x) useState()` |
| No `eval` / `new Function` | error | Arbitrary code execution |
| Default allowlist | — | `react`, `react-dom`, standard hooks only |

The allowlist is configurable per call:

```ts
import { critique } from "@/lib/critic";

const report = critique(code, {
  allowedImports: ["react", "clsx"],
});

if (!report.ok) {
  console.log(report.issues); // [{ severity, rule, message, line }]
}
```

## The repair loop

[`src/lib/repair.ts`](src/lib/repair.ts) orchestrates generator → critic → (repair)*. It takes a `GenerateFn` as input — a tiny seam that makes the whole loop unit-testable with a fake LLM:

```ts
const result = await runRepairLoop({
  prompt: "A pricing card with 3 tiers",
  generate: myLLMWrapper,       // swap for a stub in tests
  maxRepairs: 2,
  onTrace: (event) => stream.write(event),
});

result.code        // final code (repaired or original)
result.ok          // true iff critic passed
result.iterations  // how many repair rounds were used
result.trace       // full event log — surfaced to the UI
```

Each step emits a typed `TraceEvent` — the API route streams these as NDJSON to the browser, which renders them in a live trace panel so the loop is **visible, not magic**.

## Run it

```bash
git clone https://github.com/ashios15/prompt-to-component.git
cd prompt-to-component
npm install
cp .env.example .env.local   # add OPENAI_API_KEY=sk-…
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Switch providers

```bash
# default: OpenAI gpt-4o-mini
OPENAI_API_KEY=sk-…

# or Claude:
PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-…
```

## Tests

```bash
npm test          # 21 passing — critic + repair loop
npm run typecheck
npm run build
```

The critic tests cover:
- parse errors, missing/multiple default exports, unbalanced JSX
- disallowed imports (with and without a custom allowlist)
- `dangerouslySetInnerHTML`, `eval`, `new Function`
- hooks in conditionals, loops, and early returns
- happy path: clean generated code passes

The repair tests cover:
- first-pass clean code skips repair
- failing code triggers a repair call with critic issues in the prompt
- max-iterations cap
- trace ordering (generate → critic → repair → done)
- code-fence stripping (```` ```tsx ```` …)

## Architecture

```
src/
├── lib/
│   ├── critic.ts       # pure AST checker — the deterministic guardrail
│   └── repair.ts       # generate → critique → repair orchestration
├── app/
│   ├── page.tsx        # prompt input + trace + editor + preview layout
│   └── api/generate/
│       └── route.ts    # NDJSON stream of TraceEvents
└── components/
    ├── prompt-input.tsx
    ├── trace-panel.tsx    # renders the live loop trace
    ├── code-editor.tsx    # Monaco
    ├── live-preview.tsx   # Sandpack
    └── history-sidebar.tsx

tests/
├── critic.test.ts     # 13 tests
└── repair.test.ts     # 8 tests (stubbed LLM)
```

## Example prompts

- "A pricing card with 3 tiers, the middle one highlighted"
- "A testimonial carousel with prev/next buttons"
- "A login form with email + password validation"
- "A stats grid with 4 KPI cards and trend indicators"

## Why this shape?

- **Failures are typed, not silent.** Every rejection has a rule id, line number, and message — the repair prompt uses these directly.
- **The critic runs in CI.** No API key, no flake, no cost — just Babel and assertions. The reliability claim is testable.
- **Provider-agnostic.** OpenAI default, Anthropic via env. The loop logic doesn't care.
- **No hidden magic.** The trace panel shows every phase, so you can *see* the loop working (or failing) in real time.

## License

MIT © [ashios15](https://github.com/ashios15)
# Prompt to Component

A **mini v0 clone** — describe a React component in plain English and get a working, editable component with a live preview. Built with **Next.js 15**, **AI SDK**, **Monaco Editor**, and **Sandpack**.

## Features

- **Natural Language → Code**: Describe any React component and get working JSX instantly
- **Live Preview**: See your component rendered in real-time via Sandpack
- **Code Editor**: Full Monaco Editor with syntax highlighting and editing
- **Iterative Refinement**: Refine generated components with follow-up prompts
- **Generation History**: Browse and restore previous generations
- **Example Prompts**: Quick-start with curated component ideas

## How It Works

```
User Prompt → AI SDK (GPT-4o-mini) → Generated JSX → Monaco Editor + Sandpack Preview
                                                            ↑
                                              Refinement prompts loop back
```

1. User describes a component in natural language
2. The API route sends the prompt to GPT-4o-mini with a system prompt enforcing clean JSX output
3. Generated code appears in the Monaco Editor and renders live in Sandpack
4. User can refine the component with follow-up prompts or edit code directly

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| AI | Vercel AI SDK v4 + OpenAI GPT-4o-mini |
| Code Editor | Monaco Editor (@monaco-editor/react) |
| Live Preview | Sandpack (@codesandbox/sandpack-react) |
| Styling | Tailwind CSS |
| Language | TypeScript 5 |

## Getting Started

```bash
# Install dependencies
npm install

# Set your OpenAI API key
cp .env.example .env
# Edit .env with your key

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Example Prompts

- "A pricing card with 3 tiers"
- "A testimonial carousel"
- "A login form with validation"
- "A kanban board with draggable cards"
- "A weather widget"
- "An animated counter dashboard"

## Architecture

```
src/
├── app/
│   ├── api/generate/route.ts   # AI generation endpoint
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Main workspace UI
│   └── globals.css              # Tailwind base styles
└── components/
    ├── prompt-input.tsx          # Input with example prompts
    ├── code-editor.tsx           # Monaco Editor wrapper
    ├── live-preview.tsx          # Sandpack preview wrapper
    └── history-sidebar.tsx       # Generation history panel
```

## License

MIT
