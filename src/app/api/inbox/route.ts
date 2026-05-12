import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureWorkspace, normalizeInboxSource } from "@/lib/clawnote-store";

export async function GET() {
  const { workspace } = await ensureWorkspace();
  const items = await prisma.inboxItem.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const { workspace } = await ensureWorkspace();
  const body = await req.json().catch(() => ({}));
  const item = await prisma.inboxItem.create({
    data: {
      workspaceId: workspace.id,
      source: normalizeInboxSource(body.source),
      title: body.title ?? "Untitled Inbox Item",
      content: body.content ?? "",
      raw: body.raw ?? undefined,
      status: body.status ?? "UNPROCESSED",
    },
  });
  return NextResponse.json({ item }, { status: 201 });
}
