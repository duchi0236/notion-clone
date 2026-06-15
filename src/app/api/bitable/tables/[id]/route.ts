import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureWorkspace } from "@/lib/clawnote-store";

// Update a table's name/icon/fields(schema)/views.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { workspace } = await ensureWorkspace();
  const existing = await prisma.collection.findFirst({
    where: { id: params.id, workspaceId: workspace.id, NOT: { baseId: null } },
  });
  if (!existing) return NextResponse.json({ error: "Table not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const table = await prisma.collection.update({
    where: { id: params.id },
    data: {
      name: body.name?.trim() || existing.name,
      icon: body.icon ?? existing.icon,
      schema: body.schema ?? undefined,
      views: body.views ?? undefined,
    },
    include: { rows: { orderBy: { sortIndex: "asc" } } },
  });
  return NextResponse.json({ table });
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const { workspace } = await ensureWorkspace();
  const existing = await prisma.collection.findFirst({
    where: { id: params.id, workspaceId: workspace.id, NOT: { baseId: null } },
  });
  if (!existing) return NextResponse.json({ error: "Table not found" }, { status: 404 });
  if (existing.baseId) {
    const siblings = await prisma.collection.count({ where: { baseId: existing.baseId } });
    if (siblings <= 1) return NextResponse.json({ error: "至少保留一张数据表" }, { status: 400 });
  }
  await prisma.collection.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
