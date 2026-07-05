import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createDocumentVersion, ensureWorkspace, htmlToText, summarize, upsertSearchIndex } from "@/lib/clawnote-store";
import { verifyAgentRequest } from "@/lib/agent-auth";
import { createAIDraft } from "@/lib/ai-draft-service";

export async function POST(req: NextRequest) {
  const unauthorized = await verifyAgentRequest(req);
  if (unauthorized) return unauthorized;

  const { user, workspace } = await ensureWorkspace();
  const body = await req.json().catch(() => ({}));
  const title = body.title ?? "Agent 写入文档";
  const contentHtml = body.contentHtml ?? body.html ?? `<h1>${title}</h1><p>${body.content ?? ""}</p>`;
  const contentText = body.contentText ?? htmlToText(contentHtml);
  const approvedDirectWrite = body.approvedDirectWrite === true || body.directWriteApproved === true;

  if (!approvedDirectWrite) {
    const draft = await createAIDraft({
      workspaceId: workspace.id,
      targetType: "document",
      title,
      contentHtml,
      contentText,
      prompt: body.prompt ?? "Agent requested document write; saved as draft by default.",
      sourceIds: Array.isArray(body.sourceIds) ? body.sourceIds : [],
      generatedBy: "agent",
    });

    return NextResponse.json({
      draft,
      mode: "draft-first",
      next: "review-ai-draft-to-merge",
      message: "Agent output was saved as an AI draft. Set approvedDirectWrite=true only when direct document creation is explicitly allowed.",
    }, { status: 202 });
  }

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
      agentWritable: body.agentWritable === true,
    },
  });

  await createDocumentVersion(document.id, body.agentName ?? "agent", document, "agent-write-approved");
  await upsertSearchIndex(document.id, {
    title: document.title,
    text: document.contentText,
    summary: document.summary,
    tags: document.tags,
  });

  return NextResponse.json({ document, mode: "approved-direct-write" }, { status: 201 });
}
