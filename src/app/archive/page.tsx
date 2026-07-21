"use client";

import Link from "next/link";
import { ArchiveRestore, ArrowLeft, FileText, RefreshCw, Trash2 } from "lucide-react";
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

  async function purge(id: string) {
    if (!confirm("确认永久删除该文档？此操作不可恢复。")) return;
    setMessage("");
    const res = await fetch(`/api/documents/${id}/purge`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(data.error ?? "永久删除失败");
      return;
    }
    setMessage("已永久删除");
    await load();
  }

  return (
    <main className="claw-standalone px-4 sm:px-6">
      <div className="claw-page-wrap">
        <div className="claw-page-top">
          <div>
            <p className="claw-page-kicker">Archive</p>
            <h1 className="claw-page-title">归档 / 回收站</h1>
            <p className="claw-page-desc">查看已删除或归档的文档，并恢复到文档树。危险操作保持低频、清晰和可确认。</p>
          </div>
          <div className="claw-page-actions">
            <button onClick={load} className="claw-ghost-button">
              <RefreshCw className="h-4 w-4" />刷新
            </button>
            <Link href="/clawnote" className="claw-ghost-button"><ArrowLeft className="h-4 w-4" />返回文档</Link>
          </div>
        </div>

        {message && <div className="claw-status mb-4 px-4 py-3 text-sm">{message}</div>}

        <div className="claw-table overflow-x-auto">
          <div className="min-w-[760px]">
            <div className="claw-table-head grid-cols-[minmax(0,1fr)_180px_220px]">
              <span>文档</span><span>更新时间</span><span>操作</span>
            </div>
            {loading && <div className="p-8 text-center text-sm text-slate-500">加载中...</div>}
            {!loading && documents.length === 0 && <div className="p-8 text-center text-sm text-slate-500">暂无归档文档</div>}
            {documents.map((doc) => (
              <div key={doc.id} className="claw-table-row grid-cols-[minmax(0,1fr)_180px_220px]">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 font-medium"><FileText className="h-4 w-4 text-blue-600" />{doc.icon ?? "📄"}<span className="truncate">{doc.title}</span></div>
                  <p className="mt-1 line-clamp-1 text-xs text-slate-500">{doc.summary ?? "暂无摘要"}</p>
                </div>
                <span className="text-slate-500">{new Date(doc.updatedAt).toLocaleString()}</span>
                <div className="flex gap-2">
                  <button onClick={() => restore(doc.id)} className="claw-ghost-button min-h-0 px-3 py-2">
                    <ArchiveRestore className="h-4 w-4" />恢复
                  </button>
                  <button onClick={() => purge(doc.id)} className="claw-danger-button min-h-0 px-3 py-2">
                    <Trash2 className="h-4 w-4" />删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
