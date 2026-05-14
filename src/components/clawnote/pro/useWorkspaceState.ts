"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Doc, InboxItem, Memory, Task, Template } from "./types";
import { api, htmlToText, summarize, today, uid } from "./api";
import { seedDocs, seedInbox, seedMemories, seedTasks } from "./seeds";

type ApiDoc = { id: string; title?: string; icon?: string; contentHtml?: string; contentText?: string; summary?: string; tags?: string[]; isFavorite?: boolean };
type ApiTaskRow = { id: string; data?: Partial<Task> };

const seedTemplates: Template[] = [
  { id: "tpl1", title: "会议纪要", icon: "📋", desc: "会议目标、讨论要点、行动项", tags: ["会议"], html: "<h1>会议纪要</h1><h2>会议目标</h2><p></p><h2>讨论要点</h2><ul><li></li></ul><h2>行动项</h2><ul><li>[ ] </li></ul>" },
  { id: "tpl2", title: "项目计划", icon: "🚀", desc: "目标、里程碑、风险、任务", tags: ["项目"], html: "<h1>项目计划</h1><h2>目标</h2><p></p><h2>里程碑</h2><ul><li></li></ul><h2>风险</h2><p></p>" },
  { id: "tpl3", title: "SOP 模板", icon: "🧭", desc: "将重复流程沉淀为标准方法", tags: ["SOP"], html: "<h1>SOP</h1><h2>适用场景</h2><p></p><h2>步骤</h2><ol><li></li></ol>" },
];

function fromApiDoc(doc: ApiDoc): Doc {
  const html = doc.contentHtml ?? "<h1>Untitled</h1><p></p>";
  const text = doc.contentText ?? htmlToText(html);
  return { id: doc.id, title: doc.title ?? "Untitled", icon: doc.icon ?? "📄", html, text, summary: doc.summary ?? summarize(text), tags: doc.tags ?? [] };
}

function fromApiTask(row: ApiTaskRow): Task {
  const data = row.data ?? {};
  return {
    id: row.id,
    name: data.name ?? "新任务",
    owner: data.owner ?? "Me",
    status: data.status ?? "未开始",
    priority: data.priority ?? "中",
    progress: Number(data.progress ?? 0),
    dueDate: data.dueDate ?? today(),
  };
}

export function useWorkspaceState() {
  const [docs, setDocs] = useState<Doc[]>(seedDocs);
  const [tasks, setTasks] = useState<Task[]>(seedTasks);
  const [inbox, setInbox] = useState<InboxItem[]>(seedInbox);
  const [memories, setMemories] = useState<Memory[]>(seedMemories);
  const [templates, setTemplates] = useState<Template[]>(seedTemplates);
  const [selectedDocId, setSelectedDocId] = useState(seedDocs[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [aiLog, setAiLog] = useState<string[]>(["已连接 ClawNote 工作台，可总结、提取任务、写入 Memory。"]);
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const selectedDoc = docs.find((item) => item.id === selectedDocId) ?? docs[0];
  const filteredDocs = useMemo(() => docs.filter((item) => `${item.title} ${item.text} ${item.tags.join(" ")}`.toLowerCase().includes(query.toLowerCase())), [docs, query]);

  useEffect(() => {
    void (async () => {
      const [docRes, taskRes, inboxRes, memoryRes, templateRes] = await Promise.all([
        api<{ documents: ApiDoc[] }>("/api/documents"),
        api<{ rows: ApiTaskRow[] }>("/api/collections/tasks"),
        api<{ items: InboxItem[] }>("/api/inbox"),
        api<{ memories: Array<{ id: string; content: string; status: string; confidence: number; tags: string[] }> }>("/api/memory"),
        api<{ templates: Array<{ id: string; title: string; icon: string; description?: string; contentHtml: string; tags: string[] }> }>("/api/templates"),
      ]);
      if (docRes?.documents?.length) {
        const mapped = docRes.documents.map(fromApiDoc);
        setDocs(mapped);
        setSelectedDocId(mapped[0].id);
      }
      if (taskRes?.rows?.length) setTasks(taskRes.rows.map(fromApiTask));
      if (inboxRes?.items) setInbox(inboxRes.items.map((item) => ({ id: item.id, source: item.source, title: item.title, content: item.content })));
      if (memoryRes?.memories) setMemories(memoryRes.memories.map((item) => ({ id: item.id, content: item.content, status: item.status.toLowerCase() as Memory["status"], confidence: item.confidence, tags: item.tags ?? [] })));
      if (templateRes?.templates) setTemplates(templateRes.templates.map((item) => ({ id: item.id, title: item.title, icon: item.icon, desc: item.description ?? "", html: item.contentHtml, tags: item.tags ?? [] })));
    })();
  }, []);

  function persistDoc(next: Doc) {
    clearTimeout(saveTimers.current[next.id]);
    saveTimers.current[next.id] = setTimeout(() => {
      void api(`/api/documents/${next.id}`, { method: "PUT", body: JSON.stringify({ title: next.title, icon: next.icon, contentHtml: next.html, contentText: next.text, summary: next.summary, tags: next.tags }) });
    }, 650);
  }

  function updateDoc(patch: Partial<Doc>) {
    if (!selectedDoc) return;
    const next = { ...selectedDoc, ...patch };
    setDocs((items) => items.map((item) => item.id === next.id ? next : item));
    persistDoc(next);
  }

  async function createDoc(template?: Template) {
    const html = template?.html ?? "<h1>Untitled</h1><p>开始写作...</p>";
    const text = htmlToText(html);
    const draft: Doc = { id: uid("doc"), title: template?.title ?? "Untitled", icon: template?.icon ?? "📄", html, text, summary: summarize(text), tags: template?.tags ?? [] };
    setDocs((items) => [draft, ...items]);
    setSelectedDocId(draft.id);
    const saved = await api<{ document: ApiDoc }>("/api/documents", { method: "POST", body: JSON.stringify({ title: draft.title, icon: draft.icon, tags: draft.tags, contentHtml: draft.html, contentText: draft.text, summary: draft.summary }) });
    if (saved?.document) {
      const mapped = fromApiDoc(saved.document);
      setDocs((items) => items.map((item) => item.id === draft.id ? mapped : item));
      setSelectedDocId(mapped.id);
    }
  }

  function deleteDoc() {
    if (!selectedDoc) return;
    void api(`/api/documents/${selectedDoc.id}`, { method: "DELETE" });
    setDocs((items) => items.filter((item) => item.id !== selectedDoc.id));
  }

  async function createTask(name = "新任务") {
    const draft: Task = { id: uid("task"), name, owner: "Me", status: "未开始", priority: "中", progress: 0, dueDate: today() };
    setTasks((items) => [...items, draft]);
    const saved = await api<{ row: ApiTaskRow }>("/api/collections/tasks", { method: "POST", body: JSON.stringify(draft) });
    if (saved?.row) setTasks((items) => items.map((item) => item.id === draft.id ? fromApiTask(saved.row) : item));
  }

  function updateTask(id: string, patch: Partial<Task>) {
    setTasks((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item));
    void api(`/api/collections/tasks/${id}`, { method: "PUT", body: JSON.stringify(patch) });
  }

  function deleteTask(id: string) {
    setTasks((items) => items.filter((item) => item.id !== id));
    void api(`/api/collections/tasks/${id}`, { method: "DELETE" });
  }

  async function createMemory(content: string, tags: string[] = []) {
    const draft: Memory = { id: uid("memory"), content, status: "pending", confidence: 0.92, tags };
    setMemories((items) => [draft, ...items]);
    const saved = await api<{ memory: Memory }>("/api/memory", { method: "POST", body: JSON.stringify({ content, tags, confidence: 0.92, status: "PENDING" }) });
    if (saved?.memory) setMemories((items) => items.map((item) => item.id === draft.id ? { ...saved.memory, status: String(saved.memory.status).toLowerCase() as Memory["status"] } : item));
  }

  function reviewMemory(id: string, status: Memory["status"]) {
    setMemories((items) => items.map((item) => item.id === id ? { ...item, status } : item));
    void api(`/api/memory/${id}`, { method: "PUT", body: JSON.stringify({ status: status.toUpperCase() }) });
  }

  async function askAi(mode: "summary" | "task" | "memory" | "search") {
    if (!selectedDoc) return;
    if (mode === "summary") {
      const result = await api<{ summary: string }>("/api/ai/summarize", { method: "POST", body: JSON.stringify({ html: selectedDoc.html, text: selectedDoc.text }) });
      const value = result?.summary ?? summarize(selectedDoc.text);
      updateDoc({ summary: value });
      setAiLog((items) => [`已总结《${selectedDoc.title}》：${value}`, ...items]);
    }
    if (mode === "task") {
      const result = await api<{ tasks: Array<{ name: string }> }>("/api/ai/extract-tasks", { method: "POST", body: JSON.stringify({ text: selectedDoc.text, html: selectedDoc.html }) });
      await createTask(result?.tasks?.[0]?.name ?? selectedDoc.title);
      setAiLog((items) => ["已从当前文档提取任务并加入项目表格。", ...items]);
    }
    if (mode === "memory") {
      await createMemory(summarize(selectedDoc.text), selectedDoc.tags);
      setAiLog((items) => ["已写入待审核 Memory。", ...items]);
    }
    if (mode === "search") {
      const result = await api<{ results: Array<{ document: { title: string } }> }>("/api/search/semantic", { method: "POST", body: JSON.stringify({ query: selectedDoc.title, limit: 5 }) });
      const related = result?.results?.map((item) => item.document.title).join("、") || "暂无";
      setAiLog((items) => [`相关文档：${related}`, ...items]);
    }
  }

  return { docs, tasks, inbox, memories, templates, selectedDoc, selectedDocId, setSelectedDocId, filteredDocs, query, setQuery, aiLog, updateDoc, createDoc, deleteDoc, createTask, updateTask, deleteTask, createMemory, reviewMemory, askAi };
}
