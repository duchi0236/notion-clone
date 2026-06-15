import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureWorkspace } from "@/lib/clawnote-store";
import { verifyAgentRequest } from "@/lib/agent-auth";

export async function GET() {
  const { workspace } = await ensureWorkspace();
  const runs = await prisma.agentRun.findMany({
    where: {
      workspaceId: workspace.id,
      status: { in: ["pending", "accepted", "rejected", "applied"] },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ mutations: runs });
}

export async function POST(req: NextRequest) {
  const unauthorized = await verifyAgentRequest(req);
  if (unauthorized) return unauthorized;

  const { workspace } = await ensureWorkspace();
  const body = await req.json().catch(() => ({}));

  const mutation = await prisma.agentRun.create({
    data: {
      workspaceId: workspace.id,
      agentName: body.agentName ?? "Claw Agent",
      input: {
        kind: "mutation-proposal",
        target: body.target ?? null,
        before: body.before ?? null,
        after: body.after ?? null,
        summary: body.summary ?? "",
      },
      output: body.output ?? null,
      status: "pending",
      documentIds: Array.isArray(body.documentIds) ? body.documentIds : [],
    },
  });

  return NextResponse.json({ mutation }, { status: 201 });
}
