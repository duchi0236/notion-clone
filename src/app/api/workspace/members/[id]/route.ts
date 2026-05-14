import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureWorkspace } from "@/lib/clawnote-store";
import { canWriteWorkspace } from "@/lib/permissions";

const ROLES = ["OWNER", "ADMIN", "MEMBER", "GUEST"];

async function ownerCount(workspaceId: string) {
  return prisma.workspaceMember.count({ where: { workspaceId, role: "OWNER" } });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { workspace } = await ensureWorkspace();
  const allowed = await canWriteWorkspace(workspace.id);
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const role = ROLES.includes(body.role) ? body.role : "MEMBER";
  const existing = await prisma.workspaceMember.findFirst({ where: { id: params.id, workspaceId: workspace.id } });
  if (!existing) return NextResponse.json({ error: "Member not found" }, { status: 404 });

  if (existing.role === "OWNER" && role !== "OWNER" && (await ownerCount(workspace.id)) <= 1) {
    return NextResponse.json({ error: "Cannot demote the last owner" }, { status: 400 });
  }

  const member = await prisma.workspaceMember.update({
    where: { id: params.id },
    data: { role },
    include: { user: { select: { id: true, email: true, name: true, avatarUrl: true } } },
  });

  return NextResponse.json({ member });
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const { workspace } = await ensureWorkspace();
  const allowed = await canWriteWorkspace(workspace.id);
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const existing = await prisma.workspaceMember.findFirst({ where: { id: params.id, workspaceId: workspace.id } });
  if (!existing) return NextResponse.json({ error: "Member not found" }, { status: 404 });

  if (existing.role === "OWNER" && (await ownerCount(workspace.id)) <= 1) {
    return NextResponse.json({ error: "Cannot remove the last owner" }, { status: 400 });
  }

  await prisma.workspaceMember.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
