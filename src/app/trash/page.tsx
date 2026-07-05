"use client";

import { RefreshCcw, RotateCcw, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

type TrashDocument = {
  id: string;
  title: string;
  icon?: string | null;
  updatedAt?: string;
  summary?: string | null;
};

export default function TrashPage() {
  const [documents, setDocuments] = useState<TrashDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/trash/documents");
      const data = await res.json();
      setDocuments(data.documents ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function restore(id: string) {
    setBusyId(id);
    try {
      await fetch(`/api/trash/documents/${id}/restore`, { method: "POST" });
      setDocuments((items) => items.filter((item) => item.id !== id));
    } finally {
      setBusyId(null);
    }
  }

  async function permanentDelete(id: string) {
    const confirmed = window.confirm("永久删除后无法恢复，确认删除？");
    if (!confirmed) return;

    setBusyId(id);
    try {
      await fetch(`/api/trash/documents/${id}/permanent`, { method: "DELETE" });
      setDocuments((items) => items.filter((item) => item.id !== id));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-8 py-8 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">回收站</h1>
            <p className="mt-2 text-sm text-slate-500">误删的文档会暂时保留在这里，可恢复或永久删除。</p>
          </div>

          <button onClick={() => void load()} className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 hover:bg-slate-100">
            <RefreshCcw className="mr-2 inline h-4 w-4" />刷新
          </button>
        </header>

        <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="p-10 text-center text-sm text-slate-400">正在加载回收站...</div>
          ) : documents.length === 0 ? (
            <div className="p-14 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100 text-slate-400">
                <Trash2 className="h-8 w-8" />
              </div>
              <div className="text-lg font-semibold text-slate-700">回收站为空</div>
              <p className="mt-2 text-sm text-slate-400">删除的文档会先进入回收站，而不是直接丢失。</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between gap-4 px-6 py-5 hover:bg-slate-50">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{doc.icon ?? "📄"}</span>
                      <div className="truncate text-sm font-semibold text-slate-900">{doc.title}</div>
                    </div>
                    <div className="mt-2 line-clamp-2 text-sm text-slate-500">{doc.summary || "暂无摘要"}</div>
                    <div className="mt-2 text-xs text-slate-400">
                      删除前最后更新时间：{doc.updatedAt ? new Date(doc.updatedAt).toLocaleString() : "未知"}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button disabled={busyId === doc.id} onClick={() => void restore(doc.id)} className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50">
                      <RotateCcw className="mr-1 inline h-4 w-4" />恢复
                    </button>

                    <button disabled={busyId === doc.id} onClick={() => void permanentDelete(doc.id)} className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-100 disabled:opacity-50">
                      <Trash2 className="mr-1 inline h-4 w-4" />永久删除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
