import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureWorkspace } from "@/lib/clawnote-store";

function normalizeEvent(event: any) {
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    location: event.location,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    allDay: event.allDay,
    color: event.color,
    status: event.status,
    source: event.source,
    sourceId: event.sourceId,
    documentId: event.documentId,
  };
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { workspace } = await ensureWorkspace();
  const event = await prisma.calendarEvent.findFirst({ where: { id: params.id, workspaceId: workspace.id } });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ event: normalizeEvent(event) });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { workspace } = await ensureWorkspace();
  const body = await req.json();
  const existing = await prisma.calendarEvent.findFirst({ where: { id: params.id, workspaceId: workspace.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const event = await prisma.calendarEvent.update({
    where: { id: params.id },
    data: {
      title: body.title ?? existing.title,
      description: body.description ?? existing.description,
      location: body.location ?? existing.location,
      startsAt: body.startsAt ? new Date(body.startsAt) : existing.startsAt,
      endsAt: body.endsAt ? new Date(body.endsAt) : existing.endsAt,
      allDay: typeof body.allDay === "boolean" ? body.allDay : existing.allDay,
      color: body.color ?? existing.color,
      status: body.status ?? existing.status,
      documentId: body.documentId ?? existing.documentId,
      metadata: body.metadata ?? existing.metadata,
    },
  });

  return NextResponse.json({ event: normalizeEvent(event) });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { workspace } = await ensureWorkspace();
  const existing = await prisma.calendarEvent.findFirst({ where: { id: params.id, workspaceId: workspace.id } });
  if (!existing) return NextResponse.json({ ok: true });
  await prisma.calendarEvent.update({ where: { id: params.id }, data: { status: "CANCELLED" } });
  return NextResponse.json({ ok: true });
}
