"use client";

import { FileText, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type MentionDocument = {
  id: string;
  title: string;
  summary?: string | null;
  icon?: string | null;
};

export function PageMentionDialog({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (document: MentionDocument) => void;
}) {
  const [documents, setDocuments] = useState<MentionDocument[]>([]);
  const [query, setQuery] = useState("");

  async function load() {
    const res = await fetch("/api/documents");
    const data = await res.json().catch(() => ({ documents: [] }));
    setDocuments(data.documents ?? []);
  }

  useEffect(() => {
    if (open) void load();
  }, [open]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return documents.slice(0, 20);
    return documents.filter((doc) => `${doc.title} ${doc.summary ?? ""}`.toLowerCase().includes(q)).slice(0, 20);
  }, [documents, query]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/20 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">引用页面</h2>
            <p className="mt-1 text-sm text-slate-500">搜索并插入一个文档引用。</p>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3">
          <Search className="h-4 w-4 text-slate-400" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} autoFocus className="min-w-0 flex-1 bg-transparent text-sm outline-none" placeholder="搜索文档标题或摘要..." />
        </div>
        <div className="max-h-[420px] overflow-auto p-2">
          {visible.length === 0 && <div className="rounded-2xl bg-slate-50 p-5 text-center text-sm text-slate-500">没有匹配的文档</div>}
          {visible.map((doc) => (
            <button key={doc.id} onClick={() => onSelect(doc)} className="flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left hover:bg-blue-50">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-lg">{doc.icon ?? <FileText className="h-4 w-4" />}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-slate-900">{doc.title}</span>
                <span className="mt-1 block line-clamp-2 text-xs leading-5 text-slate-500">{doc.summary ?? "暂无摘要"}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
