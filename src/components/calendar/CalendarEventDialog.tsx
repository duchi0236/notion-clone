"use client";

import { useEffect, useState } from "react";
import type { CalendarEvent } from "./CalendarTypes";

export function CalendarEventDialog({
  event,
  date,
  onClose,
  onSaved,
}: {
  event?: CalendarEvent | null;
  date?: Date | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const initialDate = date ?? (event ? new Date(event.startsAt) : new Date());
  const [title, setTitle] = useState(event?.title ?? "");
  const [description, setDescription] = useState(event?.description ?? "");
  const [startsAt, setStartsAt] = useState(toInputValue(event?.startsAt ? new Date(event.startsAt) : initialDate));
  const [endsAt, setEndsAt] = useState(toInputValue(event?.endsAt ? new Date(event.endsAt) : addHour(initialDate)));
  const [allDay, setAllDay] = useState(event?.allDay ?? false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTitle(event?.title ?? "");
  }, [event?.id]);

  async function save() {
    setSaving(true);
    try {
      const payload = {
        title: title || "Untitled Event",
        description,
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
        allDay,
      };
      await fetch(event?.id && !event.id.startsWith("task:") ? `/api/calendar/events/${event.id}` : "/api/calendar/events", {
        method: event?.id && !event.id.startsWith("task:") ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!event || event.id.startsWith("task:")) return;
    await fetch(`/api/calendar/events/${event.id}`, { method: "DELETE" });
    onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/20 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{event ? "编辑日程" : "新建日程"}</h2>
            <p className="mt-1 text-sm text-slate-500">支持日程和任务待办统一展示。</p>
          </div>
          <button onClick={onClose} className="rounded-xl px-3 py-2 text-sm text-slate-500 hover:bg-slate-100">关闭</button>
        </div>

        {event?.source === "TASK" && <div className="mb-4 rounded-2xl bg-amber-50 p-3 text-sm text-amber-700">这是任务待办，来源于任务数据库。编辑请前往任务数据库。</div>}

        <div className="space-y-4">
          <input value={title} onChange={(e) => setTitle(e.target.value)} disabled={event?.source === "TASK"} placeholder="日程标题" className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-300" />
          <textarea value={description ?? ""} onChange={(e) => setDescription(e.target.value)} disabled={event?.source === "TASK"} placeholder="说明" className="h-24 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-300" />
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm text-slate-500">开始<input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} disabled={event?.source === "TASK"} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-800" /></label>
            <label className="text-sm text-slate-500">结束<input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} disabled={event?.source === "TASK"} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-800" /></label>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} disabled={event?.source === "TASK"} /> 全天</label>
        </div>

        <div className="mt-6 flex justify-between">
          <button onClick={remove} disabled={!event || event.source === "TASK"} className="rounded-xl px-4 py-2 text-sm text-red-500 disabled:opacity-30">删除</button>
          <button onClick={save} disabled={saving || event?.source === "TASK"} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{saving ? "保存中..." : "保存"}</button>
        </div>
      </div>
    </div>
  );
}

function addHour(date: Date) {
  const next = new Date(date);
  next.setHours(next.getHours() + 1);
  return next;
}

function toInputValue(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}
