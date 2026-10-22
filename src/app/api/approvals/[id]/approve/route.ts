import { ensureWorkspace } from "@/lib/clawnote-store";
import { prisma } from "@/lib/prisma";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const { user, workspace } = await ensureWorkspace();
  const approval = await prisma.approvalRequest.findFirst({
    where: { id: params.id, workspaceId: workspace.id, status: "PENDING", job: { requestedById: user.id } },
  });
  if (!approval) return Response.json({ error: "Approval not found or resolved" }, { status: 404 });
  if (approval.expiresAt && approval.expiresAt.getTime() <= Date.now()) {
    await prisma.approvalRequest.update({ where: { id: approval.id }, data: { status: "EXPIRED" } });
    return Response.json({ error: "Approval expired" }, { status: 409 });
  }
  const updated = await prisma.$transaction(async (tx) => {
    const item = await tx.approvalRequest.update({
      where: { id: approval.id },
      data: { status: "APPROVED", resolvedById: user.id, resolvedAt: new Date() },
    });
    const runtimeActive = await tx.agentStep.findFirst({
      where: { jobId: approval.jobId, sequence: { gte: 100_000 }, status: "RUNNING" },
      select: { id: true },
    });
    await tx.agentJob.update({
      where: { id: approval.jobId },
      data: { status: runtimeActive ? "RUNNING" : "QUEUED", completedAt: null },
    });
    await tx.outboxEvent.create({
      data: {
        workspaceId: workspace.id,
        topic: "approval.approved",
        aggregateId: approval.jobId,
        payload: { approvalId: approval.id, resolvedById: user.id },
      },
    });
    return item;
  });
  return Response.json({ approval: updated });
}
