import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureWorkspace } from "@/lib/clawnote-store";

const STATUSES = new Set(["pending", "accepted", "rejected", "applied"]);

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { workspace } = await ensureWorkspace();
  const body = await req.json().catch(() => ({}));
  const status = String(body.status ?? "pending");
  if (!STATUSES.has(status)) return NextResponse.json({ error: "Invalid mutation status" }, { status: 400 });

  const existing = await prisma.agentRun.findFirst({
    where: { id: params.id, workspaceId: workspace.id },
  });
  if (!existing) return NextResponse.json({ error: "Mutation not found" }, { status: 404 });

  const mutation = await prisma.agentRun.update({
    where: { id: existing.id },
    data: { status },
  });

  return NextResponse.json({ mutation });
}
