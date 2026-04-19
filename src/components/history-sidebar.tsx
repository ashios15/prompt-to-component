"use client";

interface HistoryItem {
  id: string;
  prompt: string;
  code: string;
  timestamp: number;
}

interface HistorySidebarProps {
  history: HistoryItem[];
  onSelect: (item: HistoryItem) => void;
}

export function HistorySidebar({ history, onSelect }: HistorySidebarProps) {
  return (
    <aside className="w-64 border-r border-zinc-800 flex flex-col bg-zinc-900/50 shrink-0">
      <div className="p-4 border-b border-zinc-800">
        <h2 className="text-sm font-medium text-zinc-300">History</h2>
        <p className="text-xs text-zinc-600 mt-0.5">
          {history.length} component{history.length !== 1 ? "s" : ""} generated
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {history.length === 0 ? (
          <div className="p-4 text-xs text-zinc-600">
            Generated components will appear here
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {history.map((item) => (
              <button
                key={item.id}
                onClick={() => onSelect(item)}
                className="w-full text-left rounded-lg px-3 py-2.5 hover:bg-zinc-800/50 transition-colors group"
              >
                <p className="text-sm text-zinc-300 truncate group-hover:text-zinc-100">
                  {item.prompt}
                </p>
                <p className="text-xs text-zinc-600 mt-0.5">
                  {new Date(item.timestamp).toLocaleTimeString()}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
