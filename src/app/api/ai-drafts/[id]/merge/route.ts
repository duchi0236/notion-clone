import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureWorkspace } from "@/lib/clawnote-store";
import { updateAIDraftStatus } from "@/lib/ai-draft-service";
import { htmlToText, summarize, upsertSearchIndex, createDocumentVersion } from "@/lib/clawnote-store";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, workspace } = await ensureWorkspace();
  const body = await req.json().catch(() => ({}));
  const mode = body.mode === "replace" ? "replace" : "new-document";

  const draftRecord = await prisma.knowledgeObject.findFirst({
    where: { id: params.id, workspaceId: workspace.id, type: "AI_DRAFT" },
  });
  if (!draftRecord) return NextResponse.json({ error: "Draft not found" }, { status: 404 });

  const props = draftRecord.properties as Record<string, any>;
  const title = String(draftRecord.title || "AI Draft");
  const contentHtml = String(props.contentHtml || `<h1>${title}</h1><p></p>`);
  const contentText = String(props.contentText || htmlToText(contentHtml));
  const targetId = props.targetId || body.targetId;

  let document;
  if (mode === "replace" && targetId) {
    const existing = await prisma.document.findFirst({ where: { id: String(targetId), workspaceId: workspace.id } });
    if (!existing) return NextResponse.json({ error: "Target document not found" }, { status: 404 });
    document = await prisma.document.update({
      where: { id: existing.id },
      data: {
        title: body.keepTitle ? existing.title : title,
        contentHtml,
        contentText,
        contentJson: { type: "doc", content: [{ type: "html", html: contentHtml }] },
        summary: summarize(contentText),
      },
    });
    await createDocumentVersion(document.id, "ai-draft-merge", document, `merge-draft-${draftRecord.id}`);
  } else {
    document = await prisma.document.create({
      data: {
        workspaceId: workspace.id,
        createdById: user.id,
        title,
        icon: "🤖",
        type: "DOC",
        tags: Array.isArray(props.tags) ? props.tags.map(String) : ["AI Draft"],
        contentHtml,
        contentText,
        contentJson: { type: "doc", content: [{ type: "html", html: contentHtml }] },
        summary: summarize(contentText),
        agentReadable: true,
        agentWritable: false,
      },
    });
    await createDocumentVersion(document.id, "ai-draft-merge", document, `create-from-draft-${draftRecord.id}`);
  }

  await upsertSearchIndex(document.id, {
    title: document.title,
    text: document.contentText,
    summary: document.summary,
    tags: document.tags,
  });
  await updateAIDraftStatus(draftRecord.id, "merged");

  return NextResponse.json({ document, draftId: draftRecord.id, mode });
}
