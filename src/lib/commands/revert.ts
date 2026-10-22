import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { CommandError } from "./types";

export async function revertAgentJob(workspaceId: string, jobId: string, userId: string) {
  const job = await prisma.agentJob.findFirst({ where: { id: jobId, workspaceId, requestedById: userId } });
  if (!job) throw new CommandError("Agent Job 不存在或无权撤销", 404, "JOB_NOT_FOUND");
  const changeSets = await prisma.changeSet.findMany({
    where: { workspaceId, jobId, revertedAt: null, reversible: true },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });
  if (!changeSets.length) throw new CommandError("没有可撤销的变更", 409, "NOTHING_TO_REVERT");

  await prisma.$transaction(async (tx) => {
    for (const changeSet of changeSets) {
      for (const item of [...changeSet.items].reverse()) {
        if (item.action === "create") {
          if (item.resourceType === "work-item") {
            const row = await tx.collectionRow.findFirst({ where: { id: item.resourceId, collection: { workspaceId } } });
            if (row) {
              await tx.collectionRow.update({
                where: { id: row.id },
                data: {
                  data: { ...(row.data as Record<string, unknown>), _archived: true } as Prisma.InputJsonValue,
                  version: { increment: 1 },
                },
              });
            }
          } else if (item.resourceType === "record") {
            await tx.collectionRow.deleteMany({ where: { id: item.resourceId, collection: { workspaceId } } });
          } else if (item.resourceType === "calendar-event") {
            await tx.calendarEvent.updateMany({
              where: { id: item.resourceId, workspaceId },
              data: { status: "CANCELLED", metadata: { reverted: true }, version: { increment: 1 } },
            });
          } else if (item.resourceType === "document") {
            await tx.document.updateMany({ where: { id: item.resourceId, workspaceId }, data: { isArchived: true } });
          } else if (item.resourceType === "ai-draft") {
            await tx.knowledgeObject.deleteMany({ where: { id: item.resourceId, workspaceId, type: "AI_DRAFT" } });
          }
        } else if ((item.action === "update" || item.action === "archive") && item.before) {
          const before = item.before as Record<string, unknown>;
          if (item.resourceType === "record" || item.resourceType === "work-item") {
            await tx.collectionRow.updateMany({
              where: { id: item.resourceId, collection: { workspaceId } },
              data: { data: (before.data ?? {}) as Prisma.InputJsonValue, version: { increment: 1 } },
            });
          } else if (item.resourceType === "calendar-event") {
            await tx.calendarEvent.updateMany({
              where: { id: item.resourceId, workspaceId },
              data: {
                title: String(before.title),
                description: before.description === null ? null : String(before.description ?? ""),
                location: before.location === null ? null : String(before.location ?? ""),
                startsAt: new Date(String(before.startsAt)),
                endsAt: new Date(String(before.endsAt)),
                allDay: Boolean(before.allDay),
                color: String(before.color ?? "blue"),
                status: String(before.status) as never,
                metadata: (before.metadata ?? {}) as Prisma.InputJsonValue,
                version: { increment: 1 },
              },
            });
          } else if (item.resourceType === "document") {
            await tx.document.updateMany({
              where: { id: item.resourceId, workspaceId },
              data: {
                title: String(before.title),
                contentHtml: String(before.contentHtml ?? ""),
                contentText: String(before.contentText ?? ""),
                contentJson: (before.contentJson ?? {}) as Prisma.InputJsonValue,
                summary: before.summary === null ? null : String(before.summary ?? ""),
                isArchived: Boolean(before.isArchived),
                status: String(before.status) as never,
              },
            });
          }
        }
      }
      await tx.changeSet.update({ where: { id: changeSet.id }, data: { revertedAt: new Date(), revertedById: userId } });
    }
    await tx.outboxEvent.create({
      data: { workspaceId, topic: "agent-job.reverted", aggregateId: jobId, payload: { changeSetIds: changeSets.map((item) => item.id), userId } },
    });
  });
  return { reverted: changeSets.map((item) => item.id) };
}
