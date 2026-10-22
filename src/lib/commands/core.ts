import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { CommandContext } from "./types";
import { CommandError } from "./types";

const WRITE_RANK: Record<string, number> = { GUEST: 0, MEMBER: 1, ADMIN: 2, OWNER: 3 };

export async function authorizeCommand(ctx: CommandContext, requiredScope?: string) {
  const membership = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId: ctx.actor.userId, workspaceId: ctx.workspaceId } },
  });
  if (!membership || WRITE_RANK[membership.role] < 1) {
    throw new CommandError("没有写入该工作区的权限", 403, "FORBIDDEN");
  }
  if (ctx.actor.type === "agent" && requiredScope && !(ctx.actor.scopes ?? []).includes(requiredScope)) {
    throw new CommandError(`Agent 缺少权限：${requiredScope}`, 403, "MISSING_SCOPE");
  }
}

export async function runCommand<T>(
  ctx: CommandContext,
  command: string,
  requiredScope: string | undefined,
  execute: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  await authorizeCommand(ctx, requiredScope);
  const existing = await prisma.commandExecution.findUnique({ where: { idempotencyKey: ctx.idempotencyKey } });
  if (existing?.result !== undefined && existing?.result !== null) return existing.result as T;

  try {
    return await prisma.$transaction(async (tx) => {
      const result = await execute(tx);
      await tx.commandExecution.create({
        data: {
          workspaceId: ctx.workspaceId,
          idempotencyKey: ctx.idempotencyKey,
          command,
          actorType: ctx.actor.type,
          actorId: ctx.actor.agentId ?? ctx.actor.userId,
          result: result as Prisma.InputJsonValue,
        },
      });
      await tx.outboxEvent.create({
        data: {
          workspaceId: ctx.workspaceId,
          topic: command,
          aggregateId: ctx.actor.agentJobId,
          payload: {
            actor: ctx.actor,
            reason: ctx.reason ?? null,
            sourceIds: ctx.sourceIds ?? [],
            result,
          } as Prisma.InputJsonValue,
        },
      });
      return result;
    });
  } catch (error) {
    // Two workers may race with the same key. The unique constraint rolls the
    // losing transaction (including its business writes) back atomically.
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") {
      const completed = await prisma.commandExecution.findUnique({ where: { idempotencyKey: ctx.idempotencyKey } });
      if (completed?.result !== undefined && completed?.result !== null) return completed.result as T;
    }
    throw error;
  }
}

export async function createChangeSet(
  tx: Prisma.TransactionClient,
  ctx: CommandContext,
  title: string,
  items: Array<{
    resourceType: string;
    resourceId: string;
    action: string;
    before?: unknown;
    after?: unknown;
  }>,
) {
  return tx.changeSet.create({
    data: {
      workspaceId: ctx.workspaceId,
      jobId: ctx.actor.agentJobId,
      title,
      items: {
        create: items.map((item) => ({
          resourceType: item.resourceType,
          resourceId: item.resourceId,
          action: item.action,
          before: (item.before ?? undefined) as Prisma.InputJsonValue | undefined,
          after: (item.after ?? undefined) as Prisma.InputJsonValue | undefined,
        })),
      },
    },
    include: { items: true },
  });
}
