"use client";

import { Download, Upload, X } from "lucide-react";
import { useState } from "react";

export function DocumentImportExportDialog({
  documentId,
  title,
  onClose,
  onImported,
}: {
  documentId: string;
  title: string;
  onClose: () => void;
  onImported: () => void;
}) {
  const [markdown, setMarkdown] = useState("");
  const [importTitle, setImportTitle] = useState("Imported Markdown");
  const [message, setMessage] = useState("");

  function exportMarkdown() {
    window.location.href = `/api/documents/${documentId}/export/markdown`;
  }

  async function importMarkdown() {
    setMessage("");
    const res = await fetch("/api/documents/import/markdown", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: importTitle || "Imported Markdown", markdown }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(data.error ?? "导入失败");
      return;
    }
    setMarkdown("");
    setMessage("导入成功");
    onImported();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/20 p-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Markdown 导入 / 导出</h2>
            <p className="mt-1 text-sm text-slate-500">当前文档：{title}</p>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
        </div>

        <section className="mb-5 rounded-2xl border border-slate-200 p-4">
          <div className="mb-3 font-medium">导出当前文档</div>
          <p className="mb-4 text-sm text-slate-500">将当前文档导出为 Markdown 文件，便于迁移、备份或导入其他文档工具。</p>
          <button onClick={exportMarkdown} className="rounded-2xl bg-slate-900 px-4 py-2 text-sm text-white"><Download className="mr-1 inline h-4 w-4" />导出 Markdown</button>
        </section>

        <section className="rounded-2xl border border-slate-200 p-4">
          <div className="mb-3 font-medium">导入 Markdown 为新文档</div>
          <input value={importTitle} onChange={(event) => setImportTitle(event.target.value)} className="mb-3 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-300" placeholder="文档标题" />
          <textarea value={markdown} onChange={(event) => setMarkdown(event.target.value)} rows={10} className="w-full rounded-2xl border border-slate-200 px-4 py-3 font-mono text-sm outline-none focus:border-blue-300" placeholder="# 标题\n\n这里粘贴 Markdown 内容..." />
          <button onClick={importMarkdown} className="mt-3 rounded-2xl bg-blue-600 px-4 py-2 text-sm text-white"><Upload className="mr-1 inline h-4 w-4" />导入为新文档</button>
        </section>

        {message && <div className="mt-4 rounded-2xl bg-blue-50 px-4 py-3 text-sm text-blue-700">{message}</div>}
      </div>
    </div>
  );
}
