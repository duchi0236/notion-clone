"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, FilePlus2, Merge, RefreshCw, XCircle } from "lucide-react";

type Draft = {
  id: string;
  title: string;
  targetType: string;
  targetId?: string;
  contentHtml: string;
  contentText: string;
  status: "pending" | "accepted" | "rejected" | "merged";
  generatedBy: string;
  sourceIds: string[];
  createdAt: string;
};

export default function AIDraftsPage() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [message, setMessage] = useState("");
  const selected = drafts.find((item) => item.id === selectedId) ?? drafts[0];

  async function load() {
    const res = await fetch("/api/ai-drafts");
    const data = await res.json().catch(() => ({ drafts: [] }));
    const items = data.drafts ?? [];
    setDrafts(items);
    if (!selectedId && items[0]?.id) setSelectedId(items[0].id);
  }

  useEffect(() => {
    void load();
  }, []);

  async function setStatus(id: string, status: Draft["status"]) {
    setMessage("");
    const res = await fetch(`/api/ai-drafts/${id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setMessage(res.ok ? `已标记为 ${status}` : "操作失败");
    await load();
  }

  async function merge(id: string, mode: "new-document" | "replace") {
    setMessage("");
    const res = await fetch(`/api/ai-drafts/${id}/merge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(data.error ?? "合并失败");
      return;
    }
    setMessage(mode === "replace" ? "已合并到目标文档" : "已另存为新文档");
    await load();
  }

  return (
    <main className="min-h-screen bg-[#f7f7fb] p-8 text-slate-900">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">AI 草稿箱</h1>
            <p className="mt-1 text-sm text-slate-500">AI 生成内容不会直接污染正式文档，先进入草稿/建议，由用户审核后再合并。</p>
          </div>
          <div className="flex gap-2">
            <button onClick={load} className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm hover:border-violet-300"><RefreshCw className="mr-1 inline h-4 w-4" />刷新</button>
            <Link href="/clawnote" className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm hover:border-violet-300">返回文档</Link>
          </div>
        </div>

        {message && <div className="mb-4 rounded-2xl bg-violet-50 px-4 py-3 text-sm text-violet-700">{message}</div>}

        <div className="grid grid-cols-[380px_minmax(0,1fr)] gap-6">
          <aside className="rounded-3xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-bold">草稿列表</h2>
              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-500">{drafts.length}</span>
            </div>
            <div className="space-y-2">
              {drafts.length === 0 && <p className="p-6 text-center text-sm text-slate-500">暂无 AI 草稿</p>}
              {drafts.map((draft) => (
                <button
                  key={draft.id}
                  onClick={() => setSelectedId(draft.id)}
                  className={`w-full rounded-2xl border p-4 text-left text-sm ${selected?.id === draft.id ? "border-violet-300 bg-violet-50" : "border-slate-100 bg-white hover:bg-slate-50"}`}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <b className="truncate">{draft.title}</b>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{draft.status}</span>
                  </div>
                  <p className="line-clamp-2 text-slate-500">{draft.contentText}</p>
                  <div className="mt-2 text-xs text-slate-400">{draft.generatedBy} · {new Date(draft.createdAt).toLocaleString()}</div>
                </button>
              ))}
            </div>
          </aside>

          <section className="rounded-3xl border border-slate-200 bg-white p-6">
            {selected ? (
              <>
                <div className="mb-5 flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">{selected.title}</h2>
                    <p className="mt-1 text-sm text-slate-500">目标：{selected.targetType} · 状态：{selected.status}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setStatus(selected.id, "accepted")} className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm text-white"><CheckCircle2 className="mr-1 inline h-4 w-4" />接受</button>
                    <button onClick={() => setStatus(selected.id, "rejected")} className="rounded-2xl bg-red-600 px-4 py-2 text-sm text-white"><XCircle className="mr-1 inline h-4 w-4" />拒绝</button>
                    <button onClick={() => merge(selected.id, "new-document")} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm"><FilePlus2 className="mr-1 inline h-4 w-4" />另存新文档</button>
                    <button onClick={() => merge(selected.id, "replace")} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm"><Merge className="mr-1 inline h-4 w-4" />合并目标</button>
                  </div>
                </div>
                <div className="prose prose-slate max-w-none rounded-2xl bg-slate-50 p-6" dangerouslySetInnerHTML={{ __html: selected.contentHtml }} />
              </>
            ) : (
              <div className="p-20 text-center text-slate-500">选择一个 AI 草稿进行审核</div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
