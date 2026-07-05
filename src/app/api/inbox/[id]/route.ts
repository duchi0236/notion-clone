import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureWorkspace } from "@/lib/clawnote-store";

async function findScopedItem(id: string) {
  const { workspace } = await ensureWorkspace();
  return prisma.inboxItem.findFirst({ where: { id, workspaceId: workspace.id } });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}));
  const existing = await findScopedItem(params.id);
  if (!existing) return NextResponse.json({ error: "Inbox item not found" }, { status: 404 });

  const item = await prisma.inboxItem.update({
    where: { id: params.id },
    data: {
      title: body.title,
      content: body.content,
      status: body.status,
      raw: body.raw,
    },
  });
  return NextResponse.json({ item });
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const existing = await findScopedItem(params.id);
  if (!existing) return NextResponse.json({ error: "Inbox item not found" }, { status: 404 });

  await prisma.inboxItem.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
