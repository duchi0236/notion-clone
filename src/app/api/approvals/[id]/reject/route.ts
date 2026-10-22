import { ensureWorkspace } from "@/lib/clawnote-store";
import { prisma } from "@/lib/prisma";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const { user, workspace } = await ensureWorkspace();
  const approval = await prisma.approvalRequest.findFirst({
    where: { id: params.id, workspaceId: workspace.id, status: "PENDING", job: { requestedById: user.id } },
  });
  if (!approval) return Response.json({ error: "Approval not found or resolved" }, { status: 404 });
  const updated = await prisma.$transaction(async (tx) => {
    const item = await tx.approvalRequest.update({
      where: { id: approval.id },
      data: { status: "REJECTED", resolvedById: user.id, resolvedAt: new Date() },
    });
    await tx.agentJob.update({ where: { id: approval.jobId }, data: { status: "CANCELLED", completedAt: new Date() } });
    await tx.outboxEvent.create({
      data: {
        workspaceId: workspace.id,
        topic: "approval.rejected",
        aggregateId: approval.jobId,
        payload: { approvalId: approval.id, resolvedById: user.id },
      },
    });
    return item;
  });
  return Response.json({ approval: updated });
}
