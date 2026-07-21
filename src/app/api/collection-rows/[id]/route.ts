import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureWorkspace } from "@/lib/clawnote-store";

// 独立集合行（数据库/列表页用）的读 / 改 / 删。
// 历史上这里存在 [id] 与 [rowId] 两套同路径路由（Next 不允许同路径不同 slug 名，
// 会在启动时直接崩溃），现已合并为一套：保留功能更全的实现（含 GET 详情）。

async function findRow(rowId: string, workspaceId: string) {
  return prisma.collectionRow.findFirst({
    where: { id: rowId, collection: { workspaceId } },
  });
}

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const { workspace } = await ensureWorkspace();
  const row = await prisma.collectionRow.findFirst({
    where: { id: params.id, collection: { workspaceId: workspace.id } },
    include: {
      collection: true,
      document: { select: { id: true, title: true, icon: true } },
    },
  });
  if (!row) return NextResponse.json({ error: "Row not found" }, { status: 404 });
  return NextResponse.json({ row });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { workspace } = await ensureWorkspace();
  const body = await req.json().catch(() => ({}));
  const existing = await findRow(params.id, workspace.id);
  if (!existing) return NextResponse.json({ error: "Row not found" }, { status: 404 });

  const row = await prisma.collectionRow.update({
    where: { id: params.id },
    data: {
      data: body.data ?? existing.data,
      sortIndex: body.sortIndex ?? existing.sortIndex,
      documentId: body.documentId === undefined ? existing.documentId : body.documentId,
    },
    include: {
      collection: true,
      document: { select: { id: true, title: true, icon: true } },
    },
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
