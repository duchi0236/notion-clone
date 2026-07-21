"use client";

import { ChangeEvent, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Copy, File, Loader2, Trash2, Upload } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

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
    <main className="claw-standalone px-4 sm:px-6">
      <div className="claw-page-wrap">
        <div className="claw-page-top">
          <div>
            <p className="claw-page-kicker">ClawNote library</p>
            <h1 className="claw-page-title">文件</h1>
            <p className="claw-page-desc">上传图片、PDF、Markdown 或附件，并复制链接插入 ClawNote 文档。文件区保持实心纸面，便于长期浏览和核对。</p>
          </div>
          <div className="claw-page-actions">
            <Link href="/clawnote" className="claw-ghost-button"><ArrowLeft className="h-4 w-4" />返回工作台</Link>
          </div>
        </div>

        <label className="claw-card mb-6 flex cursor-pointer flex-col items-center justify-center border-dashed p-10 text-center transition hover:-translate-y-0.5 hover:border-blue-300">
          {loading ? <Loader2 className="mb-3 h-8 w-8 animate-spin text-blue-600" /> : <Upload className="mb-3 h-8 w-8 text-blue-600" />}
          <span className="font-semibold text-slate-900">点击上传文件</span>
          <span className="mt-1 text-sm text-slate-500">最大 20MB，上传后可直接复制链接</span>
          <input type="file" className="hidden" onChange={upload} />
        </label>

        {message && <div className="claw-status mb-4 px-4 py-3 text-sm">{message}</div>}

        <div className="claw-table overflow-x-auto">
          <div className="min-w-[760px]">
            <div className="claw-table-head grid-cols-[minmax(0,1fr)_120px_180px_150px]">
              <span>文件</span><span>大小</span><span>更新时间</span><span>操作</span>
            </div>
            {files.length === 0 && <div className="p-8 text-center text-sm text-slate-500">暂无上传文件</div>}
            {files.map((file) => (
              <div key={file.filename} className="claw-table-row grid-cols-[minmax(0,1fr)_120px_180px_150px]">
                <a href={file.url} target="_blank" className="flex min-w-0 items-center gap-2 text-slate-700 hover:text-blue-700">
                  <File className="h-4 w-4 flex-shrink-0 text-blue-600" />
                  <span className="truncate">{file.filename}</span>
                </a>
                <span className="text-slate-500">{formatSize(file.size)}</span>
                <span className="text-slate-500">{formatDateTime(file.updatedAt)}</span>
                <span className="flex gap-2">
                  <button onClick={() => copy(file.url)} className="claw-ghost-button min-h-0 p-2" title="复制链接"><Copy className="h-4 w-4" /></button>
                  <button onClick={() => remove(file.filename)} className="claw-danger-button min-h-0 p-2" title="删除文件"><Trash2 className="h-4 w-4" /></button>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
