import { ensureWorkspace } from "@/lib/clawnote-store";
import { prisma } from "@/lib/prisma";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const { user, workspace } = await ensureWorkspace();
  const result = await prisma.$transaction(async (tx) => {
    const changed = await tx.agentJob.updateMany({
      where: { id: params.id, workspaceId: workspace.id, requestedById: user.id, status: "WAITING_REVIEW" },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
    if (changed.count) {
      await tx.outboxEvent.create({
        data: {
          workspaceId: workspace.id,
          topic: "agent-job.accepted",
          aggregateId: params.id,
          payload: { acceptedById: user.id },
        },
      });
    }
    return changed;
  });
  if (!result.count) return Response.json({ error: "Job is not ready for acceptance" }, { status: 409 });
  return Response.json({ ok: true });
}
