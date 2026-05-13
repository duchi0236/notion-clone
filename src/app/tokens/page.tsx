"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { Copy, KeyRound, Plus, Trash2 } from "lucide-react";

type AccessRecord = {
  id: string;
  name: string;
  scopes: string[];
  createdAt: string;
  lastUsedAt?: string | null;
};

export default function TokensPage() {
  const [records, setRecords] = useState<AccessRecord[]>([]);
  const [name, setName] = useState("OpenClaw Access Key");
  const [newValue, setNewValue] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    const res = await fetch("/api/tokens");
    const data = await res.json().catch(() => ({ tokens: [] }));
    setRecords(data.tokens ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function create(event: FormEvent) {
    event.preventDefault();
    setNewValue("");
    setMessage("");
    const res = await fetch("/api/tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(data.error ?? "创建失败");
      return;
    }
    setNewValue(data.token ?? "");
    setMessage("已创建，请立即复制保存。完整值不会再次显示。 ");
    await load();
  }

  async function remove(id: string) {
    await fetch(`/api/tokens/${id}`, { method: "DELETE" });
    await load();
  }

  async function copy(value: string) {
    await navigator.clipboard.writeText(value);
    setMessage("已复制");
  }

  return (
    <main className="min-h-screen bg-[#f7f7fb] p-8 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">访问密钥</h1>
            <p className="mt-1 text-sm text-slate-500">用于 OpenClaw 调用 ClawNote Agent API。</p>
          </div>
          <Link href="/clawnote" className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm hover:border-violet-300">返回工作台</Link>
        </div>

        <form onSubmit={create} className="mb-6 rounded-3xl border border-slate-200 bg-white p-5">
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">名称</span>
            <input value={name} onChange={(event) => setName(event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-violet-400" />
          </label>
          <button className="mt-4 inline-flex items-center rounded-2xl bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700">
            <Plus className="mr-2 h-4 w-4" />创建
          </button>
        </form>

        {message && <div className="mb-4 rounded-2xl bg-violet-50 px-4 py-3 text-sm text-violet-700">{message}</div>}

        {newValue && (
          <div className="mb-6 rounded-3xl border border-amber-200 bg-amber-50 p-5">
            <div className="mb-2 font-semibold text-amber-800">新建值，只显示一次</div>
            <div className="flex items-center gap-2 rounded-2xl bg-white p-3 font-mono text-sm">
              <span className="flex-1 break-all">{newValue}</span>
              <button type="button" onClick={() => copy(newValue)} className="rounded-xl border border-slate-200 p-2"><Copy className="h-4 w-4" /></button>
            </div>
          </div>
        )}

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
          <div className="grid grid-cols-[1fr_1fr_180px_100px] border-b border-slate-100 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-500">
            <span>名称</span><span>权限</span><span>最后使用</span><span>操作</span>
          </div>
          {records.length === 0 && <div className="p-8 text-center text-sm text-slate-500">暂无记录</div>}
          {records.map((record) => (
            <div key={record.id} className="grid grid-cols-[1fr_1fr_180px_100px] items-center border-b border-slate-100 px-4 py-3 text-sm last:border-0">
              <span className="flex items-center gap-2"><KeyRound className="h-4 w-4 text-violet-600" />{record.name}</span>
              <span className="truncate text-slate-500">{record.scopes.join(", ")}</span>
              <span className="text-slate-500">{record.lastUsedAt ? new Date(record.lastUsedAt).toLocaleString() : "未使用"}</span>
              <button type="button" onClick={() => remove(record.id)} className="rounded-xl border border-slate-200 p-2 text-red-500 hover:border-red-300"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
