"use client";

import { useState } from "react";
import { ChevronDown, Maximize2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AggType, BitableContext, Field, Row } from "./types";
import { CellInput, CellValue, fieldIcon } from "./Cell";
import { AGG_LABELS, aggOptions, aggregate, fieldScalar } from "./formula";

type Props = {
  fields: Field[]; // visible fields, ordered
  rows: Row[]; // already filtered + sorted
  ctx: BitableContext;
  schema: Field[]; // full schema (for lookup)
  groupField?: Field | null; // grid 行分组字段
  aggregations?: Record<string, AggType>;
  onUpdateCell: (rowId: string, fieldId: string, value: unknown) => void;
  onAddRow: () => void;
  onOpenRecord: (rowId: string) => void;
  onAddField: () => void;
  onEditField: (fieldId: string) => void;
  onResizeField: (fieldId: string, width: number) => void;
  onSetAgg: (fieldId: string, agg: AggType) => void;
  onPickLink: (rowId: string, field: Field) => void;
};

const ROW_NO_W = 56;
const READONLY_TYPES = ["lookup", "formula", "autoNumber", "createdTime", "modifiedTime"];

export function GridView({
  fields,
  rows,
  ctx,
  schema,
  groupField,
  aggregations,
  onUpdateCell,
  onAddRow,
  onOpenRecord,
  onAddField,
  onEditField,
  onResizeField,
  onSetAgg,
  onPickLink,
}: Props) {
  const [editing, setEditing] = useState<{ rowId: string; fieldId: string } | null>(null);
  const [draft, setDraft] = useState<unknown>(null);
  const [hoverRow, setHoverRow] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  // 行分组：按分组字段的显示值聚成若干组（保持原有顺序）
  const groups = (() => {
    if (!groupField) return [{ key: "__all__", label: "", rows }];
    const map = new Map<string, { key: string; label: string; rows: Row[] }>();
    for (const r of rows) {
      const sc = fieldScalar(groupField, r.data[groupField.id]);
      const label = sc === null || sc === "" ? "（空）" : String(sc);
      if (!map.has(label)) map.set(label, { key: label, label, rows: [] });
      map.get(label)!.rows.push(r);
    }
    return Array.from(map.values());
  })();

  const totalWidth = fields.reduce((w, f) => w + (f.width ?? 160), ROW_NO_W) + 48;

  function startEdit(rowId: string, field: Field, value: unknown) {
    if (READONLY_TYPES.includes(field.type)) return;
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

  function toggleGroup(key: string) {
    setCollapsed((c) => {
      const n = new Set(c);
      if (n.has(key)) n.delete(key); else n.add(key);
      return n;
    });
  }

  function renderRow(row: Row, displayIdx: number) {
    return (
      <div
        key={row.id}
        onMouseEnter={() => setHoverRow(row.id)}
        onMouseLeave={() => setHoverRow((r) => (r === row.id ? null : r))}
        className="flex border-b border-slate-100 hover:bg-slate-50/50"
      >
        <div className="relative flex shrink-0 items-center justify-center border-r border-slate-100 text-xs text-slate-400" style={{ width: ROW_NO_W }}>
          {hoverRow === row.id ? (
            <button onClick={() => onOpenRecord(row.id)} className="rounded p-1 text-slate-500 hover:bg-slate-200" title="展开记录">
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          ) : (
            displayIdx + 1
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
                if (e.key === "Enter" && field.type !== "longText") { e.preventDefault(); commit(); }
                else if (e.key === "Escape") setEditing(null);
              }}
              className={cn("shrink-0 border-r border-slate-100 px-2 py-1.5 text-sm", isEditing && "ring-2 ring-inset ring-blue-400")}
              style={{ width: field.width ?? 160 }}
            >
              {isEditing ? (
                <CellInput field={field} value={draft} autoFocus onChange={setDraft} onCommit={commit} onPickLink={() => onPickLink(row.id, field)} />
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
    );
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

        {/* Body（支持按字段分组：折叠分组头 + 每组小计） */}
        {(() => {
          let idx = 0;
          return groups.map((g) => {
            const isCollapsed = collapsed.has(g.key);
            return (
              <div key={g.key}>
                {groupField && (
                  <button
                    onClick={() => toggleGroup(g.key)}
                    className="flex items-center gap-2 border-b border-slate-100 bg-slate-100/70 px-2 py-1.5 text-left text-xs font-medium text-slate-600"
                    style={{ width: totalWidth }}
                  >
                    <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 transition-transform", isCollapsed && "-rotate-90")} />
                    <span className="text-slate-400">{fieldIcon(groupField.type)}</span>
                    <span className="truncate">{g.label}</span>
                    <span className="rounded-full bg-slate-200 px-1.5 text-[10px] text-slate-500">{g.rows.length}</span>
                  </button>
                )}
                {!isCollapsed && g.rows.map((row) => renderRow(row, idx++))}
                {groupField && !isCollapsed && (
                  <div className="flex border-b border-slate-200 bg-slate-50/60 text-xs">
                    <div className="shrink-0 border-r border-slate-100 px-2 py-1 text-[10px] text-slate-400" style={{ width: ROW_NO_W }}>小计</div>
                    {fields.map((field) => {
                      const agg = aggregations?.[field.id] ?? "none";
                      return (
                        <div key={field.id} className="shrink-0 border-r border-slate-100 px-2 py-1 text-right tabular-nums text-slate-600" style={{ width: field.width ?? 160 }}>
                          {agg === "none" ? "" : aggregate(agg, field, g.rows, schema)}
                        </div>
                      );
                    })}
                    <div className="shrink-0 px-3" />
                  </div>
                )}
              </div>
            );
          });
        })()}

        {/* Add row */}
        <button
          onClick={onAddRow}
          className="flex w-full items-center gap-1.5 border-b border-slate-100 px-2 py-2 text-sm text-slate-400 hover:bg-slate-50"
        >
          <Plus className="h-4 w-4" /> 新增记录
        </button>

        {/* 汇总行：每列可选聚合方式 */}
        <div className="sticky bottom-0 z-10 flex border-t border-slate-200 bg-slate-50 text-xs">
          <div className="flex shrink-0 items-center justify-center border-r border-slate-200 px-2 py-1.5 text-slate-400" style={{ width: ROW_NO_W }}>
            {rows.length}
          </div>
          {fields.map((field) => (
            <AggFooterCell
              key={field.id}
              field={field}
              rows={rows}
              schema={schema}
              agg={aggregations?.[field.id] ?? "none"}
              onSet={(a) => onSetAgg(field.id, a)}
            />
          ))}
          <div className="shrink-0 px-3" />
        </div>
      </div>
    </div>
  );
}

function AggFooterCell({
  field,
  rows,
  schema,
  agg,
  onSet,
}: {
  field: Field;
  rows: Row[];
  schema: Field[];
  agg: AggType;
  onSet: (a: AggType) => void;
}) {
  const [open, setOpen] = useState(false);
  const opts = aggOptions(field);
  const value = agg === "none" ? "" : aggregate(agg, field, rows, schema);
  return (
    <div className="relative shrink-0 border-r border-slate-200" style={{ width: field.width ?? 160 }}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-end gap-1 px-2 py-1.5 text-right text-slate-500 hover:bg-slate-100"
      >
        {agg === "none" ? (
          <span className="text-slate-300">汇总</span>
        ) : (
          <>
            <span className="text-[10px] text-slate-400">{AGG_LABELS[agg]}</span>
            <span className="font-medium tabular-nums text-slate-700">{value}</span>
          </>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full left-0 z-30 mb-1 w-32 rounded-lg border border-slate-200 bg-white p-1 shadow-xl">
            {opts.map((o) => (
              <button
                key={o}
                onClick={() => {
                  onSet(o);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between rounded px-2 py-1 text-left text-xs hover:bg-slate-50",
                  o === agg ? "text-blue-600" : "text-slate-600",
                )}
              >
                {AGG_LABELS[o]}
                {o === agg && <span>✓</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
