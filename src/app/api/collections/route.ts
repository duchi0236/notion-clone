import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureWorkspace } from "@/lib/clawnote-store";

const DEFAULT_SCHEMA = [
  { id: "name", name: "名称", type: "text" },
  { id: "status", name: "状态", type: "select", options: ["未开始", "进行中", "已完成"] },
  { id: "owner", name: "负责人", type: "text" },
  { id: "dueDate", name: "截止日期", type: "date" },
];

const DEFAULT_VIEWS = [
  { id: "table", name: "表格", type: "table" },
  { id: "board", name: "看板", type: "board", groupBy: "status" },
  { id: "gallery", name: "画廊", type: "gallery" },
  { id: "calendar", name: "日历", type: "calendar", dateBy: "dueDate" },
];

export async function GET() {
  const { workspace } = await ensureWorkspace();
  const collections = await prisma.collection.findMany({
    where: { workspaceId: workspace.id },
    include: { rows: { orderBy: { sortIndex: "asc" }, take: 20 } },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({ collections });
}

export async function POST(req: NextRequest) {
  const { workspace } = await ensureWorkspace();
  const body = await req.json().catch(() => ({}));
  const collection = await prisma.collection.create({
    data: {
      workspaceId: workspace.id,
      name: body.name ?? "新数据库",
      icon: body.icon ?? "📊",
      description: body.description ?? null,
      type: body.type ?? "TABLE",
      schema: Array.isArray(body.schema) ? body.schema : DEFAULT_SCHEMA,
      views: Array.isArray(body.views) ? body.views : DEFAULT_VIEWS,
    },
    include: { rows: { orderBy: { sortIndex: "asc" } } },
  });
  return NextResponse.json({ collection }, { status: 201 });
}
