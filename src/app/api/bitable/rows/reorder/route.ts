import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureWorkspace } from "@/lib/clawnote-store";

// 批量更新行的 sortIndex（可携带 data 变更，如看板跨列拖拽同时改分组字段）。
// 一次事务落库，避免逐行请求的竞态与闪烁。
export async function POST(req: NextRequest) {
  const { workspace, user } = await ensureWorkspace();
  const body = await req.json().catch(() => ({}));
  const updates: { id: string; sortIndex: number; data?: Record<string, unknown> }[] = Array.isArray(body.updates) ? body.updates : [];
  if (!body.tableId || updates.length === 0) return NextResponse.json({ error: "Bad request" }, { status: 400 });

  const table = await prisma.collection.findFirst({
    where: { id: body.tableId, workspaceId: workspace.id, NOT: { baseId: null } },
    include: { rows: { select: { id: true, data: true } } },
  });
  if (!table) return NextResponse.json({ error: "Table not found" }, { status: 404 });

  const owned = new Map(table.rows.map((r) => [r.id, r.data as Record<string, unknown>]));
  const author = user.name || user.email || "你";

  await prisma.$transaction(
    updates
      .filter((u) => owned.has(u.id))
      .map((u) =>
        prisma.collectionRow.update({
          where: { id: u.id },
          data: {
            sortIndex: u.sortIndex,
            data: u.data ? ({ ...owned.get(u.id), ...u.data } as Prisma.InputJsonValue) : undefined,
            updatedBy: u.data ? author : undefined,
          },
        }),
      ),
  );
  return NextResponse.json({ ok: true });
}
