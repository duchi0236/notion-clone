// Minimal iCalendar (.ics) import/export covering the fields ClawNote stores:
// title, time range, all-day, location, notes, preset recurrence, and a single
// reminder. Not a full RFC 5545 implementation, but interoperable with Apple
// Calendar / Google Calendar for everyday use.
import type { CalendarEvent, RepeatRule } from "./types";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toUtc(d: Date) {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(
    d.getUTCMinutes(),
  )}${pad(d.getUTCSeconds())}Z`;
}

function toDateOnly(d: Date) {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

function escapeText(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function unescapeText(s: string) {
  return s.replace(/\\n/gi, "\n").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\");
}

const REPEAT_TO_RRULE: Record<Exclude<RepeatRule, "none">, string> = {
  daily: "FREQ=DAILY",
  weekly: "FREQ=WEEKLY",
  biweekly: "FREQ=WEEKLY;INTERVAL=2",
  monthly: "FREQ=MONTHLY",
  yearly: "FREQ=YEARLY",
};

export function eventsToIcs(events: CalendarEvent[]): string {
  const lines: string[] = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//ClawNote//Calendar//CN", "CALSCALE:GREGORIAN"];
  for (const e of events) {
    const start = new Date(e.startsAt);
    const end = new Date(e.endsAt);
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${e.id}@clawnote`);
    lines.push(`DTSTAMP:${toUtc(new Date())}`);
    if (e.allDay) {
      lines.push(`DTSTART;VALUE=DATE:${toDateOnly(start)}`);
      lines.push(`DTEND;VALUE=DATE:${toDateOnly(new Date(end.getTime() + 1))}`);
    } else {
      lines.push(`DTSTART:${toUtc(start)}`);
      lines.push(`DTEND:${toUtc(end)}`);
    }
    lines.push(`SUMMARY:${escapeText(e.title)}`);
    if (e.location) lines.push(`LOCATION:${escapeText(e.location)}`);
    if (e.description) lines.push(`DESCRIPTION:${escapeText(e.description)}`);
    if (e.repeat && e.repeat !== "none") {
      let rrule = REPEAT_TO_RRULE[e.repeat as Exclude<RepeatRule, "none">];
      if (e.repeatUntil) rrule += `;UNTIL=${toUtc(new Date(e.repeatUntil))}`;
      lines.push(`RRULE:${rrule}`);
    }
    if (e.reminderMinutes != null) {
      lines.push("BEGIN:VALARM", "ACTION:DISPLAY", `TRIGGER:-PT${e.reminderMinutes}M`, "END:VALARM");
    }
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  // RFC 5545 line endings.
  return lines.join("\r\n");
}

function parseIcsDate(raw: string): { date: Date; allDay: boolean } {
  // Forms: 20260610T090000Z | 20260610T090000 | 20260610 (date only)
  const value = raw.includes(":") ? raw.slice(raw.indexOf(":") + 1) : raw;
  const isDateOnly = /VALUE=DATE/.test(raw) || /^\d{8}$/.test(value.trim());
  const v = value.trim();
  const y = Number(v.slice(0, 4));
  const mo = Number(v.slice(4, 6)) - 1;
  const d = Number(v.slice(6, 8));
  if (isDateOnly) return { date: new Date(y, mo, d, 0, 0, 0, 0), allDay: true };
  const h = Number(v.slice(9, 11));
  const mi = Number(v.slice(11, 13));
  const s = Number(v.slice(13, 15)) || 0;
  if (v.endsWith("Z")) return { date: new Date(Date.UTC(y, mo, d, h, mi, s)), allDay: false };
  return { date: new Date(y, mo, d, h, mi, s), allDay: false };
}

function rruleToRepeat(rrule: string): { repeat: RepeatRule; until: Date | null } {
  const freq = /FREQ=([A-Z]+)/.exec(rrule)?.[1];
  const interval = Number(/INTERVAL=(\d+)/.exec(rrule)?.[1] ?? "1");
  const untilRaw = /UNTIL=([0-9TZ]+)/.exec(rrule)?.[1];
  const until = untilRaw ? parseIcsDate(untilRaw).date : null;
  let repeat: RepeatRule = "none";
  if (freq === "DAILY") repeat = "daily";
  else if (freq === "WEEKLY") repeat = interval === 2 ? "biweekly" : "weekly";
  else if (freq === "MONTHLY") repeat = "monthly";
  else if (freq === "YEARLY") repeat = "yearly";
  return { repeat, until };
}

export type ImportedEvent = {
  title: string;
  startsAt: string;
  endsAt: string;
  allDay: boolean;
  location: string | null;
  description: string | null;
  repeat: RepeatRule;
  repeatUntil: string | null;
  reminderMinutes: number | null;
};

export function icsToEvents(text: string): ImportedEvent[] {
  // Unfold folded lines (continuations begin with a space or tab).
  const unfolded = text.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "");
  const lines = unfolded.split(/\r\n|\n|\r/);
  const events: ImportedEvent[] = [];
  let cur: Partial<ImportedEvent> & { _dtstart?: Date; _dtend?: Date; _allDay?: boolean } = {};
  let inEvent = false;
  let inAlarm = false;

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      inEvent = true;
      cur = {};
      continue;
    }
    if (line === "END:VEVENT") {
      const start = cur._dtstart;
      const end = cur._dtend ?? (start ? new Date(start.getTime() + 60 * 60000) : null);
      if (start && end) {
        events.push({
          title: cur.title ?? "未命名事件",
          startsAt: start.toISOString(),
          endsAt: (cur._allDay ? new Date(end.getTime() - 1) : end).toISOString(),
          allDay: Boolean(cur._allDay),
          location: cur.location ?? null,
          description: cur.description ?? null,
          repeat: cur.repeat ?? "none",
          repeatUntil: cur.repeatUntil ?? null,
          reminderMinutes: cur.reminderMinutes ?? null,
        });
      }
      inEvent = false;
      continue;
    }
    if (!inEvent) continue;
    if (line === "BEGIN:VALARM") {
      inAlarm = true;
      continue;
    }
    if (line === "END:VALARM") {
      inAlarm = false;
      continue;
    }

    const key = line.split(/[:;]/)[0];
    if (inAlarm) {
      if (key === "TRIGGER") {
        const m = /-PT(?:(\d+)H)?(?:(\d+)M)?/.exec(line);
        const days = /-P(\d+)D/.exec(line);
        if (days) cur.reminderMinutes = Number(days[1]) * 1440;
        else if (m) cur.reminderMinutes = (Number(m[1] ?? 0) * 60) + Number(m[2] ?? 0);
      }
      continue;
    }
    if (key === "DTSTART") {
      const p = parseIcsDate(line);
      cur._dtstart = p.date;
      cur._allDay = p.allDay;
    } else if (key === "DTEND") {
      cur._dtend = parseIcsDate(line).date;
    } else if (key === "SUMMARY") {
      cur.title = unescapeText(line.slice(line.indexOf(":") + 1));
    } else if (key === "LOCATION") {
      cur.location = unescapeText(line.slice(line.indexOf(":") + 1));
    } else if (key === "DESCRIPTION") {
      cur.description = unescapeText(line.slice(line.indexOf(":") + 1));
    } else if (key === "RRULE") {
      const r = rruleToRepeat(line.slice(line.indexOf(":") + 1));
      cur.repeat = r.repeat;
      cur.repeatUntil = r.until ? r.until.toISOString() : null;
    }
  }
  return events;
}
