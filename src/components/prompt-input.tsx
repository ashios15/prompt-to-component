"use client";

import { useState, FormEvent } from "react";

interface PromptInputProps {
  onGenerate: (prompt: string) => void;
  onRefine: (refinement: string) => void;
  isGenerating: boolean;
  hasCode: boolean;
}

export function PromptInput({
  onGenerate,
  onRefine,
  isGenerating,
  hasCode,
}: PromptInputProps) {
  const [input, setInput] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isGenerating) return;

    if (hasCode) {
      onRefine(trimmed);
    } else {
      onGenerate(trimmed);
    }
    setInput("");
  };

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex gap-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            hasCode
              ? "Refine: e.g. 'add a dark mode toggle' or 'make it responsive'"
              : "Describe a component: e.g. 'a responsive card grid with hover effects'"
          }
          disabled={isGenerating}
          className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isGenerating || !input.trim()}
          className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors shrink-0"
        >
          {isGenerating ? (
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Generating
            </span>
          ) : hasCode ? (
            "Refine"
          ) : (
            "Generate"
          )}
        </button>
      </form>
      {!hasCode && (
        <div className="flex gap-2 mt-3 flex-wrap">
          {EXAMPLES.map((example) => (
            <button
              key={example}
              onClick={() => {
                setInput(example);
                onGenerate(example);
              }}
              disabled={isGenerating}
              className="text-xs rounded-md border border-zinc-800 px-3 py-1.5 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300 transition-colors disabled:opacity-50"
            >
              {example}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const EXAMPLES = [
  "A pricing card with 3 tiers",
  "A testimonial carousel",
  "A login form with validation",
  "A kanban board with draggable cards",
  "A weather widget",
  "An animated counter dashboard",
];
