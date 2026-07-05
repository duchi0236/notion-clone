export type ContentSourceType = "document" | "file" | "comment" | "task" | "inbox" | "memory";

export type ContentAsset = {
  id: string;
  workspaceId: string;
  sourceType: ContentSourceType;
  sourceId: string;
  title: string;
  text: string;
  metadata: Record<string, unknown>;
  checksum: string;
  updatedAt: string;
};

export type KnowledgeChunk = {
  id: string;
  workspaceId: string;
  assetId: string;
  sourceType: ContentSourceType;
  sourceId: string;
  chunkIndex: number;
  text: string;
  tokenCount: number;
  summary?: string;
  metadata: Record<string, unknown>;
  embeddingStatus: "pending" | "ready" | "failed" | "skipped";
  createdAt: string;
};

export type KnowledgeSearchQuery = {
  workspaceId: string;
  query: string;
  limit?: number;
  sourceTypes?: ContentSourceType[];
  tags?: string[];
  requireAiReadable?: boolean;
};

export type KnowledgeSearchResult = {
  chunk: KnowledgeChunk;
  score: number;
  citation: {
    sourceType: ContentSourceType;
    sourceId: string;
    title: string;
  };
};

export type AIDraftStatus = "pending" | "accepted" | "rejected" | "merged";
export type AIDraftTargetType = "document" | "task" | "memory" | "inbox";

export type AIDraft = {
  id: string;
  workspaceId: string;
  targetType: AIDraftTargetType;
  targetId?: string;
  title: string;
  contentHtml: string;
  contentText: string;
  status: AIDraftStatus;
  prompt?: string;
  sourceIds: string[];
  generatedBy: "user" | "agent" | "system";
  createdAt: string;
  updatedAt: string;
};

export type AIEditProposal = {
  id: string;
  workspaceId: string;
  documentId: string;
  beforeHtml: string;
  afterHtml: string;
  patch: Record<string, unknown>;
  reason?: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
};
