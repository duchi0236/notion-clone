import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureWorkspace } from "@/lib/clawnote-store";

async function ownedRow(rowId: string, workspaceId: string) {
  return prisma.collectionRow.findFirst({
    where: { id: rowId, collection: { workspaceId, NOT: { baseId: null } } },
    select: { id: true },
  });
}

// 记录评论：列出 / 新增 / 删除
export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const { workspace } = await ensureWorkspace();
  if (!(await ownedRow(params.id, workspace.id))) return NextResponse.json({ error: "Row not found" }, { status: 404 });
  const comments = await prisma.rowComment.findMany({ where: { rowId: params.id }, orderBy: { createdAt: "asc" } });
  return NextResponse.json({ comments });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { workspace, user } = await ensureWorkspace();
  if (!(await ownedRow(params.id, workspace.id))) return NextResponse.json({ error: "Row not found" }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const text = typeof body.body === "string" ? body.body.trim() : "";
  if (!text) return NextResponse.json({ error: "Empty comment" }, { status: 400 });
  const comment = await prisma.rowComment.create({
    data: { rowId: params.id, author: user.name || user.email || "你", body: text },
  });
  return NextResponse.json({ comment }, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { workspace } = await ensureWorkspace();
  if (!(await ownedRow(params.id, workspace.id))) return NextResponse.json({ error: "Row not found" }, { status: 404 });
  const commentId = req.nextUrl.searchParams.get("commentId");
  if (!commentId) return NextResponse.json({ error: "commentId required" }, { status: 400 });
  await prisma.rowComment.deleteMany({ where: { id: commentId, rowId: params.id } });
  return NextResponse.json({ ok: true });
}
