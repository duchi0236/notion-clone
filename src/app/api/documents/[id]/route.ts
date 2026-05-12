import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createDocumentVersion, htmlToText, summarize, upsertSearchIndex } from "@/lib/clawnote-store";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const document = await prisma.document.findUnique({
    where: { id: params.id },
    include: {
      versions: { orderBy: { version: "desc" }, take: 20 },
      comments: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!document) return NextResponse.json({ error: "Document not found" }, { status: 404 });
  return NextResponse.json({ document });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}));
  const existing = await prisma.document.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  const contentHtml = body.contentHtml ?? body.html ?? existing.contentHtml;
  const contentText = body.contentText ?? htmlToText(contentHtml);

  const document = await prisma.document.update({
    where: { id: params.id },
    data: {
      title: body.title ?? existing.title,
      icon: body.icon ?? existing.icon,
      coverImage: body.coverImage ?? existing.coverImage,
      parentId: body.parentId === undefined ? existing.parentId : body.parentId,
      type: body.type ?? existing.type,
      status: body.status ?? existing.status,
      tags: Array.isArray(body.tags) ? body.tags : existing.tags,
      contentHtml,
      contentText,
      contentJson: body.contentJson ?? existing.contentJson,
      summary: body.summary ?? summarize(contentText),
      isFavorite: body.isFavorite ?? existing.isFavorite,
      isPublished: body.isPublished ?? existing.isPublished,
      agentReadable: body.agentReadable ?? existing.agentReadable,
      agentWritable: body.agentWritable ?? existing.agentWritable,
    },
  });

  await createDocumentVersion(document.id, body.changedBy ?? "user", document, body.reason ?? "update");
  await upsertSearchIndex(document.id, {
    title: document.title,
    text: document.contentText,
    summary: document.summary,
    tags: document.tags,
  });

  return NextResponse.json({ document });
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const document = await prisma.document.update({
    where: { id: params.id },
    data: { isArchived: true, status: "ARCHIVED" },
  });
  return NextResponse.json({ document });
}
