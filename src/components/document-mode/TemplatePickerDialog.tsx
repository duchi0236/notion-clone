"use client";

import { documentTemplates } from "./document-templates";

export function TemplatePickerDialog({ onClose, onSelect }: { onClose: () => void; onSelect: (templateId: string) => void }) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/20 p-4">
      <div className="w-full max-w-3xl rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">选择文档模板</h2>
            <p className="mt-1 text-sm text-slate-500">选择一个模板开始写作。</p>
          </div>
          <button onClick={onClose} className="rounded-xl px-3 py-2 text-sm text-slate-500 hover:bg-slate-100">关闭</button>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {documentTemplates.map((template) => (
            <button key={template.id} onClick={() => onSelect(template.id)} className="rounded-2xl border border-slate-200 p-4 text-left hover:border-blue-300 hover:bg-blue-50">
              <div className="text-2xl">{template.icon}</div>
              <div className="mt-2 font-semibold text-slate-900">{template.title}</div>
              <div className="mt-1 text-sm text-slate-500">{template.description}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
