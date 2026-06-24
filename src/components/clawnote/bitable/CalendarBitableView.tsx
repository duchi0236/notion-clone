"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Field, Row } from "./types";
import { primaryField } from "./types";
import { Select } from "./Select";

const WEEK = ["日", "一", "二", "三", "四", "五", "六"];

export function CalendarBitableView({
  rows,
  schema,
  dateFieldId,
  onSetDateField,
  onOpenRecord,
  onAddRow,
}: {
  rows: Row[];
  schema: Field[];
  dateFieldId: string | null | undefined;
  onSetDateField: (id: string) => void;
  onOpenRecord: (rowId: string) => void;
  onAddRow: (seed: Record<string, unknown>) => void;
}) {
  const dateFields = schema.filter((f) => f.type === "date");
  const dateField = schema.find((f) => f.id === dateFieldId) ?? dateFields[0] ?? null;
  const primary = primaryField(schema);
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });

  const cells = useMemo(() => {
    const first = new Date(cursor.y, cursor.m, 1);
    const start = new Date(first);
    start.setDate(1 - first.getDay()); // back to Sunday
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [cursor]);

  const byDay = useMemo(() => {
    const map = new Map<string, Row[]>();
    if (!dateField) return map;
    for (const r of rows) {
      const v = r.data[dateField.id];
      if (!v || typeof v !== "string") continue;
      const key = v.slice(0, 10);
      const arr = map.get(key) ?? [];
      arr.push(r);
      map.set(key, arr);
    }
    return map;
  }, [rows, dateField]);

  const fmtKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const today = new Date();
  const todayKey = fmtKey(today);

  if (!dateField) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-400">
        需要一个「日期」字段才能使用日历视图，请先在表格里添加日期字段。
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* 头部：月份切换 + 日期字段选择 */}
      <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-2">
        <div className="flex items-center gap-1">
          <button onClick={() => setCursor((c) => ({ y: c.m === 0 ? c.y - 1 : c.y, m: c.m === 0 ? 11 : c.m - 1 }))} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[110px] text-center text-sm font-semibold text-slate-800">{cursor.y} 年 {cursor.m + 1} 月</span>
          <button onClick={() => setCursor((c) => ({ y: c.m === 11 ? c.y + 1 : c.y, m: c.m === 11 ? 0 : c.m + 1 }))} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <button onClick={() => setCursor({ y: today.getFullYear(), m: today.getMonth() })} className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50">
          今天
        </button>
        <div className="ml-auto flex items-center gap-1.5 text-xs text-slate-500">
          按
          <Select
            value={dateField.id}
            onChange={onSetDateField}
            options={dateFields.map((f) => ({ value: f.id, label: f.name }))}
            align="right"
            triggerClassName="py-1 text-xs"
          />
          排布
        </div>
      </div>

      {/* 星期 */}
      <div className="grid grid-cols-7 border-b border-slate-200 text-center text-xs text-slate-400">
        {WEEK.map((w) => (
          <div key={w} className="py-1.5">周{w}</div>
        ))}
      </div>

      {/* 日格 */}
      <div className="grid min-h-0 flex-1 grid-cols-7 grid-rows-6">
        {cells.map((d, i) => {
          const key = fmtKey(d);
          const inMonth = d.getMonth() === cursor.m;
          const items = byDay.get(key) ?? [];
          return (
            <div
              key={i}
              className={cn(
                "group flex min-h-0 flex-col border-b border-r border-slate-100 p-1",
                !inMonth && "bg-slate-50/50",
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full text-xs",
                    key === todayKey ? "bg-blue-600 font-semibold text-white" : inMonth ? "text-slate-600" : "text-slate-300",
                  )}
                >
                  {d.getDate()}
                </span>
                <button
                  onClick={() => onAddRow({ [dateField.id]: key })}
                  className="rounded p-0.5 text-slate-300 opacity-0 transition-opacity hover:bg-slate-100 hover:text-slate-600 group-hover:opacity-100"
                  title="在这天新增"
                >
                  +
                </button>
              </div>
              <div className="mt-0.5 min-h-0 flex-1 space-y-0.5 overflow-y-auto">
                {items.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => onOpenRecord(r.id)}
                    className="block w-full truncate rounded-md bg-blue-50 px-1.5 py-0.5 text-left text-[11px] text-blue-700 hover:bg-blue-100"
                    title={String(r.data[primary.id] ?? "")}
                  >
                    {String(r.data[primary.id] ?? "未命名")}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
