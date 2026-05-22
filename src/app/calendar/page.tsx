"use client";

import { CalendarDays, ChevronLeft, ChevronRight, ListTodo, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CalendarEventDialog } from "@/components/calendar/CalendarEventDialog";
import { CalendarMonthView } from "@/components/calendar/CalendarMonthView";
import type { CalendarEvent, CalendarViewMode } from "@/components/calendar/CalendarTypes";

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [view, setView] = useState<CalendarViewMode>("month");
  const [dialogEvent, setDialogEvent] = useState<CalendarEvent | null>(null);
  const [dialogDate, setDialogDate] = useState<Date | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);
      const res = await fetch(`/api/calendar/events?start=${start.toISOString()}&end=${end.toISOString()}`);
      const data = await res.json();
      setEvents(data.events ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [currentDate.getFullYear(), currentDate.getMonth()]);

  const agendaEvents = useMemo(() => [...events].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()), [events]);

  function previousMonth() {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  }

  function nextMonth() {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  }

  function openCreate(date?: Date) {
    setDialogEvent(null);
    setDialogDate(date ?? new Date());
    setDialogOpen(true);
  }

  function openEvent(event: CalendarEvent) {
    setDialogEvent(event);
    setDialogDate(null);
    setDialogOpen(true);
  }

  return (
    <main className="min-h-screen bg-slate-50 px-8 py-6 text-slate-900">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white"><CalendarDays className="h-5 w-5" /></div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">日历</h1>
                <p className="mt-1 text-sm text-slate-500">像 Google Calendar 一样管理日程，并自动查看待办任务。</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setCurrentDate(new Date())} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">今天</button>
            <button onClick={previousMonth} className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50"><ChevronLeft className="h-4 w-4" /></button>
            <button onClick={nextMonth} className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50"><ChevronRight className="h-4 w-4" /></button>
            <div className="mx-2 min-w-[160px] text-center text-lg font-semibold">{currentDate.getFullYear()} 年 {currentDate.getMonth() + 1} 月</div>
            <div className="flex rounded-xl border border-slate-200 bg-white p-1">
              <button onClick={() => setView("month")} className={`rounded-lg px-3 py-1.5 text-sm ${view === "month" ? "bg-slate-900 text-white" : "text-slate-500"}`}>月</button>
              <button onClick={() => setView("agenda")} className={`rounded-lg px-3 py-1.5 text-sm ${view === "agenda" ? "bg-slate-900 text-white" : "text-slate-500"}`}>列表</button>
            </div>
            <button onClick={() => openCreate()} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"><Plus className="mr-1 inline h-4 w-4" />新建</button>
          </div>
        </header>

        {loading && <div className="mb-3 rounded-2xl bg-blue-50 px-4 py-3 text-sm text-blue-700">正在同步日程和待办...</div>}

        {view === "month" ? (
          <CalendarMonthView currentDate={currentDate} events={events} onSelectDate={openCreate} onSelectEvent={openEvent} />
        ) : (
          <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700"><ListTodo className="h-4 w-4" />日程与待办列表</div>
            <div className="space-y-2">
              {agendaEvents.map((event) => (
                <button key={event.id} onClick={() => openEvent(event)} className="flex w-full items-center justify-between rounded-2xl border border-slate-100 p-4 text-left hover:bg-slate-50">
                  <div>
                    <div className="font-semibold text-slate-900">{event.source === "TASK" ? "✓ " : ""}{event.title}</div>
                    <div className="mt-1 text-sm text-slate-500">{new Date(event.startsAt).toLocaleString()} · {event.source === "TASK" ? "待办任务" : "日程"}</div>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-xs ${event.status === "DONE" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"}`}>{event.status}</span>
                </button>
              ))}
              {agendaEvents.length === 0 && <div className="py-10 text-center text-sm text-slate-400">暂无日程</div>}
            </div>
          </section>
        )}
      </div>

      {dialogOpen && <CalendarEventDialog event={dialogEvent} date={dialogDate} onClose={() => setDialogOpen(false)} onSaved={load} />}
    </main>
  );
}
