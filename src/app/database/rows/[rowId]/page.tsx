"use client";

import Link from "next/link";
import { ArrowLeft, FileText, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

type RowDetail = {
  id: string;
  data: Record<string, unknown>;
  documentId?: string | null;
  collection?: {
    id: string;
    name: string;
    schema: Array<{ id: string; name: string; type: string; options?: string[] }>;
  };
  document?: {
    id: string;
    title: string;
  } | null;
};

async function api<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers || {}) } });
    if (!res.ok) return null;
    return await res.json() as T;
  } catch {
    return null;
  }
}

export default function RowDetailPage({ params }: { params: { rowId: string } }) {
  const [row, setRow] = useState<RowDetail | null>(null);
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [message, setMessage] = useState("");

  async function load() {
    const data = await api<{ row: RowDetail }>(`/api/collection-rows/${params.rowId}`);
    if (data?.row) {
      setRow(data.row);
      setDraft(data.row.data ?? {});
    }
  }

  useEffect(() => {
    void load();
  }, [params.rowId]);

  async function save() {
    if (!row) return;
    setMessage("");
    const data = await api<{ row: RowDetail }>(`/api/collection-rows/${row.id}`, {
      method: "PUT",
      body: JSON.stringify({ data: draft }),
    });
    if (data?.row) {
      setRow(data.row);
      setMessage("已保存");
    }
  }

  async function createLinkedDocument() {
    if (!row) return;
    const title = String(draft.name ?? "未命名记录");
    const res = await api<{ document: { id: string; title: string } }>("/api/documents", {
      method: "POST",
      body: JSON.stringify({ title, icon: "📄", contentHtml: `<h1>${title}</h1><p>由数据库记录创建。</p>`, contentText: title, tags: [row.collection?.name ?? "Database"] }),
    });
    if (!res?.document) return;
    const updated = await api<{ row: RowDetail }>(`/api/collection-rows/${row.id}`, {
      method: "PUT",
      body: JSON.stringify({ documentId: res.document.id, data: draft }),
    });
    if (updated?.row) {
      setRow(updated.row);
      setMessage("已创建关联页面");
    }
  }

  async function remove() {
    if (!row) return;
    if (!confirm("确认删除这条记录？")) return;
    await fetch(`/api/collection-rows/${row.id}`, { method: "DELETE" });
    location.href = "/database";
  }

  if (!row) return <main className="p-10 text-slate-500">加载中...</main>;

  return (
    <main className="min-h-screen bg-[#f7f7fb] p-8 text-slate-900">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Link href="/database" className="mb-4 inline-flex items-center text-sm text-slate-500 hover:text-blue-700"><ArrowLeft className="mr-1 h-4 w-4" />返回数据库</Link>
            <h1 className="text-3xl font-bold">{String(draft.name ?? "未命名记录")}</h1>
            <p className="mt-1 text-sm text-slate-500">{row.collection?.name ?? "数据库记录"}</p>
          </div>
          <div className="flex gap-2">
            {row.documentId ? (
              <Link href={`/clawnote?document=${row.documentId}`} className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm"><FileText className="mr-1 inline h-4 w-4" />打开页面</Link>
            ) : (
              <button onClick={() => void createLinkedDocument()} className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm"><FileText className="mr-1 inline h-4 w-4" />创建页面</button>
            )}
            <button onClick={() => void save()} className="rounded-2xl bg-blue-600 px-4 py-2 text-sm text-white"><Save className="mr-1 inline h-4 w-4" />保存</button>
            <button onClick={() => void remove()} className="rounded-2xl border border-red-200 bg-white px-4 py-2 text-sm text-red-600"><Trash2 className="mr-1 inline h-4 w-4" />删除</button>
          </div>
        </div>

        {message && <div className="mb-4 rounded-2xl bg-blue-50 px-4 py-3 text-sm text-blue-700">{message}</div>}

        <section className="rounded-3xl border border-slate-200 bg-white p-6">
          <h2 className="mb-5 font-bold">属性</h2>
          <div className="space-y-3">
            {row.collection?.schema?.map((field) => (
              <label key={field.id} className="grid grid-cols-[160px_1fr] items-center gap-4 text-sm">
                <span className="text-slate-500">{field.name}</span>
                {field.type === "select" ? (
                  <select value={String(draft[field.id] ?? "")} onChange={(event) => setDraft((value) => ({ ...value, [field.id]: event.target.value }))} className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-300">
                    <option value="">空</option>
                    {field.options?.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                ) : (
                  <input value={String(draft[field.id] ?? "")} onChange={(event) => setDraft((value) => ({ ...value, [field.id]: event.target.value }))} className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-300" />
                )}
              </label>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
