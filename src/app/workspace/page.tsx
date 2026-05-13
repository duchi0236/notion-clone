"use client";

import { useEffect, useState } from "react";
import { NotionEditor } from "@/components/editor/NotionEditor";

type Doc = { id: string; title: string; icon: string; html: string; text: string; summary: string; tags: string[] };

const htmlToText = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const summarize = (text: string) => text ? text.slice(0, 140) : "暂无摘要";

async function api<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers || {}) } });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

const fallback: Doc[] = [
  {
    id: "local-1",
    title: "OpenClaw workspace",
    icon: "🧠",
    html: "<h1>OpenClaw workspace</h1><p>Use this page as your personal document and knowledge workspace.</p>",
    text: "OpenClaw workspace",
    summary: "Personal document and knowledge workspace.",
    tags: ["OpenClaw"],
  },
];

export default function WorkspacePage() {
  const [docs, setDocs] = useState<Doc[]>(fallback);
  const [selected, setSelected] = useState(fallback[0].id);
  const doc = docs.find((item) => item.id === selected) || docs[0];

  useEffect(() => {
    void (async () => {
      const res = await api<{ documents: any[] }>("/api/documents");
      if (!res?.documents?.length) return;
      const mapped = res.documents.map((item) => {
        const html = item.contentHtml || "<h1>Untitled</h1><p></p>";
        const text = item.contentText || htmlToText(html);
        return {
          id: item.id,
          title: item.title || "Untitled",
          icon: item.icon || "📄",
          html,
          text,
          summary: item.summary || summarize(text),
          tags: item.tags || [],
        };
      });
      setDocs(mapped);
      setSelected(mapped[0].id);
    })();
  }, []);

  function updateDoc(patch: Partial<Doc>) {
    if (!doc) return;
    const next = { ...doc, ...patch };
    setDocs((items) => items.map((item) => (item.id === doc.id ? next : item)));
    void api(`/api/documents/${doc.id}`, {
      method: "PUT",
      body: JSON.stringify({
        title: next.title,
        icon: next.icon,
        contentHtml: next.html,
        contentText: next.text,
        summary: next.summary,
        tags: next.tags,
      }),
    });
  }

  async function createDoc() {
    const html = "<h1>Untitled</h1><p>Start writing...</p>";
    const res = await api<{ document: any }>("/api/documents", {
      method: "POST",
      body: JSON.stringify({ title: "Untitled", icon: "📄", contentHtml: html, contentText: htmlToText(html), tags: [] }),
    });
    const item = res?.document;
    const created: Doc = item
      ? { id: item.id, title: item.title, icon: item.icon || "📄", html: item.contentHtml, text: item.contentText, summary: item.summary || "", tags: item.tags || [] }
      : { id: crypto.randomUUID(), title: "Untitled", icon: "📄", html, text: htmlToText(html), summary: "", tags: [] };
    setDocs((items) => [created, ...items]);
    setSelected(created.id);
  }

  function runAi(command: "summary" | "memory" | "tasks" | "search") {
    if (!doc) return;
    if (command === "summary") updateDoc({ summary: summarize(doc.text) });
    if (command === "memory") void api("/api/memory", { method: "POST", body: JSON.stringify({ content: summarize(doc.text), sourceType: doc.title, tags: doc.tags, status: "PENDING" }) });
    if (command === "tasks") void api("/api/collections/tasks", { method: "POST", body: JSON.stringify({ name: doc.title, status: "未开始", priority: "中", progress: 0 }) });
  }

  return (
    <div className="grid min-h-screen grid-cols-[280px_minmax(0,1fr)_320px] bg-slate-50 text-slate-900">
      <aside className="border-r bg-white p-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="font-bold">ClawNote</h1>
            <p className="text-xs text-slate-500">Document workspace</p>
          </div>
          <button onClick={createDoc} className="rounded-xl bg-violet-600 px-3 py-2 text-sm text-white">New</button>
        </div>
        <div className="space-y-1">
          {docs.map((item) => (
            <button key={item.id} onClick={() => setSelected(item.id)} className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm ${selected === item.id ? "bg-violet-50 text-violet-700" : "hover:bg-slate-100"}`}>
              <span>{item.icon}</span><span className="truncate">{item.title}</span>
            </button>
          ))}
        </div>
      </aside>
      <main className="bg-white p-8">
        {doc && (
          <div className="mx-auto max-w-5xl">
            <div className="mb-6 text-6xl">{doc.icon}</div>
            <input value={doc.title} onChange={(event) => updateDoc({ title: event.target.value })} className="mb-6 w-full bg-transparent text-4xl font-bold outline-none" />
            <NotionEditor
              key={doc.id}
              content={doc.html}
              onChange={(html) => updateDoc({ html, text: htmlToText(html), summary: summarize(htmlToText(html)) })}
              onTextChange={(plain) => updateDoc({ text: plain, summary: summarize(plain) })}
              onAiCommand={runAi}
            />
          </div>
        )}
      </main>
      <aside className="border-l bg-white p-4">
        <h2 className="font-bold">Claw AI</h2>
        <p className="mt-2 text-sm text-slate-500">Current document context</p>
        <div className="mt-4 rounded-2xl bg-violet-50 p-4">
          <b>{doc?.title}</b>
          <p className="mt-2 text-xs text-slate-600">{doc?.summary}</p>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button onClick={() => runAi("summary")} className="rounded-xl border px-3 py-2 text-sm">Summary</button>
          <button onClick={() => runAi("memory")} className="rounded-xl border px-3 py-2 text-sm">Memory</button>
          <button onClick={() => runAi("tasks")} className="rounded-xl border px-3 py-2 text-sm">Task</button>
          <button onClick={() => runAi("search")} className="rounded-xl border px-3 py-2 text-sm">Search</button>
        </div>
      </aside>
    </div>
  );
}
