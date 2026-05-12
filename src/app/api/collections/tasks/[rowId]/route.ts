import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: { rowId: string } }) {
  const body = await req.json().catch(() => ({}));
  const existing = await prisma.collectionRow.findUnique({ where: { id: params.rowId } });
  if (!existing) return NextResponse.json({ error: "Task row not found" }, { status: 404 });

  const row = await prisma.collectionRow.update({
    where: { id: params.rowId },
    data: {
      data: {
        ...(existing.data as object),
        ...body,
        ...(body.progress !== undefined ? { progress: Number(body.progress) } : {}),
      },
    },
  });

  return NextResponse.json({ row });
}

export async function DELETE(_: NextRequest, { params }: { params: { rowId: string } }) {
  const row = await prisma.collectionRow.delete({ where: { id: params.rowId } });
  return NextResponse.json({ row });
}
