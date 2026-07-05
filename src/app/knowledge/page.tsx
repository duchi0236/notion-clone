"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { Database, RefreshCw, Search, Sparkles } from "lucide-react";

type Status = {
  documents: number;
  readableDocuments: number;
  indexed: number;
  stale: number;
  indexCoverage: number;
};

type SearchResult = {
  score: number;
  citation?: { title: string; sourceType: string; sourceId: string };
  chunk?: { text: string; summary?: string };
};

export default function KnowledgePage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadStatus() {
    const res = await fetch("/api/knowledge/status");
    const data = await res.json().catch(() => null);
    setStatus(data);
  }

  useEffect(() => {
    void loadStatus();
  }, []);

  async function syncAll() {
    setLoading(true);
    setMessage("");
    const res = await fetch("/api/knowledge/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    setMessage(res.ok ? `已同步 ${data.synced ?? 0} 个文档` : data.error ?? "同步失败");
    await loadStatus();
  }

  async function search(event: FormEvent) {
    event.preventDefault();
    if (!query.trim()) return;
    const res = await fetch("/api/knowledge/search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query, limit: 10 }) });
    const data = await res.json().catch(() => ({ results: [] }));
    setResults(data.results ?? []);
  }

  return (
    <main className="min-h-screen bg-[#f7f7fb] p-8 text-slate-900">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">知识库索引</h1>
            <p className="mt-1 text-sm text-slate-500">这是文档内容派生出的 AI 检索层，可重建、可关闭，不影响文档独立使用。</p>
          </div>
          <Link href="/clawnote" className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm hover:border-violet-300">返回文档</Link>
        </div>

        <div className="mb-6 grid grid-cols-4 gap-4">
          <Metric title="全部文档" value={status?.documents ?? 0} icon={<Database />} />
          <Metric title="AI 可读" value={status?.readableDocuments ?? 0} icon={<Sparkles />} />
          <Metric title="已索引" value={status?.indexed ?? 0} icon={<Search />} />
          <Metric title="待更新" value={status?.stale ?? 0} icon={<RefreshCw />} />
        </div>

        <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-bold">索引状态</h2>
              <p className="text-sm text-slate-500">覆盖率：{Math.round((status?.indexCoverage ?? 0) * 100)}%</p>
            </div>
            <button onClick={syncAll} disabled={loading} className="rounded-2xl bg-violet-600 px-4 py-2 text-sm text-white disabled:opacity-50">
              {loading ? "同步中..." : "重新索引"}
            </button>
          </div>
          {message && <div className="rounded-2xl bg-violet-50 px-4 py-3 text-sm text-violet-700">{message}</div>}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5">
          <h2 className="mb-4 font-bold">检索测试</h2>
          <form onSubmit={search} className="mb-5 flex gap-3">
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="输入问题或关键词，例如：产品定位" className="min-w-0 flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-violet-400" />
            <button className="rounded-2xl bg-violet-600 px-5 py-3 text-sm text-white">搜索</button>
          </form>
          <div className="space-y-3">
            {results.length === 0 && <p className="text-sm text-slate-500">暂无检索结果</p>}
            {results.map((item, index) => (
              <div key={index} className="rounded-2xl bg-slate-50 p-4 text-sm">
                <div className="mb-1 flex items-center justify-between"><b>{item.citation?.title ?? "Untitled"}</b><span className="text-xs text-slate-500">score {item.score}</span></div>
                <p className="line-clamp-3 text-slate-600">{item.chunk?.summary ?? item.chunk?.text}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function Metric({ title, value, icon }: { title: string; value: number; icon: React.ReactNode }) {
  return <div className="rounded-3xl border border-slate-200 bg-white p-5"><div className="flex justify-between text-sm text-slate-500">{title}<span className="text-violet-600 [&_svg]:h-5 [&_svg]:w-5">{icon}</span></div><div className="mt-3 text-3xl font-bold">{value}</div></div>;
}
