import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureWorkspace } from "@/lib/clawnote-store";
import { createCalendarEvents } from "@/lib/commands";
import { routeError } from "@/lib/agent-v1";

const REPEATS = new Set(["none", "daily", "weekly", "biweekly", "monthly", "yearly"]);

function parseDate(value: unknown): Date | null {
  if (!value) return null;
  const d = new Date(value as string);
  return Number.isNaN(d.getTime()) ? null : d;
}

// GET /api/calendar/events?start=ISO&end=ISO
// Returns events whose master row could produce an occurrence in [start, end].
// Recurring events are returned once (the master); the client expands occurrences.
export async function GET(req: NextRequest) {
  const { workspace } = await ensureWorkspace();
  const { searchParams } = new URL(req.url);
  const start = parseDate(searchParams.get("start"));
  const end = parseDate(searchParams.get("end"));
  const q = searchParams.get("q")?.trim();

  // Full-text-ish search ignores the visible range and scans all fields.
  if (q) {
    const events = await prisma.calendarEvent.findMany({
      where: {
        workspaceId: workspace.id,
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { location: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
        ],
      },
      orderBy: { startsAt: "desc" },
      take: 50,
    });
    return NextResponse.json({ events });
  }

  const where: Record<string, unknown> = { workspaceId: workspace.id };
  if (start && end) {
    // Non-recurring events that overlap the window, OR any recurring event
    // that begins on/before the window end (occurrences resolved client-side).
    where.OR = [
      // Recurring masters (repeat stored non-null) that began on/before the window end.
      { repeat: { not: null }, startsAt: { lte: end } },
      // Non-recurring events overlapping the window.
      { startsAt: { lte: end }, endsAt: { gte: start } },
    ];
  }

  const events = await prisma.calendarEvent.findMany({
    where,
    orderBy: { startsAt: "asc" },
  });

  return NextResponse.json({ events });
}

export async function POST(req: NextRequest) {
  try {
    const { user, workspace } = await ensureWorkspace();
    const body = await req.json().catch(() => ({}));
    const startsAt = parseDate(body.startsAt) ?? new Date();
    const endsAt = parseDate(body.endsAt) ?? new Date(startsAt.getTime() + 60 * 60 * 1000);
    const result = await createCalendarEvents({
      workspaceId: workspace.id,
      idempotencyKey: req.headers.get("idempotency-key") ?? `user:calendar:create:${crypto.randomUUID()}`,
      actor: { type: "user", userId: user.id },
    }, [{
      title: body.title?.trim() || "新建事件",
      description: body.description,
      location: body.location,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      allDay: Boolean(body.allDay),
      color: body.color,
      calendarId: body.calendarId || null,
      repeat: REPEATS.has(body.repeat) ? body.repeat : "none",
      repeatUntil: parseDate(body.repeatUntil)?.toISOString() ?? null,
      reminderMinutes: body.reminderMinutes == null ? null : Number(body.reminderMinutes),
      status: body.status,
      attendees: Array.isArray(body.attendees) ? body.attendees.filter(Boolean).map(String) : [],
    }]);
    return NextResponse.json({ event: result.events[0], changeSetId: result.changeSetId }, { status: 201 });
  } catch (error) {
    return routeError(error);
  }
}
