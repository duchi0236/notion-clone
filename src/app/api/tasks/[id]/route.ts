import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureWorkspace } from "@/lib/clawnote-store";

async function findScopedRow(id: string) {
  const { workspace } = await ensureWorkspace();
  return prisma.collectionRow.findFirst({
    where: { id, collection: { workspaceId: workspace.id } },
  });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}));
  const existing = await findScopedRow(params.id);
  if (!existing) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  const row = await prisma.collectionRow.update({
    where: { id: params.id },
    data: { data: { ...(existing.data as Record<string, unknown>), ...body } },
  });

  return NextResponse.json({ row });
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const existing = await findScopedRow(params.id);
  if (!existing) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  await prisma.collectionRow.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
