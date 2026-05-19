"use client";

import { Search } from "lucide-react";
import type { SlashCommand } from "./types";
import { slashCommandIconMap } from "./useSlashCommands";

function categoryFor(commandId: string) {
  if (["p", "h1", "h2", "h3"].includes(commandId)) return "基础文本";
  if (["todo", "bullet", "number", "toggle", "callout", "quote"].includes(commandId)) return "结构块";
  if (["table", "image", "upload", "code", "divider"].includes(commandId)) return "媒体与高级块";
  return "AI";
}

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

  const grouped = commands.reduce<Record<string, SlashCommand[]>>((acc, command) => {
    const category = categoryFor(command.id);
    acc[category] = acc[category] ?? [];
    acc[category].push(command);
    return acc;
  }, {});

  return (
    <div className="absolute left-0 top-12 z-50 w-[420px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
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

      <div className="max-h-[440px] overflow-auto p-2">
        {commands.length === 0 && <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">没有匹配的命令</div>}
        {Object.entries(grouped).map(([category, items]) => (
          <div key={category} className="mb-2">
            <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{category}</div>
            {items.map((command) => {
              const Icon = slashCommandIconMap[command.id as keyof typeof slashCommandIconMap];
              return (
                <button
                  key={command.id}
                  type="button"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    onRun(command);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-blue-50"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                    {Icon ? <Icon className="h-4 w-4" /> : <span className="text-xs font-bold">T</span>}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-slate-900">{command.title}</span>
                    <span className="block truncate text-xs text-slate-500">{command.description}</span>
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
