"use client";

import { Copy, ExternalLink, X } from "lucide-react";
import { useState } from "react";

export function DocumentShareDialog({
  documentId,
  title,
  onClose,
}: {
  documentId: string;
  title: string;
  onClose: () => void;
}) {
  const [published, setPublished] = useState(false);
  const [publicUrl, setPublicUrl] = useState("");
  const [message, setMessage] = useState("");

  async function publish(isPublished: boolean) {
    setMessage("");
    const res = await fetch(`/api/documents/${documentId}/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublished }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(data.error ?? "发布失败");
      return;
    }
    setPublished(isPublished);
    setPublicUrl(data.publicUrl ?? "");
    setMessage(isPublished ? "已发布" : "已取消发布");
  }

  async function copy() {
    const url = publicUrl || `/public/docs/${documentId}`;
    await navigator.clipboard.writeText(`${window.location.origin}${url}`);
    setMessage("已复制链接");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/20 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">分享文档</h2>
            <p className="mt-1 text-sm text-slate-500">{title}</p>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
        </div>

        <div className="rounded-2xl border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">公开阅读链接</div>
              <div className="mt-1 text-sm text-slate-500">开启后，任何拥有链接的人都可以只读访问。</div>
            </div>
            <button onClick={() => publish(!published)} className={`rounded-2xl px-4 py-2 text-sm text-white ${published ? "bg-slate-500" : "bg-blue-600"}`}>{published ? "关闭" : "发布"}</button>
          </div>
          <div className="mt-4 flex gap-2 rounded-2xl bg-slate-50 p-2 text-sm">
            <span className="min-w-0 flex-1 truncate px-2 py-2 text-slate-600">{publicUrl ? `${window.location.origin}${publicUrl}` : "发布后生成公开链接"}</span>
            <button onClick={copy} className="rounded-xl bg-white p-2 text-slate-600 shadow-sm"><Copy className="h-4 w-4" /></button>
            {publicUrl && <a href={publicUrl} target="_blank" className="rounded-xl bg-white p-2 text-slate-600 shadow-sm"><ExternalLink className="h-4 w-4" /></a>}
          </div>
        </div>

        {message && <div className="mt-4 rounded-2xl bg-blue-50 px-4 py-3 text-sm text-blue-700">{message}</div>}
      </div>
    </div>
  );
}
