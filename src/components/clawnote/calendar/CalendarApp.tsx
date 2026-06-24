"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CalendarPlus, ChevronLeft, ChevronRight, Download, Plus, Search, Sparkles, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { api, uid } from "../pro/api";
import { colorStyle, COLOR_KEYS, type EventColor } from "./colors";
import type { Calendar, CalendarEvent, CalendarView, Occurrence } from "./types";
import { MonthView } from "./MonthView";
import { TimeGridView } from "./TimeGridView";
import { YearView } from "./YearView";
import { EventEditor, eventToDraft, type EditorDraft } from "./EventEditor";
import { parseQuickEvent } from "./quickParse";
import { eventsToIcs, icsToEvents } from "./ics";
import {
  MONTHS,
  addDays,
  addMonths,
  endOfDay,
  expandEvents,
  fmtTime,
  startOfDay,
  startOfMonth,
  startOfWeek,
  weekDays,
} from "./dates";

const LS_EVENTS = "clawnote.calendar.events";
const LS_CALENDARS = "clawnote.calendar.calendars";

function loadLS<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveLS<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota errors */
  }
}

export default function CalendarApp() {
  const [view, setView] = useState<CalendarView>("month");
  const [anchor, setAnchor] = useState(() => new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [draft, setDraft] = useState<EditorDraft | null>(null);
  const [offline, setOffline] = useState(false);
  const [quickText, setQuickText] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CalendarEvent[]>([]);
  const [importNote, setImportNote] = useState<string | null>(null);
  const notified = useRef<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ---- Visible range -------------------------------------------------------
  const range = useMemo(() => {
    if (view === "year") {
      return { start: new Date(anchor.getFullYear(), 0, 1), end: endOfDay(new Date(anchor.getFullYear(), 11, 31)) };
    }
    if (view === "month") {
      return { start: startOfWeek(startOfMonth(anchor)), end: endOfDay(addDays(startOfWeek(startOfMonth(anchor)), 41)) };
    }
    if (view === "week") {
      const first = startOfWeek(anchor);
      return { start: first, end: endOfDay(addDays(first, 6)) };
    }
    return { start: startOfDay(anchor), end: endOfDay(anchor) };
  }, [view, anchor]);

  // ---- Data loading --------------------------------------------------------
  const loadCalendars = useCallback(async () => {
    const res = await api<{ calendars: Calendar[] }>("/api/calendar/calendars");
    if (res?.calendars) {
      setCalendars(res.calendars);
      saveLS(LS_CALENDARS, res.calendars);
    } else {
      setOffline(true);
      setCalendars(loadLS<Calendar[]>(LS_CALENDARS, []));
    }
  }, []);

  const loadEvents = useCallback(async () => {
    const res = await api<{ events: CalendarEvent[] }>(
      `/api/calendar/events?start=${encodeURIComponent(range.start.toISOString())}&end=${encodeURIComponent(range.end.toISOString())}`,
    );
    if (res?.events) {
      setEvents(res.events);
    } else {
      setOffline(true);
      setEvents(loadLS<CalendarEvent[]>(LS_EVENTS, []));
    }
  }, [range.start, range.end]);

  useEffect(() => {
    void loadCalendars();
  }, [loadCalendars]);
  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  // Keep a full local mirror for offline mode persistence.
  useEffect(() => {
    if (offline) saveLS(LS_EVENTS, events);
  }, [events, offline]);

  // ---- Occurrences (recurrence expanded + calendar filter) -----------------
  const occurrences = useMemo<Occurrence[]>(() => {
    const visible = events.filter((e) => !(e.calendarId && hidden.has(e.calendarId)));
    return expandEvents(visible, range.start, range.end);
  }, [events, hidden, range.start, range.end]);

  // Day-start timestamps that have at least one event (drives the year-view dots).
  const eventDays = useMemo(() => {
    const set = new Set<number>();
    for (const occ of occurrences) {
      let d = startOfDay(occ.start);
      while (d <= occ.end) {
        set.add(d.getTime());
        d = addDays(d, 1);
      }
    }
    return set;
  }, [occurrences]);

  // ---- Reminders (desktop notifications while the app is open) -------------
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    const hasReminders = events.some((e) => e.reminderMinutes != null);
    if (hasReminders && Notification.permission === "default") {
      void Notification.requestPermission();
    }
    const timers: ReturnType<typeof setTimeout>[] = [];
    const now = Date.now();
    const horizon = now + 24 * 60 * 60 * 1000;
    for (const occ of expandEvents(events, new Date(now), new Date(horizon))) {
      const mins = occ.event.reminderMinutes;
      if (mins == null) continue;
      const fireAt = occ.start.getTime() - mins * 60000;
      const key = `${occ.key}:${mins}`;
      if (fireAt <= now || fireAt > horizon || notified.current.has(key)) continue;
      timers.push(
        setTimeout(() => {
          notified.current.add(key);
          if (Notification.permission === "granted") {
            new Notification(occ.event.title, {
              body: mins === 0 ? "现在开始" : `${occ.start.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })} 开始`,
            });
          }
        }, fireAt - now),
      );
    }
    return () => timers.forEach(clearTimeout);
  }, [events]);

  // ---- Mutations -----------------------------------------------------------
  function defaultCalendar() {
    return calendars.find((c) => c.isDefault) ?? calendars[0];
  }

  function newDraft(start: Date, end: Date, allDay = false): EditorDraft {
    const cal = defaultCalendar();
    return {
      title: "",
      location: "",
      description: "",
      allDay,
      start,
      end,
      color: (cal?.color as EventColor) ?? "blue",
      calendarId: cal?.id ?? null,
      repeat: "none",
      repeatUntil: null,
      reminderMinutes: null,
      attendees: "",
    };
  }

  function draftToPayload(d: EditorDraft) {
    const attendees = d.attendees
      .split(/[,，;；]/)
      .map((s) => s.trim())
      .filter(Boolean);
    return {
      title: d.title.trim() || "新建事件",
      location: d.location || null,
      description: d.description || null,
      allDay: d.allDay,
      startsAt: d.start.toISOString(),
      endsAt: d.end.toISOString(),
      color: d.color,
      calendarId: d.calendarId,
      repeat: d.repeat,
      repeatUntil: d.repeatUntil ? d.repeatUntil.toISOString() : null,
      reminderMinutes: d.reminderMinutes,
      attendees,
    };
  }

  async function saveDraft(d: EditorDraft) {
    const payload = draftToPayload(d);
    if (d.id) {
      // optimistic
      setEvents((list) => list.map((e) => (e.id === d.id ? { ...e, ...payload, color: d.color } : e)));
      const res = await api<{ event: CalendarEvent }>(`/api/calendar/events/${d.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      if (res?.event) setEvents((list) => list.map((e) => (e.id === res.event.id ? res.event : e)));
    } else {
      const res = await api<{ event: CalendarEvent }>("/api/calendar/events", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (res?.event) {
        setEvents((list) => [...list, res.event]);
      } else {
        // offline fallback
        setOffline(true);
        setEvents((list) => [...list, { id: uid("evt"), status: "CONFIRMED", ...payload } as CalendarEvent]);
      }
    }
    setDraft(null);
  }

  async function deleteEvent(id?: string) {
    if (!id) return;
    setEvents((list) => list.filter((e) => e.id !== id));
    setDraft(null);
    await api(`/api/calendar/events/${id}`, { method: "DELETE" });
  }

  // Quick reschedule from drag (month: move to day keeping time; grid: set times).
  async function quickUpdate(occ: Occurrence, start: Date, end: Date) {
    const payload = { startsAt: start.toISOString(), endsAt: end.toISOString() };
    setEvents((list) => list.map((e) => (e.id === occ.event.id ? { ...e, ...payload } : e)));
    await api(`/api/calendar/events/${occ.event.id}`, { method: "PATCH", body: JSON.stringify(payload) });
  }

  function moveToDay(occ: Occurrence, day: Date) {
    const duration = occ.end.getTime() - occ.start.getTime();
    const start = new Date(day);
    start.setHours(occ.start.getHours(), occ.start.getMinutes(), 0, 0);
    void quickUpdate(occ, start, new Date(start.getTime() + duration));
  }

  async function addCalendar() {
    const used = new Set(calendars.map((c) => c.color));
    const color = COLOR_KEYS.find((c) => !used.has(c)) ?? "blue";
    const res = await api<{ calendar: Calendar }>("/api/calendar/calendars", {
      method: "POST",
      body: JSON.stringify({ name: "新日历", color }),
    });
    if (res?.calendar) setCalendars((list) => [...list, res.calendar]);
  }

  function toggleCalendar(id: string) {
    setHidden((set) => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // ---- Natural-language quick add ------------------------------------------
  function runQuickAdd() {
    const parsed = parseQuickEvent(quickText);
    if (!parsed) return;
    const base = newDraft(parsed.start, parsed.end, parsed.allDay);
    setDraft({ ...base, title: parsed.title });
    setQuickText("");
  }

  // ---- Search (server-side, ignores the visible range) ---------------------
  useEffect(() => {
    if (!searchOpen) return;
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      const res = await api<{ events: CalendarEvent[] }>(`/api/calendar/events?q=${encodeURIComponent(q)}`);
      if (!cancelled && res?.events) setSearchResults(res.events);
    }, 220);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [searchQuery, searchOpen]);

  function openSearchResult(event: CalendarEvent) {
    setAnchor(new Date(event.startsAt));
    setView("day");
    setSearchOpen(false);
    setSearchQuery("");
    setDraft(eventToDraft(event));
  }

  // ---- ICS import / export -------------------------------------------------
  async function exportIcs() {
    const res = await api<{ events: CalendarEvent[] }>("/api/calendar/events");
    const all = res?.events ?? events;
    const blob = new Blob([eventsToIcs(all)], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clawnote-${new Date().toISOString().slice(0, 10)}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importIcs(file: File) {
    const text = await file.text();
    const parsed = icsToEvents(text);
    if (!parsed.length) {
      setImportNote("未在文件中找到事件");
      return;
    }
    const cal = defaultCalendar();
    let ok = 0;
    for (const p of parsed) {
      const res = await api<{ event: CalendarEvent }>("/api/calendar/events", {
        method: "POST",
        body: JSON.stringify({ ...p, calendarId: cal?.id ?? null, color: cal?.color ?? "blue", source: "IMPORTED" }),
      });
      if (res?.event) ok += 1;
    }
    setImportNote(`已导入 ${ok} / ${parsed.length} 个事件`);
    await loadEvents();
    setTimeout(() => setImportNote(null), 4000);
  }

  // ---- Navigation ----------------------------------------------------------
  function shift(dir: number) {
    if (view === "year") setAnchor((d) => addMonths(d, dir * 12));
    else if (view === "month") setAnchor((d) => addMonths(d, dir));
    else if (view === "week") setAnchor((d) => addDays(d, dir * 7));
    else setAnchor((d) => addDays(d, dir));
  }

  const title = useMemo(() => {
    if (view === "year") return `${anchor.getFullYear()} 年`;
    if (view === "month") return `${anchor.getFullYear()} 年 ${MONTHS[anchor.getMonth()]}`;
    if (view === "day") return `${anchor.getFullYear()} 年 ${MONTHS[anchor.getMonth()]} ${anchor.getDate()} 日`;
    const ws = weekDays(anchor);
    const a = ws[0];
    const b = ws[6];
    return `${a.getFullYear()} 年 ${MONTHS[a.getMonth()]} ${a.getDate()} – ${MONTHS[b.getMonth()]} ${b.getDate()}`;
  }, [view, anchor]);

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <header className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-4 py-3">
        <h1 className="mr-2 min-w-[200px] text-lg font-semibold text-slate-900">{title}</h1>
        <button onClick={() => shift(-1)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          onClick={() => setAnchor(new Date())}
          className="rounded-lg border border-slate-200 px-3 py-1 text-sm text-slate-700 hover:bg-slate-100"
        >
          今天
        </button>
        <button onClick={() => shift(1)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100">
          <ChevronRight className="h-4 w-4" />
        </button>

        <div className="ml-2 flex rounded-lg border border-slate-200 p-0.5">
          {(["day", "week", "month", "year"] as CalendarView[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                "rounded-md px-3 py-1 text-sm",
                view === v ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100",
              )}
            >
              {v === "day" ? "日" : v === "week" ? "周" : v === "month" ? "月" : "年"}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {offline && <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-700">离线模式（本地存储）</span>}
          {/* Calendar filter chips */}
          <div className="flex flex-wrap items-center gap-1">
            {calendars.map((c) => {
              const s = colorStyle(c.color);
              const off = hidden.has(c.id);
              return (
                <button
                  key={c.id}
                  onClick={() => toggleCalendar(c.id)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs",
                    off ? "border-slate-200 text-slate-400" : "border-slate-300 text-slate-700",
                  )}
                  title={off ? "显示" : "隐藏"}
                >
                  <span className={cn("h-2.5 w-2.5 rounded-full", off ? "bg-slate-300" : s.dot)} />
                  {c.name}
                </button>
              );
            })}
            <button onClick={addCalendar} className="rounded-full p-1 text-slate-400 hover:bg-slate-100" title="新建日历">
              <CalendarPlus className="h-4 w-4" />
            </button>
          </div>

          <button
            onClick={() => {
              const start = new Date(anchor);
              start.setHours(9, 0, 0, 0);
              setDraft(newDraft(start, new Date(start.getTime() + 60 * 60 * 1000)));
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
          >
            <Plus className="h-4 w-4" /> 新建事件
          </button>
        </div>
      </header>

      {/* Secondary toolbar: quick add + search + import/export */}
      <div className="relative flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50/60 px-4 py-2">
        <div className="flex min-w-[260px] flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5">
          <Sparkles className="h-4 w-4 text-violet-500" />
          <input
            value={quickText}
            onChange={(e) => setQuickText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") runQuickAdd();
            }}
            placeholder="快速添加：明天 下午3点 和张三开会 1小时"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
          />
          {quickText && (
            <button onClick={runQuickAdd} className="rounded-md bg-slate-900 px-2 py-0.5 text-xs text-white hover:bg-slate-700">
              添加
            </button>
          )}
        </div>

        <button
          onClick={() => setSearchOpen((v) => !v)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm",
            searchOpen ? "border-slate-300 bg-white text-slate-900" : "border-slate-200 text-slate-600 hover:bg-white",
          )}
        >
          <Search className="h-4 w-4" /> 搜索
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-white"
          title="从 .ics 文件导入"
        >
          <Upload className="h-4 w-4" /> 导入
        </button>
        <button
          onClick={exportIcs}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-white"
          title="导出为 .ics 文件"
        >
          <Download className="h-4 w-4" /> 导出
        </button>
        {importNote && <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-700">{importNote}</span>}
        <input
          ref={fileInputRef}
          type="file"
          accept=".ics,text/calendar"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void importIcs(file);
            e.target.value = "";
          }}
        />

        {/* Search dropdown */}
        {searchOpen && (
          <div className="absolute left-4 right-4 top-full z-30 mt-1 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索全部事件的标题、地点、备注…"
                className="flex-1 bg-transparent text-sm outline-none"
              />
              <button onClick={() => setSearchOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-2 max-h-72 overflow-y-auto">
              {searchQuery.trim() && searchResults.length === 0 && (
                <p className="px-3 py-4 text-center text-sm text-slate-400">没有匹配的事件</p>
              )}
              {searchResults.map((ev) => {
                const c = colorStyle(ev.color);
                const d = new Date(ev.startsAt);
                return (
                  <button
                    key={ev.id}
                    onClick={() => openSearchResult(ev)}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-slate-50"
                  >
                    <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", c.dot)} />
                    <span className="flex-1 truncate text-sm text-slate-800">{ev.title}</span>
                    <span className="shrink-0 text-xs text-slate-400">
                      {d.toLocaleDateString("zh-CN")} {ev.allDay ? "全天" : fmtTime(d)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="min-h-0 flex-1">
        {view === "year" ? (
          <YearView
            year={anchor.getFullYear()}
            eventDays={eventDays}
            onSelectDay={(day) => {
              setAnchor(day);
              setView("day");
            }}
            onSelectMonth={(month) => {
              setAnchor(new Date(anchor.getFullYear(), month, 1));
              setView("month");
            }}
          />
        ) : view === "month" ? (
          <MonthView
            anchor={anchor}
            occurrences={occurrences}
            onCreate={(day) => {
              const start = new Date(day);
              start.setHours(9, 0, 0, 0);
              setDraft(newDraft(start, new Date(start.getTime() + 60 * 60 * 1000)));
            }}
            onOpen={(occ) => setDraft(eventToDraft(occ.event))}
            onMoveToDay={moveToDay}
          />
        ) : (
          <TimeGridView
            days={view === "week" ? weekDays(anchor) : [startOfDay(anchor)]}
            occurrences={occurrences}
            onCreateRange={(start, end) => setDraft(newDraft(start, end))}
            onOpen={(occ) => setDraft(eventToDraft(occ.event))}
            onUpdate={quickUpdate}
          />
        )}
      </div>

      {draft && (
        <EventEditor
          draft={draft}
          calendars={calendars}
          onSave={saveDraft}
          onDelete={draft.id ? () => deleteEvent(draft.id) : undefined}
          onClose={() => setDraft(null)}
        />
      )}
    </div>
  );
}
