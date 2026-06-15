import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureWorkspace } from "@/lib/clawnote-store";

async function ownedRow(rowId: string, workspaceId: string) {
  return prisma.collectionRow.findFirst({
    where: { id: rowId, collection: { workspaceId, NOT: { baseId: null } } },
  });
}

// Patch a record: merge data (send a field set to null to clear) and/or sortIndex.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { workspace } = await ensureWorkspace();
  const existing = await ownedRow(params.id, workspace.id);
  if (!existing) return NextResponse.json({ error: "Row not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const merged = body.data ? { ...(existing.data as object), ...body.data } : undefined;

  const row = await prisma.collectionRow.update({
    where: { id: params.id },
    data: {
      data: merged ?? undefined,
      sortIndex: typeof body.sortIndex === "number" ? body.sortIndex : undefined,
    },
  });
  return NextResponse.json({ row });
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const { workspace } = await ensureWorkspace();
  const existing = await ownedRow(params.id, workspace.id);
  if (!existing) return NextResponse.json({ error: "Row not found" }, { status: 404 });
  await prisma.collectionRow.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
