import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureWorkspace } from "@/lib/clawnote-store";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const { workspace } = await ensureWorkspace();
  const row = await prisma.collectionRow.findFirst({
    where: { id: params.id, collection: { workspaceId: workspace.id } },
  });

  if (!row) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  const current = typeof row.data === "object" && row.data !== null && !Array.isArray(row.data) ? row.data : {};
  const updated = await prisma.collectionRow.update({
    where: { id: row.id },
    data: { data: { ...current, status: "已完成", completedAt: new Date().toISOString() } },
  });

  return NextResponse.json({ row: updated });
}
