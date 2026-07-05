"use client";

import type { CalendarEvent } from "./CalendarTypes";

const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

export function CalendarMonthView({
  currentDate,
  events,
  onSelectDate,
  onSelectEvent,
}: {
  currentDate: Date;
  events: CalendarEvent[];
  onSelectDate: (date: Date) => void;
  onSelectEvent: (event: CalendarEvent) => void;
}) {
  const days = getMonthDays(currentDate);
  const today = new Date();

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50">
        {weekdays.map((day) => <div key={day} className="px-3 py-3 text-center text-xs font-semibold text-slate-500">{day}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const dayEvents = events.filter((event) => isSameDay(new Date(event.startsAt), day.date));
          const muted = day.date.getMonth() !== currentDate.getMonth();
          const activeToday = isSameDay(day.date, today);
          return (
            <button key={day.key} onDoubleClick={() => onSelectDate(day.date)} className="min-h-[132px] border-b border-r border-slate-100 p-2 text-left transition hover:bg-blue-50/40">
              <div className={`mb-2 flex h-7 w-7 items-center justify-center rounded-full text-sm ${activeToday ? "bg-blue-600 text-white" : muted ? "text-slate-300" : "text-slate-700"}`}>{day.date.getDate()}</div>
              <div className="space-y-1">
                {dayEvents.slice(0, 4).map((event) => (
                  <div key={event.id} onClick={(e) => { e.stopPropagation(); onSelectEvent(event); }} className={`truncate rounded-lg px-2 py-1 text-xs ${event.source === "TASK" ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700"}`}>
                    {event.source === "TASK" ? "✓ " : ""}{event.title}
                  </div>
                ))}
                {dayEvents.length > 4 && <div className="px-2 text-xs text-slate-400">+{dayEvents.length - 4} 更多</div>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function getMonthDays(date: Date) {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }).map((_, index) => {
    const value = new Date(start);
    value.setDate(start.getDate() + index);
    return { key: value.toISOString(), date: value };
  });
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
