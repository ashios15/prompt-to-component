"use client";

import { useState } from "react";
import { PromptInput } from "@/components/prompt-input";
import { CodeEditor } from "@/components/code-editor";
import { LivePreview } from "@/components/live-preview";
import { HistorySidebar } from "@/components/history-sidebar";

interface GeneratedComponent {
  id: string;
  prompt: string;
  code: string;
  timestamp: number;
}

export default function Home() {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [history, setHistory] = useState<GeneratedComponent[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<"editor" | "preview">("preview");

  const handleGenerate = async (prompt: string) => {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, currentCode: code }),
      });

      if (!response.ok) throw new Error("Failed to generate");

      const data = await response.json();
      const generatedCode = data.code;

      setCode(generatedCode);
      setHistory((prev) => [
        {
          id: crypto.randomUUID(),
          prompt,
          code: generatedCode,
          timestamp: Date.now(),
        },
        ...prev,
      ]);
    } catch {
      // Keep current code on error
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRefine = async (refinement: string) => {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: refinement,
          currentCode: code,
          isRefinement: true,
        }),
      });

      if (!response.ok) throw new Error("Failed to refine");

      const data = await response.json();
      setCode(data.code);
    } catch {
      // Keep current code on error
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex h-screen">
      {/* History sidebar */}
      <HistorySidebar
        history={history}
        onSelect={(item) => setCode(item.code)}
      />

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="border-b border-zinc-800 px-6 py-3 flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-lg font-semibold">Prompt to Component</h1>
            <p className="text-xs text-zinc-500">
              Describe a React component in plain English
            </p>
          </div>
          <div className="flex rounded-lg border border-zinc-700 overflow-hidden">
            <button
              onClick={() => setActiveTab("preview")}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                activeTab === "preview"
                  ? "bg-zinc-700 text-zinc-100"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Preview
            </button>
            <button
              onClick={() => setActiveTab("editor")}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                activeTab === "editor"
                  ? "bg-zinc-700 text-zinc-100"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Code
            </button>
          </div>
        </header>

        {/* Preview / Editor */}
        <div className="flex-1 min-h-0">
          {activeTab === "preview" ? (
            <LivePreview code={code} />
          ) : (
            <CodeEditor code={code} onChange={setCode} />
          )}
        </div>

        {/* Prompt input */}
        <div className="border-t border-zinc-800 px-6 py-4">
          <PromptInput
            onGenerate={handleGenerate}
            onRefine={handleRefine}
            isGenerating={isGenerating}
            hasCode={code !== DEFAULT_CODE}
          />
        </div>
      </main>
    </div>
  );
}

const DEFAULT_CODE = `export default function Component() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      fontFamily: 'system-ui, sans-serif',
      color: '#a1a1aa',
    }}>
      <p>Describe a component to get started</p>
    </div>
  );
}`;
