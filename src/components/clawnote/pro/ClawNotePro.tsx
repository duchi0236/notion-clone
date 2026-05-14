"use client";

import { useState } from "react";
import Link from "next/link";
import { Bot, Check, FileText, Inbox, KeyRound, Paperclip, Plus, Search, Sparkles, Table2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TaskView, View } from "./types";
import { useWorkspaceState } from "./useWorkspaceState";
import { DocumentPanel } from "./DocumentPanel";
import { TaskPanel } from "./TaskPanel";
import { InboxPanel, MemoryPanel, TemplatePanel } from "./Panels";

function NavButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button title={label} onClick={onClick} className={cn("flex h-11 w-11 items-center justify-center rounded-2xl text-slate-400 hover:bg-white/10 hover:text-white [&_svg]:h-5 [&_svg]:w-5", active && "bg-violet-600 text-white")}>{icon}</button>
  );
}

function Metric({ title, value, icon }: { title: string; value: number; icon: React.ReactNode }) {
  return <div className="rounded-3xl border border-slate-200 bg-white p-4"><div className="flex justify-between text-xs text-slate-500">{title}<span className="text-violet-600 [&_svg]:h-4 [&_svg]:w-4">{icon}</span></div><div className="mt-2 text-2xl font-bold">{value}</div></div>;
}

export default function ClawNotePro() {
  const [view, setView] = useState<View>("docs");
  const [taskView, setTaskView] = useState<TaskView>("table");
  const store = useWorkspaceState();

  return (
    <div className="grid min-h-screen grid-cols-[76px_280px_minmax(0,1fr)_360px] bg-[#f7f7fb] text-slate-900">
      <nav className="flex flex-col items-center gap-3 bg-slate-950 py-4 text-white">
        <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-600 text-xl font-black">C</div>
        <NavButton active={view === "docs"} onClick={() => setView("docs")} icon={<FileText />} label="文档" />
        <NavButton active={view === "tasks"} onClick={() => setView("tasks")} icon={<Table2 />} label="表格" />
        <NavButton active={view === "inbox"} onClick={() => setView("inbox")} icon={<Inbox />} label="收集" />
        <NavButton active={view === "memory"} onClick={() => setView("memory")} icon={<Sparkles />} label="记忆" />
        <NavButton active={view === "templates"} onClick={() => setView("templates")} icon={<Bot />} label="模板" />
        <Link title="文件" href="/files" className="flex h-11 w-11 items-center justify-center rounded-2xl text-slate-400 hover:bg-white/10 hover:text-white"><Paperclip className="h-5 w-5" /></Link>
        <Link title="密钥" href="/tokens" className="flex h-11 w-11 items-center justify-center rounded-2xl text-slate-400 hover:bg-white/10 hover:text-white"><KeyRound className="h-5 w-5" /></Link>
      </nav>

      <aside className="border-r border-slate-200 bg-white/70 p-4">
        <div className="mb-5 flex items-center justify-between">
          <div><h1 className="text-lg font-bold">ClawNote</h1><p className="text-xs text-slate-500">AI 文档工作台</p></div>
          <button onClick={() => void store.createDoc()} className="rounded-xl bg-violet-600 p-2 text-white"><Plus className="h-4 w-4" /></button>
        </div>
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
          <Search className="h-4 w-4 text-slate-400" />
          <input value={store.query} onChange={(event) => store.setQuery(event.target.value)} placeholder="搜索文档" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
        </div>
        <div className="mb-2 px-2 text-xs font-semibold uppercase text-slate-400">文档树</div>
        <div className="space-y-1">
          {store.filteredDocs.map((doc) => <button key={doc.id} onClick={() => { store.setSelectedDocId(doc.id); setView("docs"); }} className={cn("flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-slate-100", doc.id === store.selectedDocId && "bg-violet-50 text-violet-700")}><span>{doc.icon}</span><span className="flex-1 truncate">{doc.title}</span></button>)}
        </div>
      </aside>

      <main className="min-w-0 border-r border-slate-200 bg-white">
        {view === "docs" && <DocumentPanel doc={store.selectedDoc} updateDoc={store.updateDoc} deleteDoc={store.deleteDoc} askAi={(mode) => void store.askAi(mode)} />}
        {view === "tasks" && <TaskPanel tasks={store.tasks} taskView={taskView} setTaskView={setTaskView} createTask={() => void store.createTask()} updateTask={store.updateTask} deleteTask={store.deleteTask} />}
        {view === "inbox" && <InboxPanel inbox={store.inbox} createDoc={(item) => void store.createDoc({ id: item.id, title: item.title, icon: "📥", desc: item.source, html: `<h1>${item.title}</h1><p>${item.content}</p>`, tags: [item.source] })} createMemory={(item) => void store.createMemory(item.content, [item.source])} />}
        {view === "memory" && <MemoryPanel memories={store.memories} reviewMemory={store.reviewMemory} />}
        {view === "templates" && <TemplatePanel templates={store.templates} createDoc={(template) => void store.createDoc(template)} />}
      </main>

      <aside className="flex flex-col bg-[#fbfbfe] p-4">
        <h2 className="font-bold">Claw AI 助手</h2>
        <p className="mb-4 text-xs text-slate-500">基于当前文档和知识库</p>
        <div className="mb-4 rounded-3xl bg-violet-50 p-4"><div className="mb-1 text-sm font-medium text-violet-700"><Sparkles className="mr-1 inline h-4 w-4" />当前上下文</div><b>{store.selectedDoc?.title ?? "暂无文档"}</b><p className="mt-1 text-xs text-slate-600">{store.selectedDoc?.summary ?? ""}</p></div>
        <div className="mb-4 grid grid-cols-2 gap-2"><button onClick={() => void store.askAi("summary")} className="rounded-2xl border bg-white px-3 py-2 text-sm">总结</button><button onClick={() => void store.askAi("task")} className="rounded-2xl border bg-white px-3 py-2 text-sm">任务</button><button onClick={() => void store.askAi("memory")} className="rounded-2xl border bg-white px-3 py-2 text-sm">Memory</button><button onClick={() => void store.askAi("search")} className="rounded-2xl border bg-white px-3 py-2 text-sm">相关</button></div>
        <div className="mb-4 grid grid-cols-2 gap-3"><Metric title="Memory" value={store.memories.length} icon={<Sparkles />} /><Metric title="任务" value={store.tasks.length} icon={<Check />} /></div>
        <div className="min-h-0 flex-1 space-y-3 overflow-auto">{store.aiLog.map((message, index) => <div key={`${message}-${index}`} className="rounded-3xl bg-white p-4 text-sm shadow-sm"><Bot className="mr-1 inline h-4 w-4 text-violet-600" />{message}</div>)}</div>
      </aside>
    </div>
  );
}
