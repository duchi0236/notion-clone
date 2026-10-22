"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Bot,
  BookOpen,
  CalendarDays,
  Check,
  ChevronDown,
  Grid3x3,
  ChevronRight,
  Clock3,
  Database,
  Droplets,
  ExternalLink,
  FilePlus2,
  FileText,
  FolderTree,
  Home,
  PanelLeftClose,
  PanelLeftOpen,
  KeyRound,
  Link2,
  Moon,
  Network,
  Plus,
  RotateCcw,
  Search,
  Settings,
  Sun,
  Tags,
  Share2,
  ShieldCheck,
  Star,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { cn, formatDateTime } from "@/lib/utils";
import { useModalA11y } from "@/hooks/useModalA11y";
import { confirm } from "@/components/ui/confirm";
import { docDisplayTitle } from "./api";
import type { AgentMutation, Doc, Memory, PageNode, View } from "./types";
import { useWorkspaceState } from "./useWorkspaceState";
import { useTheme } from "./useTheme";
import { DocumentPanel } from "./DocumentPanel";
import { WorkspaceHome, WorkspaceTrash } from "./WorkspaceHome";
import { PageIcon } from "./PageIcon";
import CalendarApp from "../calendar/CalendarApp";
import BitableApp from "../bitable/BitableApp";
import { AgentChat } from "../agent/AgentChat";
import { AiConfigPanel } from "../agent/AiConfigPanel";
import { AgentSkillPanel } from "../agent/AgentSkillPanel";

type SidebarTab = "tree" | "recent" | "favorites" | "trash";
type AiTab = "chat" | "skills" | "config" | "overview" | "memory" | "activity";

const AI_TABS: { key: AiTab; label: string; desc: string }[] = [
  { key: "chat", label: "对话", desc: "和工作区助手对话" },
  { key: "skills", label: "能力与权限", desc: "选择助手可使用的能力与范围" },
  { key: "config", label: "模型与媒体", desc: "模型供应商与生成能力" },
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
  const [view, setView] = useState<View>("home");
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("tree");
  const [aiTab, setAiTab] = useState<AiTab>("chat");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [mobileTreeOpen, setMobileTreeOpen] = useState(false);
  // Desktop defaults to the labelled navigation panel. Icon-only navigation is
  // an explicit compact mode, not the first-run experience.
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
  const showSidebar = !sidebarCollapsed;

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

  function openAiWorkspace() {
    setView("ai");
    setSidebarCollapsed(false);
  }

  function createChildDoc(parentId: string) {
    setView("docs");
    setExpandedIds((current) => new Set(current).add(parentId));
    void store.createDoc({ parentId });
  }

  useEffect(() => {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem("clawnote.recent-docs") ?? "[]");
      if (Array.isArray(saved)) setRecentDocIds(saved.filter((id): id is string => typeof id === "string").slice(0, 8));
    } catch { /* Storage can be unavailable in private browsing. */ }
  }, []);

  function selectDoc(id: string) {
    setView("docs");
    if (sidebarTab === "trash") setSidebarTab("tree");
    store.setSelectedDocId(id);
    setRecentDocIds((ids) => {
      const next = [id, ...ids.filter((item) => item !== id)].slice(0, 8);
      try { localStorage.setItem("clawnote.recent-docs", JSON.stringify(next)); } catch { /* Navigation still works without storage. */ }
      return next;
    });
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
    <div className="claw-product" data-view={view}>
      <a className="cn-skip-link" href="#workspace-content">跳转到内容</a>
      <div className="cn-workspace" data-collapsed={sidebarCollapsed}>
      <aside className="cn-sidebar" aria-label="工作空间导航">
        <div className="cn-sidebar-brand">
          <button className="cn-brand" onClick={() => setView("home")} aria-label="ClawNote 主页">
            <span className="cn-brand-mark"><BookOpen size={19} strokeWidth={1.8} /></span>
            <span className="cn-brand-name">ClawNote<span>个人工作空间</span></span>
          </button>
          <button className="cn-icon-button cn-collapse" onClick={() => setSidebarCollapsed(!sidebarCollapsed)} aria-label={sidebarCollapsed ? "展开侧栏" : "收起侧栏"} title={sidebarCollapsed ? "展开侧栏" : "收起侧栏"}>
            {sidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
        </div>
        <button className="cn-sidebar-search" onClick={() => setPaletteOpen(true)} aria-label="搜索工作空间">
          <Search size={16} /><span>搜索工作空间</span><kbd>⌘ K</kbd>
        </button>
        <nav className="cn-primary-nav" aria-label="主要功能">
          {([
            { key: "home", label: "主页", icon: <Home />, count: undefined },
            { key: "docs", label: "文档", icon: <FileText />, count: activeDocs.length },
            { key: "bitable", label: "多维表格", icon: <Grid3x3 />, count: undefined },
            { key: "calendar", label: "日历", icon: <CalendarDays />, count: undefined },
            { key: "ai", label: "AI 助手", icon: <Bot />, count: undefined },
          ] as const).map((item) => (
            <button key={item.key} className="cn-nav-item" data-active={view === item.key} aria-current={view === item.key ? "page" : undefined} aria-label={item.label} title={sidebarCollapsed ? item.label : undefined} onClick={() => { setView(item.key); if (item.key === "docs") setSidebarTab("tree"); }}>
              {item.icon}<span>{item.label}</span>{item.count !== undefined && <small>{item.count}</small>}
            </button>
          ))}
        </nav>
        <div className="cn-sidebar-divider" />
        <div className="cn-sidebar-context" hidden={!showSidebar}>
          {view !== "docs" && view !== "ai" && (
            <div className="cn-pinned-pages">
              <div className="cn-section-label">快捷访问</div>
              <button className="cn-nav-item" onClick={() => { setView("docs"); setSidebarTab("favorites"); }}><Star /><span>收藏</span><small>{store.favoriteDocs.length || ""}</small></button>
              {store.favoriteDocs.slice(0, 3).map((doc) => <button key={doc.id} className="cn-nav-item cn-pinned-doc" onClick={() => selectDoc(doc.id)}><PageIcon icon={doc.icon} muted /><span>{docDisplayTitle(doc)}</span></button>)}
              <button className="cn-nav-item" onClick={() => { setView("docs"); setSidebarTab("trash"); }}><Trash2 /><span>回收站</span></button>
            </div>
          )}
          {view === "docs" && <div className="cn-tree-search"><Search size={14} /><input aria-label="筛选文档" value={store.query} onChange={(event) => store.setQuery(event.target.value)} placeholder="筛选文档…" /></div>}
        <div className="cn-sidebar-detail">
          {view === "docs" && (
            <DocsSidebar
              tab={sidebarTab}
              setTab={setSidebarTab}
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
          {view === "ai" && <AgentSidebar tab={aiTab} setTab={setAiTab} />}
        </div>
        </div>
        <div className="cn-sidebar-footer">
          <div className="cn-sidebar-tools">
            <button className="cn-icon-button" onClick={toggleTheme} aria-label={dark ? "浅色模式" : "深色模式"} title={dark ? "浅色模式" : "深色模式"}>{dark ? <Sun size={16} /> : <Moon size={16} />}</button>
            <button className="cn-icon-button" data-active={glass} onClick={toggleGlass} aria-label={glass ? "关闭玻璃质感" : "液体玻璃"} title="玻璃质感"><Droplets size={16} /></button>
            <button className="cn-icon-button" data-active={view === "settings"} onClick={() => setView("settings")} aria-label="设置" title="设置"><Settings size={16} /></button>
          </div>
          <Link href="/account" className="cn-account"><span className="cn-account-avatar">C</span><span>我的工作空间<small>账户与偏好设置</small></span><ChevronRight size={14} /></Link>
        </div>
      </aside>

      <main id="workspace-content" className="cn-main" tabIndex={-1}>
        {view === "home" && (
          <WorkspaceHome
            docs={activeDocs}
            recentDocIds={recentDocIds}
            onOpenDoc={selectDoc}
            onCreateDoc={createRootDoc}
            onCreateWith={(input) => {
              setView("docs");
              void store.createDoc(input);
            }}
            onNavigate={setView}
            onSearch={() => setPaletteOpen(true)}
          />
        )}
        {view === "docs" && sidebarTab === "trash" && <WorkspaceTrash docs={store.archivedDocs} onRestore={(id) => { store.restoreDoc(id); showToast("文档已恢复"); }} />}
        {view === "docs" && sidebarTab !== "trash" && (
          <DocumentPanel
            doc={store.selectedDoc}
            docs={activeDocs}
            updateDoc={store.updateDoc}
            saveState={store.saveState}
            onRetrySave={store.retrySave}
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
        {view === "ai" && (
          <div className="cn-ai-workspace flex h-full min-h-0 flex-col">
            <header className="cn-topbar"><div className="cn-breadcrumb"><Bot size={15} /><strong>AI 助手</strong><ChevronRight size={13} /><span>{AI_TABS.find((item) => item.key === aiTab)?.label}</span></div><span className="cn-header-caption">读写有记录，操作可撤销</span></header>
            <MobileAgentNav tab={aiTab} setTab={setAiTab} />
            <div className="min-h-0 flex-1 overflow-y-auto">
              {aiTab === "chat" ? (
                <AgentChat
                  onOpenDoc={async (id) => {
                    if (!activeDocs.some((doc) => doc.id === id)) await store.reloadDocs();
                    selectDoc(id);
                  }}
                />
              ) : aiTab === "config" ? (
                <AiConfigPanel />
              ) : aiTab === "skills" ? (
                <AgentSkillPanel />
              ) : (
                <AiAccessPanel tab={aiTab} memories={store.memories} reviewMemory={store.reviewMemory} />
              )}
            </div>
          </div>
        )}
        {view === "settings" && <SettingsPanel />}
      </main>
      </div>

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
            if (v === "ai") openAiWorkspace();
            else setView(v);
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
        <MobileTreeDrawer onClose={() => setMobileTreeOpen(false)}>
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
              tab={sidebarTab}
              setTab={setSidebarTab}
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
        </MobileTreeDrawer>
      )}

      <nav aria-label="移动端导航" className="cn-mobile-nav fixed inset-x-0 bottom-0 z-40 flex h-14 items-stretch border-t border-slate-200 bg-white/95 backdrop-blur lg:hidden">
        <MobileTab active={view === "ai"} onClick={openAiWorkspace} icon={<Bot />} label="AI" />
        <MobileTab active={view === "docs"} onClick={() => setView("docs")} icon={<FileText />} label="文档" />
        <MobileTab active={view === "home"} onClick={() => setView("home")} icon={<Home />} label="主页" />
        <MobileTab active={view === "bitable"} onClick={() => setView("bitable")} icon={<Grid3x3 />} label="表格" />
        <MobileTab active={view === "calendar"} onClick={() => setView("calendar")} icon={<CalendarDays />} label="日历" />
      </nav>

      {/* 操作反馈 Toast（删除可撤销等） */}
      {toast && (
        <div role="status" aria-live="polite" className="fixed bottom-20 left-1/2 z-[70] flex -translate-x-1/2 items-center gap-3 rounded-xl bg-slate-900 px-4 py-2.5 text-sm text-white shadow-2xl lg:bottom-6">
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

function cleanExcerpt(raw: string): string {
  const text = (raw || "").trim();
  if (/\{[^}]*:[^}]*\}/.test(text) && /\b(?:font-family|font-size|margin|padding|background|color|display)\s*:/i.test(text)) return "";
  return text;
}

function MobileTreeDrawer({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  const ref = useModalA11y<HTMLDivElement>({ open: true, onClose });
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const r = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(r);
  }, []);

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div
        className={cn("absolute inset-0 bg-slate-900/40 transition-opacity duration-200", entered ? "opacity-100" : "opacity-0")}
        onMouseDown={onClose}
      />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label="页面树"
        className={cn(
          "absolute bottom-0 left-0 top-0 flex w-[85vw] max-w-[320px] flex-col bg-[#fbfbfa] shadow-2xl transition-transform duration-200 ease-out",
          entered ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {children}
      </div>
    </div>
  );
}

function MobileTab({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      aria-current={active ? "page" : undefined}
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

function DocsSidebar({
  tab,
  setTab,
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
  tab: SidebarTab;
  setTab: (tab: SidebarTab) => void;
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
      <div role="tablist" aria-label="页面分组" className="mb-3 grid grid-cols-4 gap-1 rounded-lg bg-slate-100 p-1">
        {(() => {
          const tabs: [SidebarTab, string][] = [
            ["tree", "目录"],
            ["recent", "最近"],
            ["favorites", "收藏"],
            ["trash", "回收"],
          ];
          return tabs.map(([key, label], i) => (
            <button
              key={key}
              role="tab"
              aria-selected={tab === key}
              tabIndex={tab === key ? 0 : -1}
              onClick={() => setTab(key)}
              onKeyDown={(event) => {
                if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
                event.preventDefault();
                const dir = event.key === "ArrowRight" ? 1 : -1;
                const next = tabs[(i + dir + tabs.length) % tabs.length];
                setTab(next[0]);
                const buttons = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
                buttons?.[(i + dir + tabs.length) % tabs.length]?.focus();
              }}
              className={cn(
                "inline-flex h-8 items-center justify-center rounded-md px-2 text-xs text-slate-500 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60",
                tab === key && "bg-white text-slate-950 shadow-sm",
              )}
            >
              {label}
            </button>
          ));
        })()}
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
                onClick={async () => {
                  if (
                    await confirm({
                      title: "清空回收站",
                      body: `彻底删除回收站里的 ${archivedDocs.length} 篇文档？此操作不可恢复。`,
                      danger: true,
                      confirmText: "彻底删除",
                    })
                  )
                    emptyTrash();
                }}
                className="rounded-md px-2 py-1 text-xs text-red-500 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60"
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
                <button onClick={() => restoreDoc(doc.id)} className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-400 opacity-0 hover:bg-white hover:text-slate-700 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 [@media(hover:none)]:opacity-100" title="恢复" aria-label="恢复">
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={async () => {
                    if (
                      await confirm({
                        title: "彻底删除",
                        body: `彻底删除「${docDisplayTitle(doc)}」？此操作不可恢复。`,
                        danger: true,
                        confirmText: "彻底删除",
                      })
                    )
                      purgeDoc(doc.id);
                  }}
                  className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-400 opacity-0 hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 [@media(hover:none)]:opacity-100"
                  title="彻底删除"
                  aria-label="彻底删除"
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
          "cn-tree-row group flex min-h-8 items-center rounded-lg text-slate-700 transition-colors hover:bg-slate-100",
          node.id === selectedDocId && "bg-slate-200 text-slate-950",
          dragOver && "bg-blue-50 ring-2 ring-inset ring-blue-400",
        )}
        style={{ paddingLeft: `${level * 14}px` }}
      >
        <button
          onClick={() => node.children.length > 0 && toggleExpanded(node.id)}
          disabled={node.children.length === 0}
          tabIndex={node.children.length === 0 ? -1 : undefined}
          className="ml-1 flex h-7 w-6 shrink-0 items-center justify-center rounded text-slate-400 hover:bg-white hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 disabled:pointer-events-none"
          title={node.children.length === 0 ? undefined : expanded ? "收起" : "展开"}
          aria-label={node.children.length === 0 ? undefined : expanded ? "收起子页面" : "展开子页面"}
        >
          {node.children.length > 0 ? (
            expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <span className="h-3.5 w-3.5" />
          )}
        </button>
        <button onClick={() => selectDoc(node.id)} className="flex min-w-0 flex-1 items-center gap-2 px-1 py-1.5 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 focus-visible:ring-offset-1">
          <PageIcon icon={node.icon} muted={node.id !== selectedDocId} />
          <span className="flex-1 truncate">{docDisplayTitle(node)}</span>
        </button>
        <button
          onClick={() => toggleFavorite(node.id)}
          title={node.isFavorite ? "取消收藏" : "收藏"}
          aria-label={node.isFavorite ? "取消收藏" : "收藏"}
          className={cn("inline-flex h-6 w-6 items-center justify-center rounded-md text-slate-400 opacity-0 hover:bg-white hover:text-amber-500 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 [@media(hover:none)]:opacity-100", node.isFavorite && "opacity-100 text-amber-500")}
        >
          <Star className={cn("h-3.5 w-3.5", node.isFavorite && "fill-current")} />
        </button>
        <button
          onClick={() => createChildDoc(node.id)}
          title="新建子页面"
          aria-label="新建子页面"
          className="inline-flex h-6 w-6 items-center justify-center rounded-md text-slate-400 opacity-0 hover:bg-white hover:text-slate-950 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 [@media(hover:none)]:opacity-100"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={(event) => {
            event.stopPropagation();
            deleteDoc(node.id);
          }}
          title="移到回收站"
          aria-label="移到回收站"
          className="mr-1 inline-flex h-6 w-6 items-center justify-center rounded-md text-slate-400 opacity-0 hover:bg-white hover:text-red-500 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 [@media(hover:none)]:opacity-100"
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
            "flex min-h-8 w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 focus-visible:ring-offset-1",
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
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useModalA11y<HTMLDivElement>({ open: true, onClose, initialFocus: inputRef });
  const listboxId = "claw-palette-listbox";

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
        sub: cleanExcerpt(doc.summary),
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
      if (event.key === "ArrowDown") {
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
  }, [commands, active]);

  const groups: PaletteCommand["group"][] = ["操作", "前往", "页面"];

  return (
    <div className="fixed inset-0 z-[60] bg-slate-950/20 px-4 pt-[12vh] backdrop-blur-sm" onMouseDown={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="命令面板"
        className="mx-auto max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
          <Search className="h-5 w-5 text-slate-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            role="combobox"
            aria-expanded
            aria-controls={listboxId}
            aria-activedescendant={commands[active] ? `claw-cmd-${commands[active].id}` : undefined}
            aria-label="搜索文档或命令"
            placeholder="搜索文档，或输入命令：新建、日历、表格…"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
          <kbd className="rounded-md bg-slate-100 px-2 py-1 text-[11px] text-slate-400">ESC</kbd>
        </div>
        <div ref={listRef} id={listboxId} role="listbox" aria-label="命令与页面" className="max-h-[420px] overflow-y-auto p-2">
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
                      id={`claw-cmd-${cmd.id}`}
                      data-cmd
                      role="option"
                      aria-selected={idx === active}
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
              "flex w-full flex-col rounded-lg px-2.5 py-2 text-left hover:bg-slate-200/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 focus-visible:ring-offset-1",
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

function MobileAgentNav({ tab, setTab }: { tab: AiTab; setTab: (tab: AiTab) => void }) {
  return (
    <nav aria-label="AI 工作区" className="shrink-0 overflow-x-auto border-b border-slate-200 bg-white/95 px-2 py-2 backdrop-blur lg:hidden">
      <div className="flex min-w-max items-center gap-1">
        {AI_TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            aria-current={tab === item.key ? "page" : undefined}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60",
              tab === item.key && "bg-slate-900 text-white hover:bg-slate-900 hover:text-white",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
    </nav>
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

type Appearance = { blur: number; alpha: number; radius: number };
const APPEARANCE_DEFAULT: Appearance = { blur: 20, alpha: 0.72, radius: 24 };

function SettingsPanel() {
  const { dark, toggle: toggleTheme, glass, toggleGlass } = useTheme();
  const [appr, setAppr] = useState<Appearance>(APPEARANCE_DEFAULT);

  useEffect(() => {
    try {
      const a = JSON.parse(localStorage.getItem("clawnote.appearance") || "{}");
      setAppr((p) => ({ ...p, ...a }));
    } catch {
      /* ignore */
    }
  }, []);

  function applyAppearance(next: Appearance) {
    setAppr(next);
    const s = document.documentElement.style;
    s.setProperty("--glass-blur", `${next.blur}px`);
    s.setProperty("--glass-alpha", String(next.alpha));
    s.setProperty("--glass-alpha-dark", String(Math.max(0, next.alpha - 0.06)));
    s.setProperty("--claw-radius", `${next.radius}px`);
    try {
      localStorage.setItem("clawnote.appearance", JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }
  const setAppr1 = (patch: Partial<Appearance>) => applyAppearance({ ...appr, ...patch });

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl px-8 py-10">
        <div className="mb-7">
          <h1 className="text-3xl font-bold tracking-tight">空间设置</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">外观、材质、空间与底层能力都在这里，实时生效，不打扰正文写作。</p>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          {/* 外观与材质 */}
          <section className="rounded-2xl bg-white p-6 ring-1 ring-slate-900/5">
            <h2 className="mb-5 flex items-center gap-2 text-sm font-semibold text-slate-800">
              <Droplets className="h-4 w-4 text-slate-500" /> 外观与材质
            </h2>

            {/* 主题 */}
            <SettingRow label="主题" hint="浅色 / 深色">
              <div className="flex rounded-lg bg-slate-100 p-0.5 text-sm">
                <button onClick={() => dark && toggleTheme()} className={cn("flex items-center gap-1.5 rounded-md px-3 py-1.5", !dark ? "bg-white font-medium text-slate-900 shadow-sm" : "text-slate-500")}>
                  <Sun className="h-4 w-4" /> 浅色
                </button>
                <button onClick={() => !dark && toggleTheme()} className={cn("flex items-center gap-1.5 rounded-md px-3 py-1.5", dark ? "bg-white font-medium text-slate-900 shadow-sm" : "text-slate-500")}>
                  <Moon className="h-4 w-4" /> 深色
                </button>
              </div>
            </SettingRow>

            {/* 玻璃质感 */}
            <SettingRow label="液体玻璃" hint="导航与浮层的半透磨砂质感">
              <SettingsSwitch checked={glass} onChange={toggleGlass} label="液体玻璃" />
            </SettingRow>

            {/* 材质滑块 */}
            <div className={cn("space-y-4 border-t border-slate-100 pt-4 transition-opacity", !glass && "pointer-events-none opacity-40")}>
              <SliderRow label="模糊" value={`${appr.blur}px`} min={0} max={40} step={1} v={appr.blur} disabled={!glass} onChange={(blur) => setAppr1({ blur })} />
              <SliderRow label="透明度" value={`${Math.round(appr.alpha * 100)}%`} min={45} max={95} step={1} v={Math.round(appr.alpha * 100)} disabled={!glass} onChange={(p) => setAppr1({ alpha: p / 100 })} />
              <SliderRow label="圆角" value={`${appr.radius}px`} min={8} max={32} step={1} v={appr.radius} disabled={!glass} onChange={(radius) => setAppr1({ radius })} />
            </div>
            <button onClick={() => applyAppearance(APPEARANCE_DEFAULT)} className="mt-4 text-xs font-medium text-slate-400 hover:text-blue-600">
              恢复默认材质
            </button>
          </section>

          {/* 空间与成员（实时预览随上方设置变化的浮层即整页外壳本身） */}
          <section className="rounded-2xl bg-white p-6 ring-1 ring-slate-900/5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800">
              <ShieldCheck className="h-4 w-4 text-slate-500" /> 空间与成员
            </h2>
            <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-lg text-white">🧠</span>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-slate-800">我的知识库</div>
                <div className="text-xs text-slate-400">个人空间 · 1 名成员</div>
              </div>
            </div>
            <Link href="/settings" className="mt-3 flex items-center justify-between rounded-lg px-2 py-2 text-sm text-slate-600 hover:bg-slate-50">
              成员与权限 <ChevronRight className="h-4 w-4 text-slate-400" />
            </Link>
            <Link href="/tokens" className="flex items-center justify-between rounded-lg px-2 py-2 text-sm text-slate-600 hover:bg-slate-50">
              访问密钥（Agent / CLI） <ChevronRight className="h-4 w-4 text-slate-400" />
            </Link>
          </section>
        </div>

        {/* 管理入口 */}
        <h2 className="mb-3 mt-8 text-sm font-semibold text-slate-700">空间能力</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <SettingsLink href="/files" icon={<Upload />} title="文件管理" desc="上传、查看和删除附件" />
          <SettingsCard icon={<Share2 />} title="发布与分享" desc="公开链接、只读发布、链接过期和密码访问。" />
          <SettingsCard icon={<ShieldCheck />} title="权限模型" desc="workspace / page / database / view 五层权限。" />
          <SettingsCard icon={<Database />} title="数据库" desc="表格 / 看板 / 画册 / 日历 / 甘特 视图。" />
          <SettingsCard icon={<Network />} title="知识地图" desc="双链、标签、父子与引用关系形成图谱。" />
          <SettingsCard icon={<Link2 />} title="导入导出" desc="Markdown、HTML 与 JSON API 交换格式。" />
        </div>
      </div>
    </div>
  );
}

function SettingRow({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <div>
        <div className="text-sm font-medium text-slate-700">{label}</div>
        {hint && <div className="text-xs text-slate-400">{hint}</div>}
      </div>
      {children}
    </div>
  );
}

function SliderRow({ label, value, v, min, max, step, onChange, disabled }: { label: string; value: string; v: number; min: number; max: number; step: number; onChange: (v: number) => void; disabled?: boolean }) {
  // 自绘轨道：bg-slate-200 会被 .dark 重映射为深灰，进度用蓝色渐变按百分比铺底，
  // 拇指经 ::-webkit-slider-thumb / ::-moz-range-thumb 统一为蓝色——深色下轨道不再是 UA 的刺眼纯白。
  const pct = max > min ? Math.min(100, Math.max(0, ((v - min) / (max - min)) * 100)) : 0;
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center justify-between text-xs">
        <span className="font-medium text-slate-600">{label}</span>
        <span className="tabular-nums text-slate-400">{value}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={v}
        disabled={disabled}
        aria-label={label}
        aria-valuetext={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-blue-600 disabled:cursor-not-allowed disabled:opacity-50 [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:shadow-[0_1px_3px_rgba(15,23,42,0.35)]"
        style={{ backgroundImage: "linear-gradient(#2563eb,#2563eb)", backgroundSize: `${pct}% 100%`, backgroundRepeat: "no-repeat" }}
      />
    </label>
  );
}

function SettingsSwitch({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button type="button" onClick={onChange} role="switch" aria-checked={checked} aria-label={label} className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors", checked ? "bg-blue-600" : "bg-slate-200")}>
      <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", checked ? "left-[22px]" : "left-0.5")} />
    </button>
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
