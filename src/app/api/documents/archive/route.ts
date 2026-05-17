import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureWorkspace } from "@/lib/clawnote-store";

export async function GET() {
  const { workspace } = await ensureWorkspace();
  const documents = await prisma.document.findMany({
    where: { workspaceId: workspace.id, isArchived: true },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({ documents });
}
