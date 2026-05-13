import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureWorkspace } from "@/lib/clawnote-store";

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const { workspace } = await ensureWorkspace();
  const token = await prisma.apiToken.findFirst({
    where: {
      id: params.id,
      workspaceId: workspace.id,
    },
  });

  if (!token) return NextResponse.json({ error: "Token not found" }, { status: 404 });

  await prisma.apiToken.delete({ where: { id: token.id } });
  return NextResponse.json({ ok: true });
}
