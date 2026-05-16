import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { htmlToText, summarize } from "@/lib/clawnote-store";
import type { ContentAsset, ContentSourceType, KnowledgeChunk, KnowledgeSearchQuery, KnowledgeSearchResult } from "@/lib/domain";

function checksum(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function estimateTokens(value: string) {
  return Math.ceil(value.length / 4);
}

function splitText(value: string, size = 1200, overlap = 120) {
  const text = value.trim();
  if (!text) return [];

  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(text.length, start + size);
    chunks.push(text.slice(start, end));
    if (end === text.length) break;
    start = Math.max(0, end - overlap);
  }
  return chunks;
}

export async function buildDocumentAsset(documentId: string): Promise<ContentAsset | null> {
  const document = await prisma.document.findUnique({ where: { id: documentId } });
  if (!document || document.isArchived || !document.agentReadable) return null;

  const text = document.contentText || htmlToText(document.contentHtml);
  return {
    id: `document:${document.id}`,
    workspaceId: document.workspaceId,
    sourceType: "document",
    sourceId: document.id,
    title: document.title,
    text,
    metadata: {
      tags: document.tags,
      summary: document.summary,
      type: document.type,
      updatedAt: document.updatedAt.toISOString(),
    },
    checksum: checksum(text),
    updatedAt: document.updatedAt.toISOString(),
  };
}

export function chunkAsset(asset: ContentAsset): KnowledgeChunk[] {
  return splitText(asset.text).map((text, index) => ({
    id: `${asset.id}:chunk:${index}`,
    workspaceId: asset.workspaceId,
    assetId: asset.id,
    sourceType: asset.sourceType,
    sourceId: asset.sourceId,
    chunkIndex: index,
    text,
    tokenCount: estimateTokens(text),
    summary: summarize(text),
    metadata: asset.metadata,
    embeddingStatus: "pending",
    createdAt: new Date().toISOString(),
  }));
}

export async function syncDocumentToSearchIndex(documentId: string) {
  const asset = await buildDocumentAsset(documentId);
  if (!asset) return { asset: null, chunks: [] as KnowledgeChunk[] };

  const chunks = chunkAsset(asset);
  const mergedText = chunks.map((chunk) => chunk.text).join("\n\n");

  await prisma.searchIndex.upsert({
    where: { documentId },
    update: {
      title: asset.title,
      text: mergedText,
      summary: String(asset.metadata.summary ?? summarize(asset.text)),
      tags: Array.isArray(asset.metadata.tags) ? asset.metadata.tags.map(String) : [],
      embedding: {
        asset,
        chunks,
        provider: "pending",
        model: "not-generated",
        checksum: asset.checksum,
      },
    },
    create: {
      documentId,
      title: asset.title,
      text: mergedText,
      summary: String(asset.metadata.summary ?? summarize(asset.text)),
      tags: Array.isArray(asset.metadata.tags) ? asset.metadata.tags.map(String) : [],
      embedding: {
        asset,
        chunks,
        provider: "pending",
        model: "not-generated",
        checksum: asset.checksum,
      },
    },
  });

  return { asset, chunks };
}

function score(query: string, text: string) {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  const lower = text.toLowerCase();
  return tokens.reduce((total, token) => total + (lower.includes(token) ? 1 : 0), 0);
}

export async function searchKnowledge(query: KnowledgeSearchQuery): Promise<KnowledgeSearchResult[]> {
  const indexes = await prisma.searchIndex.findMany({
    where: {
      document: {
        workspaceId: query.workspaceId,
        isArchived: false,
        ...(query.requireAiReadable === false ? {} : { agentReadable: true }),
      },
    },
    include: {
      document: { select: { id: true, title: true, tags: true } },
    },
    take: 300,
  });

  const results: KnowledgeSearchResult[] = [];
  for (const index of indexes) {
    const embedding = index.embedding as { chunks?: KnowledgeChunk[] } | null;
    const chunks = embedding?.chunks?.length
      ? embedding.chunks
      : [{
          id: `document:${index.documentId}:chunk:0`,
          workspaceId: query.workspaceId,
          assetId: `document:${index.documentId}`,
          sourceType: "document" as ContentSourceType,
          sourceId: index.documentId,
          chunkIndex: 0,
          text: index.text,
          tokenCount: estimateTokens(index.text),
          summary: index.summary ?? undefined,
          metadata: { tags: index.tags },
          embeddingStatus: "skipped" as const,
          createdAt: new Date().toISOString(),
        }];

    for (const chunk of chunks) {
      const value = score(query.query, `${index.title} ${chunk.text} ${index.tags.join(" ")}`);
      if (value <= 0) continue;
      results.push({
        chunk,
        score: value,
        citation: { sourceType: chunk.sourceType, sourceId: chunk.sourceId, title: index.document.title },
      });
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, query.limit ?? 10);
}
