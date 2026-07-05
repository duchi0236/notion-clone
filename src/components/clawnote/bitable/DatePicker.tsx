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
  const panelRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [cursor, setCursor] = useState(() => {
    const d = selected ?? new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  // 键盘导航焦点所在的日期（roving tabindex），仅在弹层打开时有意义。
  const [focusDay, setFocusDay] = useState<Date>(() => selected ?? new Date());

  function computePos() {
    const r = triggerRef.current?.getBoundingClientRect();
    if (!r) return;
    const W = 248;
    const left = Math.min(Math.max(8, r.left), window.innerWidth - W - 8);
    const below = r.bottom + 6;
    const top = below + 290 > window.innerHeight ? Math.max(8, r.top - 296) : below;
    setPos({ left, top });
  }

  function openPanel() {
    computePos();
    const base = selected ?? new Date();
    setCursor({ y: base.getFullYear(), m: base.getMonth() });
    setFocusDay(base);
    setOpen(true);
  }

  function closePanel(restoreFocus = true) {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  }

  useEffect(() => {
    if (autoFocus) openPanel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFocus]);

  // 打开时：Esc 关闭 + 滚动/缩放重算定位。
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        closePanel();
      }
    };
    const onReposition = () => computePos();
    document.addEventListener("keydown", onKey, true);
    window.addEventListener("scroll", onReposition, true);
    window.addEventListener("resize", onReposition);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      window.removeEventListener("scroll", onReposition, true);
      window.removeEventListener("resize", onReposition);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // 打开后把焦点移到焦点日期格。
  useEffect(() => {
    if (!open) return;
    const raf = requestAnimationFrame(() => {
      gridRef.current
        ?.querySelector<HTMLButtonElement>('[data-focus="true"]')
        ?.focus();
    });
    return () => cancelAnimationFrame(raf);
  }, [open, focusDay, cursor]);

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
  const focusKey = fmt(focusDay);

  function moveFocus(next: Date) {
    setFocusDay(next);
    if (next.getFullYear() !== cursor.y || next.getMonth() !== cursor.m) {
      setCursor({ y: next.getFullYear(), m: next.getMonth() });
    }
  }

  function onGridKeyDown(e: React.KeyboardEvent) {
    const d = new Date(focusDay);
    switch (e.key) {
      case "ArrowLeft":
        e.preventDefault();
        d.setDate(d.getDate() - 1);
        moveFocus(d);
        break;
      case "ArrowRight":
        e.preventDefault();
        d.setDate(d.getDate() + 1);
        moveFocus(d);
        break;
      case "ArrowUp":
        e.preventDefault();
        d.setDate(d.getDate() - 7);
        moveFocus(d);
        break;
      case "ArrowDown":
        e.preventDefault();
        d.setDate(d.getDate() + 7);
        moveFocus(d);
        break;
      case "Home":
        e.preventDefault();
        d.setDate(d.getDate() - d.getDay());
        moveFocus(d);
        break;
      case "End":
        e.preventDefault();
        d.setDate(d.getDate() + (6 - d.getDay()));
        moveFocus(d);
        break;
      case "PageUp":
        e.preventDefault();
        d.setMonth(d.getMonth() - 1);
        moveFocus(d);
        break;
      case "PageDown":
        e.preventDefault();
        d.setMonth(d.getMonth() + 1);
        moveFocus(d);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        onChange(fmt(focusDay));
        closePanel();
        break;
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => (open ? closePanel(false) : openPanel())}
        className={cn(
          "flex w-full items-center gap-1.5 rounded-md text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60",
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
            <div className="fixed inset-0 z-[90]" onMouseDown={() => closePanel(false)} />
            <div
              ref={panelRef}
              role="dialog"
              aria-label="选择日期"
              className="claw-solid fixed z-[91] w-[248px] rounded-xl border border-slate-200 p-2.5 shadow-[0_16px_40px_-12px_rgba(15,23,42,0.3)]"
              style={{ left: pos.left, top: pos.top }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="mb-1.5 flex items-center justify-between px-1">
                <button
                  type="button"
                  aria-label="上个月"
                  onClick={() => setCursor((c) => ({ y: c.m === 0 ? c.y - 1 : c.y, m: c.m === 0 ? 11 : c.m - 1 }))}
                  className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 active:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-sm font-semibold text-slate-800">{cursor.y} 年 {cursor.m + 1} 月</span>
                <button
                  type="button"
                  aria-label="下个月"
                  onClick={() => setCursor((c) => ({ y: c.m === 11 ? c.y + 1 : c.y, m: c.m === 11 ? 0 : c.m + 1 }))}
                  className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 active:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-7 text-center text-[11px] text-slate-400">
                {WEEK.map((w) => (
                  <div key={w} className="py-1">{w}</div>
                ))}
              </div>
              <div ref={gridRef} role="listbox" aria-label="日历" className="grid grid-cols-7 gap-0.5" onKeyDown={onGridKeyDown}>
                {cells.map((d, i) => {
                  const key = fmt(d);
                  const inMonth = d.getMonth() === cursor.m;
                  const isSel = key === selKey;
                  const isToday = key === todayKey;
                  const isFocus = key === focusKey;
                  return (
                    <button
                      key={i}
                      type="button"
                      role="option"
                      tabIndex={isFocus ? 0 : -1}
                      data-focus={isFocus || undefined}
                      aria-label={`${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`}
                      aria-selected={isSel}
                      aria-current={isToday ? "date" : undefined}
                      onClick={() => {
                        onChange(key);
                        closePanel();
                      }}
                      className={cn(
                        "flex h-8 items-center justify-center rounded-md text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60",
                        isSel ? "bg-blue-600 font-semibold text-white" : inMonth ? "text-slate-700 hover:bg-blue-50 active:bg-blue-100" : "text-slate-300 hover:bg-slate-50 active:bg-slate-100",
                        !isSel && isToday && "font-semibold text-blue-600",
                      )}
                    >
                      {d.getDate()}
                    </button>
                  );
                })}
              </div>
              <div className="mt-1.5 flex items-center justify-between border-t border-slate-100 px-1 pt-1.5">
                <button
                  type="button"
                  onClick={() => { onChange(""); closePanel(); }}
                  className="rounded px-2 py-1 text-xs text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 active:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60"
                >
                  清除
                </button>
                <button
                  type="button"
                  onClick={() => { onChange(todayKey); closePanel(); }}
                  className="rounded px-2 py-1 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-50 active:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60"
                >
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
