import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeMemoryStatus } from "@/lib/clawnote-store";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}));
  const memory = await prisma.agentMemory.update({
    where: { id: params.id },
    data: {
      content: body.content,
      summary: body.summary,
      tags: Array.isArray(body.tags) ? body.tags : undefined,
      confidence: body.confidence === undefined ? undefined : Number(body.confidence),
      status: body.status ? normalizeMemoryStatus(body.status) : undefined,
    },
  });
  return NextResponse.json({ memory });
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const memory = await prisma.agentMemory.update({
    where: { id: params.id },
    data: { status: "ARCHIVED" },
  });
  return NextResponse.json({ memory });
}
