import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureWorkspace } from "@/lib/clawnote-store";
import { defaultTable } from "@/lib/bitable";

// Create a new data table inside a base.
export async function POST(req: NextRequest) {
  const { workspace } = await ensureWorkspace();
  const body = await req.json().catch(() => ({}));
  const base = await prisma.bitableBase.findFirst({ where: { id: body.baseId, workspaceId: workspace.id } });
  if (!base) return NextResponse.json({ error: "Base not found" }, { status: 404 });

  const count = await prisma.collection.count({ where: { baseId: base.id } });
  const t = defaultTable(body.name || "数据表");
  const table = await prisma.collection.create({
    data: {
      workspaceId: workspace.id,
      baseId: base.id,
      name: body.name?.trim() || `数据表 ${count + 1}`,
      icon: body.icon || "📋",
      type: "TABLE",
      sortIndex: count,
      schema: t.schema,
      views: t.views,
      rows: { create: t.rows.map((data, i) => ({ data, sortIndex: i })) },
    },
    include: { rows: { orderBy: { sortIndex: "asc" } } },
  });

  return NextResponse.json({ table }, { status: 201 });
}
