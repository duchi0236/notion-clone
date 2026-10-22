import { NextRequest } from "next/server";
import { ensureWorkspace } from "@/lib/clawnote-store";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { user, workspace } = await ensureWorkspace();
  const jobs = await prisma.agentJob.findMany({
    where: { workspaceId: workspace.id, requestedById: user.id },
    orderBy: { updatedAt: "desc" },
    take: 100,
    include: { steps: { orderBy: { sequence: "asc" } }, approvals: true, changeSets: true },
  });
  return Response.json({ jobs });
}

export async function POST(req: NextRequest) {
  const { user, workspace } = await ensureWorkspace();
  const body = await req.json().catch(() => ({}));
  const goal = String(body.goal ?? "").trim();
  if (!goal) return Response.json({ error: "goal is required" }, { status: 400 });
  const job = await prisma.agentJob.create({
    data: {
      workspaceId: workspace.id,
      requestedById: user.id,
      conversationId: body.conversationId ?? null,
      title: String(body.title ?? goal.slice(0, 80)),
      goal,
      authorization: body.authorization ?? { mode: "tiered", externalTools: false, permanentDelete: false },
    },
  });
  return Response.json({ job }, { status: 202 });
}
