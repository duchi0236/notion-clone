"use client";

import { Database, FileText, Search, X } from "lucide-react";
import { useEffect, useState } from "react";

type DocumentHit = {
  id: string;
  title: string;
  icon?: string | null;
  summary?: string | null;
};

type CollectionHit = {
  id: string;
  name: string;
  icon?: string | null;
  description?: string | null;
};

export function PageMentionPicker({
  onClose,
  onSelect,
}: {
  onClose: () => void;
  onSelect: (doc: DocumentHit) => void;
}) {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<DocumentHit[]>([]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      const res = await fetch(`/api/documents/search?q=${encodeURIComponent(query)}`);
      const data = await res.json().catch(() => ({ documents: [] }));
      setItems(data.documents ?? []);
    }, 150);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <PickerFrame title="插入页面引用" onClose={onClose}>
      <SearchInput value={query} onChange={setQuery} placeholder="搜索页面..." />
      <div className="max-h-80 overflow-auto p-2">
        {items.map((item) => (
          <button key={item.id} onClick={() => onSelect(item)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-blue-50">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100">{item.icon ?? <FileText className="h-4 w-4" />}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-slate-900">{item.title}</span>
              <span className="block truncate text-xs text-slate-500">{item.summary ?? "暂无摘要"}</span>
            </span>
          </button>
        ))}
        {items.length === 0 && <div className="p-5 text-center text-sm text-slate-500">没有找到页面</div>}
      </div>
    </PickerFrame>
  );
}

export function DatabasePicker({
  onClose,
  onSelect,
}: {
  onClose: () => void;
  onSelect: (collection: CollectionHit) => void;
}) {
  const [items, setItems] = useState<CollectionHit[]>([]);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/collections");
      const data = await res.json().catch(() => ({ collections: [] }));
      setItems(data.collections ?? []);
    })();
  }, []);

  return (
    <PickerFrame title="插入数据库" onClose={onClose}>
      <div className="max-h-96 overflow-auto p-2">
        {items.map((item) => (
          <button key={item.id} onClick={() => onSelect(item)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-blue-50">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700">{item.icon ?? <Database className="h-4 w-4" />}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-slate-900">{item.name}</span>
              <span className="block truncate text-xs text-slate-500">{item.description ?? item.id}</span>
            </span>
          </button>
        ))}
        {items.length === 0 && <div className="p-5 text-center text-sm text-slate-500">暂无数据库，请先在 /database 创建</div>}
      </div>
    </PickerFrame>
  );
}

function PickerFrame({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/20 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="font-bold text-slate-900">{title}</h2>
          <button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <div className="m-4 flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
      <Search className="h-4 w-4 text-slate-400" />
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="min-w-0 flex-1 bg-transparent text-sm outline-none" autoFocus />
    </div>
  );
}
