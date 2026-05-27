import { prisma } from "@/lib/prisma";
import { fallbackSummary, fallbackTags } from "@/lib/ai-fallback";
import { htmlToText } from "@/lib/clawnote-store";
import type { AIDraft, AIDraftStatus, AIDraftTargetType } from "@/lib/domain";

const TARGET_TYPES: AIDraftTargetType[] = ["document", "task", "memory", "inbox"];
const DRAFT_STATUSES: AIDraftStatus[] = ["pending", "accepted", "rejected", "merged"];

function normalizeTargetType(value: unknown): AIDraftTargetType {
  return TARGET_TYPES.includes(value as AIDraftTargetType) ? value as AIDraftTargetType : "document";
}

function normalizeStatus(value: unknown): AIDraftStatus {
  return DRAFT_STATUSES.includes(value as AIDraftStatus) ? value as AIDraftStatus : "pending";
}

function normalizeGeneratedBy(value: unknown): AIDraft["generatedBy"] {
  return value === "user" || value === "system" || value === "agent" ? value : "agent";
}

function toDraft(record: any): AIDraft {
  const props = record.properties as Record<string, any>;
  return {
    id: record.id,
    workspaceId: record.workspaceId,
    targetType: normalizeTargetType(props.targetType),
    targetId: props.targetId ? String(props.targetId) : undefined,
    title: record.title,
    contentHtml: String(props.contentHtml ?? ""),
    contentText: String(props.contentText ?? ""),
    status: normalizeStatus(props.status),
    prompt: props.prompt ? String(props.prompt) : undefined,
    sourceIds: Array.isArray(props.sourceIds) ? props.sourceIds.map(String) : [],
    generatedBy: normalizeGeneratedBy(props.generatedBy),
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

  return toDraft(record);
}

export async function listAIDrafts(workspaceId: string) {
  const records = await prisma.knowledgeObject.findMany({
    where: { workspaceId, type: "AI_DRAFT" },
    orderBy: { updatedAt: "desc" },
  });

  return records.map(toDraft);
}

export async function updateAIDraftStatus(input: {
  id: string;
  workspaceId: string;
  status: AIDraftStatus;
}) {
  const existing = await prisma.knowledgeObject.findFirst({
    where: {
      id: input.id,
      workspaceId: input.workspaceId,
      type: "AI_DRAFT",
    },
  });
  if (!existing) return null;

  const props = existing.properties as Record<string, any>;
  const record = await prisma.knowledgeObject.update({
    where: { id: existing.id },
    data: {
      properties: { ...props, status: input.status },
    },
  });

  return toDraft(record);
}
