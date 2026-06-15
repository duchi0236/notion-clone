"use client";

import { useState, type ReactNode } from "react";
import { ArrowUpDown, EyeOff, Filter as FilterIcon, Group, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Field, Filter, Sort, View } from "./types";
import { newId } from "./types";
import { FILTER_OPS } from "./fieldMeta";

function Popover({ label, icon, active, children }: { label: string; icon: ReactNode; active?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm",
          active ? "border-blue-300 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600 hover:bg-slate-50",
        )}
      >
        {icon} {label}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-30 mt-1 w-80 rounded-xl border border-slate-200 bg-white p-3 shadow-xl">{children}</div>
        </>
      )}
    </div>
  );
}

export function Toolbar({
  view,
  schema,
  search,
  onSearch,
  onPatchView,
}: {
  view: View;
  schema: Field[];
  search: string;
  onSearch: (v: string) => void;
  onPatchView: (patch: Partial<View>) => void;
}) {
  const filters = view.filters ?? [];
  const sorts = view.sorts ?? [];
  const hidden = view.hiddenFieldIds ?? [];
  const selectFields = schema.filter((f) => f.type === "select");

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-3 py-2">
      {/* Filter */}
      <Popover label={filters.length ? `筛选 ${filters.length}` : "筛选"} icon={<FilterIcon className="h-4 w-4" />} active={filters.length > 0}>
        <div className="space-y-2">
          {filters.length === 0 && <p className="text-xs text-slate-400">未设置筛选条件</p>}
          {filters.map((flt) => {
            const field = schema.find((f) => f.id === flt.fieldId);
            const needsValue = flt.op !== "empty" && flt.op !== "notEmpty";
            return (
              <div key={flt.id} className="flex items-center gap-1">
                <select
                  value={flt.fieldId}
                  onChange={(e) => onPatchView({ filters: filters.map((x) => (x.id === flt.id ? { ...x, fieldId: e.target.value } : x)) })}
                  className="w-24 rounded border border-slate-200 px-1 py-1 text-xs"
                >
                  {schema.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
                <select
                  value={flt.op}
                  onChange={(e) => onPatchView({ filters: filters.map((x) => (x.id === flt.id ? { ...x, op: e.target.value as Filter["op"] } : x)) })}
                  className="w-20 rounded border border-slate-200 px-1 py-1 text-xs"
                >
                  {FILTER_OPS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                {needsValue &&
                  (field?.type === "select" ? (
                    <select
                      value={String(flt.value ?? "")}
                      onChange={(e) => onPatchView({ filters: filters.map((x) => (x.id === flt.id ? { ...x, value: e.target.value } : x)) })}
                      className="flex-1 rounded border border-slate-200 px-1 py-1 text-xs"
                    >
                      <option value="">—</option>
                      {(field.options ?? []).map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={String(flt.value ?? "")}
                      onChange={(e) => onPatchView({ filters: filters.map((x) => (x.id === flt.id ? { ...x, value: e.target.value } : x)) })}
                      className="flex-1 rounded border border-slate-200 px-1 py-1 text-xs outline-none"
                    />
                  ))}
                <button onClick={() => onPatchView({ filters: filters.filter((x) => x.id !== flt.id) })} className="text-slate-400 hover:text-red-500">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
          <button
            onClick={() => onPatchView({ filters: [...filters, { id: newId("flt"), fieldId: schema[0].id, op: "contains", value: "" }] })}
            className="text-xs text-blue-600 hover:underline"
          >
            + 添加条件
          </button>
        </div>
      </Popover>

      {/* Sort */}
      <Popover label={sorts.length ? `排序 ${sorts.length}` : "排序"} icon={<ArrowUpDown className="h-4 w-4" />} active={sorts.length > 0}>
        <div className="space-y-2">
          {sorts.length === 0 && <p className="text-xs text-slate-400">未设置排序</p>}
          {sorts.map((s, i) => (
            <div key={i} className="flex items-center gap-1">
              <select
                value={s.fieldId}
                onChange={(e) => onPatchView({ sorts: sorts.map((x, j) => (j === i ? { ...x, fieldId: e.target.value } : x)) })}
                className="flex-1 rounded border border-slate-200 px-1 py-1 text-xs"
              >
                {schema.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
              <select
                value={s.dir}
                onChange={(e) => onPatchView({ sorts: sorts.map((x, j) => (j === i ? { ...x, dir: e.target.value as Sort["dir"] } : x)) })}
                className="w-20 rounded border border-slate-200 px-1 py-1 text-xs"
              >
                <option value="asc">升序</option>
                <option value="desc">降序</option>
              </select>
              <button onClick={() => onPatchView({ sorts: sorts.filter((_, j) => j !== i) })} className="text-slate-400 hover:text-red-500">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <button
            onClick={() => onPatchView({ sorts: [...sorts, { fieldId: schema[0].id, dir: "asc" }] })}
            className="text-xs text-blue-600 hover:underline"
          >
            + 添加排序
          </button>
        </div>
      </Popover>

      {/* Group (kanban) */}
      {view.type === "kanban" && (
        <Popover label="分组" icon={<Group className="h-4 w-4" />} active={!!view.groupFieldId}>
          <div className="space-y-1">
            <p className="mb-1 text-xs text-slate-400">按单选字段分组</p>
            {selectFields.length === 0 && <p className="text-xs text-amber-600">本表没有单选字段</p>}
            {selectFields.map((f) => (
              <button
                key={f.id}
                onClick={() => onPatchView({ groupFieldId: f.id })}
                className={cn("flex w-full items-center justify-between rounded px-2 py-1 text-sm hover:bg-slate-50", view.groupFieldId === f.id && "text-blue-600")}
              >
                {f.name}
                {view.groupFieldId === f.id && <span>✓</span>}
              </button>
            ))}
          </div>
        </Popover>
      )}

      {/* Hidden fields */}
      <Popover label={hidden.length ? `隐藏 ${hidden.length}` : "字段"} icon={<EyeOff className="h-4 w-4" />} active={hidden.length > 0}>
        <div className="space-y-1">
          {schema.map((f) => {
            const on = !hidden.includes(f.id);
            return (
              <label key={f.id} className="flex items-center justify-between rounded px-2 py-1 text-sm hover:bg-slate-50">
                <span className={cn(f.primary && "text-slate-400")}>{f.name}</span>
                <input
                  type="checkbox"
                  checked={on}
                  disabled={f.primary}
                  onChange={() => onPatchView({ hiddenFieldIds: on ? [...hidden, f.id] : hidden.filter((x) => x !== f.id) })}
                />
              </label>
            );
          })}
        </div>
      </Popover>

      {/* Search */}
      <div className="ml-auto flex items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-1.5">
        <Search className="h-4 w-4 text-slate-400" />
        <input value={search} onChange={(e) => onSearch(e.target.value)} placeholder="搜索记录" className="w-40 text-sm outline-none" />
      </div>
    </div>
  );
}
