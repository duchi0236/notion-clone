"use client";

import Link from "next/link";
import { Archive, Bot, CalendarDays, ChevronDown, ChevronRight, Database, FileText, Folder, Inbox, KeyRound, Plus, Search, Settings, Sparkles, Star, Upload } from "lucide-react";
import { DragEvent, useState } from "react";
import { cn } from "@/lib/utils";
import type { DocNode, DocumentRecord } from "./document-types";

function TreeNode({ node, selectedId, onSelect, onMove, level = 0 }: { node: DocNode; selectedId?: string; onSelect: (id: string) => void; onMove?: (id: string, parentId: string | null) => void; level?: number }) {
  const [open, setOpen] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const hasChildren = Boolean(node.children?.length);

  function onDragStart(event: DragEvent<HTMLDivElement>) {
    event.dataTransfer.setData("text/plain", node.id);
    event.dataTransfer.effectAllowed = "move";
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragOver(false);
    const draggedId = event.dataTransfer.getData("text/plain");
    if (!draggedId || draggedId === node.id) return;
    onMove?.(draggedId, node.id);
    setOpen(true);
  }

  return (
    <div>
      <div
        draggable
        onDragStart={onDragStart}
        onDragOver={(event) => { event.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={cn(
          "group flex items-center gap-1.5 rounded-2xl px-2 py-2 text-sm text-slate-600 transition hover:bg-white hover:shadow-sm",
          selectedId === node.id && "bg-white text-blue-700 shadow-sm ring-1 ring-blue-100",
          dragOver && "ring-2 ring-blue-200"
        )}
        style={{ paddingLeft: 10 + level * 14 }}
      >
        <button type="button" onClick={() => setOpen((value) => !value)} className="flex h-5 w-5 items-center justify-center rounded-lg text-slate-300 transition hover:bg-slate-100 hover:text-slate-500">
          {hasChildren ? open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" /> : null}
        </button>
        <span className={cn("flex h-7 w-7 items-center justify-center rounded-xl", hasChildren ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600")}>
          {hasChildren ? <Folder className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
        </span>
        <button onClick={() => onSelect(node.id)} className="min-w-0 flex-1 truncate text-left font-medium">{node.title}</button>
      </div>
      {hasChildren && open && <div className="mt-1 space-y-1">{node.children?.map((child) => <TreeNode key={child.id} node={child} selectedId={selectedId} onSelect={onSelect} onMove={onMove} level={level + 1} />)}</div>}
    </div>
  );
}

function NavLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return <Link href={href} className="flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-white hover:text-slate-900 hover:shadow-sm [&_svg]:h-4 [&_svg]:w-4">{icon}<span>{label}</span></Link>;
}

function QuickDocList({ title, documents, selectedId, onSelect, empty }: { title: string; documents: DocumentRecord[]; selectedId?: string; onSelect: (id: string) => void; empty: string }) {
  return (
    <section className="mb-4">
      <div className="mb-2 flex items-center justify-between px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
        <span>{title}</span>
        {documents.length > 0 && <span className="rounded-full bg-white px-2 py-0.5 text-[10px] text-slate-400 shadow-sm">{documents.length}</span>}
      </div>
      {documents.length ? documents.slice(0, 5).map((doc) => (
        <button key={doc.id} onClick={() => onSelect(doc.id)} className={cn("mb-1 flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-left text-sm text-slate-600 transition hover:bg-white hover:shadow-sm", selectedId === doc.id && "bg-white text-blue-700 shadow-sm ring-1 ring-blue-100")}>
          <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-slate-50 text-sm">{doc.icon || "📄"}</span>
          <span className="min-w-0 flex-1 truncate font-medium">{doc.title}</span>
          {title === "固定" && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />}
        </button>
      )) : <div className="rounded-2xl border border-dashed border-slate-200 bg-white/60 px-3 py-3 text-xs leading-5 text-slate-400">{empty}</div>}
    </section>
  );
}

export function DocumentTree({ tree, selectedId, query, onQueryChange, onSelect, onCreate, onMove, recentDocuments = [], pinnedDocuments = [] }: { tree: DocNode[]; selectedId?: string; query?: string; onQueryChange?: (query: string) => void; onSelect: (id: string) => void; onCreate: () => void; onMove?: (id: string, parentId: string | null) => void; recentDocuments?: DocumentRecord[]; pinnedDocuments?: DocumentRecord[] }) {
  const [rootDragOver, setRootDragOver] = useState(false);

  function dropToRoot(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setRootDragOver(false);
    const draggedId = event.dataTransfer.getData("text/plain");
    if (draggedId) onMove?.(draggedId, null);
  }

  return (
    <aside className="flex h-screen w-80 flex-col border-r border-white/70 bg-[#f7f8fb] text-slate-900 shadow-[8px_0_40px_rgba(15,23,42,0.04)]">
      <div className="p-4">
        <div className="mb-4 flex items-center justify-between rounded-[1.35rem] bg-white/80 p-3 shadow-sm ring-1 ring-slate-200/70 backdrop-blur">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-600 text-sm font-bold text-white shadow-lg shadow-blue-600/20">C</div>
            <div>
              <div className="font-semibold leading-tight">ClawNote</div>
              <div className="text-[11px] text-slate-400">Personal workspace</div>
            </div>
          </div>
          <button className="rounded-xl px-2 py-1 text-slate-400 transition hover:bg-slate-100">⌄</button>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input value={query ?? ""} onChange={(event) => onQueryChange?.(event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white/80 py-2.5 pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-50" placeholder="搜索文档、标题、标签" />
        </div>
        <button onClick={onCreate} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:-translate-y-0.5 hover:bg-blue-700"><Plus className="h-4 w-4" />新建文档</button>
      </div>

      <div className="px-3 pb-3">
        <div className="rounded-[1.4rem] bg-white/70 p-2 shadow-sm ring-1 ring-slate-200/60 backdrop-blur">
          <NavLink href="/clawnote" icon={<FileText />} label="文档" />
          <NavLink href="/lists" icon={<Database />} label="清单" />
          <NavLink href="/calendar" icon={<CalendarDays />} label="日历" />
          <NavLink href="/files" icon={<Upload />} label="附件" />
          <NavLink href="/tokens" icon={<KeyRound />} label="连接设置" />
          <NavLink href="/settings" icon={<Settings />} label="设置" />
        </div>
      </div>

      <div onDragOver={(event) => { event.preventDefault(); setRootDragOver(true); }} onDragLeave={() => setRootDragOver(false)} onDrop={dropToRoot} className={cn("flex-1 overflow-auto px-4 pb-4", rootDragOver && "bg-blue-50/40")}>
        <QuickDocList title="固定" documents={pinnedDocuments} selectedId={selectedId} onSelect={onSelect} empty="把重要文档固定在这里，方便快速回到工作现场。" />
        <QuickDocList title="最近" documents={recentDocuments} selectedId={selectedId} onSelect={onSelect} empty="最近访问的文档会显示在这里。" />
        <div className="mb-2 mt-5 flex items-center justify-between px-1 text-xs font-semibold uppercase tracking-wide text-slate-400"><span>全部文档</span><span>{tree.length}</span></div>
        <div className="space-y-1">
          {tree.map((node) => <TreeNode key={node.id} node={node} selectedId={selectedId} onSelect={onSelect} onMove={onMove} />)}
        </div>
        {tree.length === 0 && <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 p-4 text-xs leading-5 text-slate-400">没有匹配的文档，换个关键词试试。</div>}
        <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-white/50 p-3 text-center text-xs leading-5 text-slate-400">拖到这里移到根目录</div>
      </div>

      <div className="border-t border-white/70 p-3">
        <div className="rounded-[1.35rem] bg-white/70 p-2 shadow-sm ring-1 ring-slate-200/60 backdrop-blur">
          <NavLink href="/inbox" icon={<Inbox />} label="收集箱" />
          <NavLink href="/memory" icon={<Sparkles />} label="记忆" />
          <NavLink href="/archive" icon={<Archive />} label="归档" />
        </div>
      </div>
    </aside>
  );
}
