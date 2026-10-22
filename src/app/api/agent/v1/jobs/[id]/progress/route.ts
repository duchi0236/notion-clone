import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAgent, requireAgentJob, routeError } from "@/lib/agent-v1";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const principal = await requireAgent(req, ["jobs:write"]);
    const job = await requireAgentJob(principal.workspaceId, params.id, principal.userId);
    const body = await req.json().catch(() => ({}));
    const sequence = Number(body.sequence);
    if (!Number.isInteger(sequence) || sequence < 1 || sequence >= 100_000) {
      return Response.json({ error: "sequence must be between 1 and 99999" }, { status: 400 });
    }
    const allowedStatuses = ["RUNNING", "COMPLETED", "FAILED", "SKIPPED"];
    if (!allowedStatuses.includes(String(body.status))) {
      return Response.json({ error: "invalid step status" }, { status: 400 });
    }
    const step = await prisma.agentStep.upsert({
      where: { jobId_sequence: { jobId: job.id, sequence } },
      create: {
        jobId: job.id,
        sequence,
        title: String(body.title ?? `步骤 ${sequence}`),
        toolName: body.toolName,
        status: body.status ?? "RUNNING",
        input: body.input,
        output: body.output,
        error: body.error,
        startedAt: new Date(),
        completedAt: ["COMPLETED", "FAILED", "SKIPPED"].includes(body.status) ? new Date() : null,
      },
      update: {
        title: body.title,
        toolName: body.toolName,
        status: body.status,
        output: body.output,
        error: body.error,
        completedAt: ["COMPLETED", "FAILED", "SKIPPED"].includes(body.status) ? new Date() : undefined,
      },
    });
    return Response.json({ step });
  } catch (error) {
    return routeError(error);
  }
}
