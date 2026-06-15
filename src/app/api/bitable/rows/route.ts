import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureWorkspace } from "@/lib/clawnote-store";

// Create a record (row) in a table.
export async function POST(req: NextRequest) {
  const { workspace } = await ensureWorkspace();
  const body = await req.json().catch(() => ({}));
  const table = await prisma.collection.findFirst({
    where: { id: body.tableId, workspaceId: workspace.id, NOT: { baseId: null } },
  });
  if (!table) return NextResponse.json({ error: "Table not found" }, { status: 404 });

  const count = await prisma.collectionRow.count({ where: { collectionId: table.id } });
  const row = await prisma.collectionRow.create({
    data: {
      collectionId: table.id,
      sortIndex: typeof body.sortIndex === "number" ? body.sortIndex : count,
      data: body.data ?? {},
    },
  });
  return NextResponse.json({ row }, { status: 201 });
}
