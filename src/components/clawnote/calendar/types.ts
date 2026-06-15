import type { EventColor } from "./colors";

export type RepeatRule = "none" | "daily" | "weekly" | "biweekly" | "monthly" | "yearly";

export type CalendarView = "year" | "month" | "week" | "day";

export type Calendar = {
  id: string;
  name: string;
  color: string;
  isDefault: boolean;
  sortIndex: number;
};

// The persisted event ("master" row). Recurring events store a repeat rule and
// are expanded into occurrences on the client.
export type CalendarEvent = {
  id: string;
  title: string;
  description?: string | null;
  location?: string | null;
  startsAt: string; // ISO
  endsAt: string; // ISO
  allDay: boolean;
  color: EventColor | string;
  calendarId?: string | null;
  repeat?: RepeatRule | null;
  repeatUntil?: string | null;
  reminderMinutes?: number | null;
  status?: string;
  metadata?: { attendees?: string[] } | null;
};

// A single rendered occurrence (one row of the grid). `event` points back to
// the master so edits/deletes target the right record.
export type Occurrence = {
  key: string;
  event: CalendarEvent;
  start: Date;
  end: Date;
};

export const REPEAT_OPTIONS: { value: RepeatRule; label: string }[] = [
  { value: "none", label: "永不" },
  { value: "daily", label: "每天" },
  { value: "weekly", label: "每周" },
  { value: "biweekly", label: "每两周" },
  { value: "monthly", label: "每月" },
  { value: "yearly", label: "每年" },
];

export const REMINDER_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: "无" },
  { value: 0, label: "事件发生时" },
  { value: 5, label: "提前 5 分钟" },
  { value: 15, label: "提前 15 分钟" },
  { value: 30, label: "提前 30 分钟" },
  { value: 60, label: "提前 1 小时" },
  { value: 1440, label: "提前 1 天" },
];
