import { NextRequest } from "next/server";
import { createWorkItems } from "@/lib/commands";
import { agentCommandContext, requireAgent, requireApprovedProposal, routeError } from "@/lib/agent-v1";

export async function POST(req: NextRequest) {
  try {
    const principal = await requireAgent(req, ["tasks:write"]);
    const body = await req.json().catch(() => ({}));
    if (!body.jobId || !body.proposalId || !body.approvalId || !body.idempotencyKey) {
      return Response.json({ error: "jobId, proposalId, approvalId and idempotencyKey are required" }, { status: 400 });
    }
    if (String(body.proposalId) !== String(body.approvalId)) return Response.json({ error: "proposalId does not match approvalId" }, { status: 409 });
    const approval = await requireApprovedProposal(principal.workspaceId, String(body.jobId), String(body.approvalId), "work-items.apply", principal.userId);
    const payload = approval.payload as { items?: unknown[]; sourceIds?: string[]; projectId?: string };
    const result = await createWorkItems(
      agentCommandContext(principal, {
        idempotencyKey: String(body.idempotencyKey),
        jobId: String(body.jobId),
        projectId: payload.projectId,
        sourceIds: payload.sourceIds,
        reason: approval.summary,
      }),
      (payload.items ?? []) as Parameters<typeof createWorkItems>[1],
    );
    return Response.json(result);
  } catch (error) {
    return routeError(error);
  }
}
