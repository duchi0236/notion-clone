import { NextRequest } from "next/server";
import { ensureWorkspace } from "@/lib/clawnote-store";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, workspace } = await ensureWorkspace();
  const conversation = await prisma.agentConversation.findFirst({
    where: { id: params.id, workspaceId: workspace.id, createdById: user.id },
  });
  if (!conversation) return Response.json({ error: "Conversation not found" }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const content = String(body.content ?? body.message ?? "").trim();
  if (!content) return Response.json({ error: "content is required" }, { status: 400 });

  const result = await prisma.$transaction(async (tx) => {
    const message = await tx.agentMessage.create({
      data: { conversationId: conversation.id, role: "USER", content },
    });
    const job = await tx.agentJob.create({
      data: {
        workspaceId: workspace.id,
        conversationId: conversation.id,
        requestedById: user.id,
        title: content.slice(0, 80),
        goal: content,
        status: "QUEUED",
        authorization: { mode: "tiered", externalTools: false, permanentDelete: false },
      },
    });
    await tx.agentMessage.update({ where: { id: message.id }, data: { jobId: job.id } });
    await tx.agentConversation.update({
      where: { id: conversation.id },
      data: { title: conversation.title === "新对话" ? content.slice(0, 40) : undefined },
    });
    return { message: { ...message, jobId: job.id }, job };
  });
  return Response.json(result, { status: 202 });
}
