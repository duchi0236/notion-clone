"use client";

import { CheckSquare, Plus, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type Field = { id: string; name: string; type: string };
type Row = { id: string; data: Record<string, unknown> };
type Collection = { id: string; name: string; icon?: string; description?: string | null; schema: Field[]; rows: Row[] };

const templates = [
  { title: "任务清单", icon: "✅", description: "管理待办和行动项", type: "TASKS" },
  { title: "项目计划", icon: "🚀", description: "跟踪项目进度", type: "TABLE" },
  { title: "客户清单", icon: "👥", description: "保存客户与联系人", type: "TABLE" },
  { title: "旅行计划", icon: "✈️", description: "整理行程和资料", type: "TABLE" },
];

export default function ListsPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Record<string, string>>({});

  async function load() {
    const res = await fetch("/api/collections");
    const data = await res.json();
    const next = data.collections ?? [];
    setCollections(next);
    setSelectedId((current) => current ?? next[0]?.id ?? null);
  }

  async function createList(template = templates[0]) {
    const res = await fetch("/api/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: template.title, icon: template.icon, description: template.description, type: template.type }),
    });
    const data = await res.json();
    await load();
    setSelectedId(data.collection?.id ?? null);
  }

  useEffect(() => { void load(); }, []);

  const filteredCollections = useMemo(() => collections.filter((item) => `${item.name} ${item.description ?? ""}`.toLowerCase().includes(query.toLowerCase())), [collections, query]);
  const selected = collections.find((item) => item.id === selectedId) ?? filteredCollections[0];

  async function addRow() {
    if (!selected) return;
    const data: Record<string, string> = {};
    selected.schema.forEach((field) => { data[field.id] = draft[field.id] ?? ""; });
    await fetch(`/api/collections/${selected.id}/rows`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data }) });
    setDraft({});
    await load();
  }

  function startEdit(row: Row) {
    setEditingRowId(row.id);
    const next: Record<string, string> = {};
    selected?.schema.forEach((field) => { next[field.id] = String(row.data?.[field.id] ?? ""); });
    setEditing(next);
  }

  async function saveRow(rowId: string) {
    await fetch(`/api/collection-rows/${rowId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data: editing }) });
    setEditingRowId(null);
    await load();
  }

  async function deleteRow(rowId: string) {
    await fetch(`/api/collection-rows/${rowId}`, { method: "DELETE" });
    await load();
  }

  return (
    <main className="min-h-screen bg-slate-50 p-8 text-slate-900">
      <div className="mx-auto grid max-w-7xl grid-cols-[320px_1fr] gap-6">
        <aside className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white"><CheckSquare className="h-5 w-5" /></div>
            <div><h1 className="text-2xl font-bold">清单</h1><p className="text-sm text-slate-500">任务、项目和资料</p></div>
          </div>
          <div className="relative mb-4">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索清单" className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-300" />
          </div>
          <div className="mb-4 grid grid-cols-2 gap-2">
            {templates.map((template) => <button key={template.title} onClick={() => void createList(template)} className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-left hover:border-blue-200 hover:bg-blue-50"><div className="text-xl">{template.icon}</div><div className="mt-1 text-sm font-semibold">{template.title}</div></button>)}
          </div>
          <div className="space-y-2">
            {filteredCollections.map((item) => <button key={item.id} onClick={() => setSelectedId(item.id)} className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left ${selected?.id === item.id ? "bg-blue-50 text-blue-700" : "hover:bg-slate-50"}`}><span>{item.icon ?? "📋"}</span><span className="min-w-0 flex-1 truncate text-sm font-medium">{item.name}</span><span className="text-xs text-slate-400">{item.rows?.length ?? 0}</span></button>)}
          </div>
        </aside>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          {selected ? <>
            <div className="mb-6 flex items-start justify-between">
              <div><h2 className="text-3xl font-bold"><span className="mr-2">{selected.icon ?? "📋"}</span>{selected.name}</h2><p className="mt-2 text-sm text-slate-500">{selected.description ?? "管理你的条目"} · {selected.rows.length} 个条目</p></div>
            </div>
            <div className="mb-5 rounded-3xl border border-slate-100 bg-slate-50 p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700"><Plus className="h-4 w-4" />新增条目</div>
              <div className="grid grid-cols-4 gap-2">
                {selected.schema.slice(0, 4).map((field) => <input key={field.id} value={draft[field.id] ?? ""} onChange={(event) => setDraft((prev) => ({ ...prev, [field.id]: event.target.value }))} placeholder={field.name} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-300" />)}
              </div>
              <button onClick={() => void addRow()} className="mt-3 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white">保存条目</button>
            </div>
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-slate-500"><tr>{selected.schema.slice(0, 6).map((field) => <th key={field.id} className="border-b border-slate-200 px-4 py-3 font-medium">{field.name}</th>)}<th className="border-b border-slate-200 px-4 py-3" /></tr></thead>
                <tbody>
                  {selected.rows.map((row) => <tr key={row.id} className="border-b border-slate-100 last:border-0">
                    {selected.schema.slice(0, 6).map((field) => <td key={field.id} className="px-4 py-3">{editingRowId === row.id ? <input value={editing[field.id] ?? ""} onChange={(event) => setEditing((prev) => ({ ...prev, [field.id]: event.target.value }))} className="w-full rounded-lg border border-slate-200 px-2 py-1 outline-none focus:border-blue-300" /> : <button onClick={() => startEdit(row)} className="text-left text-slate-700">{String(row.data?.[field.id] ?? "-")}</button>}</td>)}
                    <td className="px-4 py-3 text-right">{editingRowId === row.id ? <button onClick={() => void saveRow(row.id)} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs text-white">保存</button> : <button onClick={() => void deleteRow(row.id)} className="rounded-lg p-1.5 text-red-500 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>}</td>
                  </tr>)}
                </tbody>
              </table>
              {selected.rows.length === 0 && <div className="py-12 text-center text-sm text-slate-400">暂无条目</div>}
            </div>
          </> : <div className="flex h-full min-h-[500px] items-center justify-center rounded-3xl border border-dashed border-slate-200 text-slate-400">选择或新建一个清单</div>}
        </section>
      </div>
    </main>
  );
}
