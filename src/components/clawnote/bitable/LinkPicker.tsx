"use client";

import { useState } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Table } from "./types";
import { primaryField } from "./types";

// Choose records from a linked table to populate a `link` field.
export function LinkPicker({
  targetTable,
  selectedIds,
  onChange,
  onClose,
}: {
  targetTable: Table;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const primary = primaryField(targetTable.schema);
  const filtered = targetTable.rows.filter((r) =>
    String(r.data[primary.id] ?? "").toLowerCase().includes(q.trim().toLowerCase()),
  );

  function toggle(id: string) {
    onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/30 p-4" onMouseDown={onClose}>
      <div className="flex max-h-[70vh] w-full max-w-md flex-col rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-semibold">关联「{targetTable.name}」记录</h2>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="border-b border-slate-100 p-3">
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5">
            <Search className="h-4 w-4 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索记录…" className="flex-1 text-sm outline-none" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {filtered.length === 0 && <p className="py-6 text-center text-sm text-slate-400">没有记录</p>}
          {filtered.map((r) => {
            const on = selectedIds.includes(r.id);
            return (
              <button
                key={r.id}
                onClick={() => toggle(r.id)}
                className={cn("flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50", on && "bg-blue-50")}
              >
                <span className="truncate">{String(r.data[primary.id] ?? "未命名")}</span>
                {on && <span className="text-blue-600">✓</span>}
              </button>
            );
          })}
        </div>
        <div className="border-t border-slate-100 px-4 py-3 text-right">
          <button onClick={onClose} className="rounded-lg bg-slate-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-700">
            完成（已选 {selectedIds.length}）
          </button>
        </div>
      </div>
    </div>
  );
}
