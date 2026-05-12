import { prisma } from "@/lib/prisma";

export async function getDefaultWorkspace() {
  const existing = await prisma.workspace.findFirst({ orderBy: { createdAt: "asc" } });
  if (existing) return existing;

  const user = await prisma.user.upsert({
    where: { email: "owner@clawnote.local" },
    update: {},
    create: {
      email: "owner@clawnote.local",
      name: "ClawNote Owner",
    },
  });

  const workspace = await prisma.workspace.create({
    data: {
      name: "个人知识库",
      icon: "🧠",
      description: "ClawNote default personal OpenClaw workspace",
      ownerId: user.id,
      members: {
        create: {
          userId: user.id,
          role: "OWNER",
        },
      },
    },
  });

  return workspace;
}

export async function getDefaultUser() {
  return prisma.user.upsert({
    where: { email: "owner@clawnote.local" },
    update: {},
    create: {
      email: "owner@clawnote.local",
      name: "ClawNote Owner",
    },
  });
}
