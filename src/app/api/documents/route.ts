import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createDocumentVersion, ensureWorkspace, htmlToText, summarize, upsertSearchIndex } from "@/lib/clawnote-store";

export async function GET() {
  const { workspace } = await ensureWorkspace();
  const documents = await prisma.document.findMany({
    where: { workspaceId: workspace.id, isArchived: false },
    orderBy: [{ parentId: "asc" }, { sortIndex: "asc" }, { updatedAt: "desc" }],
  });
  return NextResponse.json({ documents });
}

export async function POST(req: NextRequest) {
  const { user, workspace } = await ensureWorkspace();
  const body = await req.json().catch(() => ({}));
  const contentHtml = body.contentHtml ?? body.html ?? "<h1>Untitled</h1><p></p>";
  const contentText = body.contentText ?? htmlToText(contentHtml);
  const siblingCount = await prisma.document.count({
    where: { workspaceId: workspace.id, parentId: body.parentId ?? null, isArchived: false },
  });

  const document = await prisma.document.create({
    data: {
      workspaceId: workspace.id,
      createdById: user.id,
      title: body.title ?? "Untitled",
      icon: body.icon ?? "📄",
      parentId: body.parentId ?? null,
      sortIndex: siblingCount,
      type: body.type ?? "DOC",
      tags: Array.isArray(body.tags) ? body.tags : [],
      contentHtml,
      contentText,
      contentJson: body.contentJson ?? { type: "doc", content: [{ type: "html", html: contentHtml }] },
      summary: body.summary ?? summarize(contentText),
      agentReadable: body.agentReadable ?? true,
      agentWritable: body.agentWritable ?? false,
    },
  });

  await createDocumentVersion(document.id, "user", document, "create");
  await upsertSearchIndex(document.id, {
    title: document.title,
    text: document.contentText,
    summary: document.summary,
    tags: document.tags,
  });

  return NextResponse.json({ document }, { status: 201 });
}
