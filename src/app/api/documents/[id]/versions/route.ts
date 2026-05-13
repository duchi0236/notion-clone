import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const versions = await prisma.documentVersion.findMany({
    where: { documentId: params.id },
    orderBy: { version: "desc" },
    take: 50,
  });

  return NextResponse.json({ versions });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}));
  const document = await prisma.document.findUnique({ where: { id: params.id } });
  if (!document) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  const last = await prisma.documentVersion.findFirst({
    where: { documentId: params.id },
    orderBy: { version: "desc" },
  });

  const version = await prisma.documentVersion.create({
    data: {
      documentId: params.id,
      version: (last?.version ?? 0) + 1,
      changedBy: body.changedBy ?? "user",
      snapshot: JSON.parse(JSON.stringify(body.snapshot ?? document)),
      diff: body.diff ?? undefined,
      reason: body.reason ?? "manual-snapshot",
    },
  });

  return NextResponse.json({ version }, { status: 201 });
}
