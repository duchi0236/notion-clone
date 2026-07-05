"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Loader2, RotateCcw, Send } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { confirm } from "@/components/ui/confirm";

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
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [snapshotting, setSnapshotting] = useState(false);
  const [restoring, setRestoring] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const commentInputRef = useRef<HTMLInputElement>(null);

  async function loadVersions() {
    const res = await fetch(`/api/documents/${documentId}/versions`);
    if (!res.ok) throw new Error("failed to load versions");
    const data = await res.json().catch(() => ({ versions: [] }));
    setVersions(data.versions ?? []);
  }

  async function loadComments() {
    const res = await fetch(`/api/documents/${documentId}/comments`);
    if (!res.ok) throw new Error("failed to load comments");
    const data = await res.json().catch(() => ({ comments: [] }));
    setComments(data.comments ?? []);
  }

  async function load() {
    setLoading(true);
    setLoadError(false);
    try {
      await Promise.all([loadVersions(), loadComments()]);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!documentId) return;
    // 切换文档时重置残留状态，避免上一篇的提示/草稿带入
    setMessage("");
    setComment("");
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId]);

  // 进入评论模式时把焦点送进评论输入框
  useEffect(() => {
    if (mode === "comments" && !loading) commentInputRef.current?.focus();
  }, [mode, loading]);

  async function createSnapshot() {
    setMessage("");
    setSnapshotting(true);
    try {
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
    } catch {
      setMessage("创建快照失败");
    } finally {
      setSnapshotting(false);
    }
  }

  async function restore(version: number) {
    if (
      !(await confirm({
        title: `恢复到版本 ${version}？`,
        body: "当前内容将被该版本覆盖，此操作会替换正文。",
        confirmText: "恢复",
        danger: true,
      }))
    ) {
      return;
    }
    setMessage("");
    setRestoring(version);
    try {
      const res = await fetch(`/api/documents/${documentId}/versions/${version}/restore`, { method: "POST" });
      if (!res.ok) {
        setMessage("恢复失败");
        return;
      }
      setMessage(`已恢复到版本 ${version}`);
      await loadVersions();
      onRestored?.();
    } catch {
      setMessage("恢复失败");
    } finally {
      setRestoring(null);
    }
  }

  async function submitComment(event: FormEvent) {
    event.preventDefault();
    if (!comment.trim() || submitting) return;
    setSubmitting(true);
    try {
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
    } catch {
      setMessage("评论失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-4">
      {message && (
        <div role="status" aria-live="polite" className="mb-3 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600">
          {message}
        </div>
      )}

      {loading ? (
        <div className="space-y-2" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      ) : loadError ? (
        <div className="rounded-lg bg-rose-50 px-3 py-3 text-sm text-rose-700">
          <p>加载失败</p>
          <button
            onClick={() => void load()}
            className="mt-2 rounded-md bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-700"
          >
            重试
          </button>
        </div>
      ) : mode === "versions" ? (
        <section>
          <button
            onClick={createSnapshot}
            disabled={snapshotting}
            className="mb-4 flex w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 py-2 text-sm text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {snapshotting && <Loader2 className="h-4 w-4 animate-spin" />}
            {snapshotting ? "创建中…" : "创建快照"}
          </button>
          <div className="space-y-2">
            {versions.length === 0 && <p className="text-sm text-slate-500">暂无版本记录</p>}
            {versions.map((item) => (
              <div key={item.id} className="rounded-lg bg-white p-3 text-sm shadow-sm ring-1 ring-slate-200">
                <div className="flex items-center justify-between">
                  <b>v{item.version}</b>
                  <button
                    onClick={() => restore(item.version)}
                    disabled={restoring !== null}
                    title="恢复到此版本"
                    aria-label={`恢复到版本 ${item.version}`}
                    className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {restoring === item.version ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RotateCcw className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <div className="mt-1 text-xs text-slate-500">{item.reason ?? "snapshot"} · {formatDateTime(item.createdAt)}</div>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <section>
          <form onSubmit={submitComment} className="mb-4 flex gap-2">
            <input
              ref={commentInputRef}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="写评论或批注..."
              className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
            />
            <button
              aria-label="发送评论"
              disabled={!comment.trim() || submitting}
              className="flex items-center justify-center rounded-lg bg-slate-950 px-3 py-2 text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
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
