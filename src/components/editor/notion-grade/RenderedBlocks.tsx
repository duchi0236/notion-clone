"use client";

import { useEffect, useMemo, useState } from "react";
import { Database, ExternalLink } from "lucide-react";
import { BoardView, CalendarView, GalleryView, TableView } from "@/components/database/DatabaseViews";
import type { Collection } from "@/components/database/types";

async function api<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers || {}) } });
    if (!res.ok) return null;
    return await res.json() as T;
  } catch {
    return null;
  }
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function MermaidPreview({ code }: { code: string }) {
  const preview = useMemo(() => {
    const lines = code.split("\n").map((line) => line.trim()).filter(Boolean);
    return lines.slice(0, 8);
  }, [code]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Mermaid Preview</div>
      <div className="rounded-xl bg-white p-4 font-mono text-xs text-slate-600">
        {preview.length ? preview.map((line, index) => <div key={`${line}-${index}`}>{line}</div>) : "空图表"}
      </div>
      <div className="mt-3 text-xs text-slate-400">当前为轻量预览；接入 mermaid runtime 后会渲染为正式图表。</div>
    </div>
  );
}

export function MathPreview({ expression }: { expression: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Formula</div>
      <div className="font-mono text-lg text-slate-800">{expression || "E = mc^2"}</div>
    </div>
  );
}

export function EmbeddedDatabasePreview({ collectionId }: { collectionId: string }) {
  const [collection, setCollection] = useState<Collection | null>(null);
  const [view, setView] = useState<"table" | "board" | "calendar" | "gallery">("table");

  async function load() {
    const data = await api<{ collection: Collection }>(`/api/collections/${collectionId}`);
    if (data?.collection) setCollection(data.collection);
  }

  useEffect(() => {
    void load();
  }, [collectionId]);

  async function updateRow(row: any, data: Record<string, unknown>) {
    await api(`/api/collection-rows/${row.id}`, { method: "PUT", body: JSON.stringify({ data }) });
    await load();
  }

  async function deleteRow(rowId: string) {
    await api(`/api/collection-rows/${rowId}`, { method: "DELETE" });
    await load();
  }

  if (!collection) {
    return <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">数据库 {collectionId} 加载中...</div>;
  }

  return (
    <section className="rounded-3xl border border-blue-100 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-blue-600" />
          <div>
            <h3 className="font-semibold text-slate-900">{collection.name}</h3>
            <p className="text-xs text-slate-500">嵌入数据库 · {collection.rows.length} 条记录</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {(["table", "board", "calendar", "gallery"] as const).map((item) => (
            <button key={item} onClick={() => setView(item)} className={`rounded-xl px-3 py-1.5 text-xs ${view === item ? "bg-slate-900 text-white" : "border border-slate-200 text-slate-600"}`}>{item}</button>
          ))}
          <a href="/database" className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-600"><ExternalLink className="mr-1 inline h-3 w-3" />打开</a>
        </div>
      </div>
      {view === "table" && <TableView schema={collection.schema} rows={collection.rows} updateRow={updateRow} deleteRow={deleteRow} />}
      {view === "board" && <BoardView rows={collection.rows} updateRow={updateRow} />}
      {view === "calendar" && <CalendarView rows={collection.rows} />}
      {view === "gallery" && <GalleryView rows={collection.rows} />}
    </section>
  );
}

export function renderAdvancedHtml(html: string) {
  return html
    .replace(/<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g, (_match, code) => `<div data-render="mermaid">${escapeHtml(code)}</div>`)
    .replace(/<div class="notion-math">([\s\S]*?)<\/div>/g, (_match, expr) => `<div data-render="math">${escapeHtml(expr.replace(/^\$\$|\$\$$/g, "").trim())}</div>`)
    .replace(/<div class="notion-database-embed" data-collection-id="([^"']+)">[\s\S]*?<\/div>/g, (_match, id) => `<div data-render="database" data-collection-id="${id}"></div>`);
}
