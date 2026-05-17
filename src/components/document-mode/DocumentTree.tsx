"use client";

import { ChevronDown, ChevronRight, FileText, Folder, Plus } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { DocNode } from "./document-types";

function TreeNode({
  node,
  selectedId,
  onSelect,
  level = 0,
}: {
  node: DocNode;
  selectedId?: string;
  onSelect: (id: string) => void;
  level?: number;
}) {
  const [open, setOpen] = useState(true);
  const hasChildren = Boolean(node.children?.length);

  return (
    <div>
      <div
        className={cn(
          "group flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-slate-600 hover:bg-slate-100",
          selectedId === node.id && "bg-blue-50 text-blue-700"
        )}
        style={{ paddingLeft: 8 + level * 14 }}
      >
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex h-4 w-4 items-center justify-center text-slate-400"
        >
          {hasChildren ? open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" /> : null}
        </button>
        {hasChildren ? <Folder className="h-4 w-4 text-amber-500" /> : <FileText className="h-4 w-4 text-blue-500" />}
        <button onClick={() => onSelect(node.id)} className="min-w-0 flex-1 truncate text-left">
          {node.title}
        </button>
      </div>
      {hasChildren && open && (
        <div>
          {node.children?.map((child) => (
            <TreeNode key={child.id} node={child} selectedId={selectedId} onSelect={onSelect} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function DocumentTree({
  tree,
  selectedId,
  onSelect,
  onCreate,
}: {
  tree: DocNode[];
  selectedId?: string;
  onSelect: (id: string) => void;
  onCreate: () => void;
}) {
  return (
    <aside className="flex h-screen w-72 flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-100 p-4">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">C</div>
            <span className="font-semibold">ClawNote</span>
          </div>
          <button className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">⌄</button>
        </div>
        <input className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-300" placeholder="搜索文档 / 文件夹" />
        <button onClick={onCreate} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700">
          <Plus className="h-4 w-4" />新建
        </button>
      </div>

      <div className="flex-1 overflow-auto p-3">
        <div className="mb-2 px-2 text-xs font-medium text-slate-400">文档树</div>
        {tree.map((node) => (
          <TreeNode key={node.id} node={node} selectedId={selectedId} onSelect={onSelect} />
        ))}
      </div>
    </aside>
  );
}
