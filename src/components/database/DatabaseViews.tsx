"use client";

import type { CollectionRow, FieldSchema } from "./types";

export function TableView({ schema, rows, updateRow, deleteRow }: { schema: FieldSchema[]; rows: CollectionRow[]; updateRow: (row: CollectionRow, data: Record<string, unknown>) => void; deleteRow: (id: string) => void }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              {schema.map((field) => <th key={field.id} className="border-b border-slate-200 px-4 py-3 text-left font-medium">{field.name}</th>)}
              <th className="border-b border-slate-200 px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-slate-100 last:border-0">
                {schema.map((field) => (
                  <td key={field.id} className="px-4 py-3">
                    <Cell field={field} value={row.data?.[field.id]} onChange={(value) => updateRow(row, { ...row.data, [field.id]: value })} />
                  </td>
                ))}
                <td className="px-4 py-3 text-right"><button onClick={() => deleteRow(row.id)} className="text-xs text-red-500">删除</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Cell({ field, value, onChange }: { field: FieldSchema; value: unknown; onChange: (value: string) => void }) {
  if (field.type === "select") {
    return <select defaultValue={String(value ?? "")} onBlur={(event) => onChange(event.currentTarget.value)} className="w-full rounded-lg border border-slate-200 px-2 py-1"><option value="">空</option>{field.options?.map((option) => <option key={option} value={option}>{option}</option>)}</select>;
  }
  if (field.type === "checkbox") {
    return <input type="checkbox" defaultChecked={Boolean(value)} onChange={(event) => onChange(event.target.checked ? "true" : "false")} />;
  }
  return <input defaultValue={String(value ?? "")} onBlur={(event) => onChange(event.currentTarget.value)} className="w-full rounded-lg border border-transparent px-2 py-1 outline-none hover:border-slate-200 focus:border-blue-300" />;
}

export function BoardView({ rows, updateRow }: { rows: CollectionRow[]; updateRow: (row: CollectionRow, data: Record<string, unknown>) => void }) {
  const statuses = ["未开始", "进行中", "已完成"];
  return <div className="grid grid-cols-3 gap-4">{statuses.map((status) => <section key={status} className="rounded-3xl border border-slate-200 bg-white p-4"><h3 className="mb-4 font-semibold">{status}</h3><div className="space-y-3">{rows.filter((row) => row.data?.status === status).map((row) => <div key={row.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-3"><div className="font-medium">{String(row.data?.name ?? "未命名")}</div><div className="mt-2 text-xs text-slate-500">{String(row.data?.owner ?? "未分配")}</div><div className="mt-3 flex gap-2">{statuses.filter((next) => next !== status).map((next) => <button key={next} onClick={() => updateRow(row, { ...row.data, status: next })} className="rounded-lg bg-white px-2 py-1 text-xs">→ {next}</button>)}</div></div>)}</div></section>)}</div>;
}

export function CalendarView({ rows }: { rows: CollectionRow[] }) {
  return <div className="grid grid-cols-7 gap-3">{rows.map((row) => <div key={row.id} className="rounded-2xl border border-slate-200 bg-white p-3"><div className="text-xs text-slate-400">{String(row.data?.dueDate ?? "无日期")}</div><div className="mt-2 font-medium">{String(row.data?.name ?? "未命名")}</div><div className="mt-1 text-xs text-slate-500">{String(row.data?.status ?? "")}</div></div>)}</div>;
}

export function GalleryView({ rows }: { rows: CollectionRow[] }) {
  return <div className="grid grid-cols-3 gap-4">{rows.map((row) => <div key={row.id} className="rounded-3xl border border-slate-200 bg-white p-5"><div className="mb-3 h-24 rounded-2xl bg-gradient-to-br from-blue-100 to-violet-100" /><h3 className="font-semibold">{String(row.data?.name ?? "未命名")}</h3><p className="mt-1 text-sm text-slate-500">{String(row.data?.status ?? "")}</p></div>)}</div>;
}
