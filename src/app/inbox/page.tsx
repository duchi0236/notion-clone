"use client";

import Link from "next/link";
import { Archive, FilePlus2, Inbox, RefreshCw, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

type InboxItem = {
  id: string;
  source: string;
  title: string;
  content: string;
  status: string;
  createdAt: string;
};

export default function InboxPage() {
  const [items, setItems] = useState<InboxItem[]>([]);
  const [message, setMessage] = useState("");

  async function load() {
    const res = await fetch("/api/inbox");
    const data = await res.json().catch(() => ({ items: [] }));
    setItems(data.items ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function createDocument(item: InboxItem) {
    const res = await fetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: item.title, icon: "📥", contentHtml: `<h1>${item.title}</h1><p>${item.content}</p>`, contentText: item.content, tags: [item.source] }),
    });
    if (res.ok) setMessage("已转为文档");
  }

  async function createMemory(item: InboxItem) {
    const res = await fetch("/api/memory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: item.content, sourceType: item.source, sourceId: item.id, tags: [item.source], status: "PENDING" }),
    });
    if (res.ok) setMessage("已写入待审核 Memory");
  }

  async function archive(item: InboxItem) {
    await fetch(`/api/inbox/${item.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "ARCHIVED" }),
    });
    await load();
  }

  return (
    <main className="min-h-screen bg-[#f7f7fb] p-8 text-slate-900">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-bold"><Inbox className="h-7 w-7" />Inbox 收集箱</h1>
            <p className="mt-1 text-sm text-slate-500">外部输入先进入 Inbox，再整理成文档、任务或 Memory。</p>
          </div>
          <div className="flex gap-2">
            <button onClick={load} className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm"><RefreshCw className="mr-1 inline h-4 w-4" />刷新</button>
            <Link href="/clawnote" className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm">返回文档</Link>
          </div>
        </div>

        {message && <div className="mb-4 rounded-2xl bg-blue-50 px-4 py-3 text-sm text-blue-700">{message}</div>}

        <div className="grid gap-4">
          {items.length === 0 && <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">暂无 Inbox 内容</div>}
          {items.map((item) => (
            <section key={item.id} className="rounded-3xl border border-slate-200 bg-white p-5">
              <div className="mb-2 flex items-center justify-between">
                <div><h2 className="font-bold">{item.title}</h2><p className="mt-1 text-xs text-slate-500">{item.source} · {item.status} · {new Date(item.createdAt).toLocaleString()}</p></div>
                <div className="flex gap-2">
                  <button onClick={() => createDocument(item)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm"><FilePlus2 className="mr-1 inline h-4 w-4" />转文档</button>
                  <button onClick={() => createMemory(item)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm"><Sparkles className="mr-1 inline h-4 w-4" />转 Memory</button>
                  <button onClick={() => archive(item)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-500"><Archive className="mr-1 inline h-4 w-4" />归档</button>
                </div>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{item.content}</p>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
