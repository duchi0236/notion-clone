import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureWorkspace } from "@/lib/clawnote-store";

async function ownedRow(rowId: string, workspaceId: string) {
  return prisma.collectionRow.findFirst({
    where: { id: rowId, collection: { workspaceId, NOT: { baseId: null } } },
  });
}

// Patch a record: merge data (send a field set to null to clear) and/or sortIndex.
// data 变更时同步记录修改历史（RowRevision，仅存变更字段的 from/to）。
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { workspace, user } = await ensureWorkspace();
  const existing = await ownedRow(params.id, workspace.id);
  if (!existing) return NextResponse.json({ error: "Row not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const author = user.name || user.email || "你";
  const prev = existing.data as Record<string, unknown>;
  const merged = body.data ? { ...prev, ...body.data } : undefined;

  // 计算变更字段 diff（值未变的不记）
  let diff: Record<string, { from: unknown; to: unknown }> | null = null;
  if (body.data) {
    diff = {};
    for (const [k, v] of Object.entries(body.data as Record<string, unknown>)) {
      if (JSON.stringify(prev[k]) !== JSON.stringify(v)) diff[k] = { from: prev[k] ?? null, to: v ?? null };
    }
    if (Object.keys(diff).length === 0) diff = null;
  }

  const row = await prisma.collectionRow.update({
    where: { id: params.id },
    data: {
      data: merged ?? undefined,
      sortIndex: typeof body.sortIndex === "number" ? body.sortIndex : undefined,
      updatedBy: body.data ? author : undefined,
    },
  });
  if (diff) {
    await prisma.rowRevision.create({ data: { rowId: params.id, author, diff: diff as Prisma.InputJsonValue } });
  }
  return NextResponse.json({ row });
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const { workspace } = await ensureWorkspace();
  const existing = await ownedRow(params.id, workspace.id);
  if (!existing) return NextResponse.json({ error: "Row not found" }, { status: 404 });
  await prisma.collectionRow.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
