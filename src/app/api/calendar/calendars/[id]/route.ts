import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureWorkspace } from "@/lib/clawnote-store";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { workspace } = await ensureWorkspace();
  const existing = await prisma.calendar.findFirst({
    where: { id: params.id, workspaceId: workspace.id },
  });
  if (!existing) return NextResponse.json({ error: "Calendar not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const calendar = await prisma.calendar.update({
    where: { id: params.id },
    data: {
      name: body.name?.trim() || existing.name,
      color: body.color ?? existing.color,
      sortIndex: body.sortIndex === undefined ? existing.sortIndex : Number(body.sortIndex),
    },
  });

  return NextResponse.json({ calendar });
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const { workspace } = await ensureWorkspace();
  const existing = await prisma.calendar.findFirst({
    where: { id: params.id, workspaceId: workspace.id },
  });
  if (!existing) return NextResponse.json({ error: "Calendar not found" }, { status: 404 });
  if (existing.isDefault) {
    return NextResponse.json({ error: "默认日历不可删除" }, { status: 400 });
  }

  // Events keep their own color; calendarId is set to null via the FK rule.
  await prisma.calendar.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
