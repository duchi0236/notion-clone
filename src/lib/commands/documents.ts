import { fallbackSummary, fallbackTags } from "@/lib/ai-fallback";
import { htmlToText } from "@/lib/clawnote-store";
import type { CommandContext } from "./types";
import { createChangeSet, runCommand } from "./core";
import { CommandError } from "./types";

export async function createDocumentDraft(
  ctx: CommandContext,
  input: { title?: string; content: string; targetId?: string; prompt?: string },
) {
  return runCommand(ctx, "document-draft.created", "documents:draft", async (tx) => {
    const title = input.title?.trim() || fallbackSummary(input.content, 60);
    const html = `<h1>${title}</h1><p>${input.content}</p>`;
    const text = htmlToText(html);
    const draft = await tx.knowledgeObject.create({
      data: {
        workspaceId: ctx.workspaceId,
        type: "AI_DRAFT",
        title,
        properties: {
          targetType: "document",
          targetId: input.targetId,
          contentHtml: html,
          contentText: text,
          status: "pending",
          prompt: input.prompt ?? ctx.reason,
          sourceIds: ctx.sourceIds ?? [],
          generatedBy: ctx.actor.agentId ?? "agent",
          tags: fallbackTags(text),
        },
      },
    });
    const changeSet = await createChangeSet(tx, ctx, `创建文档草稿「${title}」`, [{
      resourceType: "ai-draft",
      resourceId: draft.id,
      action: "create",
      after: draft,
    }]);
    return { draft, changeSetId: changeSet.id };
  });
}

export async function mergeDocumentDraft(
  ctx: CommandContext,
  draftId: string,
  options: { mode: "replace" | "new-document"; targetId?: string; keepTitle?: boolean },
) {
  return runCommand(ctx, "document-draft.merged", "documents:merge", async (tx) => {
    const draft = await tx.knowledgeObject.findFirst({
      where: { id: draftId, workspaceId: ctx.workspaceId, type: "AI_DRAFT" },
    });
    if (!draft) throw new CommandError("草稿不存在", 404, "DRAFT_NOT_FOUND");
    const props = draft.properties as Record<string, unknown>;
    if (ctx.actor.type === "agent" && props.status !== "accepted") {
      throw new CommandError("正式文档修改必须先由用户接受草稿", 403, "DRAFT_NOT_APPROVED");
    }
    const title = String(draft.title || "AI Draft");
    const contentHtml = String(props.contentHtml || `<h1>${title}</h1><p></p>`);
    const contentText = String(props.contentText || htmlToText(contentHtml));
    const targetId = options.targetId ?? (props.targetId ? String(props.targetId) : undefined);
    let before: unknown;
    let document;
    let action: "create" | "update";

    if (options.mode === "replace" && targetId) {
      const existing = await tx.document.findFirst({ where: { id: targetId, workspaceId: ctx.workspaceId } });
      if (!existing) throw new CommandError("目标文档不存在", 404, "DOCUMENT_NOT_FOUND");
      before = existing;
      action = "update";
      document = await tx.document.update({
        where: { id: existing.id },
        data: {
          title: options.keepTitle ? existing.title : title,
          contentHtml,
          contentText,
          contentJson: { type: "doc", content: [{ type: "html", html: contentHtml }] },
          summary: fallbackSummary(contentText, 160),
        },
      });
    } else {
      action = "create";
      document = await tx.document.create({
        data: {
          workspaceId: ctx.workspaceId,
          createdById: ctx.actor.userId,
          title,
          icon: "🤖",
          type: "DOC",
          tags: Array.isArray(props.tags) ? props.tags.map(String) : ["AI Draft"],
          contentHtml,
          contentText,
          contentJson: { type: "doc", content: [{ type: "html", html: contentHtml }] },
          summary: fallbackSummary(contentText, 160),
          agentReadable: true,
          agentWritable: false,
        },
      });
    }

    const latestVersion = await tx.documentVersion.findFirst({
      where: { documentId: document.id },
      orderBy: { version: "desc" },
    });
    await tx.documentVersion.create({
      data: {
        documentId: document.id,
        version: (latestVersion?.version ?? 0) + 1,
        changedBy: ctx.actor.agentId ?? ctx.actor.userId,
        snapshot: document,
        reason: `merge-draft-${draft.id}`,
      },
    });
    await tx.searchIndex.upsert({
      where: { documentId: document.id },
      update: { title: document.title, text: document.contentText, summary: document.summary, tags: document.tags },
      create: { documentId: document.id, title: document.title, text: document.contentText, summary: document.summary, tags: document.tags },
    });
    await tx.knowledgeObject.update({
      where: { id: draft.id },
      data: { properties: { ...props, status: "merged" } },
    });
    const changeSet = await createChangeSet(tx, ctx, `${action === "create" ? "从草稿创建" : "合并草稿到"}文档「${document.title}」`, [{
      resourceType: "document",
      resourceId: document.id,
      action,
      before,
      after: document,
    }]);
    return { document, draftId: draft.id, mode: options.mode, changeSetId: changeSet.id };
  });
}

export async function archiveDocument(ctx: CommandContext, documentId: string) {
  return runCommand(ctx, "document.archived", "resources:archive", async (tx) => {
    const before = await tx.document.findFirst({ where: { id: documentId, workspaceId: ctx.workspaceId } });
    if (!before) throw new CommandError("文档不存在", 404, "DOCUMENT_NOT_FOUND");
    const document = await tx.document.update({
      where: { id: before.id },
      data: { isArchived: true, status: "ARCHIVED" },
    });
    const changeSet = await createChangeSet(tx, ctx, `归档文档「${document.title}」`, [{
      resourceType: "document",
      resourceId: document.id,
      action: "archive",
      before,
      after: document,
    }]);
    return { document, changeSetId: changeSet.id };
  });
}
