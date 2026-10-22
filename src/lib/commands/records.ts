import type { CommandContext } from "./types";
import type { Prisma } from "@prisma/client";
import { CommandError } from "./types";
import { createChangeSet, runCommand } from "./core";

export type RecordPatch = { id: string; data: Record<string, unknown>; expectedVersion?: number };

export async function updateRecords(ctx: CommandContext, tableId: string, patches: RecordPatch[]) {
  return runCommand(ctx, "records.updated", "records:write", async (tx) => {
    const table = await tx.collection.findFirst({ where: { id: tableId, workspaceId: ctx.workspaceId } });
    if (!table) throw new CommandError("数据表不存在", 404, "TABLE_NOT_FOUND");
    if (ctx.projectId && table.projectId !== ctx.projectId) {
      throw new CommandError("数据表不属于授权项目", 403, "PROJECT_FORBIDDEN");
    }

    const rows = await tx.collectionRow.findMany({ where: { id: { in: patches.map((item) => item.id) }, collectionId: table.id } });
    if (rows.length !== patches.length) throw new CommandError("部分记录不存在或不属于目标数据表", 404, "ROW_NOT_FOUND");

    const beforeById = new Map(rows.map((row) => [row.id, row]));
    const updated = [];
    for (const patch of patches) {
      const before = beforeById.get(patch.id)!;
      const expectedVersion = patch.expectedVersion ?? ctx.expectedVersion ?? before.version;
      const changed = await tx.collectionRow.updateMany({
        where: { id: patch.id, version: expectedVersion },
        data: {
          data: { ...(before.data as Record<string, unknown>), ...patch.data } as Prisma.InputJsonValue,
          updatedBy: ctx.actor.agentId ?? ctx.actor.userId,
          version: { increment: 1 },
        },
      });
      if (!changed.count) throw new CommandError(`记录 ${patch.id} 已被其他人修改，请重新 Preview`, 409, "VERSION_CONFLICT");
      updated.push(await tx.collectionRow.findUniqueOrThrow({ where: { id: patch.id } }));
    }
    const changeSet = await createChangeSet(tx, ctx, `更新 ${updated.length} 条记录`, updated.map((row) => ({
      resourceType: "record",
      resourceId: row.id,
      action: "update",
      before: beforeById.get(row.id),
      after: row,
    })));
    return { rows: updated, changeSetId: changeSet.id };
  });
}
