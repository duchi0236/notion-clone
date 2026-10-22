import { NextRequest } from "next/server";
import { ensureWorkspace } from "@/lib/clawnote-store";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { user, workspace } = await ensureWorkspace();
  const conversations = await prisma.agentConversation.findMany({
    where: { workspaceId: workspace.id, createdById: user.id, status: "ACTIVE" },
    orderBy: { updatedAt: "desc" },
    take: 50,
    include: { messages: { orderBy: { createdAt: "asc" }, take: 1 } },
  });
  return Response.json({ conversations });
}

export async function POST(req: NextRequest) {
  const { user, workspace } = await ensureWorkspace();
  const body = await req.json().catch(() => ({}));
  const conversation = await prisma.agentConversation.create({
    data: {
      workspaceId: workspace.id,
      createdById: user.id,
      title: String(body.title ?? "新对话").trim() || "新对话",
      openclawSessionId: `clawnote:${workspace.id}:${crypto.randomUUID()}`,
    },
  });
  return Response.json({ conversation }, { status: 201 });
}
