"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { Field, Row } from "./types";
import { primaryField } from "./types";
import { Select } from "./Select";

const DAY = 36; // px per day
const LABEL_W = 200;

function parseDay(v: unknown): Date | null {
  if (!v || typeof v !== "string") return null;
  const d = new Date(v.slice(0, 10) + "T00:00:00");
  return isNaN(d.getTime()) ? null : d;
}
function dayDiff(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

export function GanttView({
  rows,
  schema,
  startFieldId,
  endFieldId,
  onSetStartField,
  onSetEndField,
  onOpenRecord,
}: {
  rows: Row[];
  schema: Field[];
  startFieldId: string | null | undefined;
  endFieldId: string | null | undefined;
  onSetStartField: (id: string) => void;
  onSetEndField: (id: string) => void;
  onOpenRecord: (rowId: string) => void;
}) {
  const dateFields = schema.filter((f) => f.type === "date");
  const startField = schema.find((f) => f.id === startFieldId) ?? dateFields[0] ?? null;
  const endField = schema.find((f) => f.id === endFieldId) ?? null;
  const primary = primaryField(schema);

  const { days, bars } = useMemo(() => {
    if (!startField) return { days: [] as Date[], bars: [] as { row: Row; offset: number; span: number }[] };
    const items = rows
      .map((row) => {
        const s = parseDay(row.data[startField.id]);
        if (!s) return null;
        const e = endField ? parseDay(row.data[endField.id]) ?? s : s;
        return { row, start: s, end: e < s ? s : e };
      })
      .filter(Boolean) as { row: Row; start: Date; end: Date }[];

    if (!items.length) return { days: [], bars: [] };
    let min = items[0].start;
    let max = items[0].end;
    for (const it of items) {
      if (it.start < min) min = it.start;
      if (it.end > max) max = it.end;
    }
    // pad a couple days each side
    min = new Date(min); min.setDate(min.getDate() - 1);
    max = new Date(max); max.setDate(max.getDate() + 2);
    const total = dayDiff(min, max) + 1;
    const days = Array.from({ length: total }, (_, i) => {
      const d = new Date(min);
      d.setDate(min.getDate() + i);
      return d;
    });
    const bars = items.map((it) => ({
      row: it.row,
      offset: dayDiff(min, it.start),
      span: dayDiff(it.start, it.end) + 1,
    }));
    return { days, bars };
  }, [rows, startField, endField]);

  if (!startField) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-400">
        需要一个「日期」字段才能使用甘特视图，请先添加日期字段。
      </div>
    );
  }

  // 本地日期键（不要用 toISOString —— 那是 UTC，会让东/西半球的"今天"高亮错位一天）
  const localKey = (x: Date) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
  const todayKey = localKey(new Date());

  return (
    <div className="flex h-full flex-col">
      {/* 字段选择 */}
      <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-2 text-xs text-slate-500">
        开始
        <Select
          value={startField.id}
          onChange={onSetStartField}
          options={dateFields.map((f) => ({ value: f.id, label: f.name }))}
          triggerClassName="py-1 text-xs"
        />
        结束
        <Select
          value={endField?.id ?? ""}
          onChange={onSetEndField}
          options={[{ value: "", label: "（单天）" }, ...dateFields.map((f) => ({ value: f.id, label: f.name }))]}
          triggerClassName="py-1 text-xs"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <div className="inline-block min-w-full">
          {/* 时间轴表头 */}
          <div className="sticky top-0 z-10 flex bg-slate-50">
            <div className="sticky left-0 z-20 shrink-0 border-b border-r border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500" style={{ width: LABEL_W }}>
              记录
            </div>
            {days.map((d, i) => {
              const isToday = localKey(d) === todayKey;
              return (
                <div
                  key={i}
                  className={cn(
                    "shrink-0 border-b border-r border-slate-100 py-1 text-center text-[10px] leading-tight",
                    isToday
                      ? "bg-blue-50 font-semibold text-blue-600 ring-1 ring-inset ring-blue-300"
                      : d.getDay() === 0 || d.getDay() === 6
                        ? "bg-slate-100/60 text-slate-400"
                        : "text-slate-500",
                  )}
                  style={{ width: DAY }}
                >
                  {d.getMonth() + 1}/{d.getDate()}
                </div>
              );
            })}
          </div>

          {/* 行 */}
          {bars.length === 0 ? (
            <div className="px-4 py-8 text-sm text-slate-400">没有带开始日期的记录</div>
          ) : (
            bars.map(({ row, offset, span }) => (
              <div key={row.id} className="flex border-b border-slate-100 hover:bg-slate-50/40">
                <div className="sticky left-0 z-10 flex shrink-0 items-center truncate border-r border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700" style={{ width: LABEL_W }}>
                  <span className="truncate">{String(row.data[primary.id] ?? "未命名")}</span>
                </div>
                <div className="relative flex-1" style={{ height: 36 }}>
                  <button
                    onClick={() => onOpenRecord(row.id)}
                    className="absolute top-1 flex h-7 items-center rounded-md bg-gradient-to-r from-blue-500 to-blue-600 px-2 text-[11px] font-medium text-white shadow-sm transition-transform hover:scale-[1.01]"
                    style={{ left: offset * DAY + 2, width: Math.max(36, span * DAY - 4) }}
                    title={String(row.data[primary.id] ?? "")}
                  >
                    <span className="truncate">{String(row.data[primary.id] ?? "")}</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
