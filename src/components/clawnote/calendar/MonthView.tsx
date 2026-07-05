"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { colorStyle } from "./colors";
import type { Occurrence } from "./types";
import { MS_DAY, WEEKDAYS, fmtTime, isToday, monthGrid, startOfDay } from "./dates";

export function MonthView({
  anchor,
  occurrences,
  onCreate,
  onOpen,
  onMoveToDay,
  onExpandDay,
}: {
  anchor: Date;
  occurrences: Occurrence[];
  onCreate: (day: Date) => void;
  onOpen: (occ: Occurrence) => void;
  onMoveToDay: (occ: Occurrence, day: Date) => void;
  onExpandDay: (day: Date) => void;
}) {
  const cells = useMemo(() => monthGrid(anchor), [anchor]);
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [overDay, setOverDay] = useState<number | null>(null);

  // Group occurrences by day (a multi-day event shows on each day it spans).
  const byDay = useMemo(() => {
    const map = new Map<number, Occurrence[]>();
    for (const cell of cells) map.set(cell.getTime(), []);
    for (const occ of occurrences) {
      for (const cell of cells) {
        const dayStart = cell.getTime();
        const dayEnd = dayStart + MS_DAY;
        if (occ.start.getTime() < dayEnd && occ.end.getTime() > dayStart) {
          map.get(dayStart)?.push(occ);
        }
      }
    }
    return map;
  }, [cells, occurrences]);

  return (
    <div className="flex h-full flex-col">
      <div className="grid grid-cols-7 border-b border-slate-200 text-center text-xs font-medium text-slate-500">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-2">
            {d}
          </div>
        ))}
      </div>
      <div className="grid flex-1 grid-cols-7 grid-rows-6">
        {cells.map((cell) => {
          const inMonth = cell.getMonth() === anchor.getMonth();
          const dayEvents = (byDay.get(cell.getTime()) ?? []).slice(0, 4);
          const total = byDay.get(cell.getTime())?.length ?? 0;
          // Origin day of the event being dragged — don't highlight/flag a no-op move back to it.
          const draggedOcc = dragKey ? occurrences.find((o) => o.key === dragKey) : undefined;
          const isOrigin = draggedOcc ? startOfDay(draggedOcc.start).getTime() === cell.getTime() : false;
          const isOver = overDay === cell.getTime() && !isOrigin;
          return (
            <div
              key={cell.getTime()}
              onDoubleClick={() => onCreate(cell)}
              onDragOver={(e) => {
                if (dragKey) {
                  e.preventDefault();
                  setOverDay(cell.getTime());
                }
              }}
              onDrop={() => {
                const occ = occurrences.find((o) => o.key === dragKey);
                if (occ && !isOrigin) onMoveToDay(occ, cell);
                setDragKey(null);
                setOverDay(null);
              }}
              className={cn(
                "group min-h-0 border-b border-r border-slate-100 p-1 text-left focus-visible:relative focus-visible:z-10",
                isOver && "bg-blue-50 ring-1 ring-inset ring-blue-300",
              )}
            >
              <div className="flex items-center justify-between px-1">
                <span
                  className={cn(
                    "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs",
                    isToday(cell) ? "bg-red-500 font-semibold text-white" : inMonth ? "text-slate-700" : "text-slate-300",
                  )}
                >
                  {cell.getDate()}
                </span>
                <button
                  onClick={() => onCreate(cell)}
                  aria-label="新建事件"
                  className="hidden h-5 w-5 items-center justify-center rounded text-slate-400 hover:bg-slate-200 group-hover:flex group-focus-within:flex [@media(hover:none)]:flex"
                  title="新建事件"
                >
                  +
                </button>
              </div>
              <div className={cn("mt-0.5 space-y-0.5", !inMonth && "opacity-60")}>
                {dayEvents.map((occ) => {
                  const c = colorStyle(occ.event.color);
                  return (
                    <button
                      key={occ.key}
                      draggable
                      onDragStart={() => setDragKey(occ.key)}
                      onDragEnd={() => {
                        setDragKey(null);
                        setOverDay(null);
                      }}
                      onClick={() => onOpen(occ)}
                      className={cn(
                        "flex w-full cursor-grab items-center gap-1 truncate rounded px-1 py-0.5 text-left text-[11px] leading-4 hover:brightness-95 active:cursor-grabbing",
                        dragKey && "[&_*]:pointer-events-none",
                        occ.event.allDay ? cn(c.dot, "text-white") : c.soft,
                      )}
                    >
                      {!occ.event.allDay && <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", c.dot)} />}
                      {!occ.event.allDay && <span className="shrink-0 text-slate-400">{fmtTime(occ.start)}</span>}
                      <span className={cn("truncate", !occ.event.allDay && c.text)}>{occ.event.title}</span>
                    </button>
                  );
                })}
                {total > dayEvents.length && (
                  <button
                    onClick={() => onExpandDay(startOfDay(cell))}
                    className="px-1 text-[11px] text-slate-400 hover:text-slate-600"
                  >
                    还有 {total - dayEvents.length} 项
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
