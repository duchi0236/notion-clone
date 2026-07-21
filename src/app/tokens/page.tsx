"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Copy, KeyRound, Plus, Trash2 } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

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
    <main className="claw-standalone px-4 sm:px-6">
      <div className="claw-page-wrap">
        <div className="claw-page-top">
          <div>
            <p className="claw-page-kicker">Agent access</p>
            <h1 className="claw-page-title">访问密钥</h1>
            <p className="claw-page-desc">用于 OpenClaw 或其他 Agent 调用 ClawNote API。密钥只在创建后显示一次，后续只能撤销重建。</p>
          </div>
          <div className="claw-page-actions">
            <Link href="/clawnote" className="claw-ghost-button"><ArrowLeft className="h-4 w-4" />返回工作台</Link>
          </div>
        </div>

        <form onSubmit={create} className="claw-card mb-6 p-5">
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">名称</span>
            <input value={name} onChange={(event) => setName(event.target.value)} className="claw-input w-full px-4 py-3" />
          </label>
          <button className="claw-primary-button mt-4">
            <Plus className="mr-2 h-4 w-4" />创建
          </button>
        </form>

        {message && <div className="claw-status mb-4 px-4 py-3 text-sm">{message}</div>}

        {newValue && (
          <div className="mb-6 rounded-[18px] border border-amber-200 bg-amber-50 p-5">
            <div className="mb-2 font-semibold text-amber-800">新建值，只显示一次</div>
            <div className="flex items-center gap-2 rounded-[14px] bg-white p-3 font-mono text-sm">
              <span className="flex-1 break-all">{newValue}</span>
              <button type="button" onClick={() => copy(newValue)} className="claw-ghost-button min-h-0 p-2" title="复制密钥"><Copy className="h-4 w-4" /></button>
            </div>
          </div>
        )}

        <div className="claw-table overflow-x-auto">
          <div className="min-w-[760px]">
            <div className="claw-table-head grid-cols-[1fr_1fr_180px_100px]">
              <span>名称</span><span>权限</span><span>最后使用</span><span>操作</span>
            </div>
            {records.length === 0 && <div className="p-8 text-center text-sm text-slate-500">暂无记录</div>}
            {records.map((record) => (
              <div key={record.id} className="claw-table-row grid-cols-[1fr_1fr_180px_100px]">
                <span className="flex min-w-0 items-center gap-2"><KeyRound className="h-4 w-4 shrink-0 text-blue-600" /><span className="truncate">{record.name}</span></span>
                <span className="truncate text-slate-500">{record.scopes.join(", ")}</span>
                <span className="text-slate-500">{record.lastUsedAt ? formatDateTime(record.lastUsedAt) : "未使用"}</span>
                <button type="button" onClick={() => remove(record.id)} className="claw-danger-button min-h-0 p-2" title="删除密钥"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
