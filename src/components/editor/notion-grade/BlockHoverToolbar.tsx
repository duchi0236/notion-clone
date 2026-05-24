"use client";

import { Copy, GripVertical, Plus, Trash2 } from "lucide-react";

export function BlockHoverToolbar({ visible, top }: { visible: boolean; top: number }) {
  return (
    <div
      className={`pointer-events-none absolute left-[-54px] z-20 transition-all duration-150 ${visible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-1"}`}
      style={{ top }}
    >
      <div className="pointer-events-auto flex items-center gap-1 rounded-2xl border border-slate-200 bg-white/95 p-1 shadow-xl backdrop-blur">
        <button className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
          <GripVertical className="h-4 w-4" />
        </button>
        <button className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
          <Plus className="h-4 w-4" />
        </button>
        <button className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
          <Copy className="h-4 w-4" />
        </button>
        <button className="rounded-xl p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-500">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
