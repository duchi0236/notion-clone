"use client";

import type { CalendarEvent } from "./CalendarTypes";

const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

export function CalendarWeekView({ currentDate, events, onSelectDate, onSelectEvent }: { currentDate: Date; events: CalendarEvent[]; onSelectDate: (date: Date) => void; onSelectEvent: (event: CalendarEvent) => void }) {
  const days = getWeekDays(currentDate);
  const today = new Date();

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50">
        {days.map((day, index) => {
          const active = isSameDay(day, today);
          return (
            <button key={day.toISOString()} onDoubleClick={() => onSelectDate(day)} className="px-3 py-4 text-center hover:bg-blue-50/60">
              <div className="text-xs font-medium text-slate-400">{weekdays[index]}</div>
              <div className={`mx-auto mt-2 flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold ${active ? "bg-blue-600 text-white" : "text-slate-700"}`}>{day.getDate()}</div>
            </button>
          );
        })}
      </div>
      <div className="grid min-h-[560px] grid-cols-7">
        {days.map((day) => {
          const dayEvents = events.filter((event) => isSameDay(new Date(event.startsAt), day));
          return (
            <div key={day.toISOString()} className="border-r border-slate-100 p-3 last:border-r-0">
              <button onClick={() => onSelectDate(day)} className="mb-3 w-full rounded-xl border border-dashed border-slate-200 py-2 text-xs text-slate-400 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">+ 添加</button>
              <div className="space-y-2">
                {dayEvents.map((event) => (
                  <button key={event.id} onClick={() => onSelectEvent(event)} className={`w-full rounded-2xl px-3 py-2 text-left text-sm shadow-sm ${event.source === "TASK" ? "bg-amber-50 text-amber-800" : "bg-blue-50 text-blue-800"}`}>
                    <div className="font-semibold">{event.source === "TASK" ? "✓ " : ""}{event.title}</div>
                    <div className="mt-1 text-xs opacity-70">{event.allDay ? "全天" : new Date(event.startsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function getWeekDays(date: Date) {
  const start = new Date(date);
  start.setDate(date.getDate() - date.getDay());
  start.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }).map((_, index) => {
    const value = new Date(start);
    value.setDate(start.getDate() + index);
    return value;
  });
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
