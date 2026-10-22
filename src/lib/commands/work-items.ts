import { ensureTaskCollection } from "@/lib/clawnote-store";
import type { Prisma } from "@prisma/client";
import type { CommandContext } from "./types";
import { CommandError } from "./types";
import { createChangeSet, runCommand } from "./core";

export type WorkItemInput = {
  name: string;
  owner?: string;
  status?: string;
  priority?: string;
  dueDate?: string;
  progress?: number;
};

export async function createWorkItems(ctx: CommandContext, inputs: WorkItemInput[]) {
  const collection = await ensureTaskCollection(ctx.workspaceId);
  return runCommand(ctx, "work-items.created", "tasks:write", async (tx) => {
    const start = await tx.collectionRow.count({ where: { collectionId: collection.id } });
    const rows = [];
    for (let index = 0; index < inputs.length; index += 1) {
      const input = inputs[index];
      rows.push(await tx.collectionRow.create({
        data: {
          collectionId: collection.id,
          sortIndex: start + index,
          createdBy: ctx.actor.agentId ?? ctx.actor.userId,
          updatedBy: ctx.actor.agentId ?? ctx.actor.userId,
          data: {
            name: input.name?.trim() || "新任务",
            owner: input.owner ?? "Me",
            status: input.status ?? "未开始",
            priority: input.priority ?? "中",
            dueDate: input.dueDate ?? new Date().toISOString().slice(0, 10),
            progress: Number(input.progress ?? 0),
            _sourceIds: ctx.sourceIds ?? [],
            _projectId: ctx.projectId ?? null,
          },
        },
      }));
    }
    const changeSet = await createChangeSet(tx, ctx, `创建 ${rows.length} 条任务`, rows.map((row) => ({
      resourceType: "work-item",
      resourceId: row.id,
      action: "create",
      after: row,
    })));
    return { rows, changeSetId: changeSet.id };
  });
}

export async function updateWorkItem(
  ctx: CommandContext,
  rowId: string,
  patch: Partial<WorkItemInput>,
  expectedVersion?: number,
) {
  return runCommand(ctx, "work-item.updated", "tasks:write", async (tx) => {
    const before = await tx.collectionRow.findFirst({
      where: { id: rowId, collection: { workspaceId: ctx.workspaceId, type: "TASKS" } },
    });
    if (!before) throw new CommandError("任务不存在", 404, "WORK_ITEM_NOT_FOUND");
    if (ctx.projectId && (before.data as Record<string, unknown>)._projectId !== ctx.projectId) {
      throw new CommandError("任务不属于授权项目", 403, "PROJECT_FORBIDDEN");
    }
    const version = expectedVersion ?? ctx.expectedVersion ?? before.version;
    const data = {
      ...(before.data as Record<string, unknown>),
      ...patch,
      ...(patch.progress !== undefined ? { progress: Number(patch.progress) } : {}),
    } as Prisma.InputJsonValue;
    const changed = await tx.collectionRow.updateMany({
      where: { id: before.id, version },
      data: { data, updatedBy: ctx.actor.agentId ?? ctx.actor.userId, version: { increment: 1 } },
    });
    if (!changed.count) throw new CommandError("任务已被其他人修改，请刷新后重试", 409, "VERSION_CONFLICT");
    const row = await tx.collectionRow.findUniqueOrThrow({ where: { id: before.id } });
    const changeSet = await createChangeSet(tx, ctx, `更新任务「${String((row.data as Record<string, unknown>).name ?? row.id)}」`, [{
      resourceType: "work-item",
      resourceId: row.id,
      action: "update",
      before,
      after: row,
    }]);
    return { row, changeSetId: changeSet.id };
  });
}

export async function archiveWorkItem(ctx: CommandContext, rowId: string, expectedVersion?: number) {
  return runCommand(ctx, "work-item.archived", "resources:archive", async (tx) => {
    const before = await tx.collectionRow.findFirst({
      where: { id: rowId, collection: { workspaceId: ctx.workspaceId, type: "TASKS" } },
    });
    if (!before) throw new CommandError("任务不存在", 404, "WORK_ITEM_NOT_FOUND");
    if (ctx.projectId && (before.data as Record<string, unknown>)._projectId !== ctx.projectId) {
      throw new CommandError("任务不属于授权项目", 403, "PROJECT_FORBIDDEN");
    }
    const changed = await tx.collectionRow.updateMany({
      where: { id: before.id, version: expectedVersion ?? ctx.expectedVersion ?? before.version },
      data: {
        data: { ...(before.data as Record<string, unknown>), _archived: true } as Prisma.InputJsonValue,
        updatedBy: ctx.actor.agentId ?? ctx.actor.userId,
        version: { increment: 1 },
      },
    });
    if (!changed.count) throw new CommandError("任务已被其他人修改，请刷新后重试", 409, "VERSION_CONFLICT");
    const row = await tx.collectionRow.findUniqueOrThrow({ where: { id: before.id } });
    const changeSet = await createChangeSet(tx, ctx, "归档任务", [{
      resourceType: "work-item",
      resourceId: row.id,
      action: "archive",
      before,
      after: row,
    }]);
    return { row, changeSetId: changeSet.id };
  });
}
