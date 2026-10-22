import { ensureWorkspace } from "@/lib/clawnote-store";
import { prisma } from "@/lib/prisma";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const { user, workspace } = await ensureWorkspace();
  const result = await prisma.$transaction(async (tx) => {
    const changed = await tx.agentJob.updateMany({
      where: {
        id: params.id,
        workspaceId: workspace.id,
        requestedById: user.id,
        status: { notIn: ["COMPLETED", "FAILED", "CANCELLED"] },
      },
      data: { status: "CANCELLED", completedAt: new Date() },
    });
    if (changed.count) {
      await tx.approvalRequest.updateMany({
        where: { jobId: params.id, status: "PENDING" },
        data: { status: "EXPIRED", resolvedAt: new Date() },
      });
      await tx.outboxEvent.create({
        data: {
          workspaceId: workspace.id,
          topic: "agent-job.cancelled",
          aggregateId: params.id,
          payload: { cancelledById: user.id },
        },
      });
    }
    return changed;
  });
  if (!result.count) return Response.json({ error: "Job cannot be cancelled" }, { status: 409 });
  return Response.json({ ok: true });
}
