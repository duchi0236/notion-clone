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
  Home,
  ArrowUpRight,
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
  Share2,
  ShieldCheck,
  Star,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { cn, formatDateTime } from "@/lib/utils";
import { useModalA11y } from "@/hooks/useModalA11y";
import { prefersReducedMotion } from "@/hooks/useReducedMotion";
import { confirm } from "@/components/ui/confirm";
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
  const [view, setView] = useState<View>("home");
  const [aiTab, setAiTab] = useState<AiTab>("chat");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [mobileTreeOpen, setMobileTreeOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
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
  const showSidebar = view !== "home" && !sidebarCollapsed;

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
    <div className="claw-canvas relative min-h-screen text-slate-900">
      {/* 全局氛围背景：柔光团制造玻璃景深 */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -left-28 -top-32 h-[34rem] w-[34rem] rounded-full bg-[radial-gradient(circle,rgba(20,110,245,0.13),transparent_66%)] blur-3xl" />
        <div className="absolute right-[-10%] top-[-12%] h-[38rem] w-[38rem] rounded-full bg-[radial-gradient(circle,rgba(148,163,184,0.2),transparent_64%)] blur-3xl" />
        <div className="absolute bottom-[-18%] left-1/3 h-[28rem] w-[42rem] rounded-full bg-[radial-gradient(circle,rgba(125,151,184,0.12),transparent_68%)] blur-3xl" />
        <div className="claw-grain absolute inset-0 opacity-[0.22]" />
      </div>

      {view === "home" && (
        <button
          onClick={() => setPaletteOpen(true)}
          aria-label="搜索或创建（⌘K）"
          className="claw-command-lens fixed left-1/2 top-5 z-40 hidden h-12 w-[min(440px,42vw)] -translate-x-1/2 items-center gap-3 px-5 text-left text-sm text-slate-500 transition duration-200 hover:-translate-y-0.5 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 lg:flex"
        >
          <Search className="h-4 w-4 text-slate-400" />
          <span className="min-w-0 flex-1 truncate">搜索或创建...</span>
          <span className="rounded-lg border border-white/70 bg-white/70 px-2 py-1 text-[11px] font-medium text-slate-400 shadow-sm">⌘ K</span>
        </button>
      )}

      <div
        className={cn(
          "relative z-10 grid min-h-screen grid-cols-1 gap-3 p-3 transition-[grid-template-columns] duration-200 ease-out",
          showSidebar ? "lg:grid-cols-[64px_296px_minmax(0,1fr)]" : "lg:grid-cols-[64px_minmax(0,1fr)]",
        )}
      >
      <nav className="claw-dock sticky top-3 z-30 hidden h-[calc(100vh-1.5rem)] flex-col items-center gap-1 px-2 py-3 lg:flex">
        <button
          onClick={() => setView("home")}
          title="回到主页"
          className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-sm font-bold text-white shadow-sm shadow-blue-500/30 transition-transform hover:scale-105"
        >
          C
        </button>
        <IconRailButton
          active={false}
          onClick={() => setSidebarCollapsed((v) => !v)}
          icon={sidebarCollapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
          label={sidebarCollapsed ? "展开侧栏" : "收起侧栏"}
        />
        <div className="my-1 h-px w-7 bg-slate-200/70" />
        <IconRailButton active={view === "home"} onClick={() => setView("home")} icon={<Home />} label="主页" />
        <IconRailButton active={view === "docs"} onClick={() => setView("docs")} icon={<FileText />} label="文档" />
        <IconRailButton active={view === "calendar"} onClick={() => setView("calendar")} icon={<CalendarDays />} label="日历" />
        <IconRailButton active={view === "bitable"} onClick={() => setView("bitable")} icon={<Grid3x3 />} label="多维表格" />
        <IconRailButton active={view === "ai"} onClick={() => setView("ai")} icon={<Bot />} label="AI 接入" />
        <IconRailButton active={glass} onClick={toggleGlass} icon={<Droplets />} label={glass ? "关闭玻璃质感" : "液体玻璃"} wrapperClassName="mt-auto" />
        <IconRailButton active={false} onClick={toggleTheme} icon={dark ? <Sun /> : <Moon />} label={dark ? "浅色模式" : "深色模式"} />
        <IconRailButton active={view === "settings"} onClick={() => setView("settings")} icon={<Settings />} label="设置" />
      </nav>
      <aside className={cn("claw-panel sticky top-3 z-20 hidden h-[calc(100vh-1.5rem)] min-h-0 flex-col overflow-hidden", showSidebar && "lg:flex")}>
        <div className="px-4 pb-3 pt-4">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="min-w-0">
                <h1 className="truncate text-sm font-semibold leading-5">ClawNote</h1>
                <p className="text-xs text-slate-500">超级文档空间</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setPaletteOpen(true)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-white/70 hover:text-slate-950" title="打开命令面板">
                <Command className="h-4 w-4" />
              </button>
              <button onClick={createRootDoc} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-white/70 hover:text-slate-950" title="新建文档">
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-white/70 bg-white/78 px-3 py-2 shadow-sm ring-1 ring-slate-900/[0.03]">
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
          {(view === "docs" || view === "home") && (
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

      <main className={cn("min-w-0", view !== "home" && "claw-paper h-[calc(100vh-1.5rem)] overflow-y-auto")}>
        {view === "home" && (
          <SpaceHome
            docs={activeDocs}
            recentDocIds={recentDocIds}
            onOpenDoc={selectDoc}
            onCreateDoc={createRootDoc}
            onCreateWith={(input) => {
              setView("docs");
              void store.createDoc(input);
            }}
            onNavigate={setView}
          />
        )}
        {view === "docs" && (
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

      <nav className="fixed inset-x-0 bottom-0 z-40 flex h-14 items-stretch border-t border-slate-200 bg-white/95 backdrop-blur lg:hidden">
        <MobileTab active={view === "home"} onClick={() => setView("home")} icon={<Home />} label="主页" />
        <MobileTab active={view === "docs"} onClick={() => setView("docs")} icon={<FileText />} label="文档" />
        <MobileTab active={view === "calendar"} onClick={() => setView("calendar")} icon={<CalendarDays />} label="日历" />
        <MobileTab active={view === "bitable"} onClick={() => setView("bitable")} icon={<Grid3x3 />} label="表格" />
        <MobileTab active={view === "ai"} onClick={() => setView("ai")} icon={<Bot />} label="AI" />
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

// 更新时间格式：今天 14:20 / 昨天 09:05 / 6月5日 16:12
function fmtUpdated(iso: string) {
  try {
    const d = new Date(iso);
    const now = new Date();
    const hm = new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
    const y = new Date(now);
    y.setDate(now.getDate() - 1);
    if (d.toDateString() === now.toDateString()) return `今天 ${hm}`;
    if (d.toDateString() === y.toDateString()) return `昨天 ${hm}`;
    return `${new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric" }).format(d)} ${hm}`;
  } catch {
    return "";
  }
}

// 展示端防御：DB 存量摘要/正文可能混入导入 HTML 时泄漏的 CSS 源码（形如 body{margin:0;font-family:…}）。
// 命中「花括号内含冒号」且带典型 CSS 属性词即判定为样式源码，渲染时丢弃（返回空串），不动 DB。
function cleanExcerpt(raw: string): string {
  const s = (raw || "").trim();
  if (/\{[^}]*:[^}]*\}/.test(s) && /\b(?:font-family|font-size|line-height|margin|padding|background|color|display|width|height)\s*:/i.test(s)) return "";
  return s;
}

// 一张「纸」：渲染文档真实内容，带折角(dog-ear)、作者底注，hero 更大。对齐 design/01。
function PaperSheet({ doc, hero, index = 0, onOpen }: { doc: Doc; hero?: boolean; index?: number; onOpen: () => void }) {
  const fold = hero ? 30 : 24;
  const body =
    cleanExcerpt(doc.text) ||
    cleanExcerpt(doc.summary) ||
    ((doc.text || doc.summary || "").trim() ? "（HTML 页面）" : "空白文档，点击开始书写…");
  return (
    <button
      onClick={onOpen}
      style={{ marginTop: hero ? 0 : Math.min(index, 3) * 7 }}
      className={cn(
        "claw-paper-sheet group relative shrink-0 self-start text-left transition duration-300 ease-out hover:-translate-y-1 focus-visible:-translate-y-1",
        hero ? "w-[360px]" : "w-[248px]",
      )}
    >
      <div
        className={cn(
          "relative flex h-full flex-col overflow-hidden bg-white p-5 ring-1 ring-slate-900/5",
          hero ? "min-h-[300px] rounded-[24px]" : "min-h-[232px] rounded-[20px]",
        )}
        style={{
          clipPath: `polygon(0 0, calc(100% - ${fold}px) 0, 100% ${fold}px, 100% 100%, 0 100%)`,
          boxShadow: hero
            ? "0 30px 70px -28px rgba(15,23,42,0.34), 0 8px 22px -16px rgba(15,23,42,0.16)"
            : "0 22px 52px -28px rgba(15,23,42,0.25), 0 6px 16px -14px rgba(15,23,42,0.14)",
        }}
      >
        <div className="mb-4 flex items-center gap-2">
          <PageIcon icon={doc.icon} size={hero ? "lg" : "md"} />
          {doc.isFavorite && <Star className="h-4 w-4 fill-amber-400 text-amber-400" />}
        </div>
        <h3 className={cn("font-semibold tracking-tight text-slate-950 transition-colors group-hover:text-blue-600", hero ? "text-2xl leading-tight" : "text-[17px] leading-snug")}>
          {docDisplayTitle(doc)}
        </h3>
        {doc.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {doc.tags.slice(0, hero ? 4 : 2).map((t) => (
              <span key={t} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">#{t}</span>
            ))}
          </div>
        )}
        <p className={cn("mt-4 flex-1 whitespace-pre-line text-slate-500", hero ? "line-clamp-[6] text-sm leading-7" : "line-clamp-4 text-[13px] leading-6")}>
          {body}
        </p>
        <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3 text-xs text-slate-400">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-950 text-[10px] font-semibold text-white">你</span>
          <span>{fmtUpdated(doc.updatedAt)} 由你更新</span>
        </div>
      </div>
      {/* 折角 */}
      <span
        className="absolute right-0 top-0"
        style={{
          width: fold,
          height: fold,
          clipPath: "polygon(0 0, 100% 0, 100% 100%)",
          background: "linear-gradient(135deg, #e6eaf2 0%, #f4f6fb 70%)",
          boxShadow: "-2px 2px 4px rgba(15,23,42,0.1)",
        }}
      />
    </button>
  );
}

const COLLECTION_TINTS = ["bg-slate-950", "bg-blue-500", "bg-amber-500", "bg-emerald-500"];

// 空间主页：问候 + 纸张式最近内容 + 玻璃创建坞 + 合集卡（对齐 design/01-space-home）
function SpaceHome({
  docs,
  recentDocIds,
  onOpenDoc,
  onCreateDoc,
  onCreateWith,
  onNavigate,
}: {
  docs: Doc[];
  recentDocIds: string[];
  onOpenDoc: (id: string) => void;
  onCreateDoc: () => void;
  onCreateWith: (input: { title?: string; html?: string }) => void;
  onNavigate: (view: View) => void;
}) {
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 5 ? "夜深了" : hour < 11 ? "早上好" : hour < 13 ? "中午好" : hour < 18 ? "下午好" : "晚上好";
  const dateLabel = new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric", weekday: "long" }).format(now);
  const fileRef = useRef<HTMLInputElement>(null);

  // 最近：先按最近打开顺序，再用更新时间补足
  const recent = useMemo(() => {
    const byId = new Map(docs.map((d) => [d.id, d]));
    const ordered: Doc[] = [];
    const seen = new Set<string>();
    for (const id of recentDocIds) {
      const d = byId.get(id);
      if (d && !seen.has(id)) {
        ordered.push(d);
        seen.add(id);
      }
    }
    const rest = [...docs]
      .filter((d) => !seen.has(d.id))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return [...ordered, ...rest].slice(0, 6);
  }, [docs, recentDocIds]);

  // 合集：按标签聚合，取数量最多的几个
  const collections = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of docs) for (const t of d.tags) map.set(t, (map.get(t) ?? 0) + 1);
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count], i) => ({ name, count, tint: COLLECTION_TINTS[i % COLLECTION_TINTS.length] }));
  }, [docs]);

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const raw = String(reader.result ?? "");
      const title = f.name.replace(/\.[^.]+$/, "");
      const isHtml = /\.html?$/i.test(f.name);
      const html = isHtml
        ? raw
        : "<p>" +
          raw
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .split(/\n{2,}/)
            .filter(Boolean)
            .join("</p><p>")
            .replace(/\n/g, "<br/>") +
          "</p>";
      onCreateWith({ title, html });
    };
    reader.readAsText(f);
  }

  function newFromTemplate() {
    onCreateWith({
      title: "会议纪要",
      html:
        "<h1>会议纪要</h1><p>时间：｜参与人：</p><h2>议题</h2><ul><li>议题一</li><li>议题二</li></ul><h2>结论</h2><ul><li></li></ul><h2>待办</h2><ul><li>负责人 — 事项 — 截止</li></ul>",
    });
  }

  return (
    <div className="relative flex h-[calc(100vh-1.5rem)] flex-col overflow-y-auto">
      <div className="relative mx-auto flex min-h-full w-full max-w-6xl flex-col px-6 pb-10 pt-24 sm:px-10">
        {/* 问候 */}
        <header className="mb-10 max-w-2xl">
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.22em] text-slate-400">ClawNote Space</p>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-950 sm:text-[48px] sm:leading-[1.05]">
            {greeting}，继续创作
          </h1>
          <p className="mt-4 text-sm leading-6 text-slate-500">
            {dateLabel} · {docs.length} 篇内容已经整理好，主页只放最近需要继续写的东西。
          </p>
        </header>

        {/* 最近打开：纸张叠 */}
        <section>
          <div className="mb-5 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-[15px] font-semibold text-slate-700">
              <Clock3 className="h-4 w-4 text-slate-400" /> 最近打开
            </h2>
            <button onClick={() => onNavigate("docs")} className="flex items-center gap-1 text-xs font-medium text-slate-400 transition-colors hover:text-blue-600">
              查看全部 <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>
          {recent.length === 0 ? (
            <button
              onClick={onCreateDoc}
              className="flex w-full items-center justify-center gap-2 rounded-[20px] border-2 border-dashed border-slate-300/70 bg-white/40 py-16 text-sm text-slate-400 transition-colors hover:border-blue-300 hover:text-blue-600"
            >
              <FilePlus2 className="h-4 w-4" /> 还没有文档，新建第一篇
            </button>
          ) : (
            <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
              {recent[0] && <PaperSheet doc={recent[0]} hero onOpen={() => onOpenDoc(recent[0].id)} />}
              <div className="flex min-w-0 gap-4 overflow-x-auto pb-5 pl-1 pt-2 pr-6 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {recent.slice(1).map((doc, i) => (
                  <PaperSheet key={doc.id} doc={doc} index={i} onOpen={() => onOpenDoc(doc.id)} />
                ))}
              </div>
            </div>
          )}
        </section>

        {/* 玻璃创建坞（左） + 合集卡（右） */}
        <div className="mt-auto flex flex-wrap items-end justify-between gap-6 pt-12">
          <MacDock
            items={[
              { icon: <FilePlus2 className="h-4 w-4" />, label: "新建文档", primary: true, onClick: onCreateDoc },
              { icon: <Upload className="h-4 w-4" />, label: "导入文件", onClick: () => fileRef.current?.click() },
              { icon: <FileText className="h-4 w-4" />, label: "从模板新建", onClick: newFromTemplate },
            ]}
          />

          {collections.length > 0 && (
            <div className="flex items-end gap-3">
              {collections.map((c) => (
                <button
                  key={c.name}
                  onClick={() => onNavigate("docs")}
                  className="group flex w-[116px] flex-col gap-3 rounded-2xl bg-white/74 p-3.5 text-left shadow-[0_18px_44px_-24px_rgba(15,23,42,0.28)] ring-1 ring-white/70 backdrop-blur-xl transition-transform hover:-translate-y-1"
                >
                  {/* ring-white/20：深色下让近黑色块（bg-slate-950）与背景区分；浅色下几乎不可见，不改观感 */}
                  <span className={cn("h-7 w-7 rounded-lg ring-1 ring-inset ring-white/20", c.tint)} />
                  <span>
                    <span className="block truncate text-sm font-semibold text-slate-800">{c.name}</span>
                    <span className="text-xs text-slate-400">{c.count} 个文档</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <input ref={fileRef} type="file" accept=".md,.markdown,.txt,.html,.htm" className="hidden" onChange={onPickFile} />
    </div>
  );
}

type DockItem = { icon: ReactNode; label: string; primary?: boolean; onClick: () => void };

// macOS 拓展坞放大：靠 requestAnimationFrame 每帧按「光标到按钮中心的距离」实时重算缩放，
// 移动时瞬时跟手（不靠 CSS 过渡去追，避免发黏）；光标位置与强度各做轻量 lerp，进入/离开顺滑渐变。
// 放大同时用左右 margin 顶开邻居（不遮挡），外层坞宽度随之果冻伸缩。基准宽/中心只测一次。
function MacDock({ items }: { items: DockItem[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const baseRef = useRef<{ centers: number[]; widths: number[] }>({ centers: [], widths: [] });
  const raf = useRef<number | null>(null);
  const targetX = useRef(0); // 光标在坞内的目标 x
  const curX = useRef(0); // 缓动后的 x（每帧 lerp 靠近 targetX）
  const hovering = useRef(false);
  const intensity = useRef(0); // 0..1，进入渐入、离开渐出

  const AMP = 0.45; // 最大放大 = 1 + AMP
  const SIGMA = 80; // 影响半径（越大波纹越宽）

  useEffect(() => {
    function measure() {
      baseRef.current = {
        widths: itemRefs.current.map((el) => el?.offsetWidth ?? 0),
        centers: itemRefs.current.map((el) => (el ? el.offsetLeft + el.offsetWidth / 2 : 0)),
      };
    }
    measure();
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("resize", measure);
      if (raf.current != null) cancelAnimationFrame(raf.current);
    };
  }, [items.length]);

  function paint() {
    const { centers, widths } = baseRef.current;
    for (let i = 0; i < itemRefs.current.length; i++) {
      const el = itemRefs.current[i];
      if (!el) continue;
      const d = curX.current - (centers[i] ?? 0);
      const f = Math.exp(-(d * d) / (2 * SIGMA * SIGMA));
      const s = 1 + AMP * intensity.current * f;
      const extra = ((widths[i] ?? 0) * (s - 1)) / 2;
      el.style.transform = `scale(${s.toFixed(3)})`;
      el.style.marginLeft = `${extra.toFixed(2)}px`;
      el.style.marginRight = `${extra.toFixed(2)}px`;
    }
  }

  function tick() {
    const targetI = hovering.current ? 1 : 0;
    intensity.current += (targetI - intensity.current) * (hovering.current ? 0.28 : 0.16);
    if (hovering.current) curX.current += (targetX.current - curX.current) * 0.42; // 跟手缓动
    paint();
    // 离开且强度已归零 → 复位收尾
    if (!hovering.current && intensity.current < 0.004) {
      intensity.current = 0;
      paint();
      raf.current = null;
      return;
    }
    raf.current = requestAnimationFrame(tick);
  }

  function ensureRaf() {
    if (raf.current == null) raf.current = requestAnimationFrame(tick);
  }

  return (
    <div
      ref={ref}
      onMouseMove={(e) => {
        if (prefersReducedMotion()) return; // reduce：不放大，仅保留普通 hover 背景反馈
        const box = ref.current;
        if (!box) return;
        const x = e.clientX - box.getBoundingClientRect().left;
        if (!hovering.current) {
          hovering.current = true;
          curX.current = x; // 进入时直接落到光标处，避免从左缘扫入
        }
        targetX.current = x;
        ensureRaf();
      }}
      onMouseLeave={() => {
        hovering.current = false;
        ensureRaf();
      }}
      className="relative flex items-center gap-1 rounded-2xl border border-transparent bg-white/75 px-2.5 py-2 shadow-[0_18px_44px_-14px_rgba(15,23,42,0.22)] backdrop-blur-xl"
    >
      {items.map((it, i) => (
        <button
          key={it.label}
          ref={(el) => {
            itemRefs.current[i] = el;
          }}
          onClick={it.onClick}
          style={{ transformOrigin: "center", willChange: "transform, margin" }}
          className={cn(
            "flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60",
            it.primary
              ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-sm shadow-blue-500/30 active:brightness-95"
              : "text-slate-700 hover:bg-slate-100 hover:text-slate-900 active:bg-slate-200",
          )}
        >
          {it.icon} {it.label}
        </button>
      ))}
    </div>
  );
}

// 移动端页面树抽屉：滑入/滑出动画 + 焦点陷阱 + Esc + 关闭后焦点归还（背景滚动锁定）。
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
          "flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-200/70 hover:text-slate-900 [&_svg]:h-5 [&_svg]:w-5",
          active && "bg-blue-100/70 text-blue-600 hover:bg-blue-100/70 hover:text-blue-600"
        )}
      >
        {icon}
      </button>
      <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md bg-slate-800 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity duration-100 group-hover:opacity-100 group-focus-within:opacity-100">
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
          "group flex min-h-8 items-center rounded-lg text-slate-700 transition-colors hover:bg-slate-100",
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
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-lg text-white">🧠</span>
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
