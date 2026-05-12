import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureTaskCollection, ensureWorkspace } from "@/lib/clawnote-store";

export async function GET() {
  const { workspace } = await ensureWorkspace();
  const collection = await ensureTaskCollection(workspace.id);
  return NextResponse.json({ collection, rows: collection.rows });
}

export async function POST(req: NextRequest) {
  const { workspace } = await ensureWorkspace();
  const collection = await ensureTaskCollection(workspace.id);
  const body = await req.json().catch(() => ({}));
  const count = await prisma.collectionRow.count({ where: { collectionId: collection.id } });

  const row = await prisma.collectionRow.create({
    data: {
      collectionId: collection.id,
      sortIndex: count,
      data: {
        name: body.name ?? "新任务",
        owner: body.owner ?? "Me",
        status: body.status ?? "未开始",
        priority: body.priority ?? "中",
        dueDate: body.dueDate ?? new Date().toISOString().slice(0, 10),
        progress: Number(body.progress ?? 0),
      },
    },
  });

  return NextResponse.json({ row }, { status: 201 });
}
