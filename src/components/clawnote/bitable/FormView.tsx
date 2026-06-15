"use client";

import { useState } from "react";
import { Check, Send } from "lucide-react";
import type { Field } from "./types";
import { CellInput, fieldIcon } from "./Cell";
import { emptyValue } from "./fieldMeta";

// Data-entry form: fills a new record's fields and submits.
export function FormView({
  fields,
  tableName,
  onSubmit,
}: {
  fields: Field[];
  tableName: string;
  onSubmit: (data: Record<string, unknown>) => void;
}) {
  const entryFields = fields.filter((f) => f.type !== "lookup" && f.type !== "createdTime");
  const [data, setData] = useState<Record<string, unknown>>({});
  const [done, setDone] = useState(false);

  function submit() {
    const primary = fields.find((f) => f.primary) ?? fields[0];
    if (!data[primary.id]) return;
    onSubmit(data);
    setData({});
    setDone(true);
    setTimeout(() => setDone(false), 1800);
  }

  return (
    <div className="mx-auto max-w-xl overflow-y-auto p-6">
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="rounded-t-2xl border-b border-slate-100 bg-slate-900 px-6 py-5 text-white">
          <h2 className="text-lg font-semibold">{tableName}</h2>
          <p className="mt-0.5 text-sm text-slate-300">填写下面的表单以新增一条记录</p>
        </div>
        <div className="space-y-4 p-6">
          {entryFields.map((field) => (
            <label key={field.id} className="block">
              <span className="mb-1 flex items-center gap-1.5 text-sm font-medium text-slate-700">
                <span className="text-slate-400">{fieldIcon(field.type)}</span>
                {field.name}
                {field.primary && <span className="text-red-500">*</span>}
              </span>
              <div className="rounded-lg border border-slate-200 px-3 py-2">
                <CellInput
                  field={field}
                  value={data[field.id] ?? emptyValue(field)}
                  onChange={(v) => setData((d) => ({ ...d, [field.id]: v }))}
                />
              </div>
            </label>
          ))}
          <button
            onClick={submit}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            {done ? <Check className="h-4 w-4" /> : <Send className="h-4 w-4" />}
            {done ? "已提交" : "提交"}
          </button>
        </div>
      </div>
    </div>
  );
}
