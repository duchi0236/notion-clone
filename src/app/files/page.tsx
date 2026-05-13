"use client";

import { ChangeEvent, useEffect, useState } from "react";
import Link from "next/link";
import { Copy, File, Loader2, Trash2, Upload } from "lucide-react";

type StoredFile = {
  filename: string;
  size: number;
  updatedAt: string;
  url: string;
};

function formatSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

export default function FilesPage() {
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function loadFiles() {
    const res = await fetch("/api/files");
    const data = await res.json().catch(() => ({ files: [] }));
    setFiles(data.files ?? []);
  }

  useEffect(() => {
    void loadFiles();
  }, []);

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setMessage("");
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/files", { method: "POST", body: form });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMessage(data.error ?? "上传失败");
      return;
    }
    event.target.value = "";
    setMessage("上传成功");
    await loadFiles();
  }

  async function remove(filename: string) {
    await fetch(`/api/files?filename=${encodeURIComponent(filename)}`, { method: "DELETE" });
    await loadFiles();
  }

  async function copy(url: string) {
    await navigator.clipboard.writeText(url);
    setMessage("已复制链接");
  }

  return (
    <main className="min-h-screen bg-[#f7f7fb] p-8 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">文件管理</h1>
            <p className="mt-1 text-sm text-slate-500">上传图片、PDF、Markdown 或附件，并复制链接插入 ClawNote 文档。</p>
          </div>
          <Link href="/clawnote" className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm hover:border-violet-300">返回工作台</Link>
        </div>

        <label className="mb-6 flex cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-violet-300 bg-white p-10 text-center hover:bg-violet-50">
          {loading ? <Loader2 className="mb-3 h-8 w-8 animate-spin text-violet-600" /> : <Upload className="mb-3 h-8 w-8 text-violet-600" />}
          <span className="font-medium">点击上传文件</span>
          <span className="mt-1 text-sm text-slate-500">最大 20MB</span>
          <input type="file" className="hidden" onChange={upload} />
        </label>

        {message && <div className="mb-4 rounded-2xl bg-violet-50 px-4 py-3 text-sm text-violet-700">{message}</div>}

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
          <div className="grid grid-cols-[1fr_120px_180px_150px] border-b border-slate-100 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-500">
            <span>文件</span><span>大小</span><span>更新时间</span><span>操作</span>
          </div>
          {files.length === 0 && <div className="p-8 text-center text-sm text-slate-500">暂无上传文件</div>}
          {files.map((file) => (
            <div key={file.filename} className="grid grid-cols-[1fr_120px_180px_150px] items-center border-b border-slate-100 px-4 py-3 text-sm last:border-0">
              <a href={file.url} target="_blank" className="flex min-w-0 items-center gap-2 text-slate-700 hover:text-violet-700">
                <File className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{file.filename}</span>
              </a>
              <span className="text-slate-500">{formatSize(file.size)}</span>
              <span className="text-slate-500">{new Date(file.updatedAt).toLocaleString()}</span>
              <span className="flex gap-2">
                <button onClick={() => copy(file.url)} className="rounded-xl border border-slate-200 p-2 hover:border-violet-300"><Copy className="h-4 w-4" /></button>
                <button onClick={() => remove(file.filename)} className="rounded-xl border border-slate-200 p-2 text-red-500 hover:border-red-300"><Trash2 className="h-4 w-4" /></button>
              </span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
