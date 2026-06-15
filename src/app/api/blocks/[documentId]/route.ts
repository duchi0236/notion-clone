import { NextRequest, NextResponse } from "next/server";
import type { BlockType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureWorkspace } from "@/lib/clawnote-store";

const BLOCK_TYPE_MAP: Record<string, BlockType> = {
  paragraph: "TEXT",
  text: "TEXT",
  heading_1: "HEADING_1",
  h1: "HEADING_1",
  heading_2: "HEADING_2",
  h2: "HEADING_2",
  heading_3: "HEADING_3",
  h3: "HEADING_3",
  bullet_list: "BULLETED_LIST",
  bulleted_list: "BULLETED_LIST",
  ordered_list: "NUMBERED_LIST",
  numbered_list: "NUMBERED_LIST",
  todo: "TO_DO",
  to_do: "TO_DO",
  toggle: "TOGGLE",
  quote: "QUOTE",
  divider: "DIVIDER",
  code: "CODE",
  image: "IMAGE",
  file: "FILE",
  bookmark: "BOOKMARK",
  callout: "CALLOUT",
  table: "TABLE",
  table_row: "TABLE_ROW",
  embed: "EMBED",
  database: "DATABASE",
  page_link: "BOOKMARK",
};

function normalizeBlockType(value: unknown): BlockType {
  const key = String(value ?? "paragraph").toLowerCase();
  return BLOCK_TYPE_MAP[key] ?? "TEXT";
}

export async function GET(_: NextRequest, { params }: { params: { documentId: string } }) {
  const { workspace } = await ensureWorkspace();
  const document = await prisma.document.findFirst({
    where: { id: params.documentId, workspaceId: workspace.id, isArchived: false },
    select: { id: true },
  });
  if (!document) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  const blocks = await prisma.block.findMany({
    where: { documentId: params.documentId },
    orderBy: [{ parentBlockId: "asc" }, { sortIndex: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({ blocks });
}

export async function POST(req: NextRequest, { params }: { params: { documentId: string } }) {
  const { workspace } = await ensureWorkspace();
  const body = await req.json().catch(() => ({}));
  const document = await prisma.document.findFirst({
    where: { id: params.documentId, workspaceId: workspace.id, isArchived: false },
    select: { id: true },
  });
  if (!document) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  const parentBlockId = body.parentBlockId ?? null;
  const sortIndex =
    body.sortIndex === undefined
      ? await prisma.block.count({ where: { documentId: params.documentId, parentBlockId } })
      : Number(body.sortIndex);

  const block = await prisma.block.create({
    data: {
      documentId: params.documentId,
      parentBlockId,
      sortIndex,
      type: normalizeBlockType(body.type),
      content: body.content ?? {},
      properties: body.properties ?? undefined,
    },
  });

  return NextResponse.json({ block }, { status: 201 });
}
