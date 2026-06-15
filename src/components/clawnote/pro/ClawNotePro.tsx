"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Bot,
  CalendarDays,
  Check,
  ChevronDown,
  Grid3x3,
  ChevronRight,
  Clock3,
  Command,
  Database,
  Droplets,
  ExternalLink,
  FilePlus2,
  FileText,
  FolderTree,
  PanelLeftClose,
  PanelLeftOpen,
  KeyRound,
  Link2,
  MoreHorizontal,
  Moon,
  Network,
  Plus,
  RotateCcw,
  Search,
  Settings,
  Sun,
  Share2,
  ShieldCheck,
  Star,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { cn, formatDateTime } from "@/lib/utils";
import { docDisplayTitle } from "./api";
import type { AgentMutation, Doc, Memory, PageNode, View } from "./types";
import { useWorkspaceState } from "./useWorkspaceState";
import { useTheme } from "./useTheme";
import { DocumentPanel } from "./DocumentPanel";
import { PageIcon } from "./PageIcon";
import CalendarApp from "../calendar/CalendarApp";
import BitableApp from "../bitable/BitableApp";
import { AgentChat } from "../agent/AgentChat";
import { AiConfigPanel } from "../agent/AiConfigPanel";

type SidebarTab = "tree" | "recent" | "favorites" | "trash";
type AiTab = "chat" | "config" | "overview" | "memory" | "activity";

const AI_TABS: { key: AiTab; label: string; desc: string }[] = [
  { key: "chat", label: "对话", desc: "和工作区助手对话" },
  { key: "config", label: "配置", desc: "模型与技能工具" },
  { key: "overview", label: "接入概览", desc: "Agent API 与可审计写入" },
  { key: "memory", label: "Memory 审核", desc: "外部写入的长期记忆" },
  { key: "activity", label: "活动日志", desc: "版本 / 评论 / Agent 运行" },
];

type ActivityItem = {
  id: string;
  type: "version" | "comment" | "agent";
  title: string;
  desc: string;
  createdAt: string;
};

function sortDocs(a: Doc, b: Doc) {
  if (a.sortIndex !== b.sortIndex) return a.sortIndex - b.sortIndex;
  const updated = new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  if (updated !== 0) return updated;
  return a.title.localeCompare(b.title);
}

function buildDocTree(docs: Doc[]) {
  const nodes = new Map<string, PageNode>();
  const roots: PageNode[] = [];

  for (const doc of docs) nodes.set(doc.id, { ...doc, children: [] });

  for (const doc of docs) {
    const node = nodes.get(doc.id);
    if (!node) continue;
    const parent = doc.parentId ? nodes.get(doc.parentId) : null;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }

  const sortBranch = (items: PageNode[]) => {
    items.sort(sortDocs);
    items.forEach((item) => sortBranch(item.children));
  };
  sortBranch(roots);

  return roots;
}

function ancestorIds(docs: Doc[], selectedId: string) {
  const byId = new Map(docs.map((doc) => [doc.id, doc]));
  const ids = new Set<string>();
  let current = byId.get(selectedId);
  while (current?.parentId) {
    ids.add(current.parentId);
    current = byId.get(current.parentId);
  }
  return ids;
}

export default function ClawNotePro() {
  const [view, setView] = useState<View>("docs");
  const [aiTab, setAiTab] = useState<AiTab>("chat");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [mobileTreeOpen, setMobileTreeOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [toast, setToast] = useState<{ message: string; undo?: () => void } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(message: string, undo?: () => void) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, undo });
    toastTimer.current = setTimeout(() => setToast(null), 5000);
  }

  // 删除 = 移入回收站 + 可撤销 Toast
  function deleteDocWithUndo(id?: string) {
    const ids = store.deleteDoc(id);
    if (!ids.length) return;
    showToast(`已将 ${ids.length > 1 ? `${ids.length} 篇文档` : "文档"}移入回收站`, () => {
      ids.forEach((docId) => store.restoreDoc(docId));
      setToast(null);
    });
  }
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [recentDocIds, setRecentDocIds] = useState<string[]>([]);
  const { dark, toggle: toggleTheme, glass, toggleGlass } = useTheme();
  const store = useWorkspaceState();
  const activeDocs = store.activeDocs ?? store.docs.filter((doc) => !doc.isArchived);
  const docTree = useMemo(() => buildDocTree(activeDocs), [activeDocs]);

  useEffect(() => {
    const next = ancestorIds(activeDocs, store.selectedDocId);
    if (next.size === 0) return;
    setExpandedIds((current) => new Set([...Array.from(current), ...Array.from(next)]));
  }, [activeDocs, store.selectedDocId]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((value) => !value);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  function createRootDoc() {
    setView("docs");
    void store.createDoc();
  }

  function createChildDoc(parentId: string) {
    setView("docs");
    setExpandedIds((current) => new Set(current).add(parentId));
    void store.createDoc({ parentId });
  }

  function selectDoc(id: string) {
    setView("docs");
    store.setSelectedDocId(id);
    setRecentDocIds((ids) => [id, ...ids.filter((item) => item !== id)].slice(0, 8));
  }

  function toggleExpanded(id: string) {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div
      className={cn(
        "grid min-h-screen grid-cols-1 bg-white text-slate-900",
        sidebarCollapsed ? "lg:grid-cols-[56px_minmax(0,1fr)]" : "lg:grid-cols-[56px_292px_minmax(0,1fr)]",
      )}
    >
      <nav className="hidden h-screen flex-col items-center gap-1 border-r border-slate-200 bg-[#f4f4f3] py-3 lg:flex">
        <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-sm font-bold text-white">C</div>
        <IconRailButton
          active={false}
          onClick={() => setSidebarCollapsed((v) => !v)}
          icon={sidebarCollapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
          label={sidebarCollapsed ? "展开侧栏" : "收起侧栏"}
        />
        <div className="my-1 h-px w-7 bg-slate-200" />
        <IconRailButton active={view === "docs"} onClick={() => setView("docs")} icon={<FileText />} label="文档" />
        <IconRailButton active={view === "calendar"} onClick={() => setView("calendar")} icon={<CalendarDays />} label="日历" />
        <IconRailButton active={view === "bitable"} onClick={() => setView("bitable")} icon={<Grid3x3 />} label="多维表格" />
        <IconRailButton active={view === "ai"} onClick={() => setView("ai")} icon={<Bot />} label="AI 接入" />
        <IconRailButton active={glass} onClick={toggleGlass} icon={<Droplets />} label={glass ? "关闭玻璃质感" : "液体玻璃"} wrapperClassName="mt-auto" />
        <IconRailButton active={false} onClick={toggleTheme} icon={dark ? <Sun /> : <Moon />} label={dark ? "浅色模式" : "深色模式"} />
        <IconRailButton active={view === "settings"} onClick={() => setView("settings")} icon={<Settings />} label="设置" />
      </nav>
      <aside className={cn("hidden h-screen min-h-0 flex-col border-r border-slate-200 bg-[#fbfbfa]", !sidebarCollapsed && "lg:flex")}>
        <div className="px-4 pb-3 pt-4">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="min-w-0">
                <h1 className="truncate text-sm font-semibold leading-5">ClawNote</h1>
                <p className="text-xs text-slate-500">超级文档空间</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setPaletteOpen(true)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200 hover:text-slate-950" title="打开命令面板">
                <Command className="h-4 w-4" />
              </button>
              <button onClick={createRootDoc} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200 hover:text-slate-950" title="新建文档">
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={store.query}
              onChange={(event) => store.setQuery(event.target.value)}
              placeholder="搜索标题、正文、标签"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
          {view === "docs" && (
            <DocsSidebar
              docs={docTree}
              flatDocs={store.filteredDocs}
              activeDocs={activeDocs}
              favoriteDocs={store.favoriteDocs ?? []}
              archivedDocs={store.archivedDocs ?? []}
              recentDocs={recentDocIds.map((id) => activeDocs.find((doc) => doc.id === id)).filter(Boolean) as Doc[]}
              searching={store.query.trim().length > 0}
              selectedDocId={store.selectedDocId}
              expandedIds={expandedIds}
              selectDoc={selectDoc}
              createRootDoc={createRootDoc}
              createChildDoc={createChildDoc}
              toggleExpanded={toggleExpanded}
              moveDoc={store.moveDoc}
              restoreDoc={store.restoreDoc}
              toggleFavorite={store.toggleFavorite}
              deleteDoc={deleteDocWithUndo}
              purgeDoc={store.purgeDoc}
              emptyTrash={store.emptyTrash}
            />
          )}
          {view === "calendar" && <ContextAside title="日历" desc="月 / 周 / 日视图，支持拖拽新建与移动事件、重复规则、多日历配色和桌面提醒。" />}
          {view === "bitable" && <ContextAside title="多维表格" desc="飞书式多维表格：多张数据表、富字段类型、表格 / 看板 / 画册 / 表单视图，支持筛选排序分组与表间关联。" />}
          {view === "ai" && <AgentSidebar tab={aiTab} setTab={setAiTab} />}
          {view === "settings" && <ContextAside title="空间设置" desc="文件、访问密钥、权限、发布和导入导出集中放在这里。" />}
        </div>

      </aside>

      <main className="min-w-0 bg-white">
        {view === "docs" && (
          <DocumentPanel
            doc={store.selectedDoc}
            docs={activeDocs}
            updateDoc={store.updateDoc}
            saveState={store.saveState}
            autoFocusTitle={!!store.selectedDoc && (store.selectedDoc.clientKey ?? store.selectedDoc.id) === store.lastCreatedKey}
            onTitleFocused={store.clearLastCreated}
            deleteDoc={deleteDocWithUndo}
            createChild={() => store.selectedDoc && createChildDoc(store.selectedDoc.id)}
            duplicateDoc={() => store.selectedDoc && void store.duplicateDoc(store.selectedDoc.id)}
            toggleFavorite={() => store.selectedDoc && store.toggleFavorite(store.selectedDoc.id)}
            onRestored={() => void store.reloadSelectedDoc()}
          />
        )}
        {view === "calendar" && <CalendarApp />}
        {view === "bitable" && <BitableApp />}
        {view === "ai" &&
          (aiTab === "chat" ? (
            <AgentChat
              onOpenDoc={async (id) => {
                if (!activeDocs.some((doc) => doc.id === id)) await store.reloadDocs();
                selectDoc(id);
              }}
            />
          ) : aiTab === "config" ? (
            <AiConfigPanel />
          ) : (
            <AiAccessPanel tab={aiTab} memories={store.memories} reviewMemory={store.reviewMemory} />
          ))}
        {view === "settings" && <SettingsPanel />}
      </main>

      {paletteOpen && (
        <CommandPalette
          docs={activeDocs}
          onClose={() => setPaletteOpen(false)}
          onSelectDoc={(id) => {
            selectDoc(id);
            setPaletteOpen(false);
          }}
          onCreate={() => {
            createRootDoc();
            setPaletteOpen(false);
          }}
          onNavigate={(v) => {
            setView(v);
            setPaletteOpen(false);
          }}
        />
      )}

      {/* ---- Mobile (below lg): page-tree FAB + slide-over drawer + bottom tabs ---- */}
      {view === "docs" && !mobileTreeOpen && (
        <button
          onClick={() => setMobileTreeOpen(true)}
          className="fixed bottom-[4.5rem] left-4 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-slate-900 text-white shadow-lg lg:hidden"
          title="页面树"
        >
          <FolderTree className="h-5 w-5" />
        </button>
      )}

      {mobileTreeOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setMobileTreeOpen(false)} />
          <div className="absolute bottom-0 left-0 top-0 flex w-[85vw] max-w-[320px] flex-col bg-[#fbfbfa] shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <h1 className="text-sm font-semibold leading-5">ClawNote</h1>
                <p className="text-xs text-slate-500">页面树</p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={createRootDoc} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200" title="新建文档">
                  <Plus className="h-4 w-4" />
                </button>
                <button onClick={() => setMobileTreeOpen(false)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200" title="关闭">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="px-3 pt-3">
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
                <Search className="h-4 w-4 text-slate-400" />
                <input
                  value={store.query}
                  onChange={(event) => store.setQuery(event.target.value)}
                  placeholder="搜索标题、正文、标签"
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
                />
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-6 pt-3">
              <DocsSidebar
                docs={docTree}
                flatDocs={store.filteredDocs}
                activeDocs={activeDocs}
                favoriteDocs={store.favoriteDocs ?? []}
                archivedDocs={store.archivedDocs ?? []}
                recentDocs={recentDocIds.map((id) => activeDocs.find((doc) => doc.id === id)).filter(Boolean) as Doc[]}
                searching={store.query.trim().length > 0}
                selectedDocId={store.selectedDocId}
                expandedIds={expandedIds}
                selectDoc={(id) => {
                  selectDoc(id);
                  setMobileTreeOpen(false);
                }}
                createRootDoc={createRootDoc}
                createChildDoc={createChildDoc}
                toggleExpanded={toggleExpanded}
                moveDoc={store.moveDoc}
                restoreDoc={store.restoreDoc}
                toggleFavorite={store.toggleFavorite}
                deleteDoc={deleteDocWithUndo}
                purgeDoc={store.purgeDoc}
                emptyTrash={store.emptyTrash}
              />
            </div>
          </div>
        </div>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-40 flex h-14 items-stretch border-t border-slate-200 bg-white/95 backdrop-blur lg:hidden">
        <MobileTab active={view === "docs"} onClick={() => setView("docs")} icon={<FileText />} label="文档" />
        <MobileTab active={view === "calendar"} onClick={() => setView("calendar")} icon={<CalendarDays />} label="日历" />
        <MobileTab active={view === "bitable"} onClick={() => setView("bitable")} icon={<Grid3x3 />} label="表格" />
        <MobileTab active={view === "ai"} onClick={() => setView("ai")} icon={<Bot />} label="AI" />
        <MobileTab active={view === "settings"} onClick={() => setView("settings")} icon={<Settings />} label="设置" />
      </nav>

      {/* 操作反馈 Toast（删除可撤销等） */}
      {toast && (
        <div className="fixed bottom-20 left-1/2 z-[70] flex -translate-x-1/2 items-center gap-3 rounded-xl bg-slate-900 px-4 py-2.5 text-sm text-white shadow-2xl lg:bottom-6">
          <span>{toast.message}</span>
          {toast.undo && (
            <button onClick={toast.undo} className="rounded-md px-2 py-0.5 font-medium text-amber-300 hover:bg-white/10">
              撤销
            </button>
          )}
          <button onClick={() => setToast(null)} className="rounded-md p-0.5 text-slate-400 hover:bg-white/10 hover:text-white">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

function MobileTab({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] [&_svg]:h-5 [&_svg]:w-5",
        active ? "text-slate-950" : "text-slate-400",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function IconRailButton({
  active,
  onClick,
  icon,
  label,
  wrapperClassName,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
  wrapperClassName?: string;
}) {
  return (
    <div className={cn("group relative", wrapperClassName)}>
      <button
        onClick={onClick}
        aria-label={label}
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-900 [&_svg]:h-5 [&_svg]:w-5",
          active && "bg-slate-900 text-white hover:bg-slate-900 hover:text-white"
        )}
      >
        {icon}
      </button>
      <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity duration-100 group-hover:opacity-100">
        {label}
      </span>
    </div>
  );
}

function DocsSidebar({
  docs,
  flatDocs,
  activeDocs,
  favoriteDocs,
  archivedDocs,
  recentDocs,
  searching,
  selectedDocId,
  expandedIds,
  selectDoc,
  createRootDoc,
  createChildDoc,
  toggleExpanded,
  moveDoc,
  restoreDoc,
  toggleFavorite,
  deleteDoc,
  purgeDoc,
  emptyTrash,
}: {
  docs: PageNode[];
  flatDocs: Doc[];
  activeDocs: Doc[];
  favoriteDocs: Doc[];
  archivedDocs: Doc[];
  recentDocs: Doc[];
  searching: boolean;
  selectedDocId: string;
  expandedIds: Set<string>;
  selectDoc: (id: string) => void;
  createRootDoc: () => void;
  createChildDoc: (parentId: string) => void;
  toggleExpanded: (id: string) => void;
  moveDoc: (id: string, parentId: string | null) => void;
  restoreDoc: (id: string) => void;
  toggleFavorite: (id: string) => void;
  deleteDoc: (id: string) => void;
  purgeDoc: (id: string) => void;
  emptyTrash: () => void;
}) {
  const [tab, setTab] = useState<SidebarTab>("tree");

  if (searching) {
    return (
      <SidebarSection
        title="搜索结果"
        action={<button onClick={createRootDoc} className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-200" title="新建文档"><FilePlus2 className="h-4 w-4" /></button>}
      >
        <SearchGroup title="标题或内容匹配" docs={flatDocs} selectedDocId={selectedDocId} onSelect={selectDoc} />
        {flatDocs.length === 0 && <EmptyState>没有找到相关文档</EmptyState>}
      </SidebarSection>
    );
  }

  return (
    <div>
      <div className="mb-3 grid grid-cols-4 gap-1 rounded-lg bg-slate-100 p-1">
        {[
          ["tree", "目录"],
          ["recent", "最近"],
          ["favorites", "收藏"],
          ["trash", "回收"],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key as SidebarTab)}
            className={cn("inline-flex h-8 items-center justify-center rounded-md px-2 text-xs text-slate-500 hover:text-slate-950", tab === key && "bg-white text-slate-950 shadow-sm")}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "tree" && (
        <SidebarSection
          title="页面树"
          action={<button onClick={createRootDoc} className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-200" title="新建根页面"><FilePlus2 className="h-4 w-4" /></button>}
        >
          <div
            className="rounded-lg border border-dashed border-transparent"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const id = event.dataTransfer.getData("text/plain");
              if (id) moveDoc(id, null);
            }}
          >
            {docs.map((doc) => (
              <DocTreeItem
                key={doc.id}
                node={doc}
                level={0}
                selectedDocId={selectedDocId}
                expandedIds={expandedIds}
                selectDoc={selectDoc}
                createChildDoc={createChildDoc}
                toggleExpanded={toggleExpanded}
                moveDoc={moveDoc}
                toggleFavorite={toggleFavorite}
                deleteDoc={deleteDoc}
              />
            ))}
          </div>
          {activeDocs.length === 0 && <EmptyState>暂无文档</EmptyState>}
        </SidebarSection>
      )}

      {tab === "recent" && (
        <SidebarSection title="最近访问">
          <DocList docs={recentDocs.length ? recentDocs : activeDocs.slice(0, 8)} selectedDocId={selectedDocId} onSelect={selectDoc} />
        </SidebarSection>
      )}

      {tab === "favorites" && (
        <SidebarSection title="收藏">
          <DocList docs={favoriteDocs} selectedDocId={selectedDocId} onSelect={selectDoc} />
          {favoriteDocs.length === 0 && <EmptyState>还没有收藏页面</EmptyState>}
        </SidebarSection>
      )}

      {tab === "trash" && (
        <SidebarSection
          title="回收站"
          action={
            archivedDocs.length > 0 ? (
              <button
                onClick={() => {
                  if (window.confirm(`彻底删除回收站里的 ${archivedDocs.length} 篇文档？此操作不可恢复。`)) emptyTrash();
                }}
                className="rounded-md px-2 py-1 text-xs text-red-500 hover:bg-red-50"
              >
                清空
              </button>
            ) : undefined
          }
        >
          <div className="space-y-1">
            {archivedDocs.map((doc) => (
              <div key={doc.id} className="group flex min-h-8 items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm text-slate-500 hover:bg-slate-100">
                <PageIcon icon={doc.icon} muted />
                <span className="min-w-0 flex-1 truncate" title={docDisplayTitle(doc)}>{docDisplayTitle(doc)}</span>
                <button onClick={() => restoreDoc(doc.id)} className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-400 opacity-0 hover:bg-white hover:text-slate-700 group-hover:opacity-100" title="恢复">
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => {
                    if (window.confirm(`彻底删除「${docDisplayTitle(doc)}」？此操作不可恢复。`)) purgeDoc(doc.id);
                  }}
                  className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-400 opacity-0 hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                  title="彻底删除"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
          {archivedDocs.length === 0 && <EmptyState>回收站为空</EmptyState>}
        </SidebarSection>
      )}
    </div>
  );
}

function DocTreeItem({
  node,
  level,
  selectedDocId,
  expandedIds,
  selectDoc,
  createChildDoc,
  toggleExpanded,
  moveDoc,
  toggleFavorite,
  deleteDoc,
}: {
  node: PageNode;
  level: number;
  selectedDocId: string;
  expandedIds: Set<string>;
  selectDoc: (id: string) => void;
  createChildDoc: (parentId: string) => void;
  toggleExpanded: (id: string) => void;
  moveDoc: (id: string, parentId: string | null) => void;
  toggleFavorite: (id: string) => void;
  deleteDoc: (id: string) => void;
}) {
  const expanded = expandedIds.has(node.id);
  const [dragOver, setDragOver] = useState(false);

  return (
    <div>
      <div
        draggable
        onDragStart={(event) => {
          event.dataTransfer.setData("text/plain", node.id);
          event.dataTransfer.effectAllowed = "move";
        }}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
          if (!dragOver) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          const draggedId = event.dataTransfer.getData("text/plain");
          if (draggedId && draggedId !== node.id) moveDoc(draggedId, node.id);
        }}
        className={cn(
          "group flex min-h-8 items-center rounded-lg text-slate-700 transition-colors hover:bg-slate-100",
          node.id === selectedDocId && "bg-slate-200 text-slate-950",
          dragOver && "bg-blue-50 ring-2 ring-inset ring-blue-400",
        )}
        style={{ paddingLeft: `${level * 14}px` }}
      >
        <button
          onClick={() => node.children.length > 0 && toggleExpanded(node.id)}
          className="ml-1 flex h-6 w-5 shrink-0 items-center justify-center rounded text-slate-400 hover:bg-white hover:text-slate-700"
          title={expanded ? "收起" : "展开"}
        >
          {node.children.length > 0 ? (
            expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <span className="h-3.5 w-3.5" />
          )}
        </button>
        <button onClick={() => selectDoc(node.id)} className="flex min-w-0 flex-1 items-center gap-2 px-1 py-1.5 text-left text-sm">
          <PageIcon icon={node.icon} muted={node.id !== selectedDocId} />
          <span className="flex-1 truncate">{docDisplayTitle(node)}</span>
        </button>
        <button
          onClick={() => toggleFavorite(node.id)}
          title={node.isFavorite ? "取消收藏" : "收藏"}
          className={cn("inline-flex h-6 w-6 items-center justify-center rounded-md text-slate-400 opacity-0 hover:bg-white hover:text-amber-500 group-hover:opacity-100", node.isFavorite && "opacity-100 text-amber-500")}
        >
          <Star className={cn("h-3.5 w-3.5", node.isFavorite && "fill-current")} />
        </button>
        <button
          onClick={() => createChildDoc(node.id)}
          title="新建子页面"
          className="inline-flex h-6 w-6 items-center justify-center rounded-md text-slate-400 opacity-0 hover:bg-white hover:text-slate-950 group-hover:opacity-100"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={(event) => {
            event.stopPropagation();
            deleteDoc(node.id);
          }}
          title="移到回收站"
          className="mr-1 inline-flex h-6 w-6 items-center justify-center rounded-md text-slate-400 opacity-0 hover:bg-white hover:text-red-500 group-hover:opacity-100"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      {expanded && node.children.map((child) => (
        <DocTreeItem
          key={child.id}
          node={child}
          level={level + 1}
          selectedDocId={selectedDocId}
          expandedIds={expandedIds}
          selectDoc={selectDoc}
          createChildDoc={createChildDoc}
          toggleExpanded={toggleExpanded}
          moveDoc={moveDoc}
          toggleFavorite={toggleFavorite}
          deleteDoc={deleteDoc}
        />
      ))}
    </div>
  );
}

function SidebarSection({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between px-2 text-xs font-medium text-slate-500">
        <span>{title}</span>
        {action}
      </div>
      {children}
    </section>
  );
}

function SearchGroup({ title, docs, selectedDocId, onSelect }: { title: string; docs: Doc[]; selectedDocId: string; onSelect: (id: string) => void }) {
  if (docs.length === 0) return null;
  return (
    <div className="mb-3">
      <div className="px-2 py-1 text-[11px] font-semibold uppercase text-slate-400">{title}</div>
      <DocList docs={docs} selectedDocId={selectedDocId} onSelect={onSelect} />
    </div>
  );
}

function DocList({ docs, selectedDocId, onSelect }: { docs: Doc[]; selectedDocId: string; onSelect: (id: string) => void }) {
  return (
    <div className="space-y-1">
      {docs.map((doc) => (
        <button
          key={doc.id}
          onClick={() => onSelect(doc.id)}
          className={cn(
            "flex min-h-8 w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm hover:bg-slate-100",
            doc.id === selectedDocId && "bg-slate-200 text-slate-950"
          )}
        >
          <PageIcon icon={doc.icon} muted={doc.id !== selectedDocId} />
          <span className="flex-1 truncate">{docDisplayTitle(doc)}</span>
        </button>
      ))}
    </div>
  );
}

function EmptyState({ children }: { children: ReactNode }) {
  return <div className="rounded-lg border border-dashed border-slate-200 px-3 py-5 text-center text-sm text-slate-400">{children}</div>;
}

type PaletteCommand = {
  id: string;
  group: "操作" | "前往" | "页面";
  label: string;
  sub?: string;
  icon: ReactNode;
  keywords: string;
  run: () => void;
};

function CommandPalette({
  docs,
  onClose,
  onSelectDoc,
  onCreate,
  onNavigate,
}: {
  docs: Doc[];
  onClose: () => void;
  onSelectDoc: (id: string) => void;
  onCreate: () => void;
  onNavigate: (view: View) => void;
}) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const commands = useMemo<PaletteCommand[]>(() => {
    const actions: PaletteCommand[] = [
      { id: "new", group: "操作", label: "新建文档", sub: "立即开始写作", icon: <FilePlus2 className="h-4 w-4" />, keywords: "new doc 新建 创建", run: onCreate },
      { id: "go-docs", group: "前往", label: "文档", icon: <FileText className="h-4 w-4" />, keywords: "docs 文档 page", run: () => onNavigate("docs") },
      { id: "go-cal", group: "前往", label: "日历", icon: <CalendarDays className="h-4 w-4" />, keywords: "calendar 日历 日程", run: () => onNavigate("calendar") },
      { id: "go-bit", group: "前往", label: "多维表格", icon: <Grid3x3 className="h-4 w-4" />, keywords: "bitable table 表格 多维", run: () => onNavigate("bitable") },
      { id: "go-ai", group: "前往", label: "AI 助手", icon: <Bot className="h-4 w-4" />, keywords: "ai chat 助手 对话", run: () => onNavigate("ai") },
      { id: "go-set", group: "前往", label: "设置", icon: <Settings className="h-4 w-4" />, keywords: "settings 设置", run: () => onNavigate("settings") },
    ];
    const q = query.trim().toLowerCase();
    const docCmds: PaletteCommand[] = docs
      .filter((doc) => `${doc.title} ${doc.text} ${doc.tags.join(" ")}`.toLowerCase().includes(q))
      .slice(0, q ? 8 : 5)
      .map((doc) => ({
        id: `doc-${doc.id}`,
        group: "页面",
        label: docDisplayTitle(doc),
        sub: doc.summary,
        icon: <PageIcon icon={doc.icon} size="md" />,
        keywords: `${doc.title} ${doc.text}`,
        run: () => onSelectDoc(doc.id),
      }));
    const filteredActions = q ? actions.filter((a) => `${a.label} ${a.keywords}`.toLowerCase().includes(q)) : actions;
    return [...filteredActions, ...docCmds];
  }, [query, docs, onCreate, onNavigate, onSelectDoc]);

  useEffect(() => setActive(0), [query]);
  useEffect(() => {
    listRef.current?.querySelectorAll("[data-cmd]")[active]?.scrollIntoView({ block: "nearest" });
  }, [active]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      else if (event.key === "ArrowDown") {
        event.preventDefault();
        setActive((i) => Math.min(i + 1, commands.length - 1));
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setActive((i) => Math.max(i - 1, 0));
      } else if (event.key === "Enter") {
        event.preventDefault();
        commands[active]?.run();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, commands, active]);

  const groups: PaletteCommand["group"][] = ["操作", "前往", "页面"];

  return (
    <div className="fixed inset-0 z-[60] bg-slate-950/20 px-4 pt-[12vh] backdrop-blur-sm" onMouseDown={onClose}>
      <div className="mx-auto max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
          <Search className="h-5 w-5 text-slate-400" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} autoFocus placeholder="搜索文档，或输入命令：新建、日历、表格…" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
          <kbd className="rounded-md bg-slate-100 px-2 py-1 text-[11px] text-slate-400">ESC</kbd>
        </div>
        <div ref={listRef} className="max-h-[420px] overflow-y-auto p-2">
          {groups.map((group) => {
            const items = commands.filter((c) => c.group === group);
            if (!items.length) return null;
            return (
              <div key={group} className="mb-1.5 last:mb-0">
                <div className="px-2 py-1 text-[11px] font-semibold uppercase text-slate-400">{group}</div>
                {items.map((cmd) => {
                  const idx = commands.indexOf(cmd);
                  return (
                    <button
                      key={cmd.id}
                      data-cmd
                      onMouseEnter={() => setActive(idx)}
                      onClick={cmd.run}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm",
                        idx === active ? "bg-slate-100 text-slate-950" : "hover:bg-slate-50",
                      )}
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">{cmd.icon}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{cmd.label}</span>
                        {cmd.sub && <span className="block truncate text-xs text-slate-500">{cmd.sub}</span>}
                      </span>
                    </button>
                  );
                })}
              </div>
            );
          })}
          {commands.length === 0 && <EmptyState>没有匹配的命令或页面</EmptyState>}
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-3 py-2 text-[11px] text-slate-400">
          <span>↑↓ 选择 · Enter 执行</span>
          <span>⌘K 随时唤起</span>
        </div>
      </div>
    </div>
  );
}

function ContextAside({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
        <FolderTree className="h-4 w-4" />
      </div>
      <h2 className="font-semibold">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-500">{desc}</p>
    </div>
  );
}

function AgentSidebar({ tab, setTab }: { tab: AiTab; setTab: (t: AiTab) => void }) {
  return (
    <div className="px-1 py-1">
      <div className="mb-2 px-2 text-xs font-medium text-slate-500">AI 助手</div>
      <div className="space-y-0.5">
        {AI_TABS.map((item) => (
          <button
            key={item.key}
            onClick={() => setTab(item.key)}
            className={cn(
              "flex w-full flex-col rounded-lg px-2.5 py-2 text-left hover:bg-slate-200/70",
              tab === item.key && "bg-slate-200 text-slate-950",
            )}
          >
            <span className="text-sm font-medium">{item.label}</span>
            <span className="text-[11px] text-slate-500">{item.desc}</span>
          </button>
        ))}
      </div>
      <Link
        href="/tokens"
        className="mt-3 flex items-center justify-between rounded-lg border border-slate-200 px-2.5 py-2 text-sm text-slate-600 hover:bg-white"
      >
        <span className="flex items-center gap-2"><KeyRound className="h-4 w-4" /> 管理 Token</span>
        <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
      </Link>
    </div>
  );
}

function AiAccessPanel({ tab, memories, reviewMemory }: { tab: AiTab; memories: Memory[]; reviewMemory: (id: string, status: Memory["status"]) => void }) {
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [mutations, setMutations] = useState<AgentMutation[]>([]);

  useEffect(() => {
    void fetch("/api/activity").then((res) => res.json()).then((data) => setActivity(data.items ?? [])).catch(() => setActivity([]));
    void fetch("/api/agent/mutations").then((res) => res.json()).then((data) => setMutations(data.mutations ?? [])).catch(() => setMutations([]));
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-8 py-9">
      {tab === "overview" && (
        <>
          <div className="mb-6 flex items-start justify-between gap-6">
            <div>
              <h1 className="text-2xl font-bold">接入概览</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">外部 CLI / Agent 通过 Token、审计日志、Mutation Queue 和 Memory 审核链路接入；所有写入都可审计、可回滚。</p>
            </div>
            <Link href="/tokens" className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm text-white hover:bg-slate-800">
              管理 Token <ExternalLink className="h-4 w-4" />
            </Link>
          </div>

          <div className="mb-8 grid gap-4 lg:grid-cols-3">
            <CapabilityCard icon={<Database />} title="文档即 API" desc="页面、块、数据库、评论和版本都提供稳定接口。" />
            <CapabilityCard icon={<ShieldCheck />} title="可审计写入" desc="Agent 写入先进入提案和日志，可接受、拒绝、回滚。" />
            <CapabilityCard icon={<Network />} title="知识自动成网" desc="Memory、双链、标签和搜索索引共同沉淀长期知识。" />
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="mb-4 flex items-center gap-2 font-semibold"><Database className="h-4 w-4 text-slate-700" />Agent API 面</div>
              <div className="grid gap-2 text-sm text-slate-600 md:grid-cols-2">
                <Endpoint method="GET" path="/api/blocks/:documentId" desc="读取页面块树" />
                <Endpoint method="POST" path="/api/blocks/:documentId" desc="插入块" />
                <Endpoint method="POST" path="/api/pages/:id/move" desc="移动页面" />
                <Endpoint method="GET" path="/api/activity" desc="审计日志" />
                <Endpoint method="POST" path="/api/agent/mutations" desc="创建变更提案" />
                <Endpoint method="PUT" path="/api/share/:documentId" desc="发布与分享设置" />
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="mb-4 flex items-center justify-between">
                <div className="font-semibold">Mutation Queue</div>
                <span className="rounded-full bg-amber-50 px-2 py-1 text-xs text-amber-700">{mutations.length} 条</span>
              </div>
              <div className="space-y-2">
                {mutations.slice(0, 5).map((item) => (
                  <div key={item.id} className="rounded-xl bg-slate-50 p-3 text-sm">
                    <div className="font-medium">{item.agentName}</div>
                    <div className="mt-1 text-xs text-slate-500">{item.status} · {formatDateTime(item.createdAt)}</div>
                  </div>
                ))}
                {mutations.length === 0 && <EmptyState>暂无 Agent 变更提案</EmptyState>}
              </div>
            </section>
          </div>
        </>
      )}

      {tab === "memory" && (
        <section>
          <div className="mb-4">
            <h1 className="text-2xl font-bold">Memory 审核</h1>
            <p className="mt-1 text-sm text-slate-500">外部 Agent 写入的长期记忆默认进入待审核列表，确认后才进入知识网络。</p>
          </div>
          <MemoryBoard memories={memories} reviewMemory={reviewMemory} />
        </section>
      )}

      {tab === "activity" && (
        <section>
          <div className="mb-4">
            <h1 className="text-2xl font-bold">活动日志</h1>
            <p className="mt-1 text-sm text-slate-500">版本、评论和 Agent 运行统一记录。</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="space-y-3">
              {activity.slice(0, 20).map((item) => (
                <div key={item.id} className="flex gap-3 text-sm">
                  <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                    {item.type === "version" ? <Clock3 className="h-4 w-4" /> : item.type === "comment" ? <FileText className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate font-medium">{item.title}</div>
                    <div className="truncate text-xs text-slate-500">{item.desc}</div>
                  </div>
                </div>
              ))}
              {activity.length === 0 && <EmptyState>暂无活动</EmptyState>}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function CapabilityCard({ icon, title, desc }: { icon: ReactNode; title: string; desc: string }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 [&_svg]:h-5 [&_svg]:w-5">{icon}</div>
      <div className="font-semibold">{title}</div>
      <p className="mt-2 text-sm leading-6 text-slate-500">{desc}</p>
    </section>
  );
}

function Endpoint({ method, path, desc }: { method: string; path: string; desc: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2">
      <code className="text-xs font-semibold text-slate-800">{method} {path}</code>
      <div className="mt-1 text-xs text-slate-500">{desc}</div>
    </div>
  );
}

function MemoryBoard({ memories, reviewMemory }: { memories: Memory[]; reviewMemory: (id: string, status: Memory["status"]) => void }) {
  const statuses: Array<{ key: Memory["status"]; label: string }> = [
    { key: "pending", label: "待审核" },
    { key: "accepted", label: "已接受" },
    { key: "rejected", label: "已拒绝" },
    { key: "archived", label: "已归档" },
  ];

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {statuses.map((status) => {
        const items = memories.filter((memory) => memory.status === status.key);
        return (
          <section key={status.key} className="min-h-48 rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">{status.label}</h3>
              <span className="text-xs text-slate-500">{items.length}</span>
            </div>
            <div className="space-y-2">
              {items.slice(0, 3).map((memory) => (
                <div key={memory.id} className="rounded-xl bg-white p-3 text-sm shadow-sm">
                  <p className="line-clamp-3 leading-6 text-slate-700">{memory.content}</p>
                  <div className="mt-2 text-xs text-slate-500">置信度 {Math.round(memory.confidence * 100)}%</div>
                  {status.key === "pending" && (
                    <div className="mt-3 flex gap-2">
                      <button onClick={() => reviewMemory(memory.id, "accepted")} className="rounded-lg bg-emerald-500 p-1.5 text-white" title="接受">
                        <Check className="h-4 w-4" />
                      </button>
                      <button onClick={() => reviewMemory(memory.id, "rejected")} className="rounded-lg bg-red-500 p-1.5 text-white" title="拒绝">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {items.length === 0 && <EmptyState>暂无数据</EmptyState>}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function SettingsPanel() {
  return (
    <div className="mx-auto max-w-6xl px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">设置</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">这里承载文档平台的底层能力：空间、文件、权限、发布、导入导出和数据库配置，不打扰正文写作。</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <SettingsLink href="/settings" icon={<Settings />} title="空间设置" desc="名称、成员和基础信息" />
        <SettingsLink href="/files" icon={<Upload />} title="文件管理" desc="上传、查看和删除附件" />
        <SettingsLink href="/tokens" icon={<KeyRound />} title="访问密钥" desc="管理 CLI / Agent 调用密钥" />
        <SettingsCard icon={<Share2 />} title="发布与分享" desc="公开链接、只读发布、链接过期和密码访问的产品入口。" />
        <SettingsCard icon={<ShieldCheck />} title="权限模型" desc="workspace / page / database / view 五层权限的体验骨架。" />
        <SettingsCard icon={<Database />} title="数据库" desc="Table / Board / List / Calendar / Gallery 视图逐步进入文档内。" />
        <SettingsCard icon={<Network />} title="知识地图" desc="双链、标签、父子关系和引用关系形成图谱。" />
        <SettingsCard icon={<Link2 />} title="导入导出" desc="为 Markdown、HTML 和 JSON API 保留稳定交换格式。" />
        <SettingsCard icon={<MoreHorizontal />} title="高级" desc="版本策略、审计日志、Agent mutation 策略。" />
      </div>
    </div>
  );
}

function SettingsLink({ href, icon, title, desc }: { href: string; icon: ReactNode; title: string; desc: string }) {
  return (
    <Link href={href} className="rounded-2xl border border-slate-200 bg-white p-5 hover:border-slate-300 hover:bg-slate-50">
      <SettingsCardBody icon={icon} title={title} desc={desc} />
    </Link>
  );
}

function SettingsCard({ icon, title, desc }: { icon: ReactNode; title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <SettingsCardBody icon={icon} title={title} desc={desc} />
    </div>
  );
}

function SettingsCardBody({ icon, title, desc }: { icon: ReactNode; title: string; desc: string }) {
  return (
    <>
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 [&_svg]:h-5 [&_svg]:w-5">{icon}</div>
      <div className="font-semibold">{title}</div>
      <p className="mt-2 text-sm leading-6 text-slate-500">{desc}</p>
    </>
  );
}
