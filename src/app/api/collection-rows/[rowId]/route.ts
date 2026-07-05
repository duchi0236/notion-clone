import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureWorkspace } from "@/lib/clawnote-store";

export async function GET(_: NextRequest, { params }: { params: { rowId: string } }) {
  const { workspace } = await ensureWorkspace();
  const row = await prisma.collectionRow.findFirst({
    where: {
      id: params.rowId,
      collection: { workspaceId: workspace.id },
    },
    include: {
      collection: true,
      document: { select: { id: true, title: true, icon: true } },
    },
  });

  if (!row) return NextResponse.json({ error: "Row not found" }, { status: 404 });
  return NextResponse.json({ row });
}

export async function PUT(req: NextRequest, { params }: { params: { rowId: string } }) {
  const { workspace } = await ensureWorkspace();
  const body = await req.json().catch(() => ({}));

  const row = await prisma.collectionRow.findFirst({
    where: {
      id: params.rowId,
      collection: { workspaceId: workspace.id },
    },
  });

  if (!row) return NextResponse.json({ error: "Row not found" }, { status: 404 });

  const updated = await prisma.collectionRow.update({
    where: { id: params.rowId },
    data: {
      data: body.data ?? row.data,
      sortIndex: body.sortIndex ?? row.sortIndex,
      documentId: body.documentId === undefined ? row.documentId : body.documentId,
    },
    include: {
      collection: true,
      document: { select: { id: true, title: true, icon: true } },
    },
  });

  return NextResponse.json({ row: updated });
}

export async function DELETE(_: NextRequest, { params }: { params: { rowId: string } }) {
  const { workspace } = await ensureWorkspace();
  const row = await prisma.collectionRow.findFirst({
    where: {
      id: params.rowId,
      collection: { workspaceId: workspace.id },
    },
  });

  if (!row) return NextResponse.json({ error: "Row not found" }, { status: 404 });

  await prisma.collectionRow.delete({ where: { id: params.rowId } });
  return NextResponse.json({ ok: true });
}
