"use client";

import { Plus, Trash2 } from "lucide-react";
import type { FieldSchema, FieldType } from "./types";

const fieldTypes: FieldType[] = ["text", "select", "date", "number", "people", "checkbox"];

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
        <button onClick={() => addField("text")} className="rounded-xl bg-blue-600 px-3 py-2 text-sm text-white"><Plus className="mr-1 inline h-4 w-4" />字段</button>
      </div>
      <div className="space-y-2">
        {schema.map((field) => (
          <div key={field.id} className="grid grid-cols-[1fr_150px_40px] items-center gap-2 rounded-2xl bg-slate-50 p-2">
            <input value={field.name} onChange={(event) => updateField(field.id, { name: event.target.value })} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" />
            <select value={field.type} onChange={(event) => updateField(field.id, { type: event.target.value as FieldType })} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
              {fieldTypes.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
            <button onClick={() => deleteField(field.id)} className="rounded-xl p-2 text-red-500 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
    </section>
  );
}
