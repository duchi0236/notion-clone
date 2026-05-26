import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

type Permission = "read" | "comment" | "write" | "admin" | "owner";

const roleRank: Record<Role, number> = {
  GUEST: 1,
  MEMBER: 2,
  ADMIN: 3,
  OWNER: 4,
};

const permissionRank: Record<Permission, number> = {
  read: 1,
  comment: 1,
  write: 2,
  admin: 3,
  owner: 4,
};

export class PermissionError extends Error {
  status: number;
  constructor(message: string, status = 403) {
    super(message);
    this.status = status;
  }
}

export function permissionResponse(error: unknown) {
  if (error instanceof PermissionError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  return NextResponse.json({ error: "Permission check failed" }, { status: 500 });
}

export async function getSessionUser() {
  const session = await getServerSession(authOptions).catch(() => null);
  if (!session?.user?.email) return null;
  return prisma.user.findUnique({ where: { email: session.user.email.trim().toLowerCase() } });
}

export async function requireSessionUser() {
  const user = await getSessionUser();
  if (!user) throw new PermissionError("未登录", 401);
  return user;
}

export async function getWorkspaceRole(workspaceId: string) {
  const user = await getSessionUser();
  if (!user) return null;
  const member = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId: user.id, workspaceId } },
  });
  return member?.role ?? null;
}

export async function canAccessWorkspace(workspaceId: string) {
  const role = await getWorkspaceRole(workspaceId);
  return Boolean(role);
}

export async function canWriteWorkspace(workspaceId: string) {
  const role = await getWorkspaceRole(workspaceId);
  return Boolean(role && roleRank[role] >= permissionRank.write);
}

export async function requireWorkspaceAccess(workspaceId: string, permission: Permission = "read") {
  const user = await requireSessionUser();
  const member = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId: user.id, workspaceId } },
  });

  if (!member) throw new PermissionError("没有访问该空间的权限", 403);
  if (roleRank[member.role] < permissionRank[permission]) throw new PermissionError("权限不足", 403);

  return { user, member };
}

export async function requireDocumentAccess(documentId: string, permission: Permission = "read") {
  const document = await prisma.document.findUnique({ where: { id: documentId } });
  if (!document) throw new PermissionError("Document not found", 404);
  const access = await requireWorkspaceAccess(document.workspaceId, permission);
  return { ...access, document };
}
