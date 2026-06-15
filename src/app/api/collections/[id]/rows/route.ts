import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureWorkspace, htmlToText, summarize } from "@/lib/clawnote-store";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, workspace } = await ensureWorkspace();
  const body = await req.json().catch(() => ({}));
  const collection = await prisma.collection.findFirst({
    where: { id: params.id, workspaceId: workspace.id },
  });
  if (!collection) return NextResponse.json({ error: "Collection not found" }, { status: 404 });

  const count = await prisma.collectionRow.count({ where: { collectionId: collection.id } });
  const shouldCreatePage = body.createPage !== false;
  const title = body.title ?? body.data?.name ?? "新记录";
  const contentHtml = body.contentHtml ?? `<p>${title}</p>`;
  const contentText = htmlToText(contentHtml);

  const document = shouldCreatePage
    ? await prisma.document.create({
        data: {
          workspaceId: workspace.id,
          createdById: user.id,
          title,
          icon: body.icon ?? "📄",
          type: "DOC",
          contentHtml,
          contentText,
          contentJson: { type: "doc", content: [{ type: "html", html: contentHtml }] },
          summary: summarize(contentText),
          tags: Array.isArray(body.tags) ? body.tags : [],
        },
      })
    : null;

  const row = await prisma.collectionRow.create({
    data: {
      collectionId: collection.id,
      documentId: document?.id ?? null,
      sortIndex: count,
      data: body.data ?? { name: title, status: "未开始" },
    },
    include: { document: true },
  });

  return NextResponse.json({ row }, { status: 201 });
}
