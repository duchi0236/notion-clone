"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { colorStyle } from "./colors";
import type { Occurrence } from "./types";
import { MS_DAY, WEEKDAYS, fmtHour, fmtTime, isSameDay, isToday, startOfDay } from "./dates";

const HOUR_H = 48; // px per hour
const SNAP_MIN = 15;
const DAY_MIN = 24 * 60;

type DragState =
  | { mode: "create"; dayIndex: number; anchorMin: number; curMin: number }
  | { mode: "move"; key: string; dayIndex: number; offsetMin: number; durationMin: number; curStartMin: number }
  | { mode: "resize"; key: string; dayIndex: number; startMin: number; curEndMin: number };

function minutesOfDay(d: Date) {
  return d.getHours() * 60 + d.getMinutes();
}

function snap(min: number) {
  return Math.round(min / SNAP_MIN) * SNAP_MIN;
}

// Lay out overlapping timed events into side-by-side columns.
function layoutColumns(occs: Occurrence[]) {
  const sorted = [...occs].sort((a, b) => a.start.getTime() - b.start.getTime() || b.end.getTime() - a.end.getTime());
  const result = new Map<string, { col: number; cols: number }>();
  let cluster: Occurrence[] = [];
  let clusterEnd = 0;

  const flush = () => {
    const cols: Occurrence[][] = [];
    for (const occ of cluster) {
      let placed = false;
      for (let i = 0; i < cols.length; i += 1) {
        const last = cols[i][cols[i].length - 1];
        if (last.end.getTime() <= occ.start.getTime()) {
          cols[i].push(occ);
          result.set(occ.key, { col: i, cols: 0 });
          placed = true;
          break;
        }
      }
      if (!placed) {
        cols.push([occ]);
        result.set(occ.key, { col: cols.length - 1, cols: 0 });
      }
    }
    for (const occ of cluster) {
      const r = result.get(occ.key)!;
      r.cols = cols.length;
    }
    cluster = [];
  };

  for (const occ of sorted) {
    if (cluster.length && occ.start.getTime() >= clusterEnd) flush();
    cluster.push(occ);
    clusterEnd = Math.max(clusterEnd, occ.end.getTime());
  }
  flush();
  return result;
}

export function TimeGridView({
  days,
  occurrences,
  onCreateRange,
  onOpen,
  onUpdate,
}: {
  days: Date[];
  occurrences: Occurrence[];
  onCreateRange: (start: Date, end: Date) => void;
  onOpen: (occ: Occurrence) => void;
  onUpdate: (occ: Occurrence, start: Date, end: Date) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const colRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  dragRef.current = drag;

  // Scroll to ~8am on mount.
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 7 * HOUR_H;
  }, []);

  const allDay = occurrences.filter((o) => o.event.allDay);
  const timed = occurrences.filter((o) => !o.event.allDay);

  function yToMinutes(dayIndex: number, clientY: number) {
    const el = colRefs.current[dayIndex];
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const min = ((clientY - rect.top) / HOUR_H) * 60;
    return Math.max(0, Math.min(DAY_MIN, snap(min)));
  }

  function dayIndexFromX(clientX: number) {
    for (let i = 0; i < colRefs.current.length; i += 1) {
      const el = colRefs.current[i];
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      if (clientX >= rect.left && clientX <= rect.right) return i;
    }
    return null;
  }

  useEffect(() => {
    if (!drag) return;
    function onMove(e: MouseEvent) {
      const d = dragRef.current;
      if (!d) return;
      if (d.mode === "create") {
        setDrag({ ...d, curMin: yToMinutes(d.dayIndex, e.clientY) });
      } else if (d.mode === "move") {
        const idx = dayIndexFromX(e.clientX) ?? d.dayIndex;
        const top = yToMinutes(idx, e.clientY) - d.offsetMin;
        setDrag({ ...d, dayIndex: idx, curStartMin: Math.max(0, Math.min(DAY_MIN - d.durationMin, snap(top))) });
      } else if (d.mode === "resize") {
        setDrag({ ...d, curEndMin: Math.max(d.startMin + SNAP_MIN, yToMinutes(d.dayIndex, e.clientY)) });
      }
    }
    function onUp() {
      const d = dragRef.current;
      if (d) commit(d);
      setDrag(null);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag?.mode]);

  function commit(d: DragState) {
    if (d.mode === "create") {
      const a = Math.min(d.anchorMin, d.curMin);
      const b = Math.max(d.anchorMin, d.curMin);
      const day = days[d.dayIndex];
      const start = new Date(day);
      start.setHours(0, a / 60, a % 60, 0);
      const end = new Date(day);
      const span = b - a < SNAP_MIN ? a + 60 : b; // click (no drag) → 1h default
      end.setHours(0, Math.floor(span / 60), span % 60, 0);
      onCreateRange(start, end);
      return;
    }
    const occ = occurrences.find((o) => o.key === d.key);
    if (!occ) return;
    if (d.mode === "move") {
      const day = days[d.dayIndex];
      const start = new Date(day);
      start.setHours(0, Math.floor(d.curStartMin / 60), d.curStartMin % 60, 0);
      const end = new Date(start.getTime() + d.durationMin * 60000);
      onUpdate(occ, start, end);
    } else if (d.mode === "resize") {
      const start = new Date(occ.start);
      const end = new Date(occ.start);
      end.setHours(0, Math.floor(d.curEndMin / 60), d.curEndMin % 60, 0);
      onUpdate(occ, start, end);
    }
  }

  const columnLayout = useMemo(() => {
    // Layout per day so overlaps only consider same-day events.
    const perDay = days.map((day) => {
      const dayStart = startOfDay(day).getTime();
      const dayEnd = dayStart + MS_DAY;
      return timed.filter((o) => o.start.getTime() < dayEnd && o.end.getTime() > dayStart);
    });
    return perDay.map((occs) => layoutColumns(occs));
  }, [days, timed]);

  return (
    <div className="flex h-full flex-col">
      {/* Header: weekday + date */}
      <div className="flex border-b border-slate-200 pr-3">
        <div className="w-14 shrink-0" />
        {days.map((day) => (
          <div key={day.getTime()} className="flex-1 py-2 text-center">
            <div className="text-xs text-slate-500">{WEEKDAYS[day.getDay()]}</div>
            <div
              className={cn(
                "mx-auto mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full text-sm",
                isToday(day) ? "bg-red-500 font-semibold text-white" : "text-slate-800",
              )}
            >
              {day.getDate()}
            </div>
          </div>
        ))}
      </div>

      {/* All-day row */}
      {allDay.length > 0 && (
        <div className="flex border-b border-slate-200 bg-slate-50/50">
          <div className="flex w-14 shrink-0 items-center justify-end pr-2 text-[10px] text-slate-400">全天</div>
          {days.map((day) => {
            const dayStart = startOfDay(day).getTime();
            const dayEnd = dayStart + MS_DAY;
            const items = allDay.filter((o) => o.start.getTime() < dayEnd && o.end.getTime() > dayStart);
            return (
              <div key={day.getTime()} className="flex-1 space-y-0.5 border-l border-slate-100 p-1">
                {items.map((occ) => {
                  const c = colorStyle(occ.event.color);
                  return (
                    <button
                      key={occ.key}
                      onClick={() => onOpen(occ)}
                      className={cn("block w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] text-white", c.dot)}
                    >
                      {occ.event.title}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* Scrollable hour grid */}
      <div ref={scrollRef} className="relative flex-1 overflow-y-auto">
        <div className="flex" style={{ height: 24 * HOUR_H }}>
          {/* Hour labels */}
          <div className="w-14 shrink-0">
            {Array.from({ length: 24 }, (_, h) => (
              <div key={h} className="relative" style={{ height: HOUR_H }}>
                <span className="absolute -top-1.5 right-2 text-[10px] text-slate-400">{h === 0 ? "" : fmtHour(h)}</span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day, dayIndex) => {
            const layout = columnLayout[dayIndex];
            const dayOccs = timed.filter((o) => {
              const ds = startOfDay(day).getTime();
              return o.start.getTime() < ds + MS_DAY && o.end.getTime() > ds;
            });
            return (
              <div
                key={day.getTime()}
                ref={(el) => {
                  colRefs.current[dayIndex] = el;
                }}
                className="relative flex-1 border-l border-slate-100"
                onMouseDown={(e) => {
                  if (e.button !== 0 || e.target !== e.currentTarget) return;
                  const m = yToMinutes(dayIndex, e.clientY);
                  setDrag({ mode: "create", dayIndex, anchorMin: m, curMin: m });
                }}
              >
                {/* Hour lines */}
                {Array.from({ length: 24 }, (_, h) => (
                  <div key={h} className="border-b border-slate-100" style={{ height: HOUR_H }} />
                ))}

                {/* Now indicator */}
                {isToday(day) && <NowLine />}

                {/* Create preview */}
                {drag?.mode === "create" && drag.dayIndex === dayIndex && (
                  <div
                    className="pointer-events-none absolute left-1 right-1 rounded bg-blue-400/40 ring-1 ring-blue-500"
                    style={{
                      top: (Math.min(drag.anchorMin, drag.curMin) / 60) * HOUR_H,
                      height: Math.max((Math.abs(drag.curMin - drag.anchorMin) / 60) * HOUR_H, 4),
                    }}
                  />
                )}

                {/* Timed events */}
                {dayOccs.map((occ) => {
                  const c = colorStyle(occ.event.color);
                  const lay = layout.get(occ.key) ?? { col: 0, cols: 1 };
                  const isDragging = (drag?.mode === "move" || drag?.mode === "resize") && drag.key === occ.key;

                  let startMin = minutesOfDay(occ.start);
                  let endMin = isSameDay(occ.end, day) ? minutesOfDay(occ.end) : DAY_MIN;
                  if (!isSameDay(occ.start, day)) startMin = 0;

                  if (drag?.mode === "move" && drag.key === occ.key) {
                    startMin = drag.curStartMin;
                    endMin = drag.curStartMin + drag.durationMin;
                  } else if (drag?.mode === "resize" && drag.key === occ.key) {
                    endMin = drag.curEndMin;
                  }

                  const widthPct = 100 / lay.cols;
                  return (
                    <div
                      key={occ.key}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        const grabMin = yToMinutes(dayIndex, e.clientY);
                        setDrag({
                          mode: "move",
                          key: occ.key,
                          dayIndex,
                          offsetMin: grabMin - startMin,
                          durationMin: Math.max(SNAP_MIN, endMin - startMin),
                          curStartMin: startMin,
                        });
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpen(occ);
                      }}
                      className={cn(
                        "absolute cursor-grab overflow-hidden rounded-md border-l-2 px-1.5 py-0.5 text-[11px] leading-4 shadow-sm active:cursor-grabbing",
                        c.soft,
                        c.border,
                        c.text,
                        isDragging && "opacity-80 ring-2 ring-blue-400",
                      )}
                      style={{
                        top: (startMin / 60) * HOUR_H,
                        height: Math.max(((endMin - startMin) / 60) * HOUR_H, 16),
                        left: `calc(${lay.col * widthPct}% + 2px)`,
                        width: `calc(${widthPct}% - 4px)`,
                      }}
                    >
                      <div className="truncate font-medium">{occ.event.title}</div>
                      <div className="truncate opacity-70">{fmtTime(occ.start)}</div>
                      {/* Resize handle */}
                      <div
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          setDrag({ mode: "resize", key: occ.key, dayIndex, startMin, curEndMin: endMin });
                        }}
                        className="absolute inset-x-0 bottom-0 h-1.5 cursor-ns-resize"
                      />
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function NowLine() {
  const [min, setMin] = useState(() => new Date().getHours() * 60 + new Date().getMinutes());
  useEffect(() => {
    const t = setInterval(() => setMin(new Date().getHours() * 60 + new Date().getMinutes()), 60000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="pointer-events-none absolute inset-x-0 z-10" style={{ top: (min / 60) * HOUR_H }}>
      <div className="relative">
        <div className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-red-500" />
        <div className="border-t border-red-500" />
      </div>
    </div>
  );
}
