import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureWorkspace, ensureTaskCollection } from "@/lib/clawnote-store";

function toDate(value: string | null, fallback: Date) {
  if (!value) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date;
}

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

function taskToEvent(row: any) {
  const data = row.data ?? {};
  const dueDate = data.dueDate;
  if (!dueDate) return null;
  const startsAt = new Date(`${dueDate}T09:00:00`);
  const endsAt = new Date(`${dueDate}T10:00:00`);
  return {
    id: `task:${row.id}`,
    title: data.name ?? data.title ?? "未命名任务",
    description: data.status ? `任务状态：${data.status}` : "任务",
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
    allDay: true,
    color: data.priority === "高" ? "red" : data.priority === "低" ? "slate" : "amber",
    status: data.status === "已完成" ? "DONE" : "CONFIRMED",
    source: "TASK",
    sourceId: row.id,
  };
}

export async function GET(req: NextRequest) {
  const { workspace } = await ensureWorkspace();
  await ensureTaskCollection(workspace.id);

  const url = new URL(req.url);
  const now = new Date();
  const start = toDate(url.searchParams.get("start"), new Date(now.getFullYear(), now.getMonth(), 1));
  const end = toDate(url.searchParams.get("end"), new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59));

  const events = await prisma.calendarEvent.findMany({
    where: {
      workspaceId: workspace.id,
      startsAt: { lte: end },
      endsAt: { gte: start },
      status: { not: "CANCELLED" },
    },
    orderBy: { startsAt: "asc" },
  });

  const taskCollections = await prisma.collection.findMany({
    where: { workspaceId: workspace.id, type: "TASKS" },
    include: { rows: true },
  });

  const taskEvents = taskCollections.flatMap((collection) => collection.rows.map(taskToEvent).filter(Boolean));

  return NextResponse.json({ events: [...events.map(normalizeEvent), ...taskEvents] });
}

export async function POST(req: NextRequest) {
  const { workspace, user } = await ensureWorkspace();
  const body = await req.json();
  const startsAt = new Date(body.startsAt);
  const endsAt = new Date(body.endsAt || body.startsAt);

  const event = await prisma.calendarEvent.create({
    data: {
      workspaceId: workspace.id,
      createdById: user.id,
      title: body.title || "Untitled Event",
      description: body.description || null,
      location: body.location || null,
      startsAt,
      endsAt,
      allDay: Boolean(body.allDay),
      color: body.color || "blue",
      source: body.source || "MANUAL",
      documentId: body.documentId || null,
      metadata: body.metadata || undefined,
    },
  });

  return NextResponse.json({ event: normalizeEvent(event) });
}
