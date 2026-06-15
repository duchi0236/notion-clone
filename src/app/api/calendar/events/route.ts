import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureWorkspace } from "@/lib/clawnote-store";

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
  const { workspace } = await ensureWorkspace();
  const body = await req.json().catch(() => ({}));

  const startsAt = parseDate(body.startsAt) ?? new Date();
  const endsAt = parseDate(body.endsAt) ?? new Date(startsAt.getTime() + 60 * 60 * 1000);
  const repeat = REPEATS.has(body.repeat) ? body.repeat : "none";
  const attendees = Array.isArray(body.attendees) ? body.attendees.filter(Boolean) : [];

  const event = await prisma.calendarEvent.create({
    data: {
      workspaceId: workspace.id,
      title: body.title?.trim() || "新建事件",
      description: body.description ?? null,
      location: body.location ?? null,
      startsAt,
      endsAt,
      allDay: Boolean(body.allDay),
      color: body.color || "blue",
      calendarId: body.calendarId || null,
      repeat: repeat === "none" ? null : repeat,
      repeatUntil: parseDate(body.repeatUntil),
      reminderMinutes:
        body.reminderMinutes === null || body.reminderMinutes === undefined
          ? null
          : Number(body.reminderMinutes),
      metadata: attendees.length ? { attendees } : undefined,
      status: body.status || "CONFIRMED",
      source: body.source || "MANUAL",
    },
  });

  return NextResponse.json({ event }, { status: 201 });
}
