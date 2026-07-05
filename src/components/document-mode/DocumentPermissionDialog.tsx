"use client";

import { LockKeyhole, X } from "lucide-react";
import { useEffect, useState } from "react";

type PermissionDoc = {
  id: string;
  title: string;
  isPublished: boolean;
  agentReadable: boolean;
  agentWritable: boolean;
};

export function DocumentPermissionDialog({ documentId, onClose, onSaved }: { documentId: string; onClose: () => void; onSaved?: () => void }) {
  const [doc, setDoc] = useState<PermissionDoc | null>(null);
  const [message, setMessage] = useState("");

  async function load() {
    const res = await fetch(`/api/documents/${documentId}`);
    const data = await res.json().catch(() => ({}));
    if (data.document) {
      setDoc({
        id: data.document.id,
        title: data.document.title,
        isPublished: Boolean(data.document.isPublished),
        agentReadable: Boolean(data.document.agentReadable),
        agentWritable: Boolean(data.document.agentWritable),
      });
    }
  }

  useEffect(() => {
    void load();
  }, [documentId]);

  async function save(patch: Partial<PermissionDoc>) {
    if (!doc) return;
    const next = { ...doc, ...patch };
    setDoc(next);
    setMessage("");
    const res = await fetch(`/api/documents/${documentId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        isPublished: next.isPublished,
        agentReadable: next.agentReadable,
        agentWritable: next.agentWritable,
        reason: "permission-update",
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(data.error ?? "保存失败");
      return;
    }
    setMessage("已保存");
    onSaved?.();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/20 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-bold"><LockKeyhole className="h-5 w-5" />文档权限</h2>
            <p className="mt-1 text-sm text-slate-500">{doc?.title ?? "加载中..."}</p>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
        </div>

        <div className="space-y-3">
          <Toggle
            title="公开发布"
            desc="开启后可通过公开链接只读访问。"
            value={Boolean(doc?.isPublished)}
            onChange={(value) => void save({ isPublished: value })}
          />
          <Toggle
            title="允许 AI 检索"
            desc="开启后该文档会进入 Knowledge Layer，可被 AI 搜索引用。"
            value={Boolean(doc?.agentReadable)}
            onChange={(value) => void save({ agentReadable: value })}
          />
          <Toggle
            title="允许 AI 写入建议"
            desc="开启后 Agent 可以针对该文档创建草稿或修改建议，但默认不直接覆盖正文。"
            value={Boolean(doc?.agentWritable)}
            onChange={(value) => void save({ agentWritable: value })}
          />
        </div>

        {message && <div className="mt-4 rounded-2xl bg-blue-50 px-4 py-3 text-sm text-blue-700">{message}</div>}
      </div>
    </div>
  );
}

function Toggle({ title, desc, value, onChange }: { title: string; desc: string; value: boolean; onChange: (value: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-4">
      <div>
        <div className="font-medium text-slate-900">{title}</div>
        <div className="mt-1 text-sm text-slate-500">{desc}</div>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`relative h-7 w-12 rounded-full transition-colors ${value ? "bg-blue-600" : "bg-slate-300"}`}
      >
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-transform ${value ? "left-6" : "left-1"}`} />
      </button>
    </div>
  );
}
