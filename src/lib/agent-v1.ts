import type { AgentPrincipal, AgentScope } from "@/lib/agent-auth";
import { AgentAuthError, authenticateAgentRequest } from "@/lib/agent-auth";
import { prisma } from "@/lib/prisma";
import { CommandError, type CommandContext } from "@/lib/commands";

export async function requireAgent(request: Request, scopes: AgentScope[]) {
  return authenticateAgentRequest(request, scopes);
}

export function agentCommandContext(
  principal: AgentPrincipal,
  input: { idempotencyKey: string; jobId?: string; projectId?: string; reason?: string; sourceIds?: string[] },
): CommandContext {
  assertProjectAccess(principal, input.projectId);
  return {
    workspaceId: principal.workspaceId,
    projectId: input.projectId,
    idempotencyKey: input.idempotencyKey,
    reason: input.reason,
    sourceIds: input.sourceIds,
    actor: {
      type: "agent",
      userId: principal.userId,
      delegatedByUserId: principal.delegatedByUserId,
      agentId: principal.agentId,
      agentJobId: input.jobId,
      scopes: principal.scopes,
    },
  };
}

export function assertProjectAccess(principal: AgentPrincipal, projectId?: string) {
  if (!principal.projectIds.length) return;
  if (!projectId || !principal.projectIds.includes(projectId)) {
    throw new CommandError("Agent Token 无权访问该项目", 403, "PROJECT_FORBIDDEN");
  }
}

export async function assertDocumentProjectAccess(principal: AgentPrincipal, documentId: string, projectId?: string) {
  assertProjectAccess(principal, projectId);
  if (!principal.projectIds.length || !projectId) return;
  let currentId: string | null = documentId;
  for (let depth = 0; currentId && depth < 32; depth += 1) {
    if (currentId === projectId) return;
    const document: { parentId: string | null } | null = await prisma.document.findFirst({
      where: { id: currentId, workspaceId: principal.workspaceId },
      select: { parentId: true },
    });
    currentId = document?.parentId ?? null;
  }
  throw new CommandError("文档不属于授权项目", 403, "PROJECT_FORBIDDEN");
}

export async function requireAgentJob(workspaceId: string, jobId: string, requestedById?: string) {
  const job = await prisma.agentJob.findFirst({ where: { id: jobId, workspaceId, requestedById } });
  if (!job) throw new CommandError("Agent Job 不存在", 404, "JOB_NOT_FOUND");
  return job;
}

export async function requireApprovedProposal(workspaceId: string, jobId: string, approvalId: string, action: string, requestedById: string) {
  const approval = await prisma.approvalRequest.findFirst({
    where: { id: approvalId, workspaceId, jobId, action, status: "APPROVED", job: { requestedById, status: "RUNNING" } },
  });
  if (!approval) throw new CommandError("操作尚未获得批准", 403, "APPROVAL_REQUIRED");
  if (approval.expiresAt && approval.expiresAt.getTime() <= Date.now()) {
    await prisma.approvalRequest.update({ where: { id: approval.id }, data: { status: "EXPIRED" } });
    throw new CommandError("批准请求已过期", 409, "APPROVAL_EXPIRED");
  }
  return approval;
}

export async function createProposal(input: {
  workspaceId: string;
  jobId: string;
  action: string;
  summary: string;
  payload: object;
  requestedById: string;
}) {
  const job = await requireAgentJob(input.workspaceId, input.jobId, input.requestedById);
  if (!["PLANNING", "RUNNING"].includes(job.status)) {
    throw new CommandError("当前 Job 状态不允许生成 Proposal", 409, "INVALID_JOB_STATE");
  }
  const authorization = job.authorization as { projectWrite?: boolean; autoApproveActions?: string[] };
  const autoApproved = authorization.autoApproveActions?.includes(input.action)
    || (authorization.projectWrite === true && ["work-items.apply", "calendar.apply"].includes(input.action));
  const approval = await prisma.approvalRequest.create({
    data: {
      workspaceId: input.workspaceId,
      jobId: input.jobId,
      action: input.action,
      summary: input.summary,
      payload: input.payload,
      status: autoApproved ? "APPROVED" : "PENDING",
      resolvedById: autoApproved ? input.requestedById : null,
      resolvedAt: autoApproved ? new Date() : null,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });
  if (!autoApproved) {
    await prisma.agentJob.update({ where: { id: input.jobId }, data: { status: "WAITING_APPROVAL" } });
  }
  return approval;
}

export function routeError(error: unknown) {
  const status = error instanceof CommandError || error instanceof AgentAuthError ? error.status : 500;
  const code = error instanceof CommandError ? error.code : error instanceof AgentAuthError ? "AGENT_AUTH_ERROR" : "INTERNAL_ERROR";
  const message = error instanceof Error ? error.message : "Unexpected error";
  return Response.json({ error: message, code }, { status });
}
