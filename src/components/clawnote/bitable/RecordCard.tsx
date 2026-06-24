"use client";

import { Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm" onMouseDown={onClose}>
      <div className="flex max-h-[85vh] w-full max-w-xl flex-col overflow-hidden rounded-[20px] bg-white shadow-2xl ring-1 ring-slate-900/5" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
            <span>{table.icon}</span> {table.name}
          </span>
          <div className="flex items-center gap-1">
            <button onClick={onDelete} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500" title="删除记录">
              <Trash2 className="h-4 w-4" />
            </button>
            <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700" title="关闭">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto px-6 pb-6 pt-1">
          <input
            value={String(row.data[primary.id] ?? "")}
            onChange={(e) => onUpdateCell(row.id, primary.id, e.target.value)}
            placeholder="未命名记录"
            className="mb-5 w-full rounded-lg bg-transparent px-1.5 py-1 text-2xl font-bold tracking-tight text-slate-900 outline-none transition-colors placeholder:text-slate-300 hover:bg-slate-500/10 focus:bg-slate-500/10"
          />
          <div className="space-y-1">
            {table.schema.filter((f) => f.id !== primary.id).map((field) => {
              const multiline = field.type === "longText";
              return (
                <div key={field.id} className={cn("grid grid-cols-[112px_minmax(0,1fr)] gap-2", multiline ? "items-start" : "items-center")}>
                  <span className={cn("flex items-center gap-1.5 text-[13px] text-slate-400", multiline && "pt-2")}>
                    <span className="flex text-slate-400 [&_svg]:h-3.5 [&_svg]:w-3.5">{fieldIcon(field.type)}</span>
                    <span className="truncate">{field.name}</span>
                  </span>
                  <div className="min-h-[34px] rounded-lg px-2.5 py-1.5 transition-colors hover:bg-slate-500/10">
                    {["lookup", "formula", "autoNumber", "createdTime", "modifiedTime"].includes(field.type) ? (
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
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
