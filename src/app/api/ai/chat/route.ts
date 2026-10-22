import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureWorkspace } from "@/lib/clawnote-store";
import { executeAgentJob } from "@/lib/openclaw/execute-job";

// Compatibility endpoint for the existing mobile client. New clients should
// use /api/ai/conversations. It still creates the same durable AgentJob and
// delegates every real model call to OpenClaw.
export async function POST(req: NextRequest) {
  const { user, workspace } = await ensureWorkspace();
  const body = await req.json().catch(() => ({}));
  const message = String(body.message ?? "").trim();
  if (!message) return NextResponse.json({ reply: "请输入内容。" });

  const conversation = await prisma.agentConversation.create({
    data: {
      workspaceId: workspace.id,
      createdById: user.id,
      title: message.slice(0, 40),
      openclawSessionId: `clawnote:${workspace.id}:${crypto.randomUUID()}`,
    },
  });
  const job = await prisma.agentJob.create({
    data: {
      workspaceId: workspace.id,
      conversationId: conversation.id,
      requestedById: user.id,
      title: message.slice(0, 80),
      goal: message,
      status: "PLANNING",
      startedAt: new Date(),
      authorization: { mode: "tiered", externalTools: false, permanentDelete: false },
      messages: { create: { conversationId: conversation.id, role: "USER", content: message } },
    },
  });

  await executeAgentJob(job.id);
  const completed = await prisma.agentJob.findUnique({ where: { id: job.id } });
  if (completed?.status !== "FAILED") {
    const result = completed?.result as { text?: string } | null;
    return NextResponse.json({
      reply: result?.text ?? `Agent 已进入「${completed?.status ?? "RUNNING"}」状态。`,
      jobId: job.id,
      status: completed?.status,
      deprecated: true,
    });
  }

  const fallback = await readOnlyFallback(message, workspace.id);
  return NextResponse.json({
    ...fallback,
    jobId: job.id,
    status: "FAILED",
    degraded: true,
    deprecated: true,
  });
}

async function readOnlyFallback(message: string, workspaceId: string) {
  const query = message.replace(/搜索|查找|查|找|搜|search/gi, "").trim();
  if ((/搜索|查找|search/i.test(message)) && query) {
    const documents = await prisma.document.findMany({
      where: {
        workspaceId,
        isArchived: false,
        agentReadable: true,
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { contentText: { contains: query, mode: "insensitive" } },
        ],
      },
      orderBy: { updatedAt: "desc" },
      take: 6,
      select: { id: true, title: true, summary: true, contentText: true },
    });
    return {
      reply: documents.length ? `OpenClaw 暂不可用。只读降级搜索找到 ${documents.length} 篇文档。` : `OpenClaw 暂不可用，且没有找到和「${query}」相关的文档。`,
      results: documents.map((document) => ({
        id: document.id,
        title: document.title,
        snippet: document.summary ?? document.contentText.slice(0, 160),
      })),
    };
  }
  return {
    reply: "OpenClaw Gateway 暂不可用。ClawNote 已进入只读 AI 降级模式：人工编辑不受影响，但 Agent 不会执行任何写操作。",
  };
}
