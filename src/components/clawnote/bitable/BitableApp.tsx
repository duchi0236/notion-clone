"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Copy, LayoutGrid, MoreHorizontal, Pencil, Plus, Table2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { uid } from "../pro/api";
import { bitableApi } from "./api";
import type { BaseSummary, Field, Row, Table, View, ViewType } from "./types";
import { newId, primaryField } from "./types";
import { applyView } from "./fieldMeta";
import { GridView } from "./GridView";
import { KanbanView } from "./KanbanView";
import { GalleryView } from "./GalleryView";
import { FormView } from "./FormView";
import { CalendarBitableView } from "./CalendarBitableView";
import { GanttView } from "./GanttView";
import { Toolbar } from "./Toolbar";
import { FieldEditor } from "./FieldEditor";
import { RecordCard } from "./RecordCard";
import { LinkPicker } from "./LinkPicker";

const VIEW_LABELS: Record<ViewType, string> = { grid: "表格", kanban: "看板", gallery: "画册", form: "表单", calendar: "日历", gantt: "甘特" };

export default function BitableApp() {
  const [bases, setBases] = useState<BaseSummary[]>([]);
  const [activeBaseId, setActiveBaseId] = useState<string | null>(null);
  const [tables, setTables] = useState<Table[]>([]);
  const [activeTableId, setActiveTableId] = useState<string | null>(null);
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [fieldDraft, setFieldDraft] = useState<{ field: Field; isNew: boolean } | null>(null);
  const [addViewOpen, setAddViewOpen] = useState(false);
  const [recordRowId, setRecordRowId] = useState<string | null>(null);
  const [linkCtx, setLinkCtx] = useState<{ rowId: string; field: Field } | null>(null);
  const resizeTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // ---- Load bases ----------------------------------------------------------
  useEffect(() => {
    void (async () => {
      const res = await bitableApi.listBases();
      setBases(res?.bases ?? []);
      if (res?.bases?.length) setActiveBaseId(res.bases[0].id);
      setLoading(false);
    })();
  }, []);

  // ---- Load active base detail --------------------------------------------
  const loadBase = useCallback(async (baseId: string) => {
    const res = await bitableApi.getBase(baseId);
    if (res?.base) {
      setTables(res.base.tables);
      setActiveTableId((cur) => (res.base.tables.some((t) => t.id === cur) ? cur : res.base.tables[0]?.id ?? null));
    }
  }, []);
  useEffect(() => {
    if (activeBaseId) void loadBase(activeBaseId);
  }, [activeBaseId, loadBase]);

  const activeTable = tables.find((t) => t.id === activeTableId) ?? null;
  const activeView: View | null =
    activeTable?.views.find((v) => v.id === activeViewId) ?? activeTable?.views[0] ?? null;

  useEffect(() => {
    if (activeTable && !activeTable.views.some((v) => v.id === activeViewId)) {
      setActiveViewId(activeTable.views[0]?.id ?? null);
    }
  }, [activeTable, activeViewId]);

  // ---- Cross-table context (link / lookup resolution) ----------------------
  const ctx = useMemo(() => {
    const tablesById: Record<string, Table> = {};
    for (const t of tables) tablesById[t.id] = t;
    return {
      tablesById,
      primaryValue: (tableId: string, rowId: string) => {
        const t = tablesById[tableId];
        if (!t) return "";
        const pf = primaryField(t.schema);
        const r = t.rows.find((x) => x.id === rowId);
        return r ? String(r.data[pf.id] ?? "") : "";
      },
    };
  }, [tables]);

  // ---- Local table mutation + persistence ---------------------------------
  function patchTableLocal(tableId: string, updater: (t: Table) => Table) {
    setTables((ts) => ts.map((t) => (t.id === tableId ? updater(t) : t)));
  }
  function persistSchemaViews(tableId: string, schema?: Field[], views?: View[]) {
    void bitableApi.updateTable(tableId, { schema, views });
  }

  // Rows
  async function addRow(seed: Record<string, unknown> = {}) {
    if (!activeTable) return;
    const tempId = uid("row");
    const row: Row = { id: tempId, data: seed, sortIndex: activeTable.rows.length };
    patchTableLocal(activeTable.id, (t) => ({ ...t, rows: [...t.rows, row] }));
    const res = await bitableApi.createRow(activeTable.id, seed);
    if (res?.row) patchTableLocal(activeTable.id, (t) => ({ ...t, rows: t.rows.map((r) => (r.id === tempId ? res.row : r)) }));
  }
  function updateCell(rowId: string, fieldId: string, value: unknown) {
    if (!activeTable) return;
    patchTableLocal(activeTable.id, (t) => ({
      ...t,
      rows: t.rows.map((r) => (r.id === rowId ? { ...r, data: { ...r.data, [fieldId]: value } } : r)),
    }));
    void bitableApi.updateRow(rowId, { data: { [fieldId]: value } });
  }
  async function deleteRow(rowId: string) {
    if (!activeTable) return;
    patchTableLocal(activeTable.id, (t) => ({ ...t, rows: t.rows.filter((r) => r.id !== rowId) }));
    setRecordRowId(null);
    await bitableApi.deleteRow(rowId);
  }

  // Views
  function patchView(patch: Partial<View>) {
    if (!activeTable || !activeView) return;
    const views = activeTable.views.map((v) => (v.id === activeView.id ? { ...v, ...patch } : v));
    patchTableLocal(activeTable.id, (t) => ({ ...t, views }));
    persistSchemaViews(activeTable.id, undefined, views);
  }
  function addView(type: ViewType) {
    if (!activeTable) return;
    const id = newId("view");
    const count = activeTable.views.filter((v) => v.type === type).length;
    const view: View = { id, name: count ? `${VIEW_LABELS[type]} ${count + 1}` : VIEW_LABELS[type], type };
    const views = [...activeTable.views, view];
    patchTableLocal(activeTable.id, (t) => ({ ...t, views }));
    persistSchemaViews(activeTable.id, undefined, views);
    setActiveViewId(id);
    setAddViewOpen(false);
  }
  function renameView(viewId: string, name: string) {
    if (!activeTable) return;
    const views = activeTable.views.map((v) => (v.id === viewId ? { ...v, name } : v));
    patchTableLocal(activeTable.id, (t) => ({ ...t, views }));
    persistSchemaViews(activeTable.id, undefined, views);
  }
  function duplicateView(viewId: string) {
    if (!activeTable) return;
    const src = activeTable.views.find((v) => v.id === viewId);
    if (!src) return;
    const id = newId("view");
    const copy: View = { ...src, id, name: `${src.name} 副本` };
    const idx = activeTable.views.findIndex((v) => v.id === viewId);
    const views = [...activeTable.views.slice(0, idx + 1), copy, ...activeTable.views.slice(idx + 1)];
    patchTableLocal(activeTable.id, (t) => ({ ...t, views }));
    persistSchemaViews(activeTable.id, undefined, views);
    setActiveViewId(id);
  }
  function deleteView(viewId: string) {
    if (!activeTable || activeTable.views.length <= 1) return;
    const views = activeTable.views.filter((v) => v.id !== viewId);
    patchTableLocal(activeTable.id, (t) => ({ ...t, views }));
    persistSchemaViews(activeTable.id, undefined, views);
    if (activeViewId === viewId) setActiveViewId(views[0]?.id ?? null);
  }

  // Fields
  function saveField(field: Field) {
    if (!activeTable || !fieldDraft) return;
    const schema = fieldDraft.isNew
      ? [...activeTable.schema, field]
      : activeTable.schema.map((f) => (f.id === field.id ? field : f));
    patchTableLocal(activeTable.id, (t) => ({ ...t, schema }));
    persistSchemaViews(activeTable.id, schema, undefined);
    setFieldDraft(null);
  }
  function deleteField(fieldId: string) {
    if (!activeTable) return;
    const schema = activeTable.schema.filter((f) => f.id !== fieldId);
    const views = activeTable.views.map((v) => ({
      ...v,
      hiddenFieldIds: (v.hiddenFieldIds ?? []).filter((x) => x !== fieldId),
      groupFieldId: v.groupFieldId === fieldId ? null : v.groupFieldId,
    }));
    patchTableLocal(activeTable.id, (t) => ({ ...t, schema, views }));
    persistSchemaViews(activeTable.id, schema, views);
    setFieldDraft(null);
  }
  function resizeField(fieldId: string, width: number) {
    if (!activeTable) return;
    const schema = activeTable.schema.map((f) => (f.id === fieldId ? { ...f, width } : f));
    patchTableLocal(activeTable.id, (t) => ({ ...t, schema }));
    clearTimeout(resizeTimers.current[fieldId]);
    resizeTimers.current[fieldId] = setTimeout(() => persistSchemaViews(activeTable.id, schema, undefined), 500);
  }

  // Bases & tables
  async function createBase() {
    const res = await bitableApi.createBase("新建多维表格");
    if (res?.base) {
      setBases((b) => [...b, res.base]);
      setActiveBaseId(res.base.id);
    }
  }
  async function deleteBase(id: string) {
    setBases((b) => b.filter((x) => x.id !== id));
    if (activeBaseId === id) {
      const next = bases.find((x) => x.id !== id);
      setActiveBaseId(next?.id ?? null);
      if (!next) setTables([]);
    }
    await bitableApi.deleteBase(id);
  }
  async function createTable() {
    if (!activeBaseId) return;
    const res = await bitableApi.createTable(activeBaseId);
    if (res?.table) {
      setTables((t) => [...t, res.table]);
      setActiveTableId(res.table.id);
      setBases((bs) => bs.map((b) => (b.id === activeBaseId ? { ...b, tables: [...b.tables, { id: res.table.id, name: res.table.name, icon: res.table.icon }] } : b)));
    }
  }
  async function deleteTable(id: string) {
    if (tables.length <= 1) return;
    setTables((t) => t.filter((x) => x.id !== id));
    if (activeTableId === id) setActiveTableId(tables.find((x) => x.id !== id)?.id ?? null);
    await bitableApi.deleteTable(id);
  }

  // Link picker
  function openLinkPicker(rowId: string, field: Field) {
    setLinkCtx({ rowId, field });
  }

  // ---- Derived rows for the active view ------------------------------------
  const visibleFields = useMemo(() => {
    if (!activeTable || !activeView) return [];
    const hidden = new Set(activeView.hiddenFieldIds ?? []);
    return activeTable.schema.filter((f) => !hidden.has(f.id));
  }, [activeTable, activeView]);

  const viewRows = useMemo(() => {
    if (!activeTable || !activeView) return [];
    return applyView(activeTable.rows, activeTable.schema, activeView.filters ?? [], activeView.sorts ?? [], search);
  }, [activeTable, activeView, search]);

  // ---- Render --------------------------------------------------------------
  if (loading) return <div className="flex h-full items-center justify-center text-sm text-slate-400">加载中…</div>;

  if (!bases.length) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
        <LayoutGrid className="h-10 w-10 text-slate-300" />
        <p className="text-sm text-slate-500">还没有多维表格</p>
        <button onClick={createBase} className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-700">
          + 新建多维表格
        </button>
      </div>
    );
  }

  const linkTarget = linkCtx?.field.linkTableId ? ctx.tablesById[linkCtx.field.linkTableId] : null;
  const recordRow = activeTable?.rows.find((r) => r.id === recordRowId) ?? null;

  return (
    <div className="flex h-full">
      {/* Left rail: bases + tables */}
      <aside className="flex w-56 shrink-0 flex-col border-r border-slate-200 bg-[#fbfbfa]">
        <div className="flex items-center justify-between px-3 py-3">
          <span className="text-xs font-semibold text-slate-500">多维表格</span>
          <button onClick={createBase} className="rounded p-1 text-slate-400 hover:bg-slate-200" title="新建多维表格">
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-0.5 px-2">
          {bases.map((b) => (
            <div key={b.id} className="group flex items-center">
              <button
                onClick={() => setActiveBaseId(b.id)}
                className={cn(
                  "flex flex-1 items-center gap-2 truncate rounded-lg px-2 py-1.5 text-sm",
                  activeBaseId === b.id ? "bg-slate-200/70 font-medium text-slate-900" : "text-slate-600 hover:bg-slate-100",
                )}
              >
                <span>{b.icon}</span>
                <span className="truncate">{b.name}</span>
              </button>
              <button
                onClick={() => deleteBase(b.id)}
                className="hidden rounded p-1 text-slate-400 hover:text-red-500 group-hover:block"
                title="删除"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between px-3 py-1">
          <span className="text-xs font-semibold text-slate-400">数据表</span>
          <button onClick={createTable} className="rounded p-1 text-slate-400 hover:bg-slate-200" title="新建数据表">
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex-1 space-y-0.5 overflow-y-auto px-2">
          {tables.map((t) => (
            <div key={t.id} className="group flex items-center">
              <button
                onClick={() => setActiveTableId(t.id)}
                className={cn(
                  "flex flex-1 items-center gap-2 truncate rounded-lg px-2 py-1.5 text-sm",
                  activeTableId === t.id ? "bg-blue-50 font-medium text-blue-700" : "text-slate-600 hover:bg-slate-100",
                )}
              >
                <Table2 className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{t.name}</span>
                <span className="ml-auto text-[10px] text-slate-400">{t.rows.length}</span>
              </button>
              {tables.length > 1 && (
                <button onClick={() => deleteTable(t.id)} className="hidden rounded p-1 text-slate-400 hover:text-red-500 group-hover:block">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {activeTable && activeView ? (
          <>
            {/* View tabs */}
            <div className="flex items-center gap-1 border-b border-slate-200 px-3 pt-2">
              {activeTable.views.map((v) => (
                <ViewTab
                  key={v.id}
                  view={v}
                  active={activeView.id === v.id}
                  canDelete={activeTable.views.length > 1}
                  onActivate={() => setActiveViewId(v.id)}
                  onRename={(name) => renameView(v.id, name)}
                  onDuplicate={() => duplicateView(v.id)}
                  onDelete={() => deleteView(v.id)}
                />
              ))}
              <div className="relative">
                <button onClick={() => setAddViewOpen((v) => !v)} className="flex items-center gap-1 rounded-t-lg px-2 py-1.5 text-sm text-slate-400 hover:text-slate-700" title="新增视图">
                  <Plus className="h-3.5 w-3.5" /> 视图
                </button>
                {addViewOpen && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => setAddViewOpen(false)} />
                    <div className="absolute left-0 top-full z-30 mt-1 w-36 rounded-lg border border-slate-200 bg-white p-1 shadow-xl">
                      {(["grid", "kanban", "gallery", "calendar", "gantt", "form"] as ViewType[]).map((t) => (
                        <button key={t} onClick={() => addView(t)} className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm text-slate-600 hover:bg-slate-50">
                          {VIEW_LABELS[t]}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            <Toolbar view={activeView} schema={activeTable.schema} search={search} onSearch={setSearch} onPatchView={patchView} />

            <div className="min-h-0 flex-1">
              {activeView.type === "grid" && (
                <GridView
                  fields={visibleFields}
                  rows={viewRows}
                  ctx={ctx}
                  schema={activeTable.schema}
                  groupField={activeTable.schema.find((f) => f.id === activeView.rowGroupFieldId) ?? null}
                  aggregations={activeView.aggregations}
                  onUpdateCell={updateCell}
                  onAddRow={() => addRow()}
                  onOpenRecord={setRecordRowId}
                  onAddField={() => setFieldDraft({ field: { id: newId("fld"), name: "", type: "text", width: 160 }, isNew: true })}
                  onEditField={(fid) => {
                    const f = activeTable.schema.find((x) => x.id === fid);
                    if (f) setFieldDraft({ field: f, isNew: false });
                  }}
                  onResizeField={resizeField}
                  onSetAgg={(fieldId, agg) => patchView({ aggregations: { ...(activeView.aggregations ?? {}), [fieldId]: agg } })}
                  onPickLink={openLinkPicker}
                />
              )}
              {activeView.type === "kanban" && (
                <KanbanView
                  fields={visibleFields}
                  rows={viewRows}
                  schema={activeTable.schema}
                  groupField={activeTable.schema.find((f) => f.id === activeView.groupFieldId) ?? null}
                  ctx={ctx}
                  onUpdateCell={updateCell}
                  onOpenRecord={setRecordRowId}
                  onAddRow={(gv) => addRow(activeView.groupFieldId && gv ? { [activeView.groupFieldId]: gv } : {})}
                />
              )}
              {activeView.type === "gallery" && (
                <GalleryView fields={visibleFields} rows={viewRows} schema={activeTable.schema} ctx={ctx} onOpenRecord={setRecordRowId} onAddRow={() => addRow()} />
              )}
              {activeView.type === "form" && (
                <FormView fields={activeTable.schema} tableName={activeTable.name} onSubmit={(data) => addRow(data)} />
              )}
              {activeView.type === "calendar" && (
                <CalendarBitableView
                  rows={viewRows}
                  schema={activeTable.schema}
                  dateFieldId={activeView.dateFieldId}
                  onSetDateField={(id) => patchView({ dateFieldId: id })}
                  onOpenRecord={setRecordRowId}
                  onAddRow={(seed) => addRow(seed)}
                />
              )}
              {activeView.type === "gantt" && (
                <GanttView
                  rows={viewRows}
                  schema={activeTable.schema}
                  startFieldId={activeView.dateFieldId}
                  endFieldId={activeView.endDateFieldId}
                  onSetStartField={(id) => patchView({ dateFieldId: id })}
                  onSetEndField={(id) => patchView({ endDateFieldId: id || null })}
                  onOpenRecord={setRecordRowId}
                />
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-slate-400">请选择或新建一张数据表</div>
        )}
      </div>

      {/* Modals */}
      {fieldDraft && activeTable && (
        <FieldEditor
          field={fieldDraft.field}
          tables={tables}
          currentTableId={activeTable.id}
          onSave={saveField}
          onDelete={fieldDraft.isNew ? undefined : () => deleteField(fieldDraft.field.id)}
          onClose={() => setFieldDraft(null)}
        />
      )}
      {recordRow && activeTable && (
        <RecordCard
          table={activeTable}
          row={recordRow}
          ctx={ctx}
          onUpdateCell={updateCell}
          onDelete={() => deleteRow(recordRow.id)}
          onClose={() => setRecordRowId(null)}
          onPickLink={(field) => openLinkPicker(recordRow.id, field)}
        />
      )}
      {linkCtx && linkTarget && (
        <LinkPicker
          targetTable={linkTarget}
          selectedIds={(activeTable?.rows.find((r) => r.id === linkCtx.rowId)?.data[linkCtx.field.id] as string[]) ?? []}
          onChange={(ids) => updateCell(linkCtx.rowId, linkCtx.field.id, ids)}
          onClose={() => setLinkCtx(null)}
        />
      )}
    </div>
  );
}

// 视图标签：单击激活、双击重命名、⋯ 菜单提供 重命名 / 复制 / 删除
function ViewTab({
  view,
  active,
  canDelete,
  onActivate,
  onRename,
  onDuplicate,
  onDelete,
}: {
  view: View;
  active: boolean;
  canDelete: boolean;
  onActivate: () => void;
  onRename: (name: string) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const [menu, setMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(view.name);

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => { onRename(draft.trim() || view.name); setEditing(false); }}
        onKeyDown={(e) => {
          if (e.key === "Enter") { onRename(draft.trim() || view.name); setEditing(false); }
          if (e.key === "Escape") { setDraft(view.name); setEditing(false); }
        }}
        className="my-1 w-28 rounded-md border border-blue-400 px-2 py-1 text-sm outline-none ring-2 ring-blue-100"
      />
    );
  }

  return (
    <div className="group/vt relative">
      <button
        onClick={onActivate}
        onDoubleClick={() => { setDraft(view.name); setEditing(true); }}
        className={cn(
          "flex items-center gap-1.5 rounded-t-lg py-1.5 pl-3 pr-1.5 text-sm",
          active ? "border-b-2 border-slate-900 font-medium text-slate-900" : "text-slate-500 hover:text-slate-800",
        )}
      >
        {view.name}
        <span className="text-[10px] text-slate-400">{VIEW_LABELS[view.type]}</span>
        <span
          onClick={(e) => { e.stopPropagation(); setMenu((m) => !m); }}
          className={cn("flex h-5 w-5 items-center justify-center rounded text-slate-400 hover:bg-slate-200 hover:text-slate-700", active ? "opacity-100" : "opacity-0 group-hover/vt:opacity-100")}
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </span>
      </button>
      {menu && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setMenu(false)} />
          <div className="claw-solid absolute left-2 top-full z-30 mt-1 w-32 rounded-lg border border-slate-200 p-1 shadow-xl">
            <button onClick={() => { setDraft(view.name); setEditing(true); setMenu(false); }} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-slate-600 hover:bg-slate-50">
              <Pencil className="h-3.5 w-3.5" /> 重命名
            </button>
            <button onClick={() => { onDuplicate(); setMenu(false); }} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-slate-600 hover:bg-slate-50">
              <Copy className="h-3.5 w-3.5" /> 复制
            </button>
            {canDelete && (
              <button onClick={() => { onDelete(); setMenu(false); }} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-rose-500 hover:bg-rose-50">
                <Trash2 className="h-3.5 w-3.5" /> 删除
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
