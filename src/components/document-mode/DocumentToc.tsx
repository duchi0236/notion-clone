"use client";

import { ChevronLeft, ChevronRight, ListTree } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { TocItem } from "./document-types";

export function DocumentToc({ toc }: { toc: TocItem[] }) {
  const [collapsed, setCollapsed] = useState(false);

  if (collapsed) {
    return (
      <aside className="flex h-screen w-12 flex-col items-center border-r border-slate-200 bg-white py-4">
        <button onClick={() => setCollapsed(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
          <ChevronRight className="h-4 w-4" />
        </button>
      </aside>
    );
  }

  return (
    <aside className="hidden h-screen w-60 flex-col border-r border-slate-200 bg-white xl:flex">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <ListTree className="h-4 w-4" />目录
        </div>
        <button onClick={() => setCollapsed(true)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>
      <nav className="flex-1 overflow-auto px-3 py-4">
        {toc.length === 0 && <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">当前文档暂无标题目录</div>}
        {toc.map((item, index) => (
          <a
            key={`${item.id}-${index}`}
            href={`#${item.id}`}
            className={cn(
              "block rounded-lg px-2 py-1.5 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-900",
              item.level === 1 && "font-medium text-slate-700",
              item.level === 2 && "pl-5",
              item.level === 3 && "pl-8 text-xs"
            )}
          >
            {item.text}
          </a>
        ))}
      </nav>
    </aside>
  );
}
