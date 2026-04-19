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
