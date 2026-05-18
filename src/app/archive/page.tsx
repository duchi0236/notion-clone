"use client";

import Link from "next/link";
import { ArchiveRestore, FileText, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

type ArchivedDocument = {
  id: string;
  title: string;
  icon?: string | null;
  summary?: string | null;
  updatedAt: string;
};

export default function ArchivePage() {
  const [documents, setDocuments] = useState<ArchivedDocument[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/documents/archive");
    const data = await res.json().catch(() => ({ documents: [] }));
    setDocuments(data.documents ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function restore(id: string) {
    setMessage("");
    const res = await fetch(`/api/documents/${id}/restore`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(data.error ?? "恢复失败");
      return;
    }
    setMessage("已恢复文档");
    await load();
  }

  return (
    <main className="min-h-screen bg-[#f7f7fb] p-8 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">归档 / 回收站</h1>
            <p className="mt-1 text-sm text-slate-500">查看已删除或归档的文档，并恢复到文档树。</p>
          </div>
          <div className="flex gap-2">
            <button onClick={load} className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm hover:border-blue-300">
              <RefreshCw className="mr-1 inline h-4 w-4" />刷新
            </button>
            <Link href="/clawnote" className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm hover:border-blue-300">返回文档</Link>
          </div>
        </div>

        {message && <div className="mb-4 rounded-2xl bg-blue-50 px-4 py-3 text-sm text-blue-700">{message}</div>}

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
          <div className="grid grid-cols-[1fr_180px_120px] border-b border-slate-100 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-500">
            <span>文档</span><span>更新时间</span><span>操作</span>
          </div>
          {loading && <div className="p-8 text-center text-sm text-slate-500">加载中...</div>}
          {!loading && documents.length === 0 && <div className="p-8 text-center text-sm text-slate-500">暂无归档文档</div>}
          {documents.map((doc) => (
            <div key={doc.id} className="grid grid-cols-[1fr_180px_120px] items-center border-b border-slate-100 px-4 py-3 text-sm last:border-0">
              <div className="min-w-0">
                <div className="flex items-center gap-2 font-medium"><FileText className="h-4 w-4 text-blue-500" />{doc.icon ?? "📄"}<span className="truncate">{doc.title}</span></div>
                <p className="mt-1 line-clamp-1 text-xs text-slate-500">{doc.summary ?? "暂无摘要"}</p>
              </div>
              <span className="text-slate-500">{new Date(doc.updatedAt).toLocaleString()}</span>
              <button onClick={() => restore(doc.id)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-blue-700 hover:border-blue-300">
                <ArchiveRestore className="mr-1 inline h-4 w-4" />恢复
              </button>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
