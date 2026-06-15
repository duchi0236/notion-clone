"use client";

import { FormEvent, useEffect, useState } from "react";
import { RotateCcw, Send } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

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

export function DocumentMetaPanel({
  documentId,
  mode,
  onRestored,
}: {
  documentId: string;
  mode: "versions" | "comments";
  onRestored?: () => void;
}) {
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
    <div className="p-4">
      {message && <div className="mb-3 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600">{message}</div>}

      {mode === "versions" && (
        <section>
          <button onClick={createSnapshot} className="mb-4 w-full rounded-lg bg-slate-950 px-3 py-2 text-sm text-white hover:bg-slate-800">创建快照</button>
          <div className="space-y-2">
          {versions.length === 0 && <p className="text-sm text-slate-500">暂无版本记录</p>}
          {versions.map((item) => (
            <div key={item.id} className="rounded-lg bg-white p-3 text-sm shadow-sm ring-1 ring-slate-200">
              <div className="flex items-center justify-between">
                <b>v{item.version}</b>
                <button onClick={() => restore(item.version)} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-950"><RotateCcw className="h-4 w-4" /></button>
              </div>
              <div className="mt-1 text-xs text-slate-500">{item.reason ?? "snapshot"} · {formatDateTime(item.createdAt)}</div>
            </div>
          ))}
          </div>
        </section>
      )}

      {mode === "comments" && (
        <section>
          <form onSubmit={submitComment} className="mb-4 flex gap-2">
          <input value={comment} onChange={(event) => setComment(event.target.value)} placeholder="写评论或批注..." className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400" />
          <button className="rounded-lg bg-slate-950 px-3 py-2 text-white hover:bg-slate-800"><Send className="h-4 w-4" /></button>
        </form>
        <div className="space-y-2">
          {comments.length === 0 && <p className="text-sm text-slate-500">暂无评论</p>}
          {comments.map((item) => (
            <div key={item.id} className="rounded-lg bg-white p-3 text-sm shadow-sm ring-1 ring-slate-200">
              <div className="font-medium">{item.author?.name ?? item.author?.email ?? "User"}</div>
              <p className="mt-1 text-slate-700">{item.content}</p>
              <div className="mt-1 text-xs text-slate-500">{formatDateTime(item.createdAt)}</div>
            </div>
          ))}
        </div>
        </section>
      )}
    </div>
  );
}
