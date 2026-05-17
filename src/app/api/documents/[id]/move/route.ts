import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureWorkspace } from "@/lib/clawnote-store";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { workspace } = await ensureWorkspace();
  const body = await req.json().catch(() => ({}));
  const parentId = body.parentId === undefined ? undefined : body.parentId ? String(body.parentId) : null;
  const sortIndex = body.sortIndex === undefined ? undefined : Number(body.sortIndex);

  const current = await prisma.document.findFirst({ where: { id: params.id, workspaceId: workspace.id } });
  if (!current) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  if (parentId) {
    const parent = await prisma.document.findFirst({ where: { id: parentId, workspaceId: workspace.id, isArchived: false } });
    if (!parent) return NextResponse.json({ error: "Parent not found" }, { status: 404 });
  }

  const document = await prisma.document.update({
    where: { id: params.id },
    data: {
      ...(parentId !== undefined ? { parentId } : {}),
      ...(Number.isFinite(sortIndex) ? { sortIndex } : {}),
    },
  });

  return NextResponse.json({ document });
}
