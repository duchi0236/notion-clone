"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Doc, Memory } from "./types";
import { api, htmlToText, summarize, today, uid } from "./api";
import { seedDocs, seedMemories } from "./seeds";

type ApiDoc = {
  id: string;
  title?: string;
  icon?: string | null;
  parentId?: string | null;
  sortIndex?: number;
  coverImage?: string | null;
  contentHtml?: string;
  contentText?: string;
  summary?: string | null;
  tags?: string[];
  isFavorite?: boolean;
  isPublished?: boolean;
  isArchived?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type ApiMemory = {
  id: string;
  content: string;
  status: string;
  confidence: number;
  tags?: string[];
};

type CreateDocInput = {
  parentId?: string | null;
  title?: string;
  icon?: string;
  html?: string;
  tags?: string[];
};

function normalizeTitle(title?: string) {
  if (!title || title === "Untitled") return "无标题";
  return title;
}

function normalizeStarterHtml(html: string) {
  const value = html.trim();
  if (value === "<h1>Untitled</h1><p>开始写作...</p>") return "<p></p>";
  if (value === "<h1>Untitled</h1><p></p>") return "<p></p>";
  return html;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripDuplicateTitleHeading(html: string, title: string) {
  const normalizedTitle = normalizeTitle(title).trim();
  if (!normalizedTitle) return html;
  const pattern = new RegExp(`^\\s*<h1[^>]*>\\s*${escapeRegExp(normalizedTitle)}\\s*<\\/h1>\\s*`, "i");
  const next = html.replace(pattern, "").trim();
  return next || "<p></p>";
}

function fromApiDoc(doc: ApiDoc): Doc {
  const title = normalizeTitle(doc.title);
  const html = stripDuplicateTitleHeading(normalizeStarterHtml(doc.contentHtml ?? "<p></p>"), title);
  const text = htmlToText(html);
  return {
    id: doc.id,
    title,
    icon: doc.icon ?? "📄",
    parentId: doc.parentId ?? null,
    sortIndex: doc.sortIndex ?? 0,
    coverImage: doc.coverImage ?? null,
    html,
    text,
    summary: doc.summary ?? summarize(text),
    tags: doc.tags ?? [],
    isFavorite: doc.isFavorite ?? false,
    isPublished: doc.isPublished ?? false,
    isArchived: doc.isArchived ?? false,
    createdAt: doc.createdAt ?? today(),
    updatedAt: doc.updatedAt ?? today(),
  };
}

function fromApiMemory(memory: ApiMemory): Memory {
  return {
    id: memory.id,
    content: memory.content,
    status: String(memory.status).toLowerCase() as Memory["status"],
    confidence: memory.confidence,
    tags: memory.tags ?? [],
  };
}

function descendantIds(docs: Doc[], rootId: string) {
  const ids = new Set<string>([rootId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const doc of docs) {
      if (doc.parentId && ids.has(doc.parentId) && !ids.has(doc.id)) {
        ids.add(doc.id);
        changed = true;
      }
    }
  }
  return ids;
}

export function useWorkspaceState() {
  const [docs, setDocs] = useState<Doc[]>(seedDocs);
  const [memories, setMemories] = useState<Memory[]>(seedMemories);
  const [selectedDocId, setSelectedDocId] = useState(seedDocs[0]?.id ?? "");
  const [query, setQuery] = useState("");
  // 自动保存状态（用于头部指示器）与"刚新建的文档"标记（用于自动聚焦标题）
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [lastCreatedKey, setLastCreatedKey] = useState<string | null>(null);
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const activeDocs = useMemo(() => docs.filter((item) => !item.isArchived), [docs]);
  const archivedDocs = useMemo(() => docs.filter((item) => item.isArchived), [docs]);
  const favoriteDocs = useMemo(() => activeDocs.filter((item) => item.isFavorite), [activeDocs]);
  const selectedDoc = activeDocs.find((item) => item.id === selectedDocId) ?? activeDocs[0];
  const filteredDocs = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return activeDocs;
    return activeDocs.filter((item) => `${item.title} ${item.text} ${item.tags.join(" ")}`.toLowerCase().includes(value));
  }, [activeDocs, query]);

  useEffect(() => {
    void (async () => {
      const [docRes, memoryRes] = await Promise.all([
        api<{ documents: ApiDoc[] }>("/api/documents?archived=all"),
        api<{ memories: ApiMemory[] }>("/api/memory"),
      ]);

      if (docRes?.documents?.length) {
        const mapped = docRes.documents.map(fromApiDoc);
        setDocs(mapped);
        setSelectedDocId(mapped[0].id);
      }
      if (memoryRes?.memories) setMemories(memoryRes.memories.map(fromApiMemory));
    })();
  }, []);

  function persistDoc(next: Doc) {
    clearTimeout(saveTimers.current[next.id]);
    saveTimers.current[next.id] = setTimeout(() => {
      void (async () => {
        const payload = {
          title: next.title,
          icon: next.icon,
          parentId: next.parentId,
          contentHtml: next.html,
          contentText: next.text,
          summary: next.summary,
          tags: next.tags,
          changedBy: "user",
          reason: "autosave",
        };
        const updated = await api(`/api/documents/${next.id}`, { method: "PUT", body: JSON.stringify(payload) });
        if (updated) {
          setSaveState("saved");
          return;
        }
        // 兜底：PUT 失败（如本地残留过期 id → 404）则重建服务器文档，
        // 内容绝不静默丢失。clientKey 稳定，id 替换不会重挂载编辑器。
        console.warn(`[clawnote] autosave PUT failed for ${next.id}, recreating on server`);
        const created = await api<{ document: { id: string } }>("/api/documents", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        if (created?.document?.id) {
          const newId = created.document.id;
          setDocs((items) =>
            items.map((item) => (item.id === next.id ? { ...item, id: newId, clientKey: item.clientKey ?? item.id } : item)),
          );
          setSelectedDocId((cur) => (cur === next.id ? newId : cur));
          setSaveState("saved");
        } else {
          console.error(`[clawnote] autosave fallback POST also failed for ${next.id}; content kept in memory`);
          setSaveState("error");
        }
      })();
    }, 650);
  }

  function updateDoc(patch: Partial<Doc>) {
    if (!selectedDoc) return;
    const next = { ...selectedDoc, ...patch, updatedAt: today() };
    setDocs((items) => items.map((item) => (item.id === next.id ? next : item)));
    setSaveState("saving");
    persistDoc(next);
  }

  // 手动重试保存当前选中文档。saveState === "error" 表示「保存失败」（兜底重建也失败、
  // 此刻并没有自动重试在跑），UI 应据此显示「保存失败 · 重试」而非「正在重试…」，
  // 点击重试调用此函数重新走 persistDoc 流程。
  function retrySave() {
    if (!selectedDoc) return;
    setSaveState("saving");
    persistDoc(selectedDoc);
  }

  async function createDoc(input: CreateDocInput = {}) {
    const title = normalizeTitle(input.title);
    const html = input.html ?? "<p></p>";
    const text = htmlToText(html);
    const siblingCount = docs.filter((doc) => (doc.parentId ?? null) === (input.parentId ?? null)).length;
    const draftId = uid("doc");
    const draft: Doc = {
      id: draftId,
      clientKey: draftId,
      title,
      icon: input.icon ?? "📄",
      parentId: input.parentId ?? null,
      sortIndex: siblingCount,
      coverImage: null,
      html,
      text,
      summary: summarize(text),
      tags: input.tags ?? [],
      isFavorite: false,
      isPublished: false,
      isArchived: false,
      createdAt: today(),
      updatedAt: today(),
    };

    setDocs((items) => [draft, ...items]);
    setSelectedDocId(draft.id);
    setLastCreatedKey(draftId); // clientKey 稳定，id 替换后仍可识别"刚新建"

    const saved = await api<{ document: ApiDoc }>("/api/documents", {
      method: "POST",
      body: JSON.stringify({
        title: draft.title,
        icon: draft.icon,
        parentId: draft.parentId,
        tags: draft.tags,
        contentHtml: draft.html,
        contentText: draft.text,
        summary: draft.summary,
      }),
    });

    if (saved?.document) {
      const mapped = fromApiDoc(saved.document);
      // POST 返回前用户可能已在草稿里继续编辑（打字、插图、画图）。
      // 只接管服务器身份与元数据，内容字段一律以本地为准，避免被初始空文档覆盖。
      setDocs((items) =>
        items.map((item) => {
          if (item.id !== draft.id) return item;
          const merged: Doc = {
            ...mapped,
            clientKey: item.clientKey ?? item.id,
            title: item.title,
            icon: item.icon,
            parentId: item.parentId,
            sortIndex: item.sortIndex,
            html: item.html,
            text: item.text,
            summary: item.summary,
            tags: item.tags,
            isFavorite: item.isFavorite,
          };
          // 本地已被编辑过 → 把本地内容写回服务器（否则服务器仍是初始内容）
          if (item.html !== draft.html || item.title !== draft.title) persistDoc(merged);
          return merged;
        }),
      );
      setSelectedDocId(mapped.id);
    }
  }

  // 归档目标文档（含子树）。不传 id 时归档当前选中文档。
  // 返回被归档的 id 列表，供「撤销」恢复。
  function deleteDoc(targetId?: string): string[] {
    const root = targetId ? docs.find((item) => item.id === targetId) : selectedDoc;
    if (!root) return [];
    const ids = descendantIds(docs, root.id);
    void Promise.all(Array.from(ids).map((id) => api(`/api/documents/${id}`, { method: "DELETE" })));
    setDocs((items) => items.map((item) => ids.has(item.id) ? { ...item, isArchived: true, updatedAt: today() } : item));
    if (ids.has(selectedDocId)) {
      const remaining = activeDocs.filter((item) => !ids.has(item.id));
      setSelectedDocId(remaining[0]?.id ?? "");
    }
    return Array.from(ids);
  }

  function restoreDoc(id: string) {
    setDocs((items) => items.map((item) => item.id === id ? { ...item, isArchived: false, updatedAt: today() } : item));
    setSelectedDocId(id);
    void api(`/api/documents/${id}`, {
      method: "PUT",
      body: JSON.stringify({ isArchived: false, status: "ACTIVE", changedBy: "user", reason: "restore-from-trash" }),
    });
  }

  // 彻底删除（不可恢复）。仅对回收站里的文档使用。
  function purgeDoc(id: string) {
    setDocs((items) => items.filter((item) => item.id !== id));
    void api(`/api/documents/${id}?permanent=true`, { method: "DELETE" });
  }

  function emptyTrash() {
    const ids = docs.filter((item) => item.isArchived).map((item) => item.id);
    setDocs((items) => items.filter((item) => !item.isArchived));
    void Promise.all(ids.map((id) => api(`/api/documents/${id}?permanent=true`, { method: "DELETE" })));
  }

  function toggleFavorite(id: string) {
    const doc = docs.find((item) => item.id === id);
    if (!doc) return;
    const next = { ...doc, isFavorite: !doc.isFavorite, updatedAt: today() };
    setDocs((items) => items.map((item) => item.id === id ? next : item));
    void api(`/api/documents/${id}`, {
      method: "PUT",
      body: JSON.stringify({ isFavorite: next.isFavorite, changedBy: "user", reason: "toggle-favorite" }),
    });
  }

  function moveDoc(id: string, parentId: string | null) {
    if (id === parentId) return;
    const descendants = descendantIds(docs, id);
    if (parentId && descendants.has(parentId)) return;
    const sortIndex = docs.filter((doc) => (doc.parentId ?? null) === parentId && doc.id !== id && !doc.isArchived).length;
    setDocs((items) => items.map((item) => item.id === id ? { ...item, parentId, sortIndex, updatedAt: today() } : item));
    void api(`/api/pages/${id}/move`, {
      method: "POST",
      body: JSON.stringify({ parentId, sortIndex }),
    });
  }

  async function duplicateDoc(id: string) {
    const source = docs.find((item) => item.id === id);
    if (!source) return;
    await createDoc({
      parentId: source.parentId,
      title: `${source.title} 副本`,
      icon: source.icon,
      html: source.html,
      tags: source.tags,
    });
  }

  async function reloadSelectedDoc() {
    if (!selectedDoc) return;
    const res = await api<{ document: ApiDoc }>(`/api/documents/${selectedDoc.id}`);
    if (!res?.document) return;
    const mapped = fromApiDoc(res.document);
    setDocs((items) => items.map((item) => (item.id === mapped.id ? mapped : item)));
    setSelectedDocId(mapped.id);
  }

  // Re-fetch the full document list (e.g. after the agent creates a doc) without
  // changing the current selection.
  async function reloadDocs() {
    const res = await api<{ documents: ApiDoc[] }>("/api/documents?archived=all");
    if (res?.documents) setDocs(res.documents.map(fromApiDoc));
  }

  function reviewMemory(id: string, status: Memory["status"]) {
    setMemories((items) => items.map((item) => (item.id === id ? { ...item, status } : item)));
    void api(`/api/memory/${id}`, { method: "PUT", body: JSON.stringify({ status: status.toUpperCase() }) });
  }

  return {
    docs,
    activeDocs,
    archivedDocs,
    favoriteDocs,
    memories,
    selectedDoc,
    selectedDocId,
    setSelectedDocId,
    filteredDocs,
    query,
    setQuery,
    updateDoc,
    createDoc,
    deleteDoc,
    restoreDoc,
    toggleFavorite,
    moveDoc,
    duplicateDoc,
    reloadSelectedDoc,
    reloadDocs,
    reviewMemory,
    saveState,
    retrySave,
    lastCreatedKey,
    clearLastCreated: () => setLastCreatedKey(null),
    purgeDoc,
    emptyTrash,
  };
}
