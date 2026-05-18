"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { DocumentRecord } from "./document-types";
import { api, buildTree, extractToc, htmlToText, mapDocument } from "./document-utils";

const fallbackHtml = "<h1>产品需求文档 PRD</h1><p>这里是文档正文。你可以像语雀或 Notion 一样专注写作。</p><h2>产品概述</h2><p>ClawNote 是一个独立文档管理系统，AI 是可选外挂能力。</p><h2>核心功能</h2><p>文档树、目录、编辑器、版本、评论、文件和知识库索引。</p>";

const fallbackDocs: DocumentRecord[] = [
  {
    id: "local-doc-1",
    title: "产品需求文档 PRD",
    icon: "📄",
    contentHtml: fallbackHtml,
    contentText: htmlToText(fallbackHtml),
    summary: "纯文档模式，专注文章内容。",
    tags: ["PRD"],
    parentId: null,
  },
];

export function useDocumentMode() {
  const [documents, setDocuments] = useState<DocumentRecord[]>(fallbackDocs);
  const [selectedId, setSelectedId] = useState(fallbackDocs[0].id);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [aiMessage, setAiMessage] = useState("");
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const selected = documents.find((item) => item.id === selectedId) ?? documents[0];

  const filteredDocuments = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return documents;
    return documents.filter((doc) => `${doc.title} ${doc.contentText} ${doc.tags.join(" ")}`.toLowerCase().includes(q));
  }, [documents, query]);

  const tree = useMemo(() => buildTree(filteredDocuments), [filteredDocuments]);
  const toc = useMemo(() => extractToc(selected?.contentHtml ?? ""), [selected?.contentHtml]);

  async function reloadAll() {
    const response = await api<{ documents: unknown[] }>("/api/documents");
    if (!response?.documents?.length) return;
    const mapped = response.documents.map(mapDocument);
    setDocuments(mapped);
    const stillExists = mapped.find((item) => item.id === selectedId);
    setSelectedId(stillExists?.id ?? mapped[0].id);
  }

  useEffect(() => {
    void reloadAll();
  }, []);

  async function reloadSelected() {
    if (!selected) return;
    const response = await api<{ document: unknown }>(`/api/documents/${selected.id}`);
    if (response?.document) {
      const mapped = mapDocument(response.document);
      setDocuments((items) => items.map((item) => item.id === mapped.id ? mapped : item));
      setSelectedId(mapped.id);
    }
  }

  function persist(doc: DocumentRecord) {
    clearTimeout(saveTimers.current[doc.id]);
    setSaving(true);
    saveTimers.current[doc.id] = setTimeout(async () => {
      await api(`/api/documents/${doc.id}`, {
        method: "PUT",
        body: JSON.stringify({
          title: doc.title,
          icon: doc.icon,
          parentId: doc.parentId,
          contentHtml: doc.contentHtml,
          contentText: doc.contentText,
          summary: doc.summary,
          tags: doc.tags,
        }),
      });
      setSaving(false);
    }, 600);
  }

  function updateSelected(patch: Partial<DocumentRecord>) {
    if (!selected) return;
    const next = { ...selected, ...patch };
    setDocuments((items) => items.map((item) => item.id === selected.id ? next : item));
    persist(next);
  }

  async function moveDocument(id: string, parentId: string | null, sortIndex?: number) {
    if (id === parentId) return;
    setDocuments((items) => items.map((item) => item.id === id ? { ...item, parentId } : item));
    await api(`/api/documents/${id}/move`, {
      method: "POST",
      body: JSON.stringify({ parentId, sortIndex }),
    });
    await reloadAll();
  }

  async function createDocument(parentId?: string | null) {
    const html = "<h1>Untitled</h1><p>开始写作...</p>";
    const response = await api<{ document: unknown }>("/api/documents", {
      method: "POST",
      body: JSON.stringify({
        title: "Untitled",
        icon: "📄",
        parentId: parentId ?? null,
        contentHtml: html,
        contentText: htmlToText(html),
        tags: [],
      }),
    });
    const doc = response?.document ? mapDocument(response.document) : {
      id: crypto.randomUUID(),
      title: "Untitled",
      icon: "📄",
      parentId: parentId ?? null,
      contentHtml: html,
      contentText: htmlToText(html),
      summary: "",
      tags: [],
    } satisfies DocumentRecord;
    setDocuments((items) => [doc, ...items]);
    setSelectedId(doc.id);
  }

  async function deleteSelected() {
    if (!selected) return;
    await api(`/api/documents/${selected.id}`, { method: "DELETE" });
    setDocuments((items) => items.filter((item) => item.id !== selected.id));
    const next = documents.find((item) => item.id !== selected.id);
    if (next) setSelectedId(next.id);
  }

  async function askAi(mode: "summary" | "task" | "memory" | "search") {
    if (!selected) return;
    setAiMessage("");
    if (mode === "summary") {
      const result = await api<{ summary: string }>("/api/ai/summarize", { method: "POST", body: JSON.stringify({ html: selected.contentHtml, text: selected.contentText }) });
      const summary = result?.summary ?? selected.contentText.slice(0, 160);
      updateSelected({ summary });
      setAiMessage("已生成摘要");
    }
    if (mode === "task") {
      const result = await api<{ tasks: Array<{ name: string; priority?: string }> }>("/api/ai/extract-tasks", { method: "POST", body: JSON.stringify({ html: selected.contentHtml, text: selected.contentText }) });
      const taskName = result?.tasks?.[0]?.name ?? selected.title;
      await api("/api/collections/tasks", { method: "POST", body: JSON.stringify({ name: taskName, status: "未开始", priority: "中", progress: 0 }) });
      setAiMessage("已提取任务");
    }
    if (mode === "memory") {
      await api("/api/memory", { method: "POST", body: JSON.stringify({ content: selected.summary ?? selected.contentText.slice(0, 160), sourceType: "document", sourceId: selected.id, tags: selected.tags, status: "PENDING" }) });
      setAiMessage("已写入待审核 Memory");
    }
    if (mode === "search") {
      const result = await api<{ results: Array<{ citation?: { title?: string }; document?: { title?: string } }> }>("/api/knowledge/search", { method: "POST", body: JSON.stringify({ query: selected.title, limit: 5 }) });
      const names = result?.results?.map((item) => item.citation?.title ?? item.document?.title).filter(Boolean).join("、") || "暂无相关内容";
      setAiMessage(`相关内容：${names}`);
    }
  }

  return { documents, selected, selectedId, setSelectedId, query, setQuery, saving, aiMessage, tree, toc, updateSelected, moveDocument, createDocument, deleteSelected, reloadSelected, reloadAll, askAi };
}
