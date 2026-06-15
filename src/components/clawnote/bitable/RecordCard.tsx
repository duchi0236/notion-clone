"use client";

import { Trash2, X } from "lucide-react";
import type { BitableContext, Field, Row, Table } from "./types";
import { CellInput, CellValue, fieldIcon } from "./Cell";

export function RecordCard({
  table,
  row,
  ctx,
  onUpdateCell,
  onDelete,
  onClose,
  onPickLink,
}: {
  table: Table;
  row: Row;
  ctx: BitableContext;
  onUpdateCell: (rowId: string, fieldId: string, value: unknown) => void;
  onDelete: () => void;
  onClose: () => void;
  onPickLink: (field: Field) => void;
}) {
  const primary = table.schema.find((f) => f.primary) ?? table.schema[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4" onMouseDown={onClose}>
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <span className="text-xs text-slate-400">{table.icon} {table.name} · 记录</span>
          <div className="flex items-center gap-1">
            <button onClick={onDelete} className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500" title="删除记录">
              <Trash2 className="h-4 w-4" />
            </button>
            <button onClick={onClose} className="rounded p-1.5 text-slate-400 hover:bg-slate-100">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto px-5 py-4">
          <input
            value={String(row.data[primary.id] ?? "")}
            onChange={(e) => onUpdateCell(row.id, primary.id, e.target.value)}
            placeholder="未命名记录"
            className="mb-4 w-full border-b border-slate-200 pb-2 text-xl font-semibold outline-none placeholder:text-slate-300 focus:border-slate-400"
          />
          <div className="space-y-3">
            {table.schema.filter((f) => f.id !== primary.id).map((field) => (
              <div key={field.id} className="grid grid-cols-[120px_minmax(0,1fr)] items-start gap-3">
                <span className="flex items-center gap-1.5 pt-1.5 text-sm text-slate-500">
                  <span className="text-slate-400">{fieldIcon(field.type)}</span>
                  <span className="truncate">{field.name}</span>
                </span>
                <div className="min-h-[34px] rounded-lg border border-slate-200 px-3 py-1.5">
                  {field.type === "lookup" || field.type === "createdTime" ? (
                    <CellValue field={field} value={row.data[field.id]} row={row} schema={table.schema} ctx={ctx} />
                  ) : (
                    <CellInput
                      field={field}
                      value={row.data[field.id]}
                      onChange={(v) => onUpdateCell(row.id, field.id, v)}
                      onPickLink={() => onPickLink(field)}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
