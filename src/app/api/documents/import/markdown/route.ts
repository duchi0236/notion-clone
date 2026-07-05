import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureWorkspace, htmlToText, summarize, upsertSearchIndex, createDocumentVersion } from "@/lib/clawnote-store";
import { markdownToHtml } from "@/lib/markdown";

export async function POST(req: NextRequest) {
  const { user, workspace } = await ensureWorkspace();
  const body = await req.json().catch(() => ({}));
  const markdown = String(body.markdown ?? "");
  const title = String(body.title ?? "Imported Markdown");
  const parentId = body.parentId ? String(body.parentId) : null;

  if (!markdown.trim()) return NextResponse.json({ error: "Markdown is required" }, { status: 400 });

  const contentHtml = markdownToHtml(markdown);
  const contentText = htmlToText(contentHtml);

  const document = await prisma.document.create({
    data: {
      workspaceId: workspace.id,
      createdById: user.id,
      title,
      icon: "📝",
      parentId,
      type: "DOC",
      tags: Array.isArray(body.tags) ? body.tags.map(String) : ["Markdown"],
      contentHtml,
      contentText,
      contentJson: { type: "doc", content: [{ type: "html", html: contentHtml }] },
      summary: summarize(contentText),
      agentReadable: true,
      agentWritable: false,
    },
  });

  await createDocumentVersion(document.id, user.id, document, "markdown-import");
  await upsertSearchIndex(document.id, {
    title: document.title,
    text: document.contentText,
    summary: document.summary,
    tags: document.tags,
  });

  return NextResponse.json({ document }, { status: 201 });
}
