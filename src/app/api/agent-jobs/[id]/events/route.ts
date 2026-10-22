import { ensureWorkspace } from "@/lib/clawnote-store";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { user, workspace } = await ensureWorkspace();
  const allowed = await prisma.agentJob.findFirst({
    where: { id: params.id, workspaceId: workspace.id, requestedById: user.id },
    select: { id: true },
  });
  if (!allowed) return Response.json({ error: "Agent Job not found" }, { status: 404 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let previous = "";
      let sequence = Math.max(0, Number(req.headers.get("last-event-id") ?? 0) || 0);
      while (!req.signal.aborted) {
        const job = await prisma.agentJob.findUnique({
          where: { id: params.id },
          include: {
            steps: { orderBy: { sequence: "asc" } },
            approvals: { orderBy: { createdAt: "desc" } },
            changeSets: true,
          },
        });
        if (!job) break;
        const snapshot = JSON.stringify(job);
        if (snapshot !== previous) {
          sequence += 1;
          const payload = JSON.stringify({ sequence, job });
          controller.enqueue(encoder.encode(`id: ${sequence}\nevent: job.updated\ndata: ${payload}\n\n`));
          previous = snapshot;
        } else {
          controller.enqueue(encoder.encode(`: keepalive\n\n`));
        }
        if (["COMPLETED", "FAILED", "CANCELLED"].includes(job.status)) break;
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      controller.close();
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
