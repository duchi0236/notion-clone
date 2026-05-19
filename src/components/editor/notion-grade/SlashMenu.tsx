"use client";

import { Search } from "lucide-react";
import type { SlashCommand } from "./types";

export function SlashMenu({
  open,
  query,
  setQuery,
  commands,
  onRun,
}: {
  open: boolean;
  query: string;
  setQuery: (value: string) => void;
  commands: SlashCommand[];
  onRun: (command: SlashCommand) => void;
}) {
  if (!open) return null;

  return (
    <div className="absolute left-0 top-12 z-50 w-96 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
        <Search className="h-4 w-4 text-slate-400" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          autoFocus
          className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          placeholder="搜索命令，例如：标题、表格、上传..."
        />
      </div>

      <div className="max-h-96 overflow-auto p-2">
        {commands.map((command) => (
          <button
            key={command.id}
            type="button"
            onMouseDown={(event) => {
              event.preventDefault();
              onRun(command);
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-blue-50"
          >
            <div>
              <div className="text-sm font-medium text-slate-900">{command.title}</div>
              <div className="text-xs text-slate-500">{command.description}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
