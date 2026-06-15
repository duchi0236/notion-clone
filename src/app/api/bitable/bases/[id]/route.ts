import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureWorkspace } from "@/lib/clawnote-store";

// Full base payload: base + all tables (with fields, views) + all rows.
export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const { workspace } = await ensureWorkspace();
  const base = await prisma.bitableBase.findFirst({
    where: { id: params.id, workspaceId: workspace.id },
    include: {
      tables: {
        orderBy: { sortIndex: "asc" },
        include: { rows: { orderBy: { sortIndex: "asc" } } },
      },
    },
  });
  if (!base) return NextResponse.json({ error: "Base not found" }, { status: 404 });
  return NextResponse.json({ base });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { workspace } = await ensureWorkspace();
  const existing = await prisma.bitableBase.findFirst({ where: { id: params.id, workspaceId: workspace.id } });
  if (!existing) return NextResponse.json({ error: "Base not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const base = await prisma.bitableBase.update({
    where: { id: params.id },
    data: {
      name: body.name?.trim() || existing.name,
      icon: body.icon ?? existing.icon,
      description: body.description ?? existing.description,
    },
  });
  return NextResponse.json({ base });
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const { workspace } = await ensureWorkspace();
  const existing = await prisma.bitableBase.findFirst({ where: { id: params.id, workspaceId: workspace.id } });
  if (!existing) return NextResponse.json({ error: "Base not found" }, { status: 404 });
  await prisma.bitableBase.delete({ where: { id: params.id } }); // cascades to tables + rows
  return NextResponse.json({ ok: true });
}
