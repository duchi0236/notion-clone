"use client";

import { Plus } from "lucide-react";
import type { BitableContext, Field, Row } from "./types";
import { CellValue } from "./Cell";

export function GalleryView({
  fields,
  rows,
  schema,
  ctx,
  onOpenRecord,
  onAddRow,
}: {
  fields: Field[];
  rows: Row[];
  schema: Field[];
  ctx: BitableContext;
  onOpenRecord: (rowId: string) => void;
  onAddRow: () => void;
}) {
  const primary = schema.find((f) => f.primary) ?? schema[0];
  const cardFields = fields.filter((f) => f.id !== primary.id).slice(0, 5);

  return (
    <div className="grid grid-cols-1 gap-3 overflow-y-auto p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {rows.map((row) => (
        <button
          key={row.id}
          onClick={() => onOpenRecord(row.id)}
          className="rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-slate-300 hover:shadow-md"
        >
          <div className="mb-2 truncate text-sm font-semibold text-slate-800">{String(row.data[primary.id] ?? "未命名")}</div>
          <div className="space-y-1.5">
            {cardFields.map((f) => {
              const val = row.data[f.id];
              return (
                <div key={f.id} className="flex items-start gap-2 text-xs">
                  <span className="w-14 shrink-0 truncate text-slate-400">{f.name}</span>
                  <span className="min-w-0 flex-1 text-slate-600">
                    <CellValue field={f} value={val} row={row} schema={schema} ctx={ctx} />
                  </span>
                </div>
              );
            })}
          </div>
        </button>
      ))}
      <button
        onClick={onAddRow}
        className="flex min-h-[120px] items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 text-sm text-slate-400 hover:border-slate-400 hover:text-slate-600"
      >
        <Plus className="h-4 w-4" /> 新增记录
      </button>
    </div>
  );
}
