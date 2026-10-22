import type { CommandContext } from "./types";
import { CommandError } from "./types";
import { createChangeSet, runCommand } from "./core";

export async function archiveInboxItems(ctx: CommandContext, ids: string[]) {
  return runCommand(ctx, "inbox-items.archived", "inbox:write", async (tx) => {
    const items = await tx.inboxItem.findMany({ where: { id: { in: ids }, workspaceId: ctx.workspaceId } });
    if (items.length !== ids.length) throw new CommandError("部分收件箱内容不存在", 404, "INBOX_ITEM_NOT_FOUND");
    await tx.inboxItem.updateMany({ where: { id: { in: ids } }, data: { status: "ARCHIVED" } });
    const updated = items.map((item) => ({ ...item, status: "ARCHIVED" as const }));
    const changeSet = await createChangeSet(tx, ctx, `归档 ${items.length} 条收件内容`, updated.map((item) => ({
      resourceType: "inbox-item",
      resourceId: item.id,
      action: "archive",
      before: items.find((before) => before.id === item.id),
      after: item,
    })));
    return { items: updated, changeSetId: changeSet.id };
  });
}
