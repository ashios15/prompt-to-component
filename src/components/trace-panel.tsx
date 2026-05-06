"use client";

import type { CriticIssue, CriticReport } from "@/lib/critic";

export interface TraceEntry {
  phase: "generate" | "critic" | "repair" | "done" | "error";
  attempt?: number;
  report?: CriticReport;
  note?: string;
  message?: string;
}

interface TracePanelProps {
  entries: TraceEntry[];
  isRunning: boolean;
}

export function TracePanel({ entries, isRunning }: TracePanelProps) {
  if (entries.length === 0 && !isRunning) return null;

  return (
    <div className="border-t border-zinc-800 px-6 py-3 max-h-48 overflow-y-auto bg-zinc-950">
      <div className="flex items-center gap-2 mb-2">
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
          Generate → Critic → Repair
        </h3>
        {isRunning && (
          <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
        )}
      </div>
      <ol className="space-y-1 text-xs font-mono">
        {entries.map((entry, i) => (
          <TraceLine key={i} entry={entry} />
        ))}
      </ol>
    </div>
  );
}

function TraceLine({ entry }: { entry: TraceEntry }) {
  const attempt = entry.attempt ?? 0;

  switch (entry.phase) {
    case "generate":
      return (
        <li className="flex items-start gap-2 text-zinc-300">
          <Badge color="blue">gen</Badge>
          <span>initial generation produced</span>
        </li>
      );
    case "repair":
      return (
        <li className="flex items-start gap-2 text-zinc-300">
          <Badge color="amber">repair #{attempt}</Badge>
          <span>applying targeted fix</span>
        </li>
      );
    case "critic": {
      const ok = entry.report?.ok === true;
      const issueCount = entry.report?.issues.length ?? 0;
      return (
        <li className="flex items-start gap-2">
          <Badge color={ok ? "green" : "red"}>
            critic {ok ? "pass" : "fail"}
          </Badge>
          <div className="flex-1">
            {ok ? (
              <span className="text-emerald-400">all checks passed</span>
            ) : (
              <>
                <span className="text-red-400">
                  {issueCount} issue{issueCount === 1 ? "" : "s"}
                </span>
                {entry.report?.issues && (
                  <ul className="mt-1 ml-2 space-y-0.5 text-zinc-400">
                    {entry.report.issues.slice(0, 5).map((issue, i) => (
                      <IssueLine key={i} issue={issue} />
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        </li>
      );
    }
    case "done":
      return (
        <li className="flex items-start gap-2 text-zinc-400">
          <Badge color="zinc">done</Badge>
          <span>
            {entry.note === "clean"
              ? "finished clean"
              : entry.note ?? `finished after ${attempt} repair attempt(s)`}
          </span>
        </li>
      );
    case "error":
      return (
        <li className="flex items-start gap-2 text-red-400">
          <Badge color="red">error</Badge>
          <span>{entry.message ?? "unknown error"}</span>
        </li>
      );
  }
}

function IssueLine({ issue }: { issue: CriticIssue }) {
  return (
    <li>
      <span className="text-zinc-600">[{issue.code}]</span>{" "}
      {issue.line > 0 && <span className="text-zinc-500">L{issue.line} </span>}
      <span className="text-zinc-300">{issue.message}</span>
    </li>
  );
}

const BADGE_COLORS: Record<string, string> = {
  blue: "bg-blue-950 text-blue-300 border-blue-800",
  green: "bg-emerald-950 text-emerald-300 border-emerald-800",
  red: "bg-red-950 text-red-300 border-red-800",
  amber: "bg-amber-950 text-amber-300 border-amber-800",
  zinc: "bg-zinc-900 text-zinc-400 border-zinc-700",
};

function Badge({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span
      className={`inline-block shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${BADGE_COLORS[color] ?? BADGE_COLORS.zinc}`}
    >
      {children}
    </span>
  );
}
