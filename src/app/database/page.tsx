"use client";

import { CalendarDays, KanbanSquare, Plus, Rows3, Table2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type Collection = {
  id: string;
  name: string;
  icon?: string;
  schema: Array<{ id: string; name: string; type: string; options?: string[] }>;
  views: Array<{ id: string; name: string; type: string; groupBy?: string; dateBy?: string }>;
  rows: Array<{ id: string; data: Record<string, unknown> }>;
};

export default function DatabaseWorkspacePage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState("table");

  async function load() {
    const res = await fetch("/api/collections");
    const data = await res.json().catch(() => ({ collections: [] }));
    setCollections(data.collections ?? []);
    if (!selectedId && data.collections?.length) {
      setSelectedId(data.collections[0].id);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const selected = useMemo(() => collections.find((item) => item.id === selectedId), [collections, selectedId]);

  async function createCollection() {
    const res = await fetch("/api/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "新数据库", type: "TABLE" }),
    });
    if (res.ok) await load();
  }

  async function createRow() {
    if (!selected) return;
    const data: Record<string, unknown> = {};
    selected.schema.forEach((field) => {
      data[field.id] = field.id === "name" ? "未命名记录" : "";
    });

    await fetch(`/api/collections/${selected.id}/rows`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data }),
    });

    await load();
  }

  async function updateCell(rowId: string, row: Record<string, unknown>, key: string, value: string) {
    await fetch(`/api/collection-rows/${rowId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: { ...row, [key]: value } }),
    });
  }

  return (
    <main className="flex min-h-screen bg-[#f7f7fb] text-slate-900">
      <aside className="w-72 border-r border-slate-200 bg-white p-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">数据库</h1>
            <p className="text-sm text-slate-500">结构化知识层</p>
          </div>
          <button onClick={() => void createCollection()} className="rounded-xl bg-blue-600 p-2 text-white"><Plus className="h-4 w-4" /></button>
        </div>

        <div className="space-y-2">
          {collections.map((item) => (
            <button
              key={item.id}
              onClick={() => setSelectedId(item.id)}
              className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm ${selectedId === item.id ? "bg-blue-50 text-blue-700" : "hover:bg-slate-100"}`}
            >
              <Table2 className="h-4 w-4" />
              <span className="truncate">{item.name}</span>
            </button>
          ))}
        </div>
      </aside>

      <section className="flex-1 p-8">
        {!selected && <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-slate-500">请选择数据库</div>}

        {selected && (
          <>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold">{selected.name}</h2>
                <p className="mt-1 text-sm text-slate-500">{selected.rows.length} 条记录</p>
              </div>

              <div className="flex gap-2">
                <button onClick={() => setView("table")} className={`rounded-xl px-4 py-2 text-sm ${view === "table" ? "bg-slate-900 text-white" : "border border-slate-200 bg-white"}`}><Rows3 className="mr-1 inline h-4 w-4" />表格</button>
                <button onClick={() => setView("board")} className={`rounded-xl px-4 py-2 text-sm ${view === "board" ? "bg-slate-900 text-white" : "border border-slate-200 bg-white"}`}><KanbanSquare className="mr-1 inline h-4 w-4" />看板</button>
                <button onClick={() => setView("calendar")} className={`rounded-xl px-4 py-2 text-sm ${view === "calendar" ? "bg-slate-900 text-white" : "border border-slate-200 bg-white"}`}><CalendarDays className="mr-1 inline h-4 w-4" />日历</button>
                <button onClick={() => void createRow()} className="rounded-xl bg-blue-600 px-4 py-2 text-sm text-white"><Plus className="mr-1 inline h-4 w-4" />新增记录</button>
              </div>
            </div>

            {view === "table" && (
              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse text-sm">
                    <thead className="bg-slate-50 text-slate-500">
                      <tr>
                        {selected.schema.map((field) => <th key={field.id} className="border-b border-slate-200 px-4 py-3 text-left font-medium">{field.name}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {selected.rows.map((row) => (
                        <tr key={row.id} className="border-b border-slate-100 last:border-0">
                          {selected.schema.map((field) => (
                            <td key={field.id} className="px-4 py-3">
                              <input
                                defaultValue={String(row.data?.[field.id] ?? "")}
                                onBlur={(event) => void updateCell(row.id, row.data, field.id, event.target.value)}
                                className="w-full rounded-lg border border-transparent px-2 py-1 outline-none hover:border-slate-200 focus:border-blue-300"
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {view === "board" && (
              <div className="grid grid-cols-3 gap-4">
                {["未开始", "进行中", "已完成"].map((status) => (
                  <section key={status} className="rounded-3xl border border-slate-200 bg-white p-4">
                    <h3 className="mb-4 font-semibold">{status}</h3>
                    <div className="space-y-3">
                      {selected.rows.filter((row) => row.data?.status === status).map((row) => (
                        <div key={row.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                          <div className="font-medium">{String(row.data?.name ?? "未命名")}</div>
                          <div className="mt-1 text-xs text-slate-500">{String(row.data?.owner ?? "未分配")}</div>
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}

            {view === "calendar" && (
              <div className="grid grid-cols-7 gap-3">
                {selected.rows.map((row) => (
                  <div key={row.id} className="rounded-2xl border border-slate-200 bg-white p-3">
                    <div className="text-xs text-slate-400">{String(row.data?.dueDate ?? "无日期")}</div>
                    <div className="mt-2 font-medium">{String(row.data?.name ?? "未命名")}</div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
