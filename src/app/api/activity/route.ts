import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureWorkspace } from "@/lib/clawnote-store";

export const dynamic = "force-dynamic";

export async function GET() {
  const { workspace } = await ensureWorkspace();

  const [versions, comments, runs] = await Promise.all([
    prisma.documentVersion.findMany({
      where: { document: { workspaceId: workspace.id } },
      include: { document: { select: { title: true, icon: true } } },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.comment.findMany({
      where: { document: { workspaceId: workspace.id } },
      include: { document: { select: { title: true, icon: true } }, author: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.agentRun.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);

  const items = [
    ...versions.map((item) => ({
      id: item.id,
      type: "version" as const,
      title: `${item.document.icon ?? "📄"} ${item.document.title}`,
      desc: `版本 v${item.version} · ${item.reason ?? "update"} · ${item.changedBy}`,
      createdAt: item.createdAt,
    })),
    ...comments.map((item) => ({
      id: item.id,
      type: "comment" as const,
      title: `${item.document.icon ?? "📄"} ${item.document.title}`,
      desc: `${item.author.name ?? item.author.email ?? "User"} 评论：${item.content}`,
      createdAt: item.createdAt,
    })),
    ...runs.map((item) => ({
      id: item.id,
      type: "agent" as const,
      title: item.agentName,
      desc: `Agent run · ${item.status}`,
      createdAt: item.createdAt,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 50);

  return NextResponse.json({ items });
}
