"use client";

import { useState } from "react";
import { PromptInput } from "@/components/prompt-input";
import { CodeEditor } from "@/components/code-editor";
import { LivePreview } from "@/components/live-preview";
import { HistorySidebar } from "@/components/history-sidebar";
import { TracePanel, type TraceEntry } from "@/components/trace-panel";

interface GeneratedComponent {
  id: string;
  prompt: string;
  code: string;
  timestamp: number;
  attempts: number;
  ok: boolean;
}

export default function Home() {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [history, setHistory] = useState<GeneratedComponent[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<"editor" | "preview">("preview");
  const [trace, setTrace] = useState<TraceEntry[]>([]);

  const run = async (prompt: string, isRefinement: boolean) => {
    setIsGenerating(true);
    setTrace([]);
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, currentCode: code, isRefinement }),
      });
      if (!response.ok || !response.body) throw new Error("request failed");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finalCode: string | null = null;
      let finalAttempts = 0;
      let finalOk = false;

      // Consume NDJSON stream: one event per line.
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          let event: TraceEntry & { code?: string };
          try {
            event = JSON.parse(line);
          } catch {
            continue;
          }
          setTrace((prev) => [...prev, event]);
          if (event.phase === "done" && event.code) {
            finalCode = event.code;
            finalAttempts = event.attempt ?? 0;
            finalOk = event.report?.ok ?? false;
          }
        }
      }

      if (finalCode) {
        setCode(finalCode);
        setHistory((prev) => [
          {
            id: crypto.randomUUID(),
            prompt,
            code: finalCode as string,
            timestamp: Date.now(),
            attempts: finalAttempts,
            ok: finalOk,
          },
          ...prev,
        ]);
      }
    } catch (err) {
      setTrace((prev) => [
        ...prev,
        {
          phase: "error",
          message: err instanceof Error ? err.message : String(err),
        },
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex h-screen">
      <HistorySidebar
        history={history}
        onSelect={(item) => setCode(item.code)}
      />

      <main className="flex-1 flex flex-col min-w-0">
        <header className="border-b border-zinc-800 px-6 py-3 flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-lg font-semibold">Prompt to Component</h1>
            <p className="text-xs text-zinc-500">
              Generator → AST critic → self-repair (max 2 attempts)
            </p>
          </div>
          <div className="flex rounded-lg border border-zinc-700 overflow-hidden">
            <TabBtn active={activeTab === "preview"} onClick={() => setActiveTab("preview")}>
              Preview
            </TabBtn>
            <TabBtn active={activeTab === "editor"} onClick={() => setActiveTab("editor")}>
              Code
            </TabBtn>
          </div>
        </header>

        <div className="flex-1 min-h-0">
          {activeTab === "preview" ? (
            <LivePreview code={code} />
          ) : (
            <CodeEditor code={code} onChange={setCode} />
          )}
        </div>

        <TracePanel entries={trace} isRunning={isGenerating} />

        <div className="border-t border-zinc-800 px-6 py-4">
          <PromptInput
            onGenerate={(p) => run(p, false)}
            onRefine={(p) => run(p, true)}
            isGenerating={isGenerating}
            hasCode={code !== DEFAULT_CODE}
          />
        </div>
      </main>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-xs font-medium transition-colors ${
        active ? "bg-zinc-700 text-zinc-100" : "text-zinc-400 hover:text-zinc-200"
      }`}
    >
      {children}
    </button>
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
