"use client";

import "katex/dist/katex.min.css";
import { useEffect, useMemo, useState } from "react";
import { Database, ExternalLink } from "lucide-react";
import katex from "katex";
import mermaid from "mermaid";
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

function decodeHtml(value: string) {
  if (typeof window === "undefined") return value;
  const textarea = document.createElement("textarea");
  textarea.innerHTML = value;
  return textarea.value;
}

export function MermaidPreview({ code }: { code: string }) {
  const [svg, setSvg] = useState("");
  const [error, setError] = useState("");
  const decoded = useMemo(() => decodeHtml(code).trim(), [code]);

  useEffect(() => {
    let cancelled = false;
    async function render() {
      setError("");
      setSvg("");
      if (!decoded) return;
      try {
        mermaid.initialize({ startOnLoad: false, theme: "default", securityLevel: "strict" });
        const id = `mermaid-${Math.random().toString(36).slice(2)}`;
        const result = await mermaid.render(id, decoded);
        if (!cancelled) setSvg(result.svg);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Mermaid render failed");
      }
    }
    void render();
    return () => {
      cancelled = true;
    };
  }, [decoded]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Mermaid</div>
      {svg ? <div className="rounded-xl bg-white p-4" dangerouslySetInnerHTML={{ __html: svg }} /> : null}
      {!svg && <pre className="overflow-auto rounded-xl bg-white p-4 text-xs text-slate-600">{decoded || "空图表"}</pre>}
      {error && <div className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600">{error}</div>}
    </div>
  );
}

export function MathPreview({ expression }: { expression: string }) {
  const decoded = useMemo(() => decodeHtml(expression).replace(/^\$\$|\$\$$/g, "").trim(), [expression]);
  const html = useMemo(() => {
    try {
      return katex.renderToString(decoded || "E = mc^2", { throwOnError: false, displayMode: true });
    } catch {
      return "";
    }
  }, [decoded]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Formula</div>
      {html ? <div className="text-slate-800" dangerouslySetInnerHTML={{ __html: html }} /> : <div className="font-mono text-lg text-slate-800">{decoded || "E = mc^2"}</div>}
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

  async function createRow() {
    if (!collection) return;
    const rowData: Record<string, unknown> = {};
    collection.schema.forEach((field) => {
      rowData[field.id] = field.id === "name" ? "未命名记录" : "";
    });
    await api(`/api/collections/${collection.id}/rows`, { method: "POST", body: JSON.stringify({ data: rowData }) });
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
          <button onClick={() => void createRow()} className="rounded-xl bg-blue-600 px-3 py-1.5 text-xs text-white">+ 记录</button>
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
