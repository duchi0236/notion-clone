"use client";

import { FormEvent, useEffect, useState } from "react";
import { Clock3, MessageSquare, RotateCcw, Send } from "lucide-react";

type Version = {
  id: string;
  version: number;
  reason?: string | null;
  changedBy: string;
  createdAt: string;
};

type Comment = {
  id: string;
  content: string;
  createdAt: string;
  author?: { name?: string | null; email?: string | null };
};

export function DocumentMetaPanel({ documentId, onRestored }: { documentId: string; onRestored?: () => void }) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [comment, setComment] = useState("");
  const [message, setMessage] = useState("");

  async function loadVersions() {
    const res = await fetch(`/api/documents/${documentId}/versions`);
    const data = await res.json().catch(() => ({ versions: [] }));
    setVersions(data.versions ?? []);
  }

  async function loadComments() {
    const res = await fetch(`/api/documents/${documentId}/comments`);
    const data = await res.json().catch(() => ({ comments: [] }));
    setComments(data.comments ?? []);
  }

  useEffect(() => {
    if (!documentId) return;
    void loadVersions();
    void loadComments();
  }, [documentId]);

  async function createSnapshot() {
    setMessage("");
    const res = await fetch(`/api/documents/${documentId}/versions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "manual-snapshot", changedBy: "user" }),
    });
    if (!res.ok) {
      setMessage("创建快照失败");
      return;
    }
    setMessage("已创建快照");
    await loadVersions();
  }

  async function restore(version: number) {
    setMessage("");
    const res = await fetch(`/api/documents/${documentId}/versions/${version}/restore`, { method: "POST" });
    if (!res.ok) {
      setMessage("恢复失败");
      return;
    }
    setMessage(`已恢复到版本 ${version}`);
    await loadVersions();
    onRestored?.();
  }

  async function submitComment(event: FormEvent) {
    event.preventDefault();
    if (!comment.trim()) return;
    const res = await fetch(`/api/documents/${documentId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: comment }),
    });
    if (!res.ok) {
      setMessage("评论失败");
      return;
    }
    setComment("");
    await loadComments();
  }

  return (
    <div className="mt-8 grid grid-cols-2 gap-5">
      <section className="rounded-3xl border border-slate-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-bold"><Clock3 className="h-4 w-4" />版本历史</h3>
          <button onClick={createSnapshot} className="rounded-xl bg-violet-600 px-3 py-1.5 text-xs text-white">创建快照</button>
        </div>
        {message && <div className="mb-3 rounded-xl bg-violet-50 px-3 py-2 text-xs text-violet-700">{message}</div>}
        <div className="max-h-72 space-y-2 overflow-auto">
          {versions.length === 0 && <p className="text-sm text-slate-500">暂无版本记录</p>}
          {versions.map((item) => (
            <div key={item.id} className="rounded-2xl bg-slate-50 p-3 text-sm">
              <div className="flex items-center justify-between">
                <b>v{item.version}</b>
                <button onClick={() => restore(item.version)} className="rounded-lg bg-white p-1.5 text-violet-700"><RotateCcw className="h-4 w-4" /></button>
              </div>
              <div className="mt-1 text-xs text-slate-500">{item.reason ?? "snapshot"} · {new Date(item.createdAt).toLocaleString()}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5">
        <h3 className="mb-4 flex items-center gap-2 font-bold"><MessageSquare className="h-4 w-4" />评论</h3>
        <form onSubmit={submitComment} className="mb-4 flex gap-2">
          <input value={comment} onChange={(event) => setComment(event.target.value)} placeholder="写评论或批注..." className="min-w-0 flex-1 rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-violet-400" />
          <button className="rounded-2xl bg-violet-600 px-3 py-2 text-white"><Send className="h-4 w-4" /></button>
        </form>
        <div className="max-h-72 space-y-2 overflow-auto">
          {comments.length === 0 && <p className="text-sm text-slate-500">暂无评论</p>}
          {comments.map((item) => (
            <div key={item.id} className="rounded-2xl bg-slate-50 p-3 text-sm">
              <div className="font-medium">{item.author?.name ?? item.author?.email ?? "User"}</div>
              <p className="mt-1 text-slate-700">{item.content}</p>
              <div className="mt-1 text-xs text-slate-500">{new Date(item.createdAt).toLocaleString()}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
