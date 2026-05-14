"use client";

import type { InboxItem, Memory, Template } from "./types";

export function InboxPanel({
  inbox,
  createDoc,
  createMemory,
}: {
  inbox: InboxItem[];
  createDoc: (item: InboxItem) => void;
  createMemory: (item: InboxItem) => void;
}) {
  return (
    <ListPage title="Inbox 收集箱" desc="把 OpenClaw、网页、GitHub、文件输入整理成文档或 Memory。">
      {inbox.map((item) => (
        <div key={item.id} className="rounded-3xl border bg-white p-5">
          <div className="flex justify-between"><b>{item.title}</b><span className="rounded-full bg-slate-100 px-3 py-1 text-xs">{item.source}</span></div>
          <p className="mt-2 text-sm text-slate-600">{item.content}</p>
          <div className="mt-4 flex gap-2">
            <button onClick={() => createDoc(item)} className="rounded-xl bg-violet-600 px-3 py-1.5 text-sm text-white">转文档</button>
            <button onClick={() => createMemory(item)} className="rounded-xl bg-slate-100 px-3 py-1.5 text-sm">转 Memory</button>
          </div>
        </div>
      ))}
    </ListPage>
  );
}

export function MemoryPanel({
  memories,
  reviewMemory,
}: {
  memories: Memory[];
  reviewMemory: (id: string, status: Memory["status"]) => void;
}) {
  return (
    <ListPage title="Agent Memory 审核" desc="长期记忆必须审核，避免 Agent 错误沉淀。">
      <div className="grid grid-cols-3 gap-4">
        {(["pending", "accepted", "rejected"] as const).map((status) => (
          <section key={status} className="rounded-3xl border bg-slate-50 p-4">
            <h3 className="mb-3 font-semibold">{status}</h3>
            {memories.filter((item) => item.status === status).map((memory) => (
              <div key={memory.id} className="mb-3 rounded-2xl bg-white p-4 text-sm">
                <p>{memory.content}</p>
                <div className="mt-2 text-xs text-slate-500">置信度 {Math.round(memory.confidence * 100)}%</div>
                {status === "pending" && (
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => reviewMemory(memory.id, "accepted")} className="rounded bg-emerald-500 px-2 py-1 text-xs text-white">接受</button>
                    <button onClick={() => reviewMemory(memory.id, "rejected")} className="rounded bg-red-500 px-2 py-1 text-xs text-white">拒绝</button>
                  </div>
                )}
              </div>
            ))}
          </section>
        ))}
      </div>
    </ListPage>
  );
}

export function TemplatePanel({ templates, createDoc }: { templates: Template[]; createDoc: (template: Template) => void }) {
  return (
    <ListPage title="模板中心" desc="会议、项目、SOP、研究报告等文档模板。">
      <div className="grid grid-cols-3 gap-4">
        {templates.map((template) => (
          <button key={template.id} onClick={() => createDoc(template)} className="rounded-3xl border bg-white p-5 text-left hover:border-violet-300">
            <div className="text-3xl">{template.icon}</div>
            <div className="mt-3 font-semibold">{template.title}</div>
            <p className="mt-2 text-sm text-slate-500">{template.desc}</p>
          </button>
        ))}
      </div>
    </ListPage>
  );
}

function ListPage({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return <div className="p-6"><h2 className="text-2xl font-bold">{title}</h2><p className="mb-5 text-sm text-slate-500">{desc}</p><div className="space-y-3">{children}</div></div>;
}
