"use client";

import Link from "next/link";
import { Archive, CheckCircle2, RefreshCw, Sparkles, XCircle } from "lucide-react";
import { useEffect, useState } from "react";

type Memory = {
  id: string;
  content: string;
  summary?: string | null;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "ARCHIVED";
  confidence: number;
  tags: string[];
  sourceType?: string | null;
  createdAt: string;
};

export default function MemoryPage() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [filter, setFilter] = useState<Memory["status"] | "ALL">("PENDING");
  const [message, setMessage] = useState("");

  async function load() {
    const res = await fetch("/api/memory");
    const data = await res.json().catch(() => ({ memories: [] }));
    setMemories(data.memories ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function update(id: string, status: Memory["status"]) {
    setMessage("");
    const res = await fetch(`/api/memory/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(data.error ?? "操作失败");
      return;
    }
    setMessage("已更新");
    await load();
  }

  const visible = memories.filter((item) => filter === "ALL" || item.status === filter);

  return (
    <main className="min-h-screen bg-[#f7f7fb] p-8 text-slate-900">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-bold"><Sparkles className="h-7 w-7" />Memory 审核</h1>
            <p className="mt-1 text-sm text-slate-500">AI 提取的长期记忆默认进入待审核状态，只有确认后才进入长期知识层。</p>
          </div>
          <div className="flex gap-2">
            <button onClick={load} className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm"><RefreshCw className="mr-1 inline h-4 w-4" />刷新</button>
            <Link href="/clawnote" className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm">返回文档</Link>
          </div>
        </div>

        <div className="mb-5 flex flex-wrap gap-2">
          {(["PENDING", "ACCEPTED", "REJECTED", "ARCHIVED", "ALL"] as const).map((item) => (
            <button key={item} onClick={() => setFilter(item)} className={`rounded-2xl px-4 py-2 text-sm ${filter === item ? "bg-violet-600 text-white" : "border border-slate-200 bg-white text-slate-600"}`}>{item}</button>
          ))}
        </div>

        {message && <div className="mb-4 rounded-2xl bg-violet-50 px-4 py-3 text-sm text-violet-700">{message}</div>}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {visible.length === 0 && <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 md:col-span-2">暂无 Memory</div>}
          {visible.map((memory) => (
            <section key={memory.id} className="rounded-3xl border border-slate-200 bg-white p-5">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-500">{memory.status}</span>
                  {memory.sourceType && <span className="ml-2 rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-700">{memory.sourceType}</span>}
                </div>
                <span className="text-xs text-slate-400">置信度 {Math.round(memory.confidence * 100)}%</span>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-7 text-slate-800">{memory.content}</p>
              <div className="mt-3 flex flex-wrap gap-1">
                {memory.tags.map((tag) => <span key={tag} className="rounded-md bg-violet-50 px-2 py-1 text-xs text-violet-700">#{tag}</span>)}
              </div>
              <div className="mt-5 flex gap-2">
                <button onClick={() => update(memory.id, "ACCEPTED")} className="rounded-xl bg-emerald-600 px-3 py-2 text-sm text-white"><CheckCircle2 className="mr-1 inline h-4 w-4" />接受</button>
                <button onClick={() => update(memory.id, "REJECTED")} className="rounded-xl bg-red-600 px-3 py-2 text-sm text-white"><XCircle className="mr-1 inline h-4 w-4" />拒绝</button>
                <button onClick={() => update(memory.id, "ARCHIVED")} className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600"><Archive className="mr-1 inline h-4 w-4" />归档</button>
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
