import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureWorkspace } from "@/lib/clawnote-store";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const comments = await prisma.comment.findMany({
    where: { documentId: params.id, parentId: null },
    include: {
      author: { select: { id: true, name: true, email: true, avatarUrl: true } },
      replies: {
        include: { author: { select: { id: true, name: true, email: true, avatarUrl: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ comments });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { user } = await ensureWorkspace();
  const body = await req.json().catch(() => ({}));

  const document = await prisma.document.findUnique({ where: { id: params.id } });
  if (!document) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  const comment = await prisma.comment.create({
    data: {
      documentId: params.id,
      authorId: user.id,
      content: body.content ?? "",
      parentId: body.parentId ?? null,
    },
    include: { author: { select: { id: true, name: true, email: true, avatarUrl: true } } },
  });

  return NextResponse.json({ comment }, { status: 201 });
}
