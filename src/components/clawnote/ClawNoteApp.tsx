"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bot, CalendarDays, Check, FileText, GalleryHorizontal, Inbox, KanbanSquare, Plus, Search, Sparkles, Table2, Trash2 } from "lucide-react";
import { NotionEditor } from "@/components/editor/NotionEditor";
import { cn } from "@/lib/utils";

type View = "docs" | "tasks" | "inbox" | "memory" | "templates";
type TaskView = "table" | "board" | "gallery" | "calendar";
type Doc = { id: string; title: string; icon: string; html: string; text: string; summary: string; tags: string[]; favorite: boolean };
type Task = { id: string; name: string; owner: string; status: "未开始" | "进行中" | "已完成"; priority: "低" | "中" | "高"; progress: number; dueDate: string };
type Memory = { id: string; content: string; status: "pending" | "accepted" | "rejected"; confidence: number; tags: string[] };
type InboxItem = { id: string; source: string; title: string; content: string };
type Template = { id: string; title: string; icon: string; desc: string; html: string; tags: string[] };

const today = () => new Date().toISOString().slice(0, 10);
const uid = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
const plainText = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const short = (value: string) => value ? `${value.slice(0, 140)}${value.length > 140 ? "…" : ""}` : "暂无摘要";

const seedDocs: Doc[] = [
  { id: "d1", title: "OpenClaw 个人部署方案", icon: "🧠", html: "<h1>OpenClaw 个人部署方案</h1><p>部署一个可长期沉淀知识、记录任务、管理文档的个人 AI 工作台。</p><h2>核心模块</h2><ul><li>文档编辑器</li><li>知识库</li><li>Agent Memory</li><li>Inbox 收集中心</li></ul>", text: "OpenClaw 个人部署方案", summary: "部署个人 OpenClaw，并通过 ClawNote 做长期知识、任务和文档沉淀。", tags: ["OpenClaw", "部署"], favorite: true },
  { id: "d2", title: "产品设计原则", icon: "📘", html: "<h1>产品设计原则</h1><p>ClawNote 不是后台系统，而是类似 Notion、语雀、Word、Excel 的知识工作台。</p>", text: "ClawNote 不是后台系统", summary: "产品形态类似 Notion、语雀、Word、Excel。", tags: ["产品"], favorite: false },
];
const seedTasks: Task[] = [
  { id: "t1", name: "替换为 TipTap 编辑器", owner: "Me", status: "已完成", priority: "高", progress: 100, dueDate: today() },
  { id: "t2", name: "实现多视图任务表", owner: "Me", status: "进行中", priority: "高", progress: 70, dueDate: today() },
  { id: "t3", name: "接入 OpenClaw Skill", owner: "Me", status: "未开始", priority: "中", progress: 10, dueDate: today() },
];
const seedInbox: InboxItem[] = [
  { id: "i1", source: "OpenClaw", title: "产品反馈", content: "用户希望 ClawNote 更像 Notion / 语雀 / Word / Excel，而不是后台系统。" },
];
const seedTemplates: Template[] = [
  { id: "tpl1", title: "会议纪要", icon: "📋", desc: "会议目标、讨论要点、行动项", tags: ["会议"], html: "<h1>会议纪要</h1><h2>会议目标</h2><p></p><h2>讨论要点</h2><ul><li></li></ul><h2>行动项</h2><ul><li>[ ] </li></ul>" },
  { id: "tpl2", title: "项目计划", icon: "🚀", desc: "目标、里程碑、风险、任务", tags: ["项目"], html: "<h1>项目计划</h1><h2>目标</h2><p></p><h2>里程碑</h2><ul><li></li></ul><h2>风险</h2><p></p>" },
  { id: "tpl3", title: "SOP 模板", icon: "🧭", desc: "将重复流程沉淀为标准方法", tags: ["SOP"], html: "<h1>SOP</h1><h2>适用场景</h2><p></p><h2>步骤</h2><ol><li></li></ol>" },
];

type ApiDoc = { id: string; title?: string; icon?: string; contentHtml?: string; contentText?: string; summary?: string; tags?: string[]; isFavorite?: boolean };
type ApiTaskRow = { id: string; data?: Partial<Task> };

async function api<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers || {}) } });
    if (!res.ok) return null;
    return await res.json() as T;
  } catch {
    return null;
  }
}

function fromApiDoc(doc: ApiDoc): Doc {
  const html = doc.contentHtml ?? "<h1>Untitled</h1><p></p>";
  const text = doc.contentText ?? plainText(html);
  return { id: doc.id, title: doc.title ?? "Untitled", icon: doc.icon ?? "📄", html, text, summary: doc.summary ?? short(text), tags: doc.tags ?? [], favorite: Boolean(doc.isFavorite) };
}
function fromApiTask(row: ApiTaskRow): Task {
  const data = row.data ?? {};
  return { id: row.id, name: data.name ?? "新任务", owner: data.owner ?? "Me", status: data.status ?? "未开始", priority: data.priority ?? "中", progress: Number(data.progress ?? 0), dueDate: data.dueDate ?? today() };
}

export default function ClawNoteApp() {
  const [view, setView] = useState<View>("docs");
  const [taskView, setTaskView] = useState<TaskView>("table");
  const [docs, setDocs] = useState<Doc[]>(seedDocs);
  const [tasks, setTasks] = useState<Task[]>(seedTasks);
  const [inbox, setInbox] = useState<InboxItem[]>(seedInbox);
  const [memories, setMemories] = useState<Memory[]>([{ id: "m1", content: "产品形态应类似 Notion、语雀、Word、Excel，而不是后台系统。", status: "accepted", confidence: 0.98, tags: ["产品定位"] }]);
  const [templates, setTemplates] = useState<Template[]>(seedTemplates);
  const [selectedDocId, setSelectedDocId] = useState(seedDocs[0].id);
  const [query, setQuery] = useState("");
  const [aiLog, setAiLog] = useState<string[]>(["已连接 ClawNote 工作台，可总结、提取任务、写入 Memory。"]);
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const doc = docs.find((item) => item.id === selectedDocId) ?? docs[0];
  const filteredDocs = useMemo(() => docs.filter((item) => `${item.title} ${item.text} ${item.tags.join(" ")}`.toLowerCase().includes(query.toLowerCase())), [docs, query]);

  useEffect(() => {
    void (async () => {
      const [docRes, taskRes, inboxRes, memoryRes, templateRes] = await Promise.all([
        api<{ documents: ApiDoc[] }>("/api/documents"),
        api<{ rows: ApiTaskRow[] }>("/api/collections/tasks"),
        api<{ items: Array<{ id: string; source: string; title: string; content: string }> }>("/api/inbox"),
        api<{ memories: Array<{ id: string; content: string; status: string; confidence: number; tags: string[] }> }>("/api/memory"),
        api<{ templates: Array<{ id: string; title: string; icon: string; description?: string; contentHtml: string; tags: string[] }> }>("/api/templates"),
      ]);
      if (docRes?.documents?.length) {
        const mapped = docRes.documents.map(fromApiDoc);
        setDocs(mapped);
        setSelectedDocId(mapped[0].id);
      }
      if (taskRes?.rows?.length) setTasks(taskRes.rows.map(fromApiTask));
      if (inboxRes?.items) setInbox(inboxRes.items.map((item) => ({ id: item.id, source: item.source, title: item.title, content: item.content })));
      if (memoryRes?.memories) setMemories(memoryRes.memories.map((item) => ({ id: item.id, content: item.content, status: item.status.toLowerCase() as Memory["status"], confidence: item.confidence, tags: item.tags ?? [] })));
      if (templateRes?.templates) setTemplates(templateRes.templates.map((item) => ({ id: item.id, title: item.title, icon: item.icon, desc: item.description ?? "", html: item.contentHtml, tags: item.tags ?? [] })));
    })();
  }, []);

  const persistDoc = (next: Doc) => {
    clearTimeout(saveTimers.current[next.id]);
    saveTimers.current[next.id] = setTimeout(() => {
      void api(`/api/documents/${next.id}`, { method: "PUT", body: JSON.stringify({ title: next.title, icon: next.icon, contentHtml: next.html, contentText: next.text, summary: next.summary, tags: next.tags, isFavorite: next.favorite }) });
    }, 650);
  };
  const updateDoc = (patch: Partial<Doc>) => {
    if (!doc) return;
    const next = { ...doc, ...patch };
    setDocs((items) => items.map((item) => item.id === next.id ? next : item));
    persistDoc(next);
  };
  const createDoc = async (template?: Template) => {
    const html = template?.html ?? "<h1>Untitled</h1><p>开始写作...</p>";
    const text = plainText(html);
    const draft: Doc = { id: uid("doc"), title: template?.title ?? "Untitled", icon: template?.icon ?? "📄", html, text, summary: short(text), tags: template?.tags ?? [], favorite: false };
    setDocs((items) => [draft, ...items]);
    setSelectedDocId(draft.id);
    setView("docs");
    const res = await api<{ document: ApiDoc }>("/api/documents", { method: "POST", body: JSON.stringify({ title: draft.title, icon: draft.icon, tags: draft.tags, contentHtml: draft.html, contentText: draft.text, summary: draft.summary }) });
    if (res?.document) {
      const saved = fromApiDoc(res.document);
      setDocs((items) => items.map((item) => item.id === draft.id ? saved : item));
      setSelectedDocId(saved.id);
    }
  };
  const deleteDoc = () => {
    if (!doc) return;
    void api(`/api/documents/${doc.id}`, { method: "DELETE" });
    setDocs((items) => items.filter((item) => item.id !== doc.id));
  };
  const createTask = async (name = "新任务") => {
    const draft: Task = { id: uid("task"), name, owner: "Me", status: "未开始", priority: "中", progress: 0, dueDate: today() };
    setTasks((items) => [...items, draft]);
    const res = await api<{ row: ApiTaskRow }>("/api/collections/tasks", { method: "POST", body: JSON.stringify(draft) });
    if (res?.row) setTasks((items) => items.map((item) => item.id === draft.id ? fromApiTask(res.row) : item));
  };
  const updateTask = (id: string, patch: Partial<Task>) => {
    setTasks((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item));
    void api(`/api/collections/tasks/${id}`, { method: "PUT", body: JSON.stringify(patch) });
  };
  const deleteTask = (id: string) => {
    setTasks((items) => items.filter((item) => item.id !== id));
    void api(`/api/collections/tasks/${id}`, { method: "DELETE" });
  };
  const createMemory = async (content: string, tags: string[] = []) => {
    const draft: Memory = { id: uid("memory"), content, status: "pending", confidence: 0.92, tags };
    setMemories((items) => [draft, ...items]);
    const res = await api<{ memory: { id: string; content: string; status: string; confidence: number; tags: string[] } }>("/api/memory", { method: "POST", body: JSON.stringify({ content, tags, confidence: 0.92, status: "PENDING" }) });
    if (res?.memory) setMemories((items) => items.map((item) => item.id === draft.id ? { id: res.memory.id, content: res.memory.content, status: res.memory.status.toLowerCase() as Memory["status"], confidence: res.memory.confidence, tags: res.memory.tags ?? [] } : item));
  };
  const reviewMemory = (id: string, status: Memory["status"]) => {
    setMemories((items) => items.map((item) => item.id === id ? { ...item, status } : item));
    void api(`/api/memory/${id}`, { method: "PUT", body: JSON.stringify({ status: status.toUpperCase() }) });
  };
  const askAi = (mode: "summary" | "task" | "memory" | "search") => {
    if (!doc) return;
    if (mode === "summary") {
      const s = short(doc.text);
      updateDoc({ summary: s });
      setAiLog((items) => [`已总结《${doc.title}》：${s}`, ...items]);
    }
    if (mode === "task") {
      void createTask(doc.title);
      setAiLog((items) => ["已从当前文档提取任务并加入项目表格。", ...items]);
    }
    if (mode === "memory") {
      void createMemory(short(doc.text), doc.tags);
      setAiLog((items) => ["已写入待审核 Memory。", ...items]);
    }
    if (mode === "search") {
      setAiLog((items) => [`相关文档：${docs.filter((item) => item.id !== doc.id && item.tags.some((tag) => doc.tags.includes(tag))).map((item) => item.title).join("、") || "暂无"}`, ...items]);
    }
  };

  return (
    <div className="grid min-h-screen grid-cols-[76px_280px_minmax(0,1fr)_360px] bg-[#f7f7fb] text-slate-900">
      <nav className="flex flex-col items-center gap-3 bg-slate-950 py-4 text-white">
        <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-600 text-xl font-black">C</div>
        <NavButton active={view === "docs"} onClick={() => setView("docs")} icon={<FileText />} label="文档" />
        <NavButton active={view === "tasks"} onClick={() => setView("tasks")} icon={<Table2 />} label="表格" />
        <NavButton active={view === "inbox"} onClick={() => setView("inbox")} icon={<Inbox />} label="收集" />
        <NavButton active={view === "memory"} onClick={() => setView("memory")} icon={<Sparkles />} label="记忆" />
        <NavButton active={view === "templates"} onClick={() => setView("templates")} icon={<Bot />} label="模板" />
      </nav>

      <aside className="border-r border-slate-200 bg-white/70 p-4">
        <div className="mb-5 flex items-center justify-between">
          <div><h1 className="text-lg font-bold">ClawNote</h1><p className="text-xs text-slate-500">AI 文档工作台</p></div>
          <button onClick={() => void createDoc()} className="rounded-xl bg-violet-600 p-2 text-white"><Plus className="h-4 w-4" /></button>
        </div>
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
          <Search className="h-4 w-4 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索文档" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
        </div>
        <div className="mb-2 px-2 text-xs font-semibold uppercase text-slate-400">文档树</div>
        <div className="space-y-1">{filteredDocs.map((item) => <button key={item.id} onClick={() => { setSelectedDocId(item.id); setView("docs"); }} className={cn("flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-slate-100", item.id === selectedDocId && "bg-violet-50 text-violet-700")}><span>{item.icon}</span><span className="flex-1 truncate">{item.title}</span>{item.favorite && <span className="text-amber-400">★</span>}</button>)}</div>
      </aside>

      <main className="min-w-0 border-r border-slate-200 bg-white">
        {view === "docs" && doc && <DocumentView doc={doc} updateDoc={updateDoc} deleteDoc={deleteDoc} askAi={askAi} />}
        {view === "tasks" && <TasksView tasks={tasks} taskView={taskView} setTaskView={setTaskView} createTask={() => void createTask()} updateTask={updateTask} deleteTask={deleteTask} />}
        {view === "inbox" && <InboxView inbox={inbox} createDoc={(item) => void createDoc({ id: item.id, title: item.title, icon: "📥", desc: item.source, html: `<h1>${item.title}</h1><p>${item.content}</p>`, tags: [item.source] })} createMemory={(item) => void createMemory(item.content, [item.source])} />}
        {view === "memory" && <MemoryView memories={memories} reviewMemory={reviewMemory} />}
        {view === "templates" && <TemplateView templates={templates} createDoc={(template) => void createDoc(template)} />}
      </main>

      <aside className="flex flex-col bg-[#fbfbfe] p-4">
        <h2 className="font-bold">Claw AI 助手</h2><p className="mb-4 text-xs text-slate-500">基于当前文档和知识库</p>
        <div className="mb-4 rounded-3xl bg-violet-50 p-4"><div className="mb-1 text-sm font-medium text-violet-700"><Sparkles className="mr-1 inline h-4 w-4" />当前上下文</div><b>{doc?.title ?? "暂无文档"}</b><p className="mt-1 text-xs text-slate-600">{doc?.summary ?? ""}</p></div>
        <div className="mb-4 grid grid-cols-2 gap-2"><button onClick={() => askAi("summary")} className="rounded-2xl border bg-white px-3 py-2 text-sm">总结</button><button onClick={() => askAi("task")} className="rounded-2xl border bg-white px-3 py-2 text-sm">任务</button><button onClick={() => askAi("memory")} className="rounded-2xl border bg-white px-3 py-2 text-sm">Memory</button><button onClick={() => askAi("search")} className="rounded-2xl border bg-white px-3 py-2 text-sm">相关</button></div>
        <div className="mb-4 grid grid-cols-2 gap-3"><Metric title="Memory" value={memories.length} icon={<Sparkles />} /><Metric title="任务" value={tasks.length} icon={<Check />} /></div>
        <div className="min-h-0 flex-1 space-y-3 overflow-auto">{aiLog.map((message, index) => <div key={`${message}-${index}`} className="rounded-3xl bg-white p-4 text-sm shadow-sm"><Bot className="mr-1 inline h-4 w-4 text-violet-600" />{message}</div>)}</div>
      </aside>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) { return <button title={label} onClick={onClick} className={cn("flex h-11 w-11 items-center justify-center rounded-2xl text-slate-400 hover:bg-white/10 hover:text-white [&_svg]:h-5 [&_svg]:w-5", active && "bg-violet-600 text-white")}>{icon}</button>; }
function Metric({ title, value, icon }: { title: string; value: number; icon: React.ReactNode }) { return <div className="rounded-3xl border border-slate-200 bg-white p-4"><div className="flex justify-between text-xs text-slate-500">{title}<span className="text-violet-600 [&_svg]:h-4 [&_svg]:w-4">{icon}</span></div><div className="mt-2 text-2xl font-bold">{value}</div></div>; }
function DocumentView({ doc, updateDoc, deleteDoc, askAi }: { doc: Doc; updateDoc: (patch: Partial<Doc>) => void; deleteDoc: () => void; askAi: (mode: "summary" | "task" | "memory" | "search") => void }) { return <div className="mx-auto max-w-5xl p-8"><div className="mb-6 flex justify-between"><div><button className="mb-3 text-6xl">{doc.icon}</button><input value={doc.title} onChange={(event) => updateDoc({ title: event.target.value })} className="w-full bg-transparent text-4xl font-bold outline-none" /><div className="mt-3 flex gap-2">{doc.tags.map((tag) => <span key={tag} className="rounded-full bg-violet-50 px-3 py-1 text-xs text-violet-700">#{tag}</span>)}</div></div><button onClick={deleteDoc} className="h-10 rounded-xl border border-slate-200 p-2 text-red-500"><Trash2 className="h-4 w-4" /></button></div><NotionEditor content={doc.html} onChange={(html) => { const text = plainText(html); updateDoc({ html, text, summary: short(text) }); }} onTextChange={(text) => updateDoc({ text, summary: short(text) })} onAiCommand={(command) => askAi(command === "tasks" ? "task" : command)} /></div>; }
function TasksView({ tasks, taskView, setTaskView, createTask, updateTask, deleteTask }: { tasks: Task[]; taskView: TaskView; setTaskView: (view: TaskView) => void; createTask: () => void; updateTask: (id: string, patch: Partial<Task>) => void; deleteTask: (id: string) => void }) { return <div className="p-6"><div className="mb-5 flex justify-between"><div><h2 className="text-2xl font-bold">项目跟进表</h2><p className="text-sm text-slate-500">Table / Board / Gallery / Calendar 多视图。</p></div><button onClick={createTask} className="rounded-2xl bg-violet-600 px-4 py-2 text-sm text-white"><Plus className="mr-1 inline h-4 w-4" />新增任务</button></div><div className="mb-5 flex gap-2">{([ ["table", Table2, "表格"], ["board", KanbanSquare, "看板"], ["gallery", GalleryHorizontal, "画廊"], ["calendar", CalendarDays, "日历"] ] as const).map(([key, Icon, label]) => <button key={key} onClick={() => setTaskView(key)} className={cn("flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm", taskView === key ? "border-violet-300 bg-violet-50 text-violet-700" : "border-slate-200 bg-white text-slate-600")}><Icon className="h-4 w-4" />{label}</button>)}</div>{taskView === "table" && <TaskTable tasks={tasks} updateTask={updateTask} deleteTask={deleteTask} />}{taskView === "board" && <TaskBoard tasks={tasks} updateTask={updateTask} />}{taskView === "gallery" && <TaskGallery tasks={tasks} />}{taskView === "calendar" && <TaskCalendar tasks={tasks} />}</div>; }
function TaskTable({ tasks, updateTask, deleteTask }: { tasks: Task[]; updateTask: (id: string, patch: Partial<Task>) => void; deleteTask: (id: string) => void }) { return <div className="overflow-hidden rounded-3xl border border-slate-200"><table className="w-full bg-white text-sm"><thead className="bg-slate-50 text-left text-slate-500"><tr>{["任务", "负责人", "状态", "优先级", "截止", "进度", ""].map((head) => <th key={head} className="p-3">{head}</th>)}</tr></thead><tbody>{tasks.map((task) => <tr key={task.id} className="border-t border-slate-100"><td className="p-3"><input value={task.name} onChange={(event) => updateTask(task.id, { name: event.target.value })} className="w-full bg-transparent outline-none" /></td><td className="p-3"><input value={task.owner} onChange={(event) => updateTask(task.id, { owner: event.target.value })} className="w-24 bg-transparent outline-none" /></td><td className="p-3"><select value={task.status} onChange={(event) => updateTask(task.id, { status: event.target.value as Task["status"] })} className="rounded-xl border px-2 py-1"><option>未开始</option><option>进行中</option><option>已完成</option></select></td><td className="p-3"><select value={task.priority} onChange={(event) => updateTask(task.id, { priority: event.target.value as Task["priority"] })} className="rounded-xl border px-2 py-1"><option>低</option><option>中</option><option>高</option></select></td><td className="p-3"><input type="date" value={task.dueDate} onChange={(event) => updateTask(task.id, { dueDate: event.target.value })} className="bg-transparent" /></td><td className="p-3"><input type="number" value={task.progress} onChange={(event) => updateTask(task.id, { progress: Number(event.target.value) })} className="w-16 rounded-lg border px-2 py-1" />%</td><td><button onClick={() => deleteTask(task.id)} className="text-red-500"><Trash2 className="h-4 w-4" /></button></td></tr>)}</tbody></table></div>; }
function TaskBoard({ tasks, updateTask }: { tasks: Task[]; updateTask: (id: string, patch: Partial<Task>) => void }) { const statuses: Task["status"][] = ["未开始", "进行中", "已完成"]; return <div className="flex gap-4 overflow-x-auto pb-4">{statuses.map((status) => <section key={status} className="w-80 flex-shrink-0 rounded-3xl border border-slate-200 bg-slate-50 p-4"><div className="mb-3 flex justify-between"><h3 className="font-semibold">{status}</h3><span className="text-xs text-slate-500">{tasks.filter((task) => task.status === status).length}</span></div>{tasks.filter((task) => task.status === status).map((task) => <div key={task.id} className="mb-3 rounded-2xl border bg-white p-4 shadow-sm"><div className="font-medium">{task.name}</div><div className="mt-2 text-xs text-slate-500">{task.owner} · {task.priority} · {task.progress}%</div><div className="mt-3 flex gap-2">{statuses.filter((next) => next !== status).map((next) => <button key={next} onClick={() => updateTask(task.id, { status: next })} className="rounded-lg bg-slate-100 px-2 py-1 text-xs">→ {next}</button>)}</div></div>)}</section>)}</div>; }
function TaskGallery({ tasks }: { tasks: Task[] }) { return <div className="grid grid-cols-3 gap-4">{tasks.map((task) => <div key={task.id} className="rounded-3xl border border-slate-200 bg-white p-5"><div className="mb-3 h-24 rounded-2xl bg-gradient-to-br from-violet-100 to-indigo-100" /><h3 className="font-semibold">{task.name}</h3><p className="mt-1 text-sm text-slate-500">{task.owner} · {task.status}</p><div className="mt-3 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-violet-500" style={{ width: `${Math.min(100, task.progress)}%` }} /></div></div>)}</div>; }
function TaskCalendar({ tasks }: { tasks: Task[] }) { return <div className="rounded-3xl border border-slate-200 bg-white p-5">{tasks.slice().sort((a, b) => a.dueDate.localeCompare(b.dueDate)).map((task) => <div key={task.id} className="flex items-center gap-4 border-b border-slate-100 py-3 last:border-0"><div className="w-28 rounded-xl bg-violet-50 px-3 py-2 text-center text-sm text-violet-700">{task.dueDate}</div><div className="flex-1"><div className="font-medium">{task.name}</div><div className="text-sm text-slate-500">{task.owner} · {task.status} · {task.priority}</div></div></div>)}</div>; }
function InboxView({ inbox, createDoc, createMemory }: { inbox: InboxItem[]; createDoc: (item: InboxItem) => void; createMemory: (item: InboxItem) => void }) { return <ListPage title="Inbox 收集箱" desc="把 OpenClaw、网页、GitHub、文件输入整理成文档或 Memory。">{inbox.map((item) => <div key={item.id} className="rounded-3xl border bg-white p-5"><div className="flex justify-between"><b>{item.title}</b><span className="rounded-full bg-slate-100 px-3 py-1 text-xs">{item.source}</span></div><p className="mt-2 text-sm text-slate-600">{item.content}</p><div className="mt-4 flex gap-2"><button onClick={() => createDoc(item)} className="rounded-xl bg-violet-600 px-3 py-1.5 text-sm text-white">转文档</button><button onClick={() => createMemory(item)} className="rounded-xl bg-slate-100 px-3 py-1.5 text-sm">转 Memory</button></div></div>)}</ListPage>; }
function MemoryView({ memories, reviewMemory }: { memories: Memory[]; reviewMemory: (id: string, status: Memory["status"]) => void }) { return <ListPage title="Agent Memory 审核" desc="长期记忆必须审核，避免 Agent 错误沉淀。"><div className="grid grid-cols-3 gap-4">{(["pending", "accepted", "rejected"] as const).map((status) => <section key={status} className="rounded-3xl border bg-slate-50 p-4"><h3 className="mb-3 font-semibold">{status}</h3>{memories.filter((item) => item.status === status).map((memory) => <div key={memory.id} className="mb-3 rounded-2xl bg-white p-4 text-sm"><p>{memory.content}</p><div className="mt-2 text-xs text-slate-500">置信度 {Math.round(memory.confidence * 100)}%</div>{status === "pending" && <div className="mt-3 flex gap-2"><button onClick={() => reviewMemory(memory.id, "accepted")} className="rounded bg-emerald-500 px-2 py-1 text-xs text-white">接受</button><button onClick={() => reviewMemory(memory.id, "rejected")} className="rounded bg-red-500 px-2 py-1 text-xs text-white">拒绝</button></div>}</div>)}</section>)}</div></ListPage>; }
function TemplateView({ templates, createDoc }: { templates: Template[]; createDoc: (template: Template) => void }) { return <ListPage title="模板中心" desc="会议、项目、SOP、研究报告等文档模板。"><div className="grid grid-cols-3 gap-4">{templates.map((template) => <button key={template.id} onClick={() => createDoc(template)} className="rounded-3xl border bg-white p-5 text-left hover:border-violet-300"><div className="text-3xl">{template.icon}</div><div className="mt-3 font-semibold">{template.title}</div><p className="mt-2 text-sm text-slate-500">{template.desc}</p></button>)}</div></ListPage>; }
function ListPage({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) { return <div className="p-6"><h2 className="text-2xl font-bold">{title}</h2><p className="mb-5 text-sm text-slate-500">{desc}</p><div className="space-y-3">{children}</div></div>; }
