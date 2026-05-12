import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createDocumentVersion, ensureWorkspace, htmlToText, summarize, upsertSearchIndex } from "@/lib/clawnote-store";

export async function POST(req: NextRequest) {
  const { user, workspace } = await ensureWorkspace();
  const body = await req.json().catch(() => ({}));
  const title = body.title ?? "Agent 写入文档";
  const contentHtml = body.contentHtml ?? body.html ?? `<h1>${title}</h1><p>${body.content ?? ""}</p>`;
  const contentText = body.contentText ?? htmlToText(contentHtml);

  const document = await prisma.document.create({
    data: {
      workspaceId: workspace.id,
      createdById: user.id,
      title,
      icon: body.icon ?? "🤖",
      type: body.type ?? "AGENT_LOG",
      tags: Array.isArray(body.tags) ? body.tags : ["Agent"],
      contentHtml,
      contentText,
      contentJson: body.contentJson ?? { type: "doc", content: [{ type: "html", html: contentHtml }] },
      summary: body.summary ?? summarize(contentText),
      agentReadable: true,
      agentWritable: true,
    },
  });

  await createDocumentVersion(document.id, body.agentName ?? "agent", document, "agent-write");
  await upsertSearchIndex(document.id, {
    title: document.title,
    text: document.contentText,
    summary: document.summary,
    tags: document.tags,
  });

  return NextResponse.json({ document }, { status: 201 });
}
