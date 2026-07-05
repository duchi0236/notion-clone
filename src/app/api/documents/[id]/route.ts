import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createDocumentVersion, htmlToText, summarize, upsertSearchIndex } from "@/lib/clawnote-store";
import { permissionResponse, requireDocumentAccess } from "@/lib/permissions";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireDocumentAccess(params.id, "read");
    const document = await prisma.document.findUnique({
      where: { id: params.id },
      include: {
        versions: { orderBy: { version: "desc" }, take: 20 },
        comments: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!document) return NextResponse.json({ error: "Document not found" }, { status: 404 });
    return NextResponse.json({ document });
  } catch (error) {
    return permissionResponse(error);
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { document: existing, user } = await requireDocumentAccess(params.id, "write");
    const body = await req.json().catch(() => ({}));
    const contentHtml = body.contentHtml ?? body.html ?? existing.contentHtml;
    const contentText = body.contentText ?? htmlToText(contentHtml);

    const document = await prisma.document.update({
      where: { id: params.id },
      data: {
        title: body.title ?? existing.title,
        icon: body.icon ?? existing.icon,
        coverImage: body.coverImage ?? existing.coverImage,
        parentId: body.parentId === undefined ? existing.parentId : body.parentId,
        sortIndex: body.sortIndex === undefined ? existing.sortIndex : Number(body.sortIndex),
        type: body.type ?? existing.type,
        status: body.status ?? existing.status,
        tags: Array.isArray(body.tags) ? body.tags : existing.tags,
        contentHtml,
        contentText,
        contentJson: body.contentJson ?? existing.contentJson,
        summary: body.summary ?? summarize(contentText),
        isFavorite: body.isFavorite ?? existing.isFavorite,
        isPublished: body.isPublished ?? existing.isPublished,
        isArchived: body.isArchived ?? existing.isArchived,
        agentReadable: body.agentReadable ?? existing.agentReadable,
        agentWritable: body.agentWritable ?? existing.agentWritable,
      },
    });

    if (body.reason !== "autosave") {
      await createDocumentVersion(document.id, body.changedBy ?? user.id, document, body.reason ?? "update");
    }
    await upsertSearchIndex(document.id, {
      title: document.title,
      text: document.contentText,
      summary: document.summary,
      tags: document.tags,
    });

    return NextResponse.json({ document });
  } catch (error) {
    return permissionResponse(error);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireDocumentAccess(params.id, "write");
    // ?permanent=true 彻底删除（不可恢复）；否则软删除进回收站
    const permanent = new URL(req.url).searchParams.get("permanent") === "true";
    if (permanent) {
      await prisma.document.delete({ where: { id: params.id } }).catch(() => null);
      return NextResponse.json({ ok: true, permanent: true });
    }
    const document = await prisma.document.update({
      where: { id: params.id },
      data: { isArchived: true, status: "ARCHIVED" },
    });
    return NextResponse.json({ document });
  } catch (error) {
    return permissionResponse(error);
  }
}
