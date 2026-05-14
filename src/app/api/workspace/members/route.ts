import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureWorkspace } from "@/lib/clawnote-store";
import { canWriteWorkspace } from "@/lib/permissions";

export async function GET() {
  const { workspace } = await ensureWorkspace();
  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId: workspace.id },
    include: { user: { select: { id: true, email: true, name: true, avatarUrl: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ members });
}

export async function POST(req: NextRequest) {
  const { workspace } = await ensureWorkspace();
  const allowed = await canWriteWorkspace(workspace.id);
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  const name = String(body.name ?? email.split("@")[0] ?? "Member");
  const role = ["OWNER", "ADMIN", "MEMBER", "GUEST"].includes(body.role) ? body.role : "MEMBER";

  if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 });

  const user = await prisma.user.upsert({
    where: { email },
    update: { name },
    create: { email, name },
  });

  const member = await prisma.workspaceMember.upsert({
    where: { userId_workspaceId: { userId: user.id, workspaceId: workspace.id } },
    update: { role },
    create: { userId: user.id, workspaceId: workspace.id, role },
    include: { user: { select: { id: true, email: true, name: true, avatarUrl: true } } },
  });

  return NextResponse.json({ member }, { status: 201 });
}
