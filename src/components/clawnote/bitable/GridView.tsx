"use client";

import { useState } from "react";
import { ChevronDown, Maximize2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BitableContext, Field, Row } from "./types";
import { CellInput, CellValue, fieldIcon } from "./Cell";

type Props = {
  fields: Field[]; // visible fields, ordered
  rows: Row[]; // already filtered + sorted
  ctx: BitableContext;
  schema: Field[]; // full schema (for lookup)
  onUpdateCell: (rowId: string, fieldId: string, value: unknown) => void;
  onAddRow: () => void;
  onOpenRecord: (rowId: string) => void;
  onAddField: () => void;
  onEditField: (fieldId: string) => void;
  onResizeField: (fieldId: string, width: number) => void;
  onPickLink: (rowId: string, field: Field) => void;
};

const ROW_NO_W = 56;

export function GridView({
  fields,
  rows,
  ctx,
  schema,
  onUpdateCell,
  onAddRow,
  onOpenRecord,
  onAddField,
  onEditField,
  onResizeField,
  onPickLink,
}: Props) {
  const [editing, setEditing] = useState<{ rowId: string; fieldId: string } | null>(null);
  const [draft, setDraft] = useState<unknown>(null);
  const [hoverRow, setHoverRow] = useState<string | null>(null);

  function startEdit(rowId: string, field: Field, value: unknown) {
    if (field.type === "lookup" || field.type === "createdTime") return;
    setEditing({ rowId, fieldId: field.id });
    setDraft(value);
  }
  function commit() {
    if (editing) onUpdateCell(editing.rowId, editing.fieldId, draft);
    setEditing(null);
  }

  function startResize(e: React.MouseEvent, field: Field) {
    e.stopPropagation();
    e.preventDefault();
    const startX = e.clientX;
    const startW = field.width ?? 160;
    function move(ev: MouseEvent) {
      const w = Math.max(80, startW + ev.clientX - startX);
      onResizeField(field.id, w);
    }
    function up() {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    }
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  }

  return (
    <div className="h-full overflow-auto">
      <div className="inline-block min-w-full">
        {/* Header */}
        <div className="sticky top-0 z-10 flex border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
          <div className="shrink-0 border-r border-slate-200 px-2 py-2 text-center text-slate-400" style={{ width: ROW_NO_W }}>
            #
          </div>
          {fields.map((field) => (
            <div
              key={field.id}
              className="group relative shrink-0 border-r border-slate-200"
              style={{ width: field.width ?? 160 }}
            >
              <button
                onClick={() => onEditField(field.id)}
                className="flex w-full items-center gap-1.5 px-2 py-2 text-left hover:bg-slate-100"
              >
                <span className="text-slate-400">{fieldIcon(field.type)}</span>
                <span className="flex-1 truncate">{field.name}</span>
                <ChevronDown className="h-3 w-3 text-slate-300 opacity-0 group-hover:opacity-100" />
              </button>
              <span
                onMouseDown={(e) => startResize(e, field)}
                className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-400"
              />
            </div>
          ))}
          <button onClick={onAddField} className="shrink-0 px-3 py-2 text-slate-400 hover:bg-slate-100" title="新增字段">
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        {rows.map((row, i) => (
          <div
            key={row.id}
            onMouseEnter={() => setHoverRow(row.id)}
            onMouseLeave={() => setHoverRow((r) => (r === row.id ? null : r))}
            className="flex border-b border-slate-100 hover:bg-slate-50/50"
          >
            <div
              className="relative flex shrink-0 items-center justify-center border-r border-slate-100 text-xs text-slate-400"
              style={{ width: ROW_NO_W }}
            >
              {hoverRow === row.id ? (
                <button onClick={() => onOpenRecord(row.id)} className="rounded p-1 text-slate-500 hover:bg-slate-200" title="展开记录">
                  <Maximize2 className="h-3.5 w-3.5" />
                </button>
              ) : (
                i + 1
              )}
            </div>
            {fields.map((field) => {
              const isEditing = editing?.rowId === row.id && editing.fieldId === field.id;
              return (
                <div
                  key={field.id}
                  onClick={() => !isEditing && startEdit(row.id, field, row.data[field.id])}
                  onKeyDown={(e) => {
                    if (!isEditing) return;
                    if (e.key === "Enter" && field.type !== "longText") {
                      e.preventDefault();
                      commit();
                    } else if (e.key === "Escape") {
                      setEditing(null);
                    }
                  }}
                  className={cn(
                    "shrink-0 border-r border-slate-100 px-2 py-1.5 text-sm",
                    isEditing && "ring-2 ring-inset ring-blue-400",
                  )}
                  style={{ width: field.width ?? 160 }}
                >
                  {isEditing ? (
                    <CellInput
                      field={field}
                      value={draft}
                      autoFocus
                      onChange={setDraft}
                      onCommit={commit}
                      onPickLink={() => onPickLink(row.id, field)}
                    />
                  ) : (
                    <div className="flex min-h-[20px] items-center overflow-hidden">
                      <CellValue field={field} value={row.data[field.id]} row={row} schema={schema} ctx={ctx} />
                    </div>
                  )}
                </div>
              );
            })}
            <div className="shrink-0 px-3" />
          </div>
        ))}

        {/* Add row */}
        <button
          onClick={onAddRow}
          className="flex w-full items-center gap-1.5 border-b border-slate-100 px-2 py-2 text-sm text-slate-400 hover:bg-slate-50"
        >
          <Plus className="h-4 w-4" /> 新增记录
        </button>
      </div>

      <div className="px-3 py-2 text-xs text-slate-400">共 {rows.length} 条记录</div>
    </div>
  );
}
