import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { openClawClient } from "./client";

export async function executeAgentJob(jobId: string) {
  const job = await prisma.agentJob.findUnique({
    where: { id: jobId },
    include: { conversation: true },
  });
  if (!job || job.status !== "PLANNING") return;

  const lastStep = await prisma.agentStep.findFirst({
    where: { jobId: job.id },
    orderBy: { sequence: "desc" },
    select: { sequence: true },
  });
  const isResume = Boolean(lastStep);
  const step = await prisma.agentStep.create({
    data: {
      jobId: job.id,
      // 100000+ is reserved for ClawNote runtime bookkeeping. Plugin-visible
      // progress steps use 1..99999, so an Agent cannot overwrite this step.
      sequence: Math.max(100_000, (lastStep?.sequence ?? 99_999) + 1),
      title: isResume ? "OpenClaw 恢复并继续执行" : "OpenClaw 理解目标并执行",
      toolName: "openclaw.responses",
      status: "RUNNING",
      startedAt: new Date(),
      input: { goal: job.goal, resumed: isResume },
    },
  });
  await prisma.agentJob.update({ where: { id: job.id }, data: { status: "RUNNING", startedAt: job.startedAt ?? new Date() } });

  try {
    const result = await openClawClient.respond({
      message: isResume
        ? `继续执行 AgentJob ${job.id}。用户已处理待审批或补充信息，请检查 ClawNote 中当前 Job、Approval 和 Proposal 状态，然后从安全断点继续。原目标：${job.goal}`
        : job.goal,
      sessionKey: job.conversation?.openclawSessionId ?? `clawnote:${job.workspaceId}:${job.conversationId ?? job.id}`,
      userId: job.requestedById,
      previousResponseId: job.openclawSessionId,
      instructions:
        `你正在执行 ClawNote AgentJob ${job.id}。` +
        "ClawNote 是业务数据真相源。使用 clawnote 工具读取上下文；正式文档先创建草稿；" +
        "任务、表格和日历写入必须先 Preview，等待批准后再 Apply；不得永久删除资源。",
    });
    const current = await prisma.agentJob.findUnique({
      where: { id: job.id },
      select: {
        status: true,
        completedAt: true,
        approvals: {
          where: { status: "APPROVED", resolvedAt: { gte: step.startedAt ?? job.startedAt ?? new Date(0) } },
          select: { id: true },
        },
        _count: { select: { changeSets: true } },
      },
    });
    const paused = current?.status === "WAITING_APPROVAL" || current?.status === "WAITING_INPUT" || current?.status === "WAITING_REVIEW";
    const cancelled = current?.status === "CANCELLED";
    const approvalArrivedDuringRun = current?.status === "RUNNING" && Boolean(current.approvals.length);
    const reviewAfterWrite = current?.status === "RUNNING" && Boolean(current._count.changeSets);
    let verificationError: string | null = null;
    if (reviewAfterWrite) {
      await prisma.agentJob.updateMany({ where: { id: job.id, status: "RUNNING" }, data: { status: "VERIFYING" } });
      const verification = await prisma.agentStep.create({
        data: {
          jobId: job.id,
          sequence: step.sequence + 1,
          title: "验证业务变更",
          toolName: "clawnote.verify-change-set",
          status: "RUNNING",
          startedAt: new Date(),
        },
      });
      const verified = await verifyJobChanges(job.id);
      verificationError = verified.ok ? null : verified.message;
      await prisma.agentStep.update({
        where: { id: verification.id },
        data: {
          status: verified.ok ? "COMPLETED" : "FAILED",
          completedAt: new Date(),
          output: verified.ok ? { checked: verified.checked } : undefined,
          error: verified.ok ? undefined : { message: verified.message },
        },
      });
    }
    await prisma.$transaction([
      prisma.agentStep.update({
        where: { id: step.id },
        data: { status: "COMPLETED", completedAt: new Date(), output: result.raw as Prisma.InputJsonValue },
      }),
      prisma.agentJob.update({
        where: { id: job.id },
        data: {
          openclawSessionId: result.responseId,
          status: cancelled
            ? "CANCELLED"
            : reviewAfterWrite
                ? "WAITING_REVIEW"
                : approvalArrivedDuringRun
                  ? "QUEUED"
                : paused
                  ? current.status
                  : "COMPLETED",
          result: { text: result.text, responseId: result.responseId },
          error: verificationError ? { code: "VERIFICATION_FAILED", message: verificationError } : Prisma.DbNull,
          completedAt: cancelled
            ? current.completedAt ?? new Date()
            : approvalArrivedDuringRun || reviewAfterWrite || paused
              ? null
              : new Date(),
        },
      }),
      ...(job.conversationId ? [prisma.agentMessage.create({
        data: {
          conversationId: job.conversationId,
          jobId: job.id,
          role: "ASSISTANT",
          content: result.text,
          metadata: { responseId: result.responseId },
        },
      })] : []),
    ]);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const current = await prisma.agentJob.findUnique({
      where: { id: job.id },
      select: {
        status: true,
        attempts: true,
        maxAttempts: true,
        _count: { select: { changeSets: true, approvals: true } },
      },
    });
    if (current?.status === "CANCELLED") {
      await prisma.agentStep.update({
        where: { id: step.id },
        data: { status: "SKIPPED", completedAt: new Date(), error: { message: "Job cancelled while OpenClaw was running" } },
      });
      return;
    }
    const uncertainWrite = Boolean(current?._count.changeSets || current?._count.approvals);
    const canRetry = !uncertainWrite && Boolean(current && current.attempts < current.maxAttempts);
    const retryAt = new Date(Date.now() + Math.min(60_000, 1000 * 2 ** Math.min(current?.attempts ?? 1, 6)));
    await prisma.$transaction([
      prisma.agentStep.update({
        where: { id: step.id },
        data: { status: "FAILED", completedAt: new Date(), error: { message } },
      }),
      prisma.agentJob.update({
        where: { id: job.id },
        data: {
          status: uncertainWrite ? "WAITING_REVIEW" : canRetry ? "QUEUED" : "FAILED",
          error: {
            message,
            retrying: canRetry,
            uncertainWrite,
            nextAttemptAt: canRetry ? retryAt.toISOString() : null,
          },
          nextAttemptAt: canRetry ? retryAt : undefined,
          completedAt: uncertainWrite || canRetry ? null : new Date(),
        },
      }),
      ...(!canRetry && job.conversationId ? [prisma.agentMessage.create({
        data: {
          conversationId: job.conversationId,
          jobId: job.id,
          role: "ASSISTANT",
          content: uncertainWrite
            ? `Agent 连接中断，且本次任务已经产生 Proposal 或变更。为避免重复写入，任务已暂停并等待人工复核：${message}`
            : `Agent 执行失败：${message}`,
          metadata: { error: true, uncertainWrite },
        },
      })] : []),
    ]);
  }
}

async function verifyJobChanges(jobId: string) {
  const changeSets = await prisma.changeSet.findMany({
    where: { jobId, revertedAt: null },
    include: { items: true },
  });
  let checked = 0;
  for (const changeSet of changeSets) {
    for (const item of changeSet.items) {
      checked += 1;
      let exists = true;
      if (item.resourceType === "work-item" || item.resourceType === "record") {
        exists = Boolean(await prisma.collectionRow.findUnique({ where: { id: item.resourceId }, select: { id: true } }));
      } else if (item.resourceType === "calendar-event") {
        exists = Boolean(await prisma.calendarEvent.findUnique({ where: { id: item.resourceId }, select: { id: true } }));
      } else if (item.resourceType === "document") {
        exists = Boolean(await prisma.document.findUnique({ where: { id: item.resourceId }, select: { id: true } }));
      } else if (item.resourceType === "ai-draft") {
        exists = Boolean(await prisma.knowledgeObject.findUnique({ where: { id: item.resourceId }, select: { id: true } }));
      }
      if (!exists) return { ok: false as const, checked, message: `变更资源 ${item.resourceType}:${item.resourceId} 不存在` };
    }
  }
  return { ok: true as const, checked, message: "" };
}
