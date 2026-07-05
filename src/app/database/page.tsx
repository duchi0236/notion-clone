"use client";

import { CalendarDays, GalleryHorizontal, KanbanSquare, Plus, Rows3, Table2 } from "lucide-react";
import { SchemaEditor } from "@/components/database/SchemaEditor";
import { BoardView, CalendarView, GalleryView, TableView } from "@/components/database/DatabaseViews";
import { useDatabaseWorkspace } from "@/components/database/useDatabaseWorkspace";
import type { DatabaseView } from "@/components/database/types";

const viewTabs: Array<[DatabaseView, any, string]> = [
  ["table", Rows3, "表格"],
  ["board", KanbanSquare, "看板"],
  ["calendar", CalendarDays, "日历"],
  ["gallery", GalleryHorizontal, "画廊"],
];

export default function DatabaseWorkspacePage() {
  const db = useDatabaseWorkspace();

  return (
    <main className="flex min-h-screen bg-[#f7f7fb] text-slate-900">
      <aside className="w-72 border-r border-slate-200 bg-white p-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">数据库</h1>
            <p className="text-sm text-slate-500">结构化知识层</p>
          </div>
          <button onClick={() => void db.createCollection()} className="rounded-xl bg-blue-600 p-2 text-white"><Plus className="h-4 w-4" /></button>
        </div>
        <div className="space-y-2">
          {db.collections.map((item) => (
            <button key={item.id} onClick={() => db.setSelectedId(item.id)} className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm ${db.selectedId === item.id ? "bg-blue-50 text-blue-700" : "hover:bg-slate-100"}`}>
              <Table2 className="h-4 w-4" /><span className="truncate">{item.name}</span>
            </button>
          ))}
        </div>
      </aside>

      <section className="flex-1 p-8">
        {!db.selected && <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-slate-500">请选择数据库</div>}
        {db.selected && (
          <>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <input value={db.selected.name} onChange={(event) => void db.updateCollection({ name: event.target.value })} className="w-full bg-transparent text-3xl font-bold outline-none" />
                <p className="mt-1 text-sm text-slate-500">{db.rows.length} 条记录</p>
              </div>
              <div className="flex gap-2">
                {viewTabs.map(([key, Icon, label]) => (
                  <button key={key} onClick={() => db.setView(key)} className={`rounded-xl px-4 py-2 text-sm ${db.view === key ? "bg-slate-900 text-white" : "border border-slate-200 bg-white"}`}>
                    <Icon className="mr-1 inline h-4 w-4" />{label}
                  </button>
                ))}
                <button onClick={() => void db.createRow()} className="rounded-xl bg-blue-600 px-4 py-2 text-sm text-white"><Plus className="mr-1 inline h-4 w-4" />新增记录</button>
              </div>
            </div>

            <div className="mb-6 grid grid-cols-[1fr_220px] gap-4">
              <input value={db.filter} onChange={(event) => db.setFilter(event.target.value)} placeholder="筛选记录..." className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-300" />
              <select value={db.sortBy} onChange={(event) => db.setSortBy(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-300">
                {db.selected.schema.map((field) => <option key={field.id} value={field.id}>按 {field.name} 排序</option>)}
              </select>
            </div>

            <div className="mb-6">
              <SchemaEditor schema={db.selected.schema} addField={db.addField} updateField={db.updateField} deleteField={db.deleteField} />
            </div>

            {db.view === "table" && <TableView schema={db.selected.schema} rows={db.rows} updateRow={db.updateRow} deleteRow={db.deleteRow} />}
            {db.view === "board" && <BoardView rows={db.rows} updateRow={db.updateRow} />}
            {db.view === "calendar" && <CalendarView rows={db.rows} />}
            {db.view === "gallery" && <GalleryView rows={db.rows} />}
          </>
        )}
      </section>
    </main>
  );
}
