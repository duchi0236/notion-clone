import { prisma } from "@/lib/prisma";
import { fallbackSummary, fallbackTags } from "@/lib/ai-fallback";
import { htmlToText } from "@/lib/clawnote-store";
import type { AIDraft, AIDraftTargetType } from "@/lib/domain";

function toDraft(record: any): AIDraft {
  return {
    id: record.id,
    workspaceId: record.workspaceId,
    targetType: record.targetType,
    targetId: record.targetId ?? undefined,
    title: record.title,
    contentHtml: record.contentHtml,
    contentText: record.contentText,
    status: record.status,
    prompt: record.prompt ?? undefined,
    sourceIds: record.sourceIds ?? [],
    generatedBy: record.generatedBy,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export async function createAIDraft(input: {
  workspaceId: string;
  targetType: AIDraftTargetType;
  targetId?: string;
  title?: string;
  contentHtml?: string;
  contentText?: string;
  prompt?: string;
  sourceIds?: string[];
  generatedBy?: "user" | "agent" | "system";
}) {
  const html = input.contentHtml ?? `<h1>${input.title ?? "AI Draft"}</h1><p>${input.contentText ?? ""}</p>`;
  const text = input.contentText ?? htmlToText(html);
  const title = input.title ?? fallbackSummary(text, 60);

  const record = await prisma.knowledgeObject.create({
    data: {
      workspaceId: input.workspaceId,
      type: "AI_DRAFT",
      title,
      properties: {
        targetType: input.targetType,
        targetId: input.targetId,
        contentHtml: html,
        contentText: text,
        status: "pending",
        prompt: input.prompt,
        sourceIds: input.sourceIds ?? [],
        generatedBy: input.generatedBy ?? "agent",
        tags: fallbackTags(text),
      },
    },
  });

  return {
    id: record.id,
    workspaceId: record.workspaceId,
    targetType: input.targetType,
    targetId: input.targetId,
    title: record.title,
    contentHtml: html,
    contentText: text,
    status: "pending",
    prompt: input.prompt,
    sourceIds: input.sourceIds ?? [],
    generatedBy: input.generatedBy ?? "agent",
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  } satisfies AIDraft;
}

export async function listAIDrafts(workspaceId: string) {
  const records = await prisma.knowledgeObject.findMany({
    where: { workspaceId, type: "AI_DRAFT" },
    orderBy: { updatedAt: "desc" },
  });

  return records.map((record) => {
    const props = record.properties as Record<string, any>;
    return {
      id: record.id,
      workspaceId: record.workspaceId,
      targetType: props.targetType ?? "document",
      targetId: props.targetId,
      title: record.title,
      contentHtml: props.contentHtml ?? "",
      contentText: props.contentText ?? "",
      status: props.status ?? "pending",
      prompt: props.prompt,
      sourceIds: props.sourceIds ?? [],
      generatedBy: props.generatedBy ?? "agent",
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    } satisfies AIDraft;
  });
}

export async function updateAIDraftStatus(id: string, status: "pending" | "accepted" | "rejected" | "merged") {
  const existing = await prisma.knowledgeObject.findUnique({ where: { id } });
  if (!existing) return null;
  const props = existing.properties as Record<string, any>;

  const record = await prisma.knowledgeObject.update({
    where: { id },
    data: {
      properties: { ...props, status },
    },
  });

  return record;
}
