import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const name = String(body.name ?? email.split("@")[0] ?? "User");

  if (!email || !password || password.length < 6) {
    return NextResponse.json({ error: "Email and password with at least 6 characters are required" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: "User already exists" }, { status: 409 });

  const hashed = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      email,
      name,
      password: hashed,
      ownedWorkspaces: {
        create: {
          name: `${name} 的知识库`,
          icon: "🧠",
          description: "Personal ClawNote workspace",
        },
      },
    },
    include: { ownedWorkspaces: true },
  });

  const workspace = user.ownedWorkspaces[0];
  if (workspace) {
    await prisma.workspaceMember.create({
      data: {
        userId: user.id,
        workspaceId: workspace.id,
        role: "OWNER",
      },
    });
  }

  return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name } }, { status: 201 });
}
