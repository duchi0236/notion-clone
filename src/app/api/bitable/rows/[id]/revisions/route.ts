import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureWorkspace } from "@/lib/clawnote-store";

// 记录修改历史（由 rows/[id] PATCH 自动写入），倒序返回最近 50 条。
export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const { workspace } = await ensureWorkspace();
  const row = await prisma.collectionRow.findFirst({
    where: { id: params.id, collection: { workspaceId: workspace.id, NOT: { baseId: null } } },
    select: { id: true },
  });
  if (!row) return NextResponse.json({ error: "Row not found" }, { status: 404 });
  const revisions = await prisma.rowRevision.findMany({
    where: { rowId: params.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({ revisions });
}
