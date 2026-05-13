"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bot, BookOpen, CalendarDays, Check, Database, FileText, GalleryHorizontal, Home, Inbox, KanbanSquare, ListChecks, Plus, Search, Settings, Sparkles, Star, Table2, Trash2, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { NotionEditor } from "@/components/editor/NotionEditor";

type View = "home" | "docs" | "table" | "inbox" | "memory" | "templates" | "search";
type TaskView = "table" | "board" | "gallery" | "calendar";
type Doc = { id: string; title: string; icon: string; html: string; text: string; summary: string; tags: string[]; favorite: boolean; updatedAt: string };
type Task = { id: string; name: string; owner: string; status: "未开始" | "进行中" | "已完成"; priority: "低" | "中" | "高"; progress: number; dueDate: string };
type InboxItem = { id: string; source: string; title: string; content: string; status: "unprocessed" | "converted" | "archived" };
type Memory = { id: string; content: string; source: string; status: "pending" | "accepted" | "rejected" | "archived"; confidence: number; tags: string[] };
type Template = { id: string; title: string; icon: string; desc: string; html: string; tags: string[] };
type State = { docs: Doc[]; tasks: Task[]; inbox: InboxItem[]; memories: Memory[]; templates: Template[] };

const today = () => new Date().toISOString().slice(0, 10);
const uid = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
const htmlText = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const summarize = (value: string) => (value ? `${value.slice(0, 140)}${value.length > 140 ? "…" : ""}` : "暂无摘要");
const dateOnly = (value?: string) => (value ? new Date(value).toISOString().slice(0, 10) : today());

const seed: State = {
  docs: [
    { id: "d1", title: "OpenClaw 个人部署方案", icon: "🧠", html: "<h1>OpenClaw 个人部署方案</h1><p>部署一个可长期沉淀知识、记录任务、管理文档的个人 AI 工作台。</p><h2>核心模块</h2><ul><li>文档编辑器</li><li>知识库</li><li>Agent Memory</li><li>Inbox 收集中心</li></ul>", text: "OpenClaw 个人部署方案", summary: "部署个人 OpenClaw，并通过 ClawNote 做长期知识、任务和文档沉淀。", tags: ["OpenClaw", "部署", "知识库"], favorite: true, updatedAt: today() },
    { id: "d2", title: "产品设计原则", icon: "📘", html: "<h1>产品设计原则</h1><p>ClawNote 不是后台系统，而是类似 Notion、语雀、Word、Excel 的知识工作台。</p><blockquote>文档优先，Agent 辅助；人负责判断，AI 负责整理。</blockquote>", text: "ClawNote 类似 Notion 语雀 Word Excel", summary: "ClawNote 的核心是人和 Agent 共用的文档与知识工作台。", tags: ["产品", "原则"], favorite: false, updatedAt: today() },
  ],
  tasks: [
    { id: "t1", name: "替换为 TipTap 编辑器", owner: "Me", status: "已完成", priority: "高", progress: 100, dueDate: today() },
    { id: "t2", name: "实现多视图任务表", owner: "Me", status: "进行中", priority: "高", progress: 75, dueDate: today() },
    { id: "t3", name: "接入 OpenClaw Skill", owner: "Me", status: "未开始", priority: "中", progress: 10, dueDate: today() },
  ],
  inbox: [
    { id: "i1", source: "OpenClaw", title: "OpenClaw Chat 记录", content: "用户要求 ClawNote 更像 Notion / 语雀 / Word / Excel，而不是后台系统。", status: "unprocessed" },
  ],
  memories: [
    { id: "m1", content: "产品形态应类似 Notion、语雀、Word、Excel，而不是后台系统。", source: "产品反馈", status: "accepted", confidence: 0.98, tags: ["产品定位"] },
  ],
  templates: [
    { id: "tpl1", title: "会议纪要", icon: "📋", desc: "会议目标、讨论要点、行动项", tags: ["会议"], html: "<h1>会议纪要</h1><h2>会议目标</h2><p></p><h2>讨论要点</h2><ul><li></li></ul><h2>行动项</h2><ul><li>[ ] </li></ul>" },
    { id: "tpl2", title: "项目计划", icon: "🚀", desc: "目标、里程碑、风险、任务", tags: ["项目"], html: "<h1>项目计划</h1><h2>目标</h2><p></p><h2>里程碑</h2><ul><li></li></ul><h2>风险</h2><p></p>" },
    { id: "tpl3", title: "SOP 模板", icon: "🧭", desc: "将重复流程沉淀为标准方法", tags: ["SOP"], html: "<h1>SOP</h1><h2>适用场景</h2><p></p><h2>步骤</h2><ol><li></li></ol>" },
    { id: "tpl4", title: "研究报告", icon: "📊", desc: "市场、竞品、用户研究", tags: ["研究"], html: "<h1>研究报告</h1><h2>背景</h2><p></p><h2>发现</h2><p></p><h2>结论</h2><p></p>" },
  ],
};

async function api<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers || {}) } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function mapDoc(d: any): Doc {
  const html = d.contentHtml ?? d.html ?? "<h1>Untitled</h1><p></p>";
  const plain = d.contentText ?? d.text ?? htmlText(html);
  return { id: d.id, title: d.title ?? "Untitled", icon: d.icon ?? "📄", html, text: plain, summary: d.summary ?? summarize(plain), tags: Array.isArray(d.tags) ? d.tags : [], favorite: Boolean(d.isFavorite ?? d.favorite), updatedAt: dateOnly(d.updatedAt) };
}
function mapTask(row: any): Task { const d = row.data ?? row; return { id: row.id, name: d.name ?? "新任务", owner: d.owner ?? "Me", status: d.status ?? "未开始", priority: d.priority ?? "中", progress: Number(d.progress ?? 0), dueDate: d.dueDate ?? today() }; }
function mapInbox(i: any): InboxItem { return { id: i.id, source: i.source ?? "MANUAL", title: i.title ?? "Untitled", content: i.content ?? "", status: String(i.status ?? "UNPROCESSED").toLowerCase() as InboxItem["status"] }; }
function mapMemory(m: any): Memory { return { id: m.id, content: m.content ?? "", source: m.sourceType ?? m.source ?? "Agent", status: String(m.status ?? "PENDING").toLowerCase() as Memory["status"], confidence: Number(m.confidence ?? 1), tags: Array.isArray(m.tags) ? m.tags : [] }; }
function mapTemplate(t: any): Template { return { id: t.id, title: t.title ?? "Untitled", icon: t.icon ?? "📄", desc: t.description ?? t.desc ?? "", html: t.contentHtml ?? t.html ?? "<h1>Untitled</h1><p></p>", tags: Array.isArray(t.tags) ? t.tags : [] }; }

export default function ClawNoteWorkspace() {
  const [state, setState] = useState<State>(seed);
  const [view, setView] = useState<View>("home");
  const [taskView, setTaskView] = useState<TaskView>("table");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(seed.docs[0].id);
  const [ai, setAi] = useState(["你可以让我总结当前文档、提取任务、写入 Memory、检索知识库。"]);
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const doc = state.docs.find((item) => item.id === selected) ?? state.docs[0];

  useEffect(() => {
    const raw = localStorage.getItem("clawnote-state-v2");
    if (raw) setState(JSON.parse(raw) as State);
    void (async () => {
      const [docRes, taskRes, inboxRes, memoryRes, templateRes] = await Promise.all([
        api<{ documents: any[] }>("/api/documents"),
        api<{ rows: any[] }>("/api/collections/tasks"),
        api<{ items: any[] }>("/api/inbox"),
        api<{ memories: any[] }>("/api/memory"),
        api<{ templates: any[] }>("/api/templates"),
      ]);
      setState((current) => ({
        docs: docRes?.documents?.map(mapDoc) ?? current.docs,
        tasks: taskRes?.rows?.map(mapTask) ?? current.tasks,
        inbox: inboxRes?.items?.map(mapInbox) ?? current.inbox,
        memories: memoryRes?.memories?.map(mapMemory) ?? current.memories,
        templates: templateRes?.templates?.map(mapTemplate) ?? current.templates,
      }));
      if (docRes?.documents?.[0]?.id) setSelected(docRes.documents[0].id);
    })();
  }, []);

  useEffect(() => localStorage.setItem("clawnote-state-v2", JSON.stringify(state)), [state]);

  const docs = useMemo(() => state.docs.filter((item) => `${item.title} ${item.text} ${item.tags.join(" ")}`.toLowerCase().includes(query.toLowerCase())), [query, state.docs]);

  const persistDoc = (next: Doc) => {
    clearTimeout(saveTimers.current[next.id]);
    saveTimers.current[next.id] = setTimeout(() => {
      void api(`/api/documents/${next.id}`, {
        method: "PUT",
        body: JSON.stringify({ title: next.title, icon: next.icon, tags: next.tags, contentHtml: next.html, contentText: next.text, summary: next.summary, isFavorite: next.favorite }),
      });
    }, 600);
  };

  const updateDoc = (patch: Partial<Doc>) => {
    if (!doc) return;
    let next = doc;
    setState((current) => ({ ...current, docs: current.docs.map((item) => {
      if (item.id !== doc.id) return item;
      next = { ...item, ...patch, updatedAt: today() };
      return next;
    }) }));
    persistDoc(next);
  };

  const createDoc = async (template?: Template) => {
    const html = template?.html ?? "<h1>Untitled</h1><p>开始写作...</p>";
    const plain = htmlText(html);
    const draft: Doc = { id: uid("doc"), title: template?.title ?? "Untitled", icon: template?.icon ?? "📄", html, text: plain, summary: summarize(plain), tags: template?.tags ?? [], favorite: false, updatedAt: today() };
    setState((current) => ({ ...current, docs: [draft, ...current.docs] }));
    setSelected(draft.id);
    setView("docs");
    const saved = await api<{ document: any }>("/api/documents", { method: "POST", body: JSON.stringify({ title: draft.title, icon: draft.icon, tags: draft.tags, contentHtml: draft.html, contentText: draft.text, summary: draft.summary }) });
    if (saved?.document) {
      const mapped = mapDoc(saved.document);
      setState((current) => ({ ...current, docs: current.docs.map((item) => item.id === draft.id ? mapped : item) }));
      setSelected(mapped.id);
    }
  };

  const deleteDoc = () => {
    if (!doc) return;
    void api(`/api/documents/${doc.id}`, { method: "DELETE" });
    setState((current) => ({ ...current, docs: current.docs.filter((item) => item.id !== doc.id) }));
    setSelected(state.docs.find((item) => item.id !== doc.id)?.id ?? "");
  };

  const addTask = async (name = "新任务") => {
    const draft: Task = { id: uid("task"), name, owner: "Me", status: "未开始", priority: "中", progress: 0, dueDate: today() };
    setState((current) => ({ ...current, tasks: [...current.tasks, draft] }));
    const saved = await api<{ row: any }>("/api/collections/tasks", { method: "POST", body: JSON.stringify(draft) });
    if (saved?.row) setState((current) => ({ ...current, tasks: current.tasks.map((task) => task.id === draft.id ? mapTask(saved.row) : task) }));
  };
  const updateTask = (taskId: string, patch: Partial<Task>) => {
    setState((current) => ({ ...current, tasks: current.tasks.map((task) => task.id === taskId ? { ...task, ...patch } : task) }));
    void api(`/api/collections/tasks/${taskId}`, { method: "PUT", body: JSON.stringify(patch) });
  };
  const deleteTask = (taskId: string) => {
    setState((current) => ({ ...current, tasks: current.tasks.filter((task) => task.id !== taskId) }));
    void api(`/api/collections/tasks/${taskId}`, { method: "DELETE" });
  };

  const createMemory = async (content: string, source = "User", tags: string[] = []) => {
    const draft: Memory = { id: uid("memory"), content, source, status: "pending", confidence: 0.92, tags };
    setState((current) => ({ ...current, memories: [draft, ...current.memories] }));
    const saved = await api<{ memory: any }>("/api/memory", { method: "POST", body: JSON.stringify({ content, sourceType: source, tags, confidence: 0.92, status: "PENDING" }) });
    if (saved?.memory) setState((current) => ({ ...current, memories: current.memories.map((item) => item.id === draft.id ? mapMemory(saved.memory) : item) }));
  };
  const updateMemory = (memoryId: string, status: Memory["status"]) => {
    setState((current) => ({ ...current, memories: current.memories.map((item) => item.id === memoryId ? { ...item, status } : item) }));
    void api(`/api/memory/${memoryId}`, { method: "PUT", body: JSON.stringify({ status: status.toUpperCase() }) });
  };

  const askAi = (mode: "summary" | "task" | "memory" | "search") => {
    if (!doc) return;
    if (mode === "summary") {
      const nextSummary = summarize(doc.text);
      updateDoc({ summary: nextSummary });
      setAi((items) => [`已总结《${doc.title}》：${nextSummary}`, ...items]);
    }
    if (mode === "task") {
      void addTask(doc.title);
      setAi((items) => ["已从当前文档提取任务并加入项目表格。", ...items]);
    }
    if (mode === "memory") {
      void createMemory(summarize(doc.text), doc.title, doc.tags);
      setAi((items) => ["已写入待审核 Memory。", ...items]);
    }
    if (mode === "search") {
      const related = state.docs.filter((item) => item.id !== doc.id && item.tags.some((tag) => doc.tags.includes(tag))).map((item) => item.title).join("、") || "暂无";
      setAi((items) => [`找到相关文档：${related}`, ...items]);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f7fb] text-slate-900">
      <div className="grid min-h-screen grid-cols-[72px_260px_minmax(0,1fr)_360px]">
        <Rail view={view} setView={setView} />
        <Sidebar docs={docs} selected={selected} setSelected={setSelected} setView={setView} query={query} setQuery={setQuery} createDoc={() => void createDoc()} />
        <main className="min-w-0 border-x border-slate-200 bg-white">
          <Top query={query} setQuery={setQuery} createDoc={() => void createDoc()} />
          {view === "home" && <Dashboard state={state} setView={setView} setSelected={setSelected} />}
          {view === "docs" && <DocumentEditor doc={doc} updateDoc={updateDoc} deleteDoc={deleteDoc} askAi={askAi} />}
          {view === "table" && <TasksPage tasks={state.tasks} taskView={taskView} setTaskView={setTaskView} addTask={() => void addTask()} updateTask={updateTask} deleteTask={deleteTask} />}
          {view === "inbox" && <InboxPage items={state.inbox} createDoc={(title, content) => void createDoc({ id: "tmp", title, icon: "📥", desc: "", tags: ["Inbox"], html: `<h1>${title}</h1><p>${content}</p>` })} createMemory={createMemory} />}
          {view === "memory" && <MemoryPage memories={state.memories} updateMemory={updateMemory} />}
          {view === "templates" && <Templates templates={state.templates} createDoc={(template) => void createDoc(template)} />}
          {view === "search" && <SearchPage query={query} setQuery={setQuery} docs={docs} setSelected={setSelected} setView={setView} />}
        </main>
        <AiPanel doc={doc} state={state} ai={ai} askAi={askAi} />
      </div>
    </div>
  );
}

function Rail({ view, setView }: { view: View; setView: (v: View) => void }) {
  const items: [View, React.ElementType, string][] = [["home", Home, "首页"], ["docs", FileText, "文档"], ["table", Table2, "表格"], ["inbox", Inbox, "收集"], ["memory", Sparkles, "记忆"], ["templates", BookOpen, "模板"]];
  return <aside className="flex flex-col items-center gap-3 bg-slate-950 py-4 text-white"><div className="mb-2 flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-600 text-xl font-black">C</div>{items.map(([id, Icon, label]) => <button key={id} title={label} onClick={() => setView(id)} className={cn("flex h-11 w-11 items-center justify-center rounded-2xl text-slate-400 hover:bg-white/10 hover:text-white", view === id && "bg-violet-600 text-white")}><Icon className="h-5 w-5" /></button>)}</aside>;
}

function Sidebar(props: { docs: Doc[]; selected: string; setSelected: (v: string) => void; setView: (v: View) => void; query: string; setQuery: (v: string) => void; createDoc: () => void }) {
  return <aside className="bg-[#fbfbfe] p-4"><div className="mb-5 flex items-center justify-between"><div><h1 className="text-lg font-bold">ClawNote</h1><p className="text-xs text-slate-500">个人 AI 知识工作台</p></div><button onClick={props.createDoc} className="rounded-xl bg-violet-600 p-2 text-white"><Plus className="h-4 w-4" /></button></div><SearchBox value={props.query} onChange={props.setQuery} /><Section title="空间">{[["home", "工作台", Home], ["docs", "我的文档", FileText], ["table", "项目表格", Database], ["inbox", "收集箱", Inbox], ["memory", "Agent 记忆", Bot], ["search", "搜索", Search]].map(([id, label, Icon]) => <button key={String(id)} onClick={() => props.setView(id as View)} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-600 hover:bg-violet-50 hover:text-violet-700"><Icon className="h-4 w-4" />{String(label)}</button>)}</Section><Section title="文档树">{props.docs.map((doc) => <button key={doc.id} onClick={() => { props.setSelected(doc.id); props.setView("docs"); }} className={cn("flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-slate-100", props.selected === doc.id && "bg-violet-50 text-violet-700")}><span>{doc.icon}</span><span className="flex-1 truncate">{doc.title}</span>{doc.favorite && <Star className="h-3 w-3 fill-amber-400 text-amber-400" />}</button>)}</Section></aside>;
}

function SearchBox({ value, onChange }: { value: string; onChange: (v: string) => void }) { return <div className="mb-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2"><Search className="h-4 w-4 text-slate-400" /><input value={value} onChange={(event) => onChange(event.target.value)} placeholder="搜索文档、标签、记忆" className="min-w-0 flex-1 bg-transparent text-sm outline-none" /></div>; }
function Section({ title, children }: { title: string; children: React.ReactNode }) { return <section className="mb-5"><div className="mb-2 px-2 text-xs font-semibold uppercase text-slate-400">{title}</div><div className="space-y-1">{children}</div></section>; }
function Top({ query, setQuery, createDoc }: { query: string; setQuery: (v: string) => void; createDoc: () => void }) { return <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/90 px-5 backdrop-blur"><div className="flex flex-1 items-center gap-2 rounded-2xl bg-slate-100 px-3 py-2"><Search className="h-4 w-4 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索文档、任务、Memory..." className="flex-1 bg-transparent text-sm outline-none" /><span className="rounded-lg bg-white px-2 py-1 text-xs text-slate-400">⌘K</span></div><button onClick={createDoc} className="rounded-2xl bg-violet-600 px-4 py-2 text-sm text-white"><Plus className="mr-1 inline h-4 w-4" />新建</button><button className="rounded-2xl border border-slate-200 p-2"><Settings className="h-4 w-4" /></button></header>; }

function Dashboard({ state, setView, setSelected }: { state: State; setView: (v: View) => void; setSelected: (id: string) => void }) {
  return <div className="space-y-6 p-6"><div className="rounded-3xl bg-gradient-to-br from-violet-600 to-indigo-600 p-8 text-white"><p className="text-sm opacity-80">欢迎回来</p><h2 className="mt-2 text-3xl font-bold">你的 OpenClaw 知识工作台已准备好</h2><p className="mt-3 text-sm opacity-85">像 Notion / 语雀一样写文档，像 Excel 一样管理任务表，并让 Agent 自动沉淀长期记忆。</p></div><div className="grid grid-cols-4 gap-4"><Metric title="文档" value={state.docs.length} icon={<FileText />} /><Metric title="任务" value={state.tasks.length} icon={<ListChecks />} /><Metric title="收集" value={state.inbox.length} icon={<Inbox />} /><Metric title="Memory" value={state.memories.length} icon={<Sparkles />} /></div><div className="grid grid-cols-2 gap-4">{state.docs.slice(0, 4).map((doc) => <button key={doc.id} onClick={() => { setSelected(doc.id); setView("docs"); }} className="rounded-3xl border border-slate-200 bg-white p-5 text-left hover:border-violet-300"><div className="text-3xl">{doc.icon}</div><div className="mt-2 font-semibold">{doc.title}</div><p className="mt-1 text-sm text-slate-500">{doc.summary}</p></button>)}</div></div>;
}
function Metric({ title, value, icon }: { title: string; value: number; icon: React.ReactNode }) { return <div className="rounded-3xl border border-slate-200 bg-white p-5"><div className="flex justify-between text-sm text-slate-500">{title}<span className="text-violet-600 [&_svg]:h-5 [&_svg]:w-5">{icon}</span></div><div className="mt-3 text-3xl font-bold">{value}</div></div>; }

function DocumentEditor({ doc, updateDoc, deleteDoc, askAi }: { doc?: Doc; updateDoc: (patch: Partial<Doc>) => void; deleteDoc: () => void; askAi: (mode: "summary" | "task" | "memory" | "search") => void }) {
  if (!doc) return <div className="p-8 text-slate-500">暂无文档，点击新建开始。</div>;
  return <div className="mx-auto max-w-5xl p-8"><div className="mb-6 flex justify-between"><div><button className="mb-3 text-6xl">{doc.icon}</button><input value={doc.title} onChange={(event) => updateDoc({ title: event.target.value })} className="w-full bg-transparent text-4xl font-bold outline-none" /><div className="mt-3 flex gap-2">{doc.tags.map((tag) => <span key={tag} className="rounded-full bg-violet-50 px-3 py-1 text-xs text-violet-700">#{tag}</span>)}</div></div><button onClick={deleteDoc} className="h-10 rounded-xl border border-slate-200 p-2 text-red-500"><Trash2 className="h-4 w-4" /></button></div><NotionEditor content={doc.html} onChange={(html) => { const plain = htmlText(html); updateDoc({ html, text: plain, summary: summarize(plain) }); }} onTextChange={(plain) => updateDoc({ text: plain, summary: summarize(plain) })} onAiCommand={(command) => askAi(command === "tasks" ? "task" : command)} /></div>;
}

function TasksPage({ tasks, taskView, setTaskView, addTask, updateTask, deleteTask }: { tasks: Task[]; taskView: TaskView; setTaskView: (view: TaskView) => void; addTask: () => void; updateTask: (id: string, patch: Partial<Task>) => void; deleteTask: (id: string) => void }) {
  return <div className="p-6"><div className="mb-5 flex items-center justify-between"><div><h2 className="text-2xl font-bold">项目跟进表</h2><p className="text-sm text-slate-500">Table / Board / Gallery / Calendar 多视图。</p></div><button onClick={addTask} className="rounded-2xl bg-violet-600 px-4 py-2 text-sm text-white"><Plus className="mr-1 inline h-4 w-4" />新增任务</button></div><div className="mb-5 flex gap-2">{[["table", Table2, "表格"], ["board", KanbanSquare, "看板"], ["gallery", GalleryHorizontal, "画廊"], ["calendar", CalendarDays, "日历"]].map(([key, Icon, label]) => <button key={String(key)} onClick={() => setTaskView(key as TaskView)} className={cn("flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm", taskView === key ? "border-violet-300 bg-violet-50 text-violet-700" : "border-slate-200 bg-white text-slate-600")}><Icon className="h-4 w-4" />{String(label)}</button>)}</div>{taskView === "table" && <TaskTable tasks={tasks} updateTask={updateTask} deleteTask={deleteTask} />}{taskView === "board" && <TaskBoard tasks={tasks} updateTask={updateTask} />}{taskView === "gallery" && <TaskGallery tasks={tasks} />}{taskView === "calendar" && <TaskCalendar tasks={tasks} />}</div>;
}
function TaskTable({ tasks, updateTask, deleteTask }: { tasks: Task[]; updateTask: (id: string, p: Partial<Task>) => void; deleteTask: (id: string) => void }) { return <div className="overflow-hidden rounded-3xl border border-slate-200"><table className="w-full bg-white text-sm"><thead className="bg-slate-50 text-left text-slate-500"><tr>{["任务", "负责人", "状态", "优先级", "截止", "进度", ""].map((head) => <th key={head} className="p-3">{head}</th>)}</tr></thead><tbody>{tasks.map((task) => <tr key={task.id} className="border-t border-slate-100"><td className="p-3"><input value={task.name} onChange={(event) => updateTask(task.id, { name: event.target.value })} className="w-full bg-transparent outline-none" /></td><td className="p-3"><input value={task.owner} onChange={(event) => updateTask(task.id, { owner: event.target.value })} className="w-24 bg-transparent outline-none" /></td><td className="p-3"><select value={task.status} onChange={(event) => updateTask(task.id, { status: event.target.value as Task["status"] })} className="rounded-xl border px-2 py-1"><option>未开始</option><option>进行中</option><option>已完成</option></select></td><td className="p-3"><select value={task.priority} onChange={(event) => updateTask(task.id, { priority: event.target.value as Task["priority"] })} className="rounded-xl border px-2 py-1"><option>低</option><option>中</option><option>高</option></select></td><td className="p-3"><input type="date" value={task.dueDate} onChange={(event) => updateTask(task.id, { dueDate: event.target.value })} className="bg-transparent" /></td><td className="p-3"><input type="number" value={task.progress} onChange={(event) => updateTask(task.id, { progress: Number(event.target.value) })} className="w-16 rounded-lg border px-2 py-1" />%</td><td><button onClick={() => deleteTask(task.id)} className="text-red-500"><Trash2 className="h-4 w-4" /></button></td></tr>)}</tbody></table></div>; }
function TaskBoard({ tasks, updateTask }: { tasks: Task[]; updateTask: (id: string, p: Partial<Task>) => void }) { const statuses: Task["status"][] = ["未开始", "进行中", "已完成"]; return <div className="flex gap-4 overflow-x-auto pb-4">{statuses.map((status) => <section key={status} className="w-80 flex-shrink-0 rounded-3xl border border-slate-200 bg-slate-50 p-4"><div className="mb-3 flex items-center justify-between"><h3 className="font-semibold">{status}</h3><span className="text-xs text-slate-500">{tasks.filter((task) => task.status === status).length}</span></div>{tasks.filter((task) => task.status === status).map((task) => <div key={task.id} className="mb-3 rounded-2xl border bg-white p-4 shadow-sm"><div className="font-medium">{task.name}</div><div className="mt-2 flex gap-2 text-xs text-slate-500"><span>{task.owner}</span><span>{task.priority}</span><span>{task.progress}%</span></div><div className="mt-3 flex gap-2">{statuses.filter((next) => next !== status).map((next) => <button key={next} onClick={() => updateTask(task.id, { status: next })} className="rounded-lg bg-slate-100 px-2 py-1 text-xs">→ {next}</button>)}</div></div>)}</section>)}</div>; }
function TaskGallery({ tasks }: { tasks: Task[] }) { return <div className="grid grid-cols-3 gap-4">{tasks.map((task) => <div key={task.id} className="rounded-3xl border border-slate-200 bg-white p-5"><div className="mb-3 h-24 rounded-2xl bg-gradient-to-br from-violet-100 to-indigo-100" /><h3 className="font-semibold">{task.name}</h3><p className="mt-1 text-sm text-slate-500">{task.owner} · {task.status}</p><div className="mt-3 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-violet-500" style={{ width: `${Math.min(100, task.progress)}%` }} /></div></div>)}</div>; }
function TaskCalendar({ tasks }: { tasks: Task[] }) { return <div className="rounded-3xl border border-slate-200 bg-white p-5">{tasks.slice().sort((a, b) => a.dueDate.localeCompare(b.dueDate)).map((task) => <div key={task.id} className="flex items-center gap-4 border-b border-slate-100 py-3 last:border-0"><div className="w-28 rounded-xl bg-violet-50 px-3 py-2 text-center text-sm text-violet-700">{task.dueDate}</div><div className="flex-1"><div className="font-medium">{task.name}</div><div className="text-sm text-slate-500">{task.owner} · {task.status} · {task.priority}</div></div></div>)}</div>; }

function InboxPage({ items, createDoc, createMemory }: { items: InboxItem[]; createDoc: (title: string, content: string) => void; createMemory: (content: string, source?: string, tags?: string[]) => void }) { return <ListPage title="Inbox 收集箱" desc="把 OpenClaw、网页、GitHub、文件输入整理成文档、任务或 Memory。">{items.map((item) => <div key={item.id} className="rounded-3xl border bg-white p-5"><div className="flex justify-between"><b>{item.title}</b><span className="rounded-full bg-slate-100 px-3 py-1 text-xs">{item.source}</span></div><p className="mt-2 text-sm text-slate-600">{item.content}</p><div className="mt-4 flex gap-2"><button onClick={() => createDoc(item.title, item.content)} className="rounded-xl bg-violet-600 px-3 py-1.5 text-sm text-white">转文档</button><button onClick={() => createMemory(item.content, item.source, [item.source])} className="rounded-xl bg-slate-100 px-3 py-1.5 text-sm">转 Memory</button></div></div>)}</ListPage>; }
function MemoryPage({ memories, updateMemory }: { memories: Memory[]; updateMemory: (id: string, status: Memory["status"]) => void }) { return <ListPage title="Agent Memory 审核" desc="长期记忆必须审核，避免 Agent 错误沉淀。"><div className="grid grid-cols-3 gap-4">{(["pending", "accepted", "rejected"] as const).map((status) => <section key={status} className="rounded-3xl border bg-slate-50 p-4"><h3 className="mb-3 font-semibold">{status}</h3>{memories.filter((item) => item.status === status).map((memory) => <div key={memory.id} className="mb-3 rounded-2xl bg-white p-4 text-sm"><p>{memory.content}</p><div className="mt-2 text-xs text-slate-500">置信度 {Math.round(memory.confidence * 100)}%</div>{status === "pending" && <div className="mt-3 flex gap-2"><button onClick={() => updateMemory(memory.id, "accepted")} className="rounded bg-emerald-500 px-2 py-1 text-xs text-white">接受</button><button onClick={() => updateMemory(memory.id, "rejected")} className="rounded bg-red-500 px-2 py-1 text-xs text-white">拒绝</button></div>}</div>)}</section>)}</div></ListPage>; }
function Templates({ templates, createDoc }: { templates: Template[]; createDoc: (template: Template) => void }) { return <ListPage title="模板中心" desc="会议、项目、SOP、研究报告等文档模板。"><div className="grid grid-cols-3 gap-4">{templates.map((template) => <button key={template.id} onClick={() => createDoc(template)} className="rounded-3xl border bg-white p-5 text-left hover:border-violet-300"><div className="text-3xl">{template.icon}</div><div className="mt-3 font-semibold">{template.title}</div><p className="mt-2 text-sm text-slate-500">{template.desc}</p></button>)}</div></ListPage>; }
function SearchPage({ query, setQuery, docs, setSelected, setView }: { query: string; setQuery: (value: string) => void; docs: Doc[]; setSelected: (id: string) => void; setView: (view: View) => void }) { return <ListPage title="搜索与推荐" desc="关键词搜索，后端可接 PostgreSQL 全文检索和 pgvector。"><SearchBox value={query} onChange={setQuery} />{docs.map((doc) => <button key={doc.id} onClick={() => { setSelected(doc.id); setView("docs"); }} className="mb-3 w-full rounded-3xl border bg-white p-5 text-left hover:border-violet-300"><b>{doc.icon} {doc.title}</b><p className="mt-2 text-sm text-slate-500">{doc.summary}</p></button>)}</ListPage>; }
function ListPage({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) { return <div className="p-6"><h2 className="text-2xl font-bold">{title}</h2><p className="mb-5 text-sm text-slate-500">{desc}</p><div className="space-y-3">{children}</div></div>; }
function AiPanel({ doc, state, ai, askAi }: { doc?: Doc; state: State; ai: string[]; askAi: (mode: "summary" | "task" | "memory" | "search") => void }) { return <aside className="flex flex-col bg-[#fbfbfe] p-4"><h2 className="font-bold">Claw AI 助手</h2><p className="mb-4 text-xs text-slate-500">基于当前文档和知识库</p><div className="mb-4 rounded-3xl bg-violet-50 p-4"><div className="mb-1 text-sm font-medium text-violet-700"><Sparkles className="mr-1 inline h-4 w-4" />当前上下文</div><b>{doc?.title ?? "暂无文档"}</b><p className="mt-1 text-xs text-slate-600">{doc?.summary ?? "新建或选择一个文档开始。"}</p></div><div className="mb-4 grid grid-cols-2 gap-2"><button onClick={() => askAi("summary")} className="rounded-2xl border bg-white px-3 py-2 text-sm hover:text-violet-700">总结文档</button><button onClick={() => askAi("task")} className="rounded-2xl border bg-white px-3 py-2 text-sm hover:text-violet-700">提取任务</button><button onClick={() => askAi("memory")} className="rounded-2xl border bg-white px-3 py-2 text-sm hover:text-violet-700">写入 Memory</button><button onClick={() => askAi("search")} className="rounded-2xl border bg-white px-3 py-2 text-sm hover:text-violet-700">相关文档</button></div><div className="mb-4 grid grid-cols-2 gap-3"><Metric title="Memory" value={state.memories.length} icon={<Sparkles />} /><Metric title="任务" value={state.tasks.length} icon={<Check />} /></div><div className="min-h-0 flex-1 space-y-3 overflow-auto">{ai.map((message, index) => <div key={`${message}-${index}`} className="rounded-3xl bg-white p-4 text-sm shadow-sm"><Bot className="mr-1 inline h-4 w-4 text-violet-600" />{message}</div>)}</div><div className="mt-4 rounded-2xl border bg-white p-3 text-sm text-slate-500"><Wand2 className="mr-1 inline h-4 w-4" />后端 Agent API 已预留，可接 OpenClaw。</div></aside>; }
