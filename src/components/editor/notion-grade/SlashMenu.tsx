"use client";

import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { SlashCommand, SlashCommandCategory } from "./types";
import { slashCommandIconMap } from "./useSlashCommands";

const categoryOrder: SlashCommandCategory[] = ["常用", "文本", "清单", "媒体", "高级", "AI"];
const RECENT_KEY = "clawnote.recentSlashCommands";

function categoryFor(command: SlashCommand): SlashCommandCategory {
  if (command.category) return command.category;
  if (["p", "h1", "h2", "h3"].includes(command.id)) return "文本";
  if (["todo", "bullet", "number"].includes(command.id)) return "清单";
  if (["table", "image", "upload", "code", "divider"].includes(command.id)) return "媒体";
  return "高级";
}

function normalizeQuery(value: string) {
  return value.replace(/^\/+/, "");
}

export function SlashMenu({ open, query, setQuery, commands, onRun }: { open: boolean; query: string; setQuery: (value: string) => void; commands: SlashCommand[]; onRun: (command: SlashCommand) => void }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentIds, setRecentIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(RECENT_KEY);
      if (saved) setRecentIds(JSON.parse(saved));
    } catch {}
  }, []);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query, open]);

  const recentCommands = useMemo(() => recentIds.map((id) => commands.find((command) => command.id === id)).filter(Boolean) as SlashCommand[], [recentIds, commands]);

  const grouped = commands.reduce<Record<string, SlashCommand[]>>((acc, command) => {
    const category = categoryFor(command);
    acc[category] = acc[category] ?? [];
    acc[category].push(command);
    return acc;
  }, {});

  if (recentCommands.length && !query.trim()) {
    grouped["常用"] = [...recentCommands, ...(grouped["常用"] ?? []).filter((item) => !recentIds.includes(item.id))].slice(0, 8);
  }

  const visibleCategories = categoryOrder.filter((category) => grouped[category]?.length);
  const flatCommands = visibleCategories.flatMap((category) => grouped[category]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (!flatCommands.length) return;

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelectedIndex((value) => (value + 1) % flatCommands.length);
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedIndex((value) => (value - 1 + flatCommands.length) % flatCommands.length);
      }

      if (event.key === "Enter") {
        event.preventDefault();
        execute(flatCommands[selectedIndex]);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [flatCommands, open, selectedIndex]);

  function execute(command: SlashCommand) {
    const nextRecent = [command.id, ...recentIds.filter((id) => id !== command.id)].slice(0, 12);
    setRecentIds(nextRecent);
    try {
      window.localStorage.setItem(RECENT_KEY, JSON.stringify(nextRecent));
    } catch {}
    onRun(command);
  }

  if (!open) return null;

  let cursor = -1;

  return (
    <div className="absolute left-0 top-12 z-50 w-[460px] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl ring-1 ring-slate-950/5">
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
        <Search className="h-4 w-4 text-slate-400" />
        <input value={query} onChange={(event) => setQuery(normalizeQuery(event.target.value))} autoFocus className="min-w-0 flex-1 bg-transparent text-sm outline-none" placeholder="输入命令：标题、待办、表格、附件、AI..." />
        <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-400">↑↓</span>
      </div>

      <div className="max-h-[480px] overflow-auto p-2">
        {commands.length === 0 && <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">没有匹配的命令</div>}
        {visibleCategories.map((category) => (
          <div key={category} className="mb-2">
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{category}</span>
              {category === "常用" && <span className="text-[11px] text-slate-300">最近使用</span>}
            </div>
            {grouped[category].map((command) => {
              cursor += 1;
              const active = cursor === selectedIndex;
              const Icon = slashCommandIconMap[command.id as keyof typeof slashCommandIconMap];
              return (
                <button
                  key={command.id}
                  type="button"
                  onMouseEnter={() => setSelectedIndex(cursor)}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    execute(command);
                  }}
                  className={`group flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition ${active ? "bg-blue-50" : "hover:bg-blue-50"}`}
                >
                  <span className={`flex h-10 w-10 items-center justify-center rounded-2xl transition ${active ? "bg-white text-blue-600" : "bg-slate-100 text-slate-600"}`}>
                    {Icon ? <Icon className="h-4 w-4" /> : <span className="text-xs font-bold">T</span>}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-slate-900">{command.title}</span>
                    <span className="block truncate text-xs leading-5 text-slate-500">{command.description}</span>
                  </span>
                  {command.shortcut && <span className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-400">{command.shortcut}</span>}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-4 py-2 text-[11px] text-slate-400">
        <span>/ 打开命令 · @ 引用文档</span>
        <span>Enter 执行 · ESC 关闭</span>
      </div>
    </div>
  );
}
