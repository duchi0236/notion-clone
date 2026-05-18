import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureWorkspace } from "@/lib/clawnote-store";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const { workspace } = await ensureWorkspace();
  const collection = await prisma.collection.findFirst({ where: { id: params.id, workspaceId: workspace.id } });
  if (!collection) return NextResponse.json({ error: "Collection not found" }, { status: 404 });
  const rows = await prisma.collectionRow.findMany({ where: { collectionId: params.id }, orderBy: { sortIndex: "asc" } });
  return NextResponse.json({ rows });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { workspace } = await ensureWorkspace();
  const collection = await prisma.collection.findFirst({ where: { id: params.id, workspaceId: workspace.id } });
  if (!collection) return NextResponse.json({ error: "Collection not found" }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const count = await prisma.collectionRow.count({ where: { collectionId: params.id } });
  const row = await prisma.collectionRow.create({ data: { collectionId: params.id, sortIndex: count, data: body.data ?? body } });
  return NextResponse.json({ row }, { status: 201 });
}
