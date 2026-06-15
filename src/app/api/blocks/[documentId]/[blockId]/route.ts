import { NextRequest, NextResponse } from "next/server";
import type { BlockType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureWorkspace } from "@/lib/clawnote-store";

function normalizeBlockType(value: unknown): BlockType | undefined {
  if (value === undefined) return undefined;
  const key = String(value).toUpperCase();
  const allowed = new Set([
    "TEXT",
    "HEADING_1",
    "HEADING_2",
    "HEADING_3",
    "BULLETED_LIST",
    "NUMBERED_LIST",
    "TO_DO",
    "TOGGLE",
    "QUOTE",
    "DIVIDER",
    "CODE",
    "IMAGE",
    "VIDEO",
    "FILE",
    "BOOKMARK",
    "CALLOUT",
    "TABLE",
    "TABLE_ROW",
    "EMBED",
    "DATABASE",
  ]);
  return allowed.has(key) ? (key as BlockType) : undefined;
}

async function assertDocument(documentId: string) {
  const { workspace } = await ensureWorkspace();
  return prisma.document.findFirst({
    where: { id: documentId, workspaceId: workspace.id, isArchived: false },
    select: { id: true },
  });
}

export async function PUT(req: NextRequest, { params }: { params: { documentId: string; blockId: string } }) {
  const document = await assertDocument(params.documentId);
  if (!document) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const block = await prisma.block.update({
    where: { id: params.blockId },
    data: {
      type: normalizeBlockType(body.type),
      content: body.content,
      properties: body.properties,
      parentBlockId: body.parentBlockId === undefined ? undefined : body.parentBlockId,
      sortIndex: body.sortIndex === undefined ? undefined : Number(body.sortIndex),
    },
  });

  return NextResponse.json({ block });
}

export async function DELETE(_: NextRequest, { params }: { params: { documentId: string; blockId: string } }) {
  const document = await assertDocument(params.documentId);
  if (!document) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  const block = await prisma.block.delete({ where: { id: params.blockId } });
  return NextResponse.json({ block });
}
