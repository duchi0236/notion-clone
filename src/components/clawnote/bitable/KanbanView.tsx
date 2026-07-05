"use client";

import { useState } from "react";
import {
  DragDropContext,
  Draggable,
  Droppable,
  type DragUpdate,
  type DropResult,
} from "@hello-pangea/dnd";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BitableContext, Field, Row, SelectOption } from "./types";
import { CellValue } from "./Cell";
import { optionColor } from "./fieldMeta";

const UNGROUPED = "__ungrouped__";

/** 拖拽落点：col=目标列 key，index=横线应渲染在「列内第 index 张卡片之前」（>= 列长度表示列尾） */
type DropTarget = { col: string; index: number } | null;

export function KanbanView({
  fields,
  rows,
  schema,
  groupField,
  ctx,
  onOpenRecord,
  onAddRow,
  onReorder,
}: {
  fields: Field[];
  rows: Row[];
  schema: Field[];
  groupField: Field | null;
  ctx: BitableContext;
  onUpdateCell: (rowId: string, fieldId: string, value: unknown) => void;
  onOpenRecord: (rowId: string) => void;
  onAddRow: (groupValue: string | null) => void;
  onReorder: (updates: { id: string; sortIndex: number; data?: Record<string, unknown> }[]) => void;
}) {
  const [dropTarget, setDropTarget] = useState<DropTarget>(null);

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
  // 列内按 sortIndex 排序，Draggable 的 index 即该数组序
  grouped.forEach((list) => list.sort((a, b) => a.sortIndex - b.sortIndex));

  function onDragUpdate(update: DragUpdate) {
    if (!update.destination) {
      setDropTarget(null);
      return;
    }
    const { droppableId, index } = update.destination;
    let before = index;
    if (droppableId === update.source.droppableId) {
      if (index === update.source.index) {
        setDropTarget(null);
        return;
      }
      // 同列时 destination.index 是「最终位置」；映射为视觉上的插入间隙
      before = index > update.source.index ? index + 1 : index;
    }
    setDropTarget({ col: droppableId, index: before });
  }

  function onDragEnd(result: DropResult) {
    setDropTarget(null);
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const sourceItems = grouped.get(source.droppableId) ?? [];
    const moved = sourceItems[source.index];
    if (!moved || moved.id !== draggableId) return;

    const sameColumn = destination.droppableId === source.droppableId;
    const destItems = sameColumn ? sourceItems : (grouped.get(destination.droppableId) ?? []);
    const newDest = [...destItems];
    if (sameColumn) newDest.splice(source.index, 1);
    newDest.splice(destination.index, 0, moved);

    // 目标列全部行按新顺序重编 sortIndex；被移动行跨列时额外携带分组字段变更
    const destOptionId = destination.droppableId === UNGROUPED ? null : destination.droppableId;
    const updates = newDest.map((r, i) => {
      const u: { id: string; sortIndex: number; data?: Record<string, unknown> } = { id: r.id, sortIndex: i };
      if (!sameColumn && r.id === moved.id) u.data = { [groupField!.id]: destOptionId };
      return u;
    });
    onReorder(updates);
  }

  return (
    <DragDropContext onDragEnd={onDragEnd} onDragUpdate={onDragUpdate}>
      <div className="flex h-full gap-3 overflow-x-auto p-3">
        {columns.map((col) => {
          const items = grouped.get(col.key) ?? [];
          const c = col.option ? optionColor(col.option.color) : optionColor("gray");
          const dropAtEnd = dropTarget !== null && dropTarget.col === col.key && dropTarget.index >= items.length;
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
                    className={cn(
                      "min-h-[64px] flex-1 space-y-2 overflow-y-auto rounded-lg border-2 border-transparent px-2 pb-2",
                      snapshot.isDraggingOver && "border-dashed border-blue-300 bg-blue-50",
                    )}
                  >
                    {items.length === 0 && !snapshot.isDraggingOver && (
                      <div className="px-2 py-6 text-center text-xs text-slate-300">暂无记录</div>
                    )}
                    {items.length === 0 && snapshot.isDraggingOver && (
                      <div className="px-2 py-6 text-center text-xs text-blue-400">拖到此处</div>
                    )}
                    {items.map((row, i) => {
                      const showDropLine =
                        dropTarget !== null && dropTarget.col === col.key && dropTarget.index === i;
                      return (
                        <Draggable key={row.id} draggableId={row.id} index={i}>
                          {(p, snap) => (
                            <div
                              ref={p.innerRef}
                              {...p.draggableProps}
                              {...p.dragHandleProps}
                              role="button"
                              tabIndex={0}
                              onClick={() => {
                                if (snap.isDragging) return;
                                onOpenRecord(row.id);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  onOpenRecord(row.id);
                                }
                              }}
                              className={cn(
                                "relative cursor-pointer rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm hover:border-slate-300 active:bg-slate-50",
                                snap.isDragging && "rotate-1 shadow-lg ring-2 ring-blue-400",
                              )}
                            >
                              {showDropLine && !snap.isDragging && (
                                <div aria-hidden className="pointer-events-none absolute inset-x-1 -top-[5px] h-[2px] rounded-full bg-blue-500" />
                              )}
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
                      );
                    })}
                    {/* placeholder 外包容器：撑住落位空间，列尾落点渲染 2px 蓝色横线 */}
                    <div className={cn(snapshot.isDraggingOver && "min-h-[2px]")}>
                      {dropAtEnd && items.length > 0 && (
                        <div aria-hidden className="pointer-events-none mx-1 h-[2px] rounded-full bg-blue-500" />
                      )}
                      {provided.placeholder}
                    </div>
                  </div>
                )}
              </Droppable>
              <button
                onClick={() => onAddRow(col.option ? col.option.id : null)}
                className="m-2 flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-slate-400 transition-colors hover:bg-slate-100 active:bg-slate-200"
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
