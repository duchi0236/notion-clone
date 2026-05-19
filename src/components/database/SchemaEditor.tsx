"use client";

import { Plus, Trash2 } from "lucide-react";
import type { FieldSchema, FieldType } from "./types";

const fieldTypes: FieldType[] = ["text", "select", "date", "number", "people", "checkbox", "relation", "rollup", "formula"];

export function SchemaEditor({
  schema,
  addField,
  updateField,
  deleteField,
}: {
  schema: FieldSchema[];
  addField: (type?: FieldType) => void;
  updateField: (id: string, patch: Partial<FieldSchema>) => void;
  deleteField: (id: string) => void;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-bold">字段 Schema</h3>
        <div className="flex gap-2">
          <button onClick={() => addField("text")} className="rounded-xl bg-blue-600 px-3 py-2 text-sm text-white"><Plus className="mr-1 inline h-4 w-4" />字段</button>
          <button onClick={() => addField("relation")} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">Relation</button>
          <button onClick={() => addField("formula")} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">Formula</button>
        </div>
      </div>
      <div className="space-y-2">
        {schema.map((field) => (
          <div key={field.id} className="rounded-2xl bg-slate-50 p-2">
            <div className="grid grid-cols-[1fr_150px_40px] items-center gap-2">
              <input value={field.name} onChange={(event) => updateField(field.id, { name: event.target.value })} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" />
              <select value={field.type} onChange={(event) => updateField(field.id, { type: event.target.value as FieldType })} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
                {fieldTypes.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
              <button onClick={() => deleteField(field.id)} className="rounded-xl p-2 text-red-500 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
            </div>
            {field.type === "select" && (
              <input value={(field.options ?? []).join(",")} onChange={(event) => updateField(field.id, { options: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) })} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs" placeholder="选项，逗号分隔" />
            )}
            {field.type === "relation" && (
              <input value={field.relationCollectionId ?? ""} onChange={(event) => updateField(field.id, { relationCollectionId: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs" placeholder="关联数据库 ID" />
            )}
            {field.type === "rollup" && (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <input value={field.relationFieldId ?? ""} onChange={(event) => updateField(field.id, { relationFieldId: event.target.value })} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs" placeholder="Relation 字段 ID" />
                <input value={field.rollupFieldId ?? ""} onChange={(event) => updateField(field.id, { rollupFieldId: event.target.value })} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs" placeholder="Rollup 字段 ID" />
              </div>
            )}
            {field.type === "formula" && (
              <input value={field.formula ?? ""} onChange={(event) => updateField(field.id, { formula: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs" placeholder="公式，例如 progress / 100" />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
