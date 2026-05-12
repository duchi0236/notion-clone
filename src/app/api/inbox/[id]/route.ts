import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}));
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
  await prisma.inboxItem.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
