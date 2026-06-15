"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, Clock, MapPin, Palette, Repeat, Trash2, Users, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { COLOR_KEYS, EVENT_COLORS, type EventColor } from "./colors";
import { REMINDER_OPTIONS, REPEAT_OPTIONS, type Calendar, type CalendarEvent, type RepeatRule } from "./types";
import { toDateInput, toLocalInput } from "./dates";

export type EditorDraft = {
  id?: string;
  title: string;
  location: string;
  description: string;
  allDay: boolean;
  start: Date;
  end: Date;
  color: EventColor | string;
  calendarId: string | null;
  repeat: RepeatRule;
  repeatUntil: Date | null;
  reminderMinutes: number | null;
  attendees: string; // comma-separated names / emails
};

export function eventToDraft(event: CalendarEvent): EditorDraft {
  return {
    id: event.id,
    title: event.title,
    location: event.location ?? "",
    description: event.description ?? "",
    allDay: event.allDay,
    start: new Date(event.startsAt),
    end: new Date(event.endsAt),
    color: event.color ?? "blue",
    calendarId: event.calendarId ?? null,
    repeat: (event.repeat as RepeatRule) ?? "none",
    repeatUntil: event.repeatUntil ? new Date(event.repeatUntil) : null,
    reminderMinutes: event.reminderMinutes ?? null,
    attendees: (event.metadata?.attendees ?? []).join(", "),
  };
}

function readDateInput(value: string, base: Date, allDay: boolean): Date {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return base;
  if (allDay) d.setHours(0, 0, 0, 0);
  return d;
}

export function EventEditor({
  draft,
  calendars,
  onSave,
  onDelete,
  onClose,
}: {
  draft: EditorDraft;
  calendars: Calendar[];
  onSave: (draft: EditorDraft) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<EditorDraft>(draft);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => setForm(draft), [draft]);
  useEffect(() => {
    titleRef.current?.focus();
    titleRef.current?.select();
  }, []);
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") onSave(form);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [form, onClose, onSave]);

  function set<K extends keyof EditorDraft>(key: K, value: EditorDraft[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function setAllDay(allDay: boolean) {
    setForm((f) => {
      const start = new Date(f.start);
      const end = new Date(f.end);
      if (allDay) {
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
      }
      return { ...f, allDay, start, end };
    });
  }

  const isNew = !form.id;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4" onMouseDown={onClose}>
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h2 className="text-sm font-semibold text-slate-900">{isNew ? "新建事件" : "编辑事件"}</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto px-5 py-4">
          <input
            ref={titleRef}
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="标题"
            className="w-full border-b border-slate-200 pb-2 text-lg font-medium outline-none placeholder:text-slate-300 focus:border-slate-400"
          />

          <label className="flex items-center gap-2 text-sm text-slate-600">
            <MapPin className="h-4 w-4 text-slate-400" />
            <input
              value={form.location}
              onChange={(e) => set("location", e.target.value)}
              placeholder="地点"
              className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 outline-none focus:border-slate-400"
            />
          </label>

          <label className="flex items-center gap-2 text-sm text-slate-600">
            <Users className="h-4 w-4 text-slate-400" />
            <input
              value={form.attendees}
              onChange={(e) => set("attendees", e.target.value)}
              placeholder="邀请人（用逗号分隔）"
              className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 outline-none focus:border-slate-400"
            />
          </label>

          {/* All-day + times */}
          <div className="rounded-xl border border-slate-200 p-3">
            <label className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-slate-600">
                <Clock className="h-4 w-4 text-slate-400" /> 全天
              </span>
              <input type="checkbox" checked={form.allDay} onChange={(e) => setAllDay(e.target.checked)} className="h-4 w-4" />
            </label>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <label className="text-xs text-slate-500">
                开始
                <input
                  type={form.allDay ? "date" : "datetime-local"}
                  value={form.allDay ? toDateInput(form.start) : toLocalInput(form.start)}
                  onChange={(e) => set("start", readDateInput(e.target.value, form.start, form.allDay))}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-700 outline-none focus:border-slate-400"
                />
              </label>
              <label className="text-xs text-slate-500">
                结束
                <input
                  type={form.allDay ? "date" : "datetime-local"}
                  value={form.allDay ? toDateInput(form.end) : toLocalInput(form.end)}
                  onChange={(e) => set("end", readDateInput(e.target.value, form.end, form.allDay))}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-700 outline-none focus:border-slate-400"
                />
              </label>
            </div>
          </div>

          {/* Calendar group */}
          {calendars.length > 0 && (
            <label className="block text-sm">
              <span className="text-xs text-slate-500">日历</span>
              <select
                value={form.calendarId ?? ""}
                onChange={(e) => {
                  const id = e.target.value || null;
                  const cal = calendars.find((c) => c.id === id);
                  setForm((f) => ({ ...f, calendarId: id, color: cal?.color ?? f.color }));
                }}
                className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-slate-400"
              >
                <option value="">未分组</option>
                {calendars.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          {/* Color */}
          <div>
            <span className="flex items-center gap-2 text-xs text-slate-500">
              <Palette className="h-3.5 w-3.5" /> 颜色
            </span>
            <div className="mt-2 flex flex-wrap gap-2">
              {COLOR_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => set("color", key)}
                  title={EVENT_COLORS[key].label}
                  className={cn(
                    "h-6 w-6 rounded-full ring-2 ring-offset-2 transition",
                    EVENT_COLORS[key].dot,
                    form.color === key ? "ring-slate-400" : "ring-transparent",
                  )}
                />
              ))}
            </div>
          </div>

          {/* Repeat */}
          <label className="block text-sm">
            <span className="flex items-center gap-2 text-xs text-slate-500">
              <Repeat className="h-3.5 w-3.5" /> 重复
            </span>
            <select
              value={form.repeat}
              onChange={(e) => set("repeat", e.target.value as RepeatRule)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-slate-400"
            >
              {REPEAT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          {form.repeat !== "none" && (
            <label className="block text-sm">
              <span className="text-xs text-slate-500">重复结束（留空表示永不结束）</span>
              <input
                type="date"
                value={form.repeatUntil ? toDateInput(form.repeatUntil) : ""}
                onChange={(e) => set("repeatUntil", e.target.value ? new Date(e.target.value) : null)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-slate-400"
              />
            </label>
          )}

          {/* Reminder */}
          <label className="block text-sm">
            <span className="flex items-center gap-2 text-xs text-slate-500">
              <Bell className="h-3.5 w-3.5" /> 提醒
            </span>
            <select
              value={form.reminderMinutes === null ? "" : String(form.reminderMinutes)}
              onChange={(e) => set("reminderMinutes", e.target.value === "" ? null : Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-slate-400"
            >
              {REMINDER_OPTIONS.map((o) => (
                <option key={String(o.value)} value={o.value === null ? "" : String(o.value)}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          {/* Notes */}
          <label className="block text-sm">
            <span className="text-xs text-slate-500">备注</span>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={3}
              placeholder="添加备注…"
              className="mt-1 w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
            />
          </label>
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
          {onDelete && !isNew ? (
            <button
              onClick={onDelete}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-red-600 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" /> 删除
            </button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100">
              取消
            </button>
            <button
              onClick={() => onSave(form)}
              className="rounded-lg bg-slate-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
