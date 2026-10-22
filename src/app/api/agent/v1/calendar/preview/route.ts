import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertProjectAccess, createProposal, requireAgent, routeError } from "@/lib/agent-v1";

export async function POST(req: NextRequest) {
  try {
    const principal = await requireAgent(req, ["calendar:write"]);
    const body = await req.json().catch(() => ({}));
    const events = Array.isArray(body.events) ? body.events : [];
    if (!body.jobId || !events.length) return Response.json({ error: "jobId and events are required" }, { status: 400 });
    assertProjectAccess(principal, body.projectId ? String(body.projectId) : undefined);
    const starts = events.map((event: { startsAt?: string }) => new Date(String(event.startsAt))).filter((date: Date) => !Number.isNaN(date.getTime()));
    const ends = events.map((event: { endsAt?: string }) => new Date(String(event.endsAt))).filter((date: Date) => !Number.isNaN(date.getTime()));
    const conflicts = starts.length && ends.length ? await prisma.calendarEvent.findMany({
      where: {
        workspaceId: principal.workspaceId,
        ...(body.projectId ? { projectId: String(body.projectId) } : {}),
        startsAt: { lt: new Date(Math.max(...ends.map((date: Date) => date.getTime()))) },
        endsAt: { gt: new Date(Math.min(...starts.map((date: Date) => date.getTime()))) },
        status: { not: "CANCELLED" },
      },
      select: { id: true, title: true, startsAt: true, endsAt: true },
    }) : [];
    const proposal = await createProposal({
      workspaceId: principal.workspaceId,
      jobId: String(body.jobId),
      action: "calendar.apply",
      summary: `准备创建 ${events.length} 个日程${conflicts.length ? `，发现 ${conflicts.length} 个潜在冲突` : ""}`,
      payload: { events, conflicts, sourceIds: body.sourceIds ?? [], projectId: body.projectId ?? null },
      requestedById: principal.userId,
    });
    return Response.json({ proposal, proposalId: proposal.id, conflicts, requiresApproval: proposal.status === "PENDING" }, { status: 201 });
  } catch (error) {
    return routeError(error);
  }
}
