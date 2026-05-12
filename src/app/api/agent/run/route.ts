import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureWorkspace } from "@/lib/clawnote-store";

export async function GET() {
  const { workspace } = await ensureWorkspace();
  const runs = await prisma.agentRun.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json({ runs });
}

export async function POST(req: NextRequest) {
  const { workspace } = await ensureWorkspace();
  const body = await req.json().catch(() => ({}));
  const run = await prisma.agentRun.create({
    data: {
      workspaceId: workspace.id,
      agentName: body.agentName ?? "OpenClaw Agent",
      input: body.input ?? {},
      output: body.output ?? null,
      status: body.status ?? "completed",
      documentIds: Array.isArray(body.documentIds) ? body.documentIds : [],
    },
  });
  return NextResponse.json({ run }, { status: 201 });
}
