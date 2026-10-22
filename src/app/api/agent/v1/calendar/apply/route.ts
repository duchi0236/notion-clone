import { NextRequest } from "next/server";
import { createCalendarEvents } from "@/lib/commands";
import { agentCommandContext, requireAgent, requireApprovedProposal, routeError } from "@/lib/agent-v1";

export async function POST(req: NextRequest) {
  try {
    const principal = await requireAgent(req, ["calendar:write"]);
    const body = await req.json().catch(() => ({}));
    if (!body.jobId || !body.proposalId || !body.approvalId || !body.idempotencyKey) {
      return Response.json({ error: "jobId, proposalId, approvalId and idempotencyKey are required" }, { status: 400 });
    }
    if (String(body.proposalId) !== String(body.approvalId)) return Response.json({ error: "proposalId does not match approvalId" }, { status: 409 });
    const approval = await requireApprovedProposal(principal.workspaceId, String(body.jobId), String(body.approvalId), "calendar.apply", principal.userId);
    const payload = approval.payload as { events: Parameters<typeof createCalendarEvents>[1]; sourceIds?: string[]; projectId?: string };
    const result = await createCalendarEvents(
      agentCommandContext(principal, {
        idempotencyKey: String(body.idempotencyKey),
        jobId: String(body.jobId),
        projectId: payload.projectId,
        sourceIds: payload.sourceIds,
        reason: approval.summary,
      }),
      payload.events,
    );
    return Response.json(result);
  } catch (error) {
    return routeError(error);
  }
}
