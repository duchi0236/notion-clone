import type { CalendarEvent, Occurrence, RepeatRule } from "./types";

export const MS_HOUR = 60 * 60 * 1000;
export const MS_DAY = 24 * MS_HOUR;
export const WEEKDAYS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
export const MONTHS = ["1 月", "2 月", "3 月", "4 月", "5 月", "6 月", "7 月", "8 月", "9 月", "10 月", "11 月", "12 月"];

export function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function addMonths(d: Date, n: number) {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
}

export function startOfWeek(d: Date) {
  // Sunday-first, matching Apple Calendar's default.
  const x = startOfDay(d);
  x.setDate(x.getDate() - x.getDay());
  return x;
}

export function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

export function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function isToday(d: Date) {
  return isSameDay(d, new Date());
}

// 6-week grid (42 cells) covering the month that `anchor` falls in.
export function monthGrid(anchor: Date): Date[] {
  const first = startOfWeek(startOfMonth(anchor));
  return Array.from({ length: 42 }, (_, i) => addDays(first, i));
}

export function weekDays(anchor: Date): Date[] {
  const first = startOfWeek(anchor);
  return Array.from({ length: 7 }, (_, i) => addDays(first, i));
}

// Day cells for a single month, only the days that belong to that month
// (used by the year view's mini-months). Index 0 is weekday-aligned padding.
export function miniMonthGrid(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const lead = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = Array.from({ length: lead }, () => null);
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function fmtTime(d: Date) {
  return d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false });
}

export function fmtHour(h: number) {
  return `${String(h).padStart(2, "0")}:00`;
}

// Build a <input type="datetime-local"> value from a Date (local time).
export function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function toDateInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function advance(d: Date, rule: RepeatRule): Date {
  switch (rule) {
    case "daily":
      return addDays(d, 1);
    case "weekly":
      return addDays(d, 7);
    case "biweekly":
      return addDays(d, 14);
    case "monthly":
      return addMonths(d, 1);
    case "yearly":
      return addMonths(d, 12);
    default:
      return addDays(d, 1);
  }
}

// Expand a single event into the occurrences that intersect [rangeStart, rangeEnd].
// Non-recurring events yield at most one occurrence.
export function expandEvent(event: CalendarEvent, rangeStart: Date, rangeEnd: Date): Occurrence[] {
  const start = new Date(event.startsAt);
  const end = new Date(event.endsAt);
  const duration = Math.max(end.getTime() - start.getTime(), 0);
  const repeat = event.repeat ?? "none";

  if (repeat === "none") {
    if (end < rangeStart || start > rangeEnd) return [];
    return [{ key: event.id, event, start, end }];
  }

  const until = event.repeatUntil ? new Date(event.repeatUntil) : null;
  const occurrences: Occurrence[] = [];
  let cursor = new Date(start);
  let guard = 0;

  // Fast-forward isn't trivial for month/year rules, so we iterate with a guard.
  while (cursor <= rangeEnd && guard < 1500) {
    guard += 1;
    if (until && cursor > until) break;
    const occEnd = new Date(cursor.getTime() + duration);
    if (occEnd >= rangeStart && cursor <= rangeEnd) {
      occurrences.push({
        key: `${event.id}:${cursor.getTime()}`,
        event,
        start: new Date(cursor),
        end: occEnd,
      });
    }
    cursor = advance(cursor, repeat);
  }

  return occurrences;
}

export function expandEvents(events: CalendarEvent[], rangeStart: Date, rangeEnd: Date): Occurrence[] {
  return events
    .flatMap((e) => expandEvent(e, rangeStart, rangeEnd))
    .sort((a, b) => a.start.getTime() - b.start.getTime());
}
