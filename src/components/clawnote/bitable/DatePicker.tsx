"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const WEEK = ["日", "一", "二", "三", "四", "五", "六"];

function parse(v: string): Date | null {
  if (!v) return null;
  const d = new Date(v.slice(0, 10) + "T00:00:00");
  return isNaN(d.getTime()) ? null : d;
}
function fmt(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// 自定义日期选择器（替代原生 input[type=date]）：触发器 + portal 弹层日历，风格与产品一致。
export function DatePicker({
  value,
  onChange,
  autoFocus,
  compact,
}: {
  value: string;
  onChange: (v: string) => void;
  autoFocus?: boolean;
  compact?: boolean;
}) {
  const selected = parse(value);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [cursor, setCursor] = useState(() => {
    const d = selected ?? new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });

  useEffect(() => {
    if (autoFocus) openPanel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFocus]);

  function openPanel() {
    const r = triggerRef.current?.getBoundingClientRect();
    if (r) {
      const W = 248;
      const left = Math.min(Math.max(8, r.left), window.innerWidth - W - 8);
      const below = r.bottom + 6;
      const top = below + 290 > window.innerHeight ? Math.max(8, r.top - 296) : below;
      setPos({ left, top });
    }
    if (selected) setCursor({ y: selected.getFullYear(), m: selected.getMonth() });
    setOpen(true);
  }

  const cells = useMemo(() => {
    const first = new Date(cursor.y, cursor.m, 1);
    const start = new Date(first);
    start.setDate(1 - first.getDay());
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [cursor]);

  const todayKey = fmt(new Date());
  const selKey = selected ? fmt(selected) : "";

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (open ? setOpen(false) : openPanel())}
        className={cn(
          "flex w-full items-center gap-1.5 rounded-md text-left text-sm outline-none",
          compact ? "" : "px-0",
          selected ? "text-slate-700" : "text-slate-300",
        )}
      >
        <CalendarDays className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        <span className="truncate">{selected ? value.slice(0, 10) : "选择日期"}</span>
      </button>

      {open && pos &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[90]" onMouseDown={() => setOpen(false)} />
            <div
              className="claw-solid fixed z-[91] w-[248px] rounded-xl border border-slate-200 p-2.5 shadow-[0_16px_40px_-12px_rgba(15,23,42,0.3)]"
              style={{ left: pos.left, top: pos.top }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="mb-1.5 flex items-center justify-between px-1">
                <button onClick={() => setCursor((c) => ({ y: c.m === 0 ? c.y - 1 : c.y, m: c.m === 0 ? 11 : c.m - 1 }))} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-sm font-semibold text-slate-800">{cursor.y} 年 {cursor.m + 1} 月</span>
                <button onClick={() => setCursor((c) => ({ y: c.m === 11 ? c.y + 1 : c.y, m: c.m === 11 ? 0 : c.m + 1 }))} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-7 text-center text-[11px] text-slate-400">
                {WEEK.map((w) => (
                  <div key={w} className="py-1">{w}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-0.5">
                {cells.map((d, i) => {
                  const key = fmt(d);
                  const inMonth = d.getMonth() === cursor.m;
                  const isSel = key === selKey;
                  const isToday = key === todayKey;
                  return (
                    <button
                      key={i}
                      onClick={() => {
                        onChange(key);
                        setOpen(false);
                      }}
                      className={cn(
                        "flex h-8 items-center justify-center rounded-md text-[13px] transition-colors",
                        isSel ? "bg-blue-600 font-semibold text-white" : inMonth ? "text-slate-700 hover:bg-blue-50" : "text-slate-300 hover:bg-slate-50",
                        !isSel && isToday && "font-semibold text-blue-600",
                      )}
                    >
                      {d.getDate()}
                    </button>
                  );
                })}
              </div>
              <div className="mt-1.5 flex items-center justify-between border-t border-slate-100 px-1 pt-1.5">
                <button onClick={() => { onChange(""); setOpen(false); }} className="rounded px-2 py-1 text-xs text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                  清除
                </button>
                <button onClick={() => { onChange(todayKey); setOpen(false); }} className="rounded px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50">
                  今天
                </button>
              </div>
            </div>
          </>,
          document.body,
        )}
    </>
  );
}
