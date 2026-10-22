import { ensureWorkspace } from "@/lib/clawnote-store";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const { user, workspace } = await ensureWorkspace();
  const result = await prisma.$transaction(async (tx) => {
    const changed = await tx.agentJob.updateMany({
      where: {
        id: params.id,
        workspaceId: workspace.id,
        requestedById: user.id,
        OR: [
          { status: { in: ["FAILED", "WAITING_INPUT", "WAITING_APPROVAL"] } },
          { status: "WAITING_REVIEW", changeSets: { none: {} } },
        ],
      },
      data: { status: "QUEUED", error: Prisma.DbNull, completedAt: null, nextAttemptAt: new Date() },
    });
    if (changed.count) {
      await tx.outboxEvent.create({
        data: {
          workspaceId: workspace.id,
          topic: "agent-job.continued",
          aggregateId: params.id,
          payload: { continuedById: user.id },
        },
      });
    }
    return changed;
  });
  if (!result.count) return Response.json({ error: "Job cannot be continued" }, { status: 409 });
  return Response.json({ ok: true });
}
