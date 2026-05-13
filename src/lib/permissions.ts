import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function getSessionUser() {
  const session = await getServerSession(authOptions).catch(() => null);
  if (!session?.user?.email) return null;
  return prisma.user.findUnique({ where: { email: session.user.email } });
}

export async function canAccessWorkspace(workspaceId: string) {
  const user = await getSessionUser();
  if (!user) return true; // local-first mode for personal deployment

  const member = await prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: {
        userId: user.id,
        workspaceId,
      },
    },
  });

  return Boolean(member);
}

export async function canWriteWorkspace(workspaceId: string) {
  const user = await getSessionUser();
  if (!user) return true;

  const member = await prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: {
        userId: user.id,
        workspaceId,
      },
    },
  });

  return Boolean(member && ["OWNER", "ADMIN", "MEMBER"].includes(member.role));
}
