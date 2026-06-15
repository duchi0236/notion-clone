import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureWorkspace } from "@/lib/clawnote-store";
import { defaultTable } from "@/lib/bitable";

export async function GET() {
  const { workspace } = await ensureWorkspace();
  const bases = await prisma.bitableBase.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { sortIndex: "asc" },
    include: {
      tables: { orderBy: { sortIndex: "asc" }, select: { id: true, name: true, icon: true } },
    },
  });
  return NextResponse.json({ bases });
}

export async function POST(req: NextRequest) {
  const { workspace } = await ensureWorkspace();
  const body = await req.json().catch(() => ({}));
  const count = await prisma.bitableBase.count({ where: { workspaceId: workspace.id } });

  const base = await prisma.bitableBase.create({
    data: {
      workspaceId: workspace.id,
      name: body.name?.trim() || "新建多维表格",
      icon: body.icon || "🗂️",
      sortIndex: count,
    },
  });

  // Seed the base with one starter table.
  const t = defaultTable("数据表");
  const table = await prisma.collection.create({
    data: {
      workspaceId: workspace.id,
      baseId: base.id,
      name: "数据表",
      icon: "📋",
      type: "TABLE",
      sortIndex: 0,
      schema: t.schema,
      views: t.views,
      rows: {
        create: t.rows.map((data, i) => ({ data, sortIndex: i })),
      },
    },
  });

  return NextResponse.json({ base: { ...base, tables: [{ id: table.id, name: table.name, icon: table.icon }] } }, { status: 201 });
}
