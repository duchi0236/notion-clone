import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureWorkspace } from "@/lib/clawnote-store";

const REPEATS = new Set(["none", "daily", "weekly", "biweekly", "monthly", "yearly"]);

function parseDate(value: unknown): Date | null {
  if (value === null || value === undefined) return null;
  const d = new Date(value as string);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { workspace } = await ensureWorkspace();
  const existing = await prisma.calendarEvent.findFirst({
    where: { id: params.id, workspaceId: workspace.id },
  });
  if (!existing) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));

  const repeat =
    body.repeat === undefined
      ? undefined
      : REPEATS.has(body.repeat)
        ? body.repeat === "none"
          ? null
          : body.repeat
        : existing.repeat;

  const metadata =
    body.attendees === undefined
      ? undefined
      : { ...(existing.metadata as object | null), attendees: Array.isArray(body.attendees) ? body.attendees.filter(Boolean) : [] };

  const event = await prisma.calendarEvent.update({
    where: { id: params.id },
    data: {
      title: body.title === undefined ? existing.title : body.title.trim() || existing.title,
      description: body.description === undefined ? existing.description : body.description,
      location: body.location === undefined ? existing.location : body.location,
      startsAt: body.startsAt === undefined ? existing.startsAt : parseDate(body.startsAt) ?? existing.startsAt,
      endsAt: body.endsAt === undefined ? existing.endsAt : parseDate(body.endsAt) ?? existing.endsAt,
      allDay: body.allDay === undefined ? existing.allDay : Boolean(body.allDay),
      color: body.color === undefined ? existing.color : body.color,
      calendarId: body.calendarId === undefined ? existing.calendarId : body.calendarId || null,
      repeat,
      repeatUntil: body.repeatUntil === undefined ? existing.repeatUntil : parseDate(body.repeatUntil),
      reminderMinutes:
        body.reminderMinutes === undefined
          ? existing.reminderMinutes
          : body.reminderMinutes === null
            ? null
            : Number(body.reminderMinutes),
      status: body.status === undefined ? existing.status : body.status,
      metadata,
    },
  });

  return NextResponse.json({ event });
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const { workspace } = await ensureWorkspace();
  const existing = await prisma.calendarEvent.findFirst({
    where: { id: params.id, workspaceId: workspace.id },
  });
  if (!existing) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  await prisma.calendarEvent.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
