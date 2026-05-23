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
        className={cn("group flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-slate-600 hover:bg-slate-100", selectedId === node.id && "bg-blue-50 text-blue-700", dragOver && "ring-2 ring-blue-200")}
        style={{ paddingLeft: 8 + level * 14 }}
      >
        <button type="button" onClick={() => setOpen((value) => !value)} className="flex h-4 w-4 items-center justify-center text-slate-400">
          {hasChildren ? open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" /> : null}
        </button>
        {hasChildren ? <Folder className="h-4 w-4 text-amber-500" /> : <FileText className="h-4 w-4 text-blue-500" />}
        <button onClick={() => onSelect(node.id)} className="min-w-0 flex-1 truncate text-left">{node.title}</button>
      </div>
      {hasChildren && open && <div>{node.children?.map((child) => <TreeNode key={child.id} node={child} selectedId={selectedId} onSelect={onSelect} onMove={onMove} level={level + 1} />)}</div>}
    </div>
  );
}

function NavLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return <Link href={href} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-600 hover:bg-slate-100 [&_svg]:h-4 [&_svg]:w-4">{icon}<span>{label}</span></Link>;
}

function QuickDocList({ title, documents, selectedId, onSelect, empty }: { title: string; documents: DocumentRecord[]; selectedId?: string; onSelect: (id: string) => void; empty: string }) {
  return (
    <section className="mb-3">
      <div className="mb-1 px-2 text-xs font-medium text-slate-400">{title}</div>
      {documents.length ? documents.slice(0, 5).map((doc) => (
        <button key={doc.id} onClick={() => onSelect(doc.id)} className={cn("flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-slate-600 hover:bg-slate-100", selectedId === doc.id && "bg-blue-50 text-blue-700")}>
          <span>{doc.icon || "📄"}</span>
          <span className="min-w-0 flex-1 truncate">{doc.title}</span>
        </button>
      )) : <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-400">{empty}</div>}
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
    <aside className="flex h-screen w-72 flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-100 p-4">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">C</div><span className="font-semibold">ClawNote</span></div>
          <button className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">⌄</button>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input value={query ?? ""} onChange={(event) => onQueryChange?.(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-300" placeholder="搜索文档" />
        </div>
        <button onClick={onCreate} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"><Plus className="h-4 w-4" />新建文档</button>
      </div>

      <div className="border-b border-slate-100 p-3">
        <NavLink href="/clawnote" icon={<FileText />} label="文档" />
        <NavLink href="/calendar" icon={<CalendarDays />} label="日历" />
        <NavLink href="/knowledge" icon={<Database />} label="清单 / 知识" />
        <NavLink href="/files" icon={<Upload />} label="附件" />
        <NavLink href="/tokens" icon={<KeyRound />} label="连接设置" />
        <NavLink href="/settings" icon={<Settings />} label="设置" />
      </div>

      <div onDragOver={(event) => { event.preventDefault(); setRootDragOver(true); }} onDragLeave={() => setRootDragOver(false)} onDrop={dropToRoot} className={cn("flex-1 overflow-auto p-3", rootDragOver && "bg-blue-50/40")}>
        <QuickDocList title="固定" documents={pinnedDocuments} selectedId={selectedId} onSelect={onSelect} empty="还没有固定文档" />
        <QuickDocList title="最近" documents={recentDocuments} selectedId={selectedId} onSelect={onSelect} empty="最近访问会显示在这里" />
        <div className="mb-2 mt-4 px-2 text-xs font-medium text-slate-400">全部文档</div>
        {tree.map((node) => <TreeNode key={node.id} node={node} selectedId={selectedId} onSelect={onSelect} onMove={onMove} />)}
        {tree.length === 0 && <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">没有匹配的文档</div>}
        <div className="mt-3 rounded-xl border border-dashed border-slate-200 p-3 text-center text-xs text-slate-400">拖到这里移到根目录</div>
      </div>

      <div className="border-t border-slate-100 p-3">
        <NavLink href="/inbox" icon={<Inbox />} label="收集箱" />
        <NavLink href="/memory" icon={<Sparkles />} label="记忆" />
        <NavLink href="/archive" icon={<Archive />} label="归档" />
      </div>
    </aside>
  );
}
