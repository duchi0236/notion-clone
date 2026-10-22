"use client";

import { Plus, Trash2 } from "lucide-react";
import { fieldOptionLabel, type FieldOption, type FieldSchema, type FieldType } from "./types";
import { Select } from "@/components/ui/Select";

const fieldTypes: FieldType[] = ["text", "select", "date", "number", "person", "people", "checkbox", "relation", "rollup", "formula"];
const fieldTypeLabels: Record<FieldType, string> = {
  text: "文本",
  select: "单选",
  date: "日期",
  number: "数字",
  people: "人员",
  person: "人员",
  checkbox: "复选框",
  relation: "关联",
  rollup: "汇总",
  formula: "公式",
};

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
  function updateOptions(field: FieldSchema, rawValue: string) {
    const names = rawValue.split(",").map((item) => item.trim()).filter(Boolean);
    const objectMode = (field.options ?? []).some((option) => typeof option !== "string");
    const options: FieldOption[] = names.map((name, index) => {
      const existing = field.options?.[index];
      if (existing && typeof existing !== "string") return { ...existing, name };
      if (objectMode) return { id: `${field.id}_option_${index + 1}`, name, color: "gray" };
      return name;
    });
    updateField(field.id, { options });
  }

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
              <Select
                value={field.type}
                onChange={(type) => updateField(field.id, { type: type as FieldType })}
                ariaLabel={`${field.name}字段类型`}
                options={fieldTypes.map((type) => ({ value: type, label: fieldTypeLabels[type] }))}
              />
              <button onClick={() => deleteField(field.id)} className="rounded-xl p-2 text-red-500 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
            </div>
            {field.type === "select" && (
              <input value={(field.options ?? []).map(fieldOptionLabel).join(",")} onChange={(event) => updateOptions(field, event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs" placeholder="选项，逗号分隔" />
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
