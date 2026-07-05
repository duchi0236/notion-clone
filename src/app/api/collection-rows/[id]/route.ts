import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureWorkspace } from "@/lib/clawnote-store";

async function findRow(rowId: string, workspaceId: string) {
  return prisma.collectionRow.findFirst({
    where: { id: rowId, collection: { workspaceId } },
  });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { workspace } = await ensureWorkspace();
  const body = await req.json().catch(() => ({}));
  const existing = await findRow(params.id, workspace.id);
  if (!existing) return NextResponse.json({ error: "Item not found" }, { status: 404 });

  const row = await prisma.collectionRow.update({
    where: { id: params.id },
    data: { data: body.data ?? existing.data },
  });
  return NextResponse.json({ row });
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const { workspace } = await ensureWorkspace();
  const existing = await findRow(params.id, workspace.id);
  if (!existing) return NextResponse.json({ ok: true });
  await prisma.collectionRow.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
