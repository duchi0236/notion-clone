import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}));
  const existing = await prisma.collectionRow.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  const row = await prisma.collectionRow.update({
    where: { id: params.id },
    data: { data: { ...(existing.data as Record<string, unknown>), ...body } },
  });

  return NextResponse.json({ row });
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.collectionRow.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
