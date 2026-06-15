import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureWorkspace } from "@/lib/clawnote-store";

// Default calendar groups, created the first time the calendar view is opened.
const DEFAULT_CALENDARS = [
  { name: "个人", color: "blue", isDefault: true, sortIndex: 0 },
  { name: "工作", color: "red", isDefault: false, sortIndex: 1 },
  { name: "提醒", color: "orange", isDefault: false, sortIndex: 2 },
];

async function ensureCalendars(workspaceId: string) {
  const count = await prisma.calendar.count({ where: { workspaceId } });
  if (count === 0) {
    await prisma.calendar.createMany({
      data: DEFAULT_CALENDARS.map((c) => ({ ...c, workspaceId })),
    });
  }
  return prisma.calendar.findMany({
    where: { workspaceId },
    orderBy: { sortIndex: "asc" },
  });
}

export async function GET() {
  const { workspace } = await ensureWorkspace();
  const calendars = await ensureCalendars(workspace.id);
  return NextResponse.json({ calendars });
}

export async function POST(req: NextRequest) {
  const { workspace } = await ensureWorkspace();
  const body = await req.json().catch(() => ({}));
  const count = await prisma.calendar.count({ where: { workspaceId: workspace.id } });

  const calendar = await prisma.calendar.create({
    data: {
      workspaceId: workspace.id,
      name: body.name?.trim() || "新日历",
      color: body.color || "blue",
      sortIndex: count,
    },
  });

  return NextResponse.json({ calendar }, { status: 201 });
}
