"use client";

import { DragDropContext, Draggable, Droppable, type DropResult } from "@hello-pangea/dnd";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BitableContext, Field, Row, SelectOption } from "./types";
import { CellValue } from "./Cell";
import { optionColor } from "./fieldMeta";

const UNGROUPED = "__ungrouped__";

export function KanbanView({
  fields,
  rows,
  schema,
  groupField,
  ctx,
  onUpdateCell,
  onOpenRecord,
  onAddRow,
}: {
  fields: Field[];
  rows: Row[];
  schema: Field[];
  groupField: Field | null;
  ctx: BitableContext;
  onUpdateCell: (rowId: string, fieldId: string, value: unknown) => void;
  onOpenRecord: (rowId: string) => void;
  onAddRow: (groupValue: string | null) => void;
}) {
  if (!groupField || groupField.type !== "select") {
    return <div className="p-8 text-center text-sm text-slate-400">看板视图需要一个「单选」字段作为分组依据，请在视图设置中选择。</div>;
  }
  const primary = schema.find((f) => f.primary) ?? schema[0];
  const cardFields = fields.filter((f) => f.id !== primary.id && f.id !== groupField.id).slice(0, 4);

  const columns: { key: string; option: SelectOption | null }[] = [
    ...(groupField.options ?? []).map((o) => ({ key: o.id, option: o })),
    { key: UNGROUPED, option: null },
  ];
  const grouped = new Map<string, Row[]>();
  for (const col of columns) grouped.set(col.key, []);
  for (const row of rows) {
    const v = row.data[groupField.id];
    const key = v && grouped.has(String(v)) ? String(v) : UNGROUPED;
    grouped.get(key)!.push(row);
  }

  function onDragEnd(result: DropResult) {
    if (!result.destination) return;
    const dest = result.destination.droppableId;
    const rowId = result.draggableId;
    onUpdateCell(rowId, groupField!.id, dest === UNGROUPED ? "" : dest);
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex h-full gap-3 overflow-x-auto p-3">
        {columns.map((col) => {
          const items = grouped.get(col.key) ?? [];
          const c = col.option ? optionColor(col.option.color) : optionColor("gray");
          return (
            <div key={col.key} className="flex w-72 shrink-0 flex-col rounded-xl bg-slate-50">
              <div className="flex items-center justify-between px-3 py-2">
                <span className={cn("rounded px-1.5 py-0.5 text-xs font-medium", c.chip)}>
                  {col.option ? col.option.name : "未分组"}
                </span>
                <span className="text-xs text-slate-400">{items.length}</span>
              </div>
              <Droppable droppableId={col.key}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn("min-h-[40px] flex-1 space-y-2 overflow-y-auto px-2 pb-2", snapshot.isDraggingOver && "bg-blue-50")}
                  >
                    {items.map((row, i) => (
                      <Draggable key={row.id} draggableId={row.id} index={i}>
                        {(p, snap) => (
                          <div
                            ref={p.innerRef}
                            {...p.draggableProps}
                            {...p.dragHandleProps}
                            onClick={() => onOpenRecord(row.id)}
                            className={cn(
                              "rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm hover:border-slate-300",
                              snap.isDragging && "shadow-lg ring-2 ring-blue-400",
                            )}
                          >
                            <div className="mb-1.5 truncate text-sm font-medium text-slate-800">
                              {String(row.data[primary.id] ?? "未命名")}
                            </div>
                            <div className="space-y-1">
                              {cardFields.map((f) => {
                                const val = row.data[f.id];
                                if (val === null || val === undefined || val === "" || (Array.isArray(val) && !val.length)) return null;
                                return (
                                  <div key={f.id} className="flex items-center gap-1.5 text-xs text-slate-500">
                                    <span className="shrink-0 text-slate-400">{f.name}</span>
                                    <span className="truncate"><CellValue field={f} value={val} row={row} schema={schema} ctx={ctx} /></span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
              <button
                onClick={() => onAddRow(col.option ? col.option.id : null)}
                className="m-2 flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-slate-400 hover:bg-slate-100"
              >
                <Plus className="h-3.5 w-3.5" /> 新增
              </button>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}
