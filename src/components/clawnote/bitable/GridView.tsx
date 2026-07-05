"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, Maximize2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDismiss } from "@/hooks/useDismiss";
import type { AggType, BitableContext, Field, FormatRule, Row } from "./types";
import { CellInput, CellValue, fieldIcon } from "./Cell";
import { cellValue, FORMAT_TINTS, matchFormats } from "./fieldMeta";
import { AGG_LABELS, aggOptions, aggregate, fieldScalar } from "./formula";

type Props = {
  fields: Field[]; // visible fields, ordered
  rows: Row[]; // already filtered + sorted
  ctx: BitableContext;
  schema: Field[]; // full schema (for lookup)
  groupField?: Field | null; // grid 行分组字段
  aggregations?: Record<string, AggType>;
  formats?: FormatRule[]; // 条件格式规则（view.formats）
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
const READONLY_TYPES = ["lookup", "formula", "autoNumber", "createdTime", "modifiedTime", "createdBy", "modifiedBy"];

export function GridView({
  fields,
  rows,
  ctx,
  schema,
  groupField,
  aggregations,
  formats,
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
  // draft 的同步镜像：附件等控件在同一事件里 onChange 后立即 onCommit，
  // state 尚未重渲染，提交时从 ref 读最新值，避免提交到旧草稿。
  const draftRef = useRef<unknown>(null);
  const updateDraft = useCallback((v: unknown) => {
    draftRef.current = v;
    setDraft(v);
  }, []);
  const [hoverRow, setHoverRow] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  // 网格内键盘焦点：以单元格 div 的 ref 记录，提交/方向键移动后恢复焦点。
  const cellRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const cellKey = (rowId: string, fieldId: string) => `${rowId}:${fieldId}`;
  const setCellRef = useCallback((key: string, el: HTMLDivElement | null) => {
    if (el) cellRefs.current.set(key, el);
    else cellRefs.current.delete(key);
  }, []);
  const focusCell = useCallback((rowId: string, fieldId: string) => {
    requestAnimationFrame(() => cellRefs.current.get(cellKey(rowId, fieldId))?.focus());
  }, []);

  // 行分组：按分组字段的显示值聚成若干组（保持原有顺序）
  const groups = (() => {
    if (!groupField) return [{ key: "__all__", label: "", rows }];
    const map = new Map<string, { key: string; label: string; rows: Row[] }>();
    for (const r of rows) {
      const sc = fieldScalar(groupField, cellValue(groupField, r));
      const label = sc === null || sc === "" ? "（空）" : String(sc);
      if (!map.has(label)) map.set(label, { key: label, label, rows: [] });
      map.get(label)!.rows.push(r);
    }
    return Array.from(map.values());
  })();

  const totalWidth = fields.reduce((w, f) => w + (f.width ?? 160), ROW_NO_W) + 48;

  // 当前可见（未折叠）行的扁平顺序，用于方向键 / Enter 跨行移动。
  const visibleRows: Row[] = groups.flatMap((g) => (collapsed.has(g.key) ? [] : g.rows));

  function startEdit(rowId: string, field: Field, value: unknown) {
    if (READONLY_TYPES.includes(field.type)) return;
    setEditing({ rowId, fieldId: field.id });
    updateDraft(value);
  }
  // advance: "down" 提交后跳到下一行同列；"self" 提交后焦点回当前格（键盘提交）；
  // undefined（来自 onBlur）不夺取焦点，避免与点击其它格冲突。
  function commit(advance?: "down" | "self") {
    const cur = editing;
    if (cur) onUpdateCell(cur.rowId, cur.fieldId, draftRef.current);
    setEditing(null);
    // Only move focus on explicit keyboard intents. onBlur passes a FocusEvent
    // (truthy) — must not be treated as an advance, or it yanks focus back.
    if (!cur || (advance !== "down" && advance !== "self")) return;
    if (advance === "down") {
      const ri = visibleRows.findIndex((r) => r.id === cur.rowId);
      const next = ri >= 0 && ri < visibleRows.length - 1 ? visibleRows[ri + 1] : null;
      focusCell(next ? next.id : cur.rowId, cur.fieldId);
    } else {
      focusCell(cur.rowId, cur.fieldId);
    }
  }

  // 网格容器键盘导航：未编辑态用方向键 / Tab 在格间移动，Enter 进入编辑。
  function onGridKeyDown(e: React.KeyboardEvent, rowId: string, field: Field) {
    if (editing) return; // 编辑态由单元格内部 onKeyDown 处理
    const ri = visibleRows.findIndex((r) => r.id === rowId);
    const ci = fields.findIndex((f) => f.id === field.id);
    if (ri < 0 || ci < 0) return;
    const go = (r: number, c: number) => {
      const row = visibleRows[r];
      const col = fields[c];
      if (row && col) {
        e.preventDefault();
        focusCell(row.id, col.id);
      }
    };
    switch (e.key) {
      case "ArrowDown":
        go(Math.min(ri + 1, visibleRows.length - 1), ci);
        break;
      case "ArrowUp":
        go(Math.max(ri - 1, 0), ci);
        break;
      case "ArrowRight":
        go(ri, Math.min(ci + 1, fields.length - 1));
        break;
      case "ArrowLeft":
        go(ri, Math.max(ci - 1, 0));
        break;
      case "Tab": {
        e.preventDefault();
        let nr = ri;
        let nc = ci + (e.shiftKey ? -1 : 1);
        if (nc >= fields.length) { nc = 0; nr = Math.min(ri + 1, visibleRows.length - 1); }
        else if (nc < 0) { nc = fields.length - 1; nr = Math.max(ri - 1, 0); }
        go(nr, nc);
        break;
      }
      case "Enter":
        if (!READONLY_TYPES.includes(field.type)) {
          e.preventDefault();
          startEdit(rowId, field, cellValue(field, visibleRows[ri]));
        }
        break;
      default:
        break;
    }
  }

  function startResize(e: React.MouseEvent, field: Field) {
    e.stopPropagation();
    e.preventDefault();
    const startX = e.clientX;
    const startW = field.width ?? 160;
    const prevCursor = document.body.style.cursor;
    const prevSelect = document.body.style.userSelect;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    function move(ev: MouseEvent) {
      const w = Math.max(80, startW + ev.clientX - startX);
      onResizeField(field.id, w);
    }
    function up() {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      document.body.style.cursor = prevCursor;
      document.body.style.userSelect = prevSelect;
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
    // 条件格式：整行规则着色所有数据单元格（行号列除外），单元格规则优先于行规则
    const fmt = matchFormats(row, schema, formats);
    return (
      <div
        key={row.id}
        onMouseEnter={() => setHoverRow(row.id)}
        onMouseLeave={() => setHoverRow((r) => (r === row.id ? null : r))}
        className="flex border-b border-slate-100 hover:bg-slate-50/50"
      >
        <div className="group/no relative flex shrink-0 items-center justify-center border-r border-slate-100 text-xs text-slate-400" style={{ width: ROW_NO_W }}>
          <span
            className={cn(
              "transition-opacity",
              hoverRow === row.id ? "opacity-0" : "opacity-100",
            )}
          >
            {displayIdx + 1}
          </span>
          <button
            onClick={() => onOpenRecord(row.id)}
            tabIndex={hoverRow === row.id ? 0 : -1}
            className={cn(
              "absolute rounded p-1 text-slate-500 transition-opacity hover:bg-slate-200 focus-visible:opacity-100",
              hoverRow === row.id ? "opacity-100" : "opacity-0",
            )}
            title="展开记录"
            aria-label="展开记录"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        </div>
        {fields.map((field) => {
          const isEditing = editing?.rowId === row.id && editing.fieldId === field.id;
          const readOnly = READONLY_TYPES.includes(field.type);
          const tintColor = fmt.cellColors[field.id] ?? fmt.rowColor;
          const value = cellValue(field, row);
          return (
            <div
              key={field.id}
              ref={(el) => setCellRef(cellKey(row.id, field.id), el)}
              role="gridcell"
              tabIndex={isEditing ? -1 : 0}
              aria-readonly={readOnly || undefined}
              title={readOnly ? "自动计算，不可编辑" : undefined}
              onClick={() => !isEditing && startEdit(row.id, field, value)}
              onKeyDown={(e) => {
                if (!isEditing) {
                  onGridKeyDown(e, row.id, field);
                  return;
                }
                if (e.key === "Enter" && field.type !== "longText") { e.preventDefault(); commit("down"); }
                else if (e.key === "Escape") { e.preventDefault(); setEditing(null); focusCell(row.id, field.id); }
              }}
              className={cn(
                // 格式底色放在 hover/选中类之前，保证不覆盖交互态
                tintColor ? FORMAT_TINTS[tintColor] : undefined,
                "shrink-0 border-r border-slate-100 px-2 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500/60",
                readOnly ? "cursor-default" : "cursor-cell",
                isEditing && "ring-2 ring-inset ring-blue-400",
              )}
              style={{ width: field.width ?? 160 }}
            >
              {isEditing ? (
                <CellInput field={field} value={draft} autoFocus onChange={updateDraft} onCommit={commit} onPickLink={() => onPickLink(row.id, field)} />
              ) : (
                <div className="flex min-h-[20px] items-center overflow-hidden">
                  <CellValue field={field} value={value} row={row} schema={schema} ctx={ctx} />
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
                aria-haspopup="dialog"
                aria-label={`字段 ${field.name} 设置`}
                className="flex w-full items-center gap-1.5 px-2 py-2 text-left hover:bg-slate-100"
              >
                <span className="text-slate-400">{fieldIcon(field.type)}</span>
                <span className="flex-1 truncate">{field.name}</span>
                <ChevronDown className="h-3 w-3 text-slate-300 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100" />
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
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const opts = aggOptions(field);
  const value = agg === "none" ? "" : aggregate(agg, field, rows, schema);

  useDismiss({ open, onClose: () => setOpen(false), refs: [panelRef, triggerRef] });
  // 打开后聚焦第一项；关闭后归还焦点给触发按钮。
  useEffect(() => {
    if (open) {
      const raf = requestAnimationFrame(() => panelRef.current?.querySelector<HTMLElement>("button")?.focus());
      return () => cancelAnimationFrame(raf);
    }
  }, [open]);

  return (
    <div className="relative shrink-0 border-r border-slate-200" style={{ width: field.width ?? 160 }}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          if (open) triggerRef.current?.focus();
          setOpen((v) => !v);
        }}
        aria-haspopup="menu"
        aria-expanded={open}
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
        <div
          ref={panelRef}
          role="menu"
          className="absolute bottom-full left-0 z-30 mb-1 w-32 rounded-lg border border-slate-200 bg-white p-1 shadow-xl"
        >
          {opts.map((o) => (
            <button
              key={o}
              type="button"
              role="menuitemradio"
              aria-checked={o === agg}
              onClick={() => {
                onSet(o);
                setOpen(false);
                triggerRef.current?.focus();
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
      )}
    </div>
  );
}
