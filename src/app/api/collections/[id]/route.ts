import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureWorkspace } from "@/lib/clawnote-store";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const { workspace } = await ensureWorkspace();
  const collection = await prisma.collection.findFirst({
    where: { id: params.id, workspaceId: workspace.id },
    include: { rows: { orderBy: { sortIndex: "asc" } } },
  });
  if (!collection) return NextResponse.json({ error: "Collection not found" }, { status: 404 });
  return NextResponse.json({ collection, rows: collection.rows });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { workspace } = await ensureWorkspace();
  const body = await req.json().catch(() => ({}));
  const existing = await prisma.collection.findFirst({ where: { id: params.id, workspaceId: workspace.id } });
  if (!existing) return NextResponse.json({ error: "Collection not found" }, { status: 404 });

  const collection = await prisma.collection.update({
    where: { id: params.id },
    data: {
      name: body.name ?? existing.name,
      icon: body.icon ?? existing.icon,
      description: body.description ?? existing.description,
      type: body.type ?? existing.type,
      schema: Array.isArray(body.schema) ? body.schema : existing.schema,
      views: Array.isArray(body.views) ? body.views : existing.views,
    },
    include: { rows: { orderBy: { sortIndex: "asc" } } },
  });

  return NextResponse.json({ collection, rows: collection.rows });
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const { workspace } = await ensureWorkspace();
  const existing = await prisma.collection.findFirst({ where: { id: params.id, workspaceId: workspace.id } });
  if (!existing) return NextResponse.json({ error: "Collection not found" }, { status: 404 });
  await prisma.collection.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
