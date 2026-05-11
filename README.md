# @ashios15/prompt-to-component

> **Prompt → React component, with a closed feedback loop.** The LLM writes JSX, a deterministic AST critic checks it, and any failures are fed back to the model for a targeted fix — all without a human in the loop. Live preview via Sandpack, editable in Monaco.

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![AI SDK](https://img.shields.io/badge/AI%20SDK-v4-purple)
![Tests](https://img.shields.io/badge/tests-21%20passing-green)
![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)

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
