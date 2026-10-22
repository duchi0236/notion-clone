"use client";

import { useMemo, useRef, useState, type ChangeEvent } from "react";
import { ArrowDown, ArrowUpRight, Bot, ChevronRight, Clock3, FilePlus2, FileText, LayoutTemplate, Plus, RotateCcw, Search, Star, Trash2, Upload, X } from "lucide-react";
import { useModalA11y } from "@/hooks/useModalA11y";
import { documentTemplates } from "@/components/document-mode/document-templates";
import { docDisplayTitle } from "./api";
import { PageIcon } from "./PageIcon";
import type { Doc, View } from "./types";

type Props = {
  docs: Doc[];
  recentDocIds: string[];
  onOpenDoc: (id: string) => void;
  onCreateDoc: () => void;
  onCreateWith: (input: { title?: string; html?: string; icon?: string; tags?: string[] }) => void;
  onNavigate: (view: View) => void;
  onSearch: () => void;
};

function excerpt(doc: Doc) {
  const text = doc.text || doc.summary || "";
  if (/\{[^}]*:[^}]*\}/.test(text) && /(?:font-family|margin|padding|background|display)\s*:/i.test(text)) return "打开查看交互页面与完整内容";
  return text.replace(/\s+/g, " ").trim() || "空白的一页，等待你的第一个想法。";
}

function updatedLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("zh-CN", { month: "short", day: "numeric", timeZone: "Asia/Shanghai" }).format(date);
}

export function WorkspaceHome({ docs, recentDocIds, onOpenDoc, onCreateDoc, onCreateWith, onNavigate, onSearch }: Props) {
  const [filter, setFilter] = useState("all");
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [importError, setImportError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLElement>(null);
  const now = new Date();
  const hour = Number(new Intl.DateTimeFormat("zh-CN", { hour: "numeric", hourCycle: "h23", timeZone: "Asia/Shanghai" }).format(now));
  const greeting = hour < 5 ? "夜深了" : hour < 11 ? "早上好" : hour < 13 ? "中午好" : hour < 18 ? "下午好" : "晚上好";
  const dateLabel = new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric", weekday: "long", timeZone: "Asia/Shanghai" }).format(now);

  const orderedDocs = useMemo(() => [...docs].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()), [docs]);
  const recent = useMemo(() => {
    const ids = [...new Set([...recentDocIds, ...orderedDocs.map((doc) => doc.id)])];
    return ids.map((id) => docs.find((doc) => doc.id === id)).filter((doc): doc is Doc => Boolean(doc)).slice(0, 3);
  }, [docs, orderedDocs, recentDocIds]);
  const tags = useMemo(() => [...new Set(docs.flatMap((doc) => doc.tags))].slice(0, 5), [docs]);
  const visibleDocs = orderedDocs.filter((doc) => filter === "all" || (filter === "favorites" ? doc.isFavorite : doc.tags.includes(filter.slice(4))));

  async function importFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setImportError("");
    try {
      const raw = await file.text();
      const html = /\.html?$/i.test(file.name) ? raw : `<p>${raw.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").split(/\n{2,}/).filter(Boolean).join("</p><p>").replace(/\n/g, "<br/>")}</p>`;
      onCreateWith({ title: file.name.replace(/\.[^.]+$/, ""), html });
    } catch {
      setImportError("文件读取失败，请重新选择文件。");
    }
  }

  return (
    <div className="cn-home">
      <header className="cn-topbar">
        <div className="cn-breadcrumb"><span>我的工作空间</span><ChevronRight size={13} /><strong>主页</strong></div>
        <div className="cn-topbar-actions">
          <button className="cn-icon-button" onClick={onSearch} aria-label="搜索或创建" title="搜索或创建 · ⌘K"><Search size={17} /></button>
          <span className="cn-toolbar-divider" />
          <button className="cn-button cn-button-primary" onClick={onCreateDoc}><Plus size={15} />新建文档</button>
        </div>
      </header>

      <div className="cn-home-content">
        <header className="cn-home-intro">
          <div><p className="cn-date-label" suppressHydrationWarning>{dateLabel}</p><h1 suppressHydrationWarning>{greeting}，继续创作<span className="cn-greeting-dot">。</span></h1><p className="cn-home-description">从最近的文档继续，或开启一篇新的记录。</p></div>
          <button className="cn-button cn-ai-shortcut" onClick={() => onNavigate("ai")}><Bot size={16} />与 AI 一起思考<ArrowUpRight size={14} /></button>
        </header>

        <section className="cn-recents" aria-labelledby="recent-heading">
          <div className="cn-section-heading"><h2 id="recent-heading"><Clock3 size={15} />最近文档</h2><button className="cn-text-button" onClick={() => libraryRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" })}>查看全部<ArrowDown size={13} /></button></div>
          {recent.length ? <div className="cn-recent-grid">{recent.map((doc, index) => (
            <button key={doc.id} className="cn-recent-card" onClick={() => onOpenDoc(doc.id)} aria-label={`打开文档：${docDisplayTitle(doc)}`}>
              <div className="cn-doc-preview" data-tone={index}>
                <div className="cn-preview-sheet"><FileText size={16} /><strong>{docDisplayTitle(doc)}</strong><p>{excerpt(doc)}</p><div className="cn-preview-lines" aria-hidden="true"><i /><i /><i /></div></div>
                {doc.isFavorite && <Star size={13} className="cn-preview-star" aria-label="已收藏" />}
                <span className="cn-preview-open"><ArrowUpRight size={15} /></span>
              </div>
              <div className="cn-recent-card-info"><PageIcon icon={doc.icon} /><div><h3>{docDisplayTitle(doc)}</h3><p>编辑于 {updatedLabel(doc.updatedAt)}{doc.tags[0] && <><span>·</span>{doc.tags[0]}</>}</p></div></div>
            </button>
          ))}</div> : <div className="cn-home-empty"><FileText size={28} /><h3>给想法一个落脚的地方</h3><p>创建第一篇文档，开始整理你的知识空间。</p><button className="cn-button cn-button-primary" onClick={onCreateDoc}><Plus size={15} />新建文档</button></div>}
        </section>

        <div className="cn-quick-actions" aria-label="快速创建">
          <button onClick={onCreateDoc}><span className="cn-action-icon" data-tone="blue"><FilePlus2 size={18} /></span><span><strong>空白文档</strong><small>记录一个新的想法</small></span><Plus size={15} /></button>
          <button onClick={() => setTemplatesOpen(true)}><span className="cn-action-icon" data-tone="amber"><LayoutTemplate size={18} /></span><span><strong>从模板开始</strong><small>让整理更有条理</small></span><ChevronRight size={15} /></button>
          <button onClick={() => fileRef.current?.click()}><span className="cn-action-icon" data-tone="green"><Upload size={18} /></span><span><strong>导入文件</strong><small>文本、Markdown 或 HTML</small></span><ChevronRight size={15} /></button>
        </div>
        {importError && <p className="cn-inline-error" role="alert">{importError}</p>}

        <section ref={libraryRef} className="cn-library" aria-labelledby="library-heading">
          <div className="cn-section-heading"><h2 id="library-heading">我的文档<span className="cn-count">{docs.length}</span></h2><button className="cn-text-button" onClick={() => onNavigate("docs")}>打开文档空间<ArrowUpRight size={13} /></button></div>
          <div className="cn-library-filters" role="group" aria-label="筛选我的文档">
            <button aria-pressed={filter === "all"} onClick={() => setFilter("all")}>全部</button>
            <button aria-pressed={filter === "favorites"} onClick={() => setFilter("favorites")}><Star size={12} />已收藏</button>
            {tags.length > 0 && <span className="cn-filter-divider" />}
            {tags.map((tag) => <button key={tag} aria-pressed={filter === `tag:${tag}`} onClick={() => setFilter(`tag:${tag}`)}><span className="cn-tag-hash">#</span>{tag}</button>)}
          </div>
          <div className="cn-document-list">
            <div className="cn-list-heading"><span>名称</span><span>标签</span><span>最后编辑</span></div>
            {visibleDocs.slice(0, 8).map((doc) => <button className="cn-document-row" key={doc.id} onClick={() => onOpenDoc(doc.id)}><span className="cn-document-name"><PageIcon icon={doc.icon} /><span>{docDisplayTitle(doc)}</span>{doc.isFavorite && <Star size={12} className="cn-row-star" />}</span><span className="cn-document-tags">{doc.tags.slice(0, 2).map((tag) => <span key={tag}>{tag}</span>)}</span><time dateTime={doc.updatedAt}>{updatedLabel(doc.updatedAt)}<ArrowUpRight size={13} /></time></button>)}
            {!visibleDocs.length && <div className="cn-filter-empty">{filter === "favorites" ? "还没有收藏的文档。在文档右上角点击星标，即可收藏。" : "这个分类下还没有文档。"}</div>}
            {visibleDocs.length > 8 && <button className="cn-list-more" onClick={() => onNavigate("docs")}>查看全部 {visibleDocs.length} 篇文档<ChevronRight size={13} /></button>}
          </div>
        </section>
        <footer className="cn-home-footer"><BookMark />让每一个想法，都有迹可循。<span>ClawNote</span></footer>
      </div>
      <input ref={fileRef} type="file" accept=".md,.markdown,.txt,.html,.htm" hidden onChange={importFile} />
      {templatesOpen && <TemplateChooser onClose={() => setTemplatesOpen(false)} onChoose={(id) => { const template = documentTemplates.find((item) => item.id === id); if (template) onCreateWith({ title: template.title, html: template.contentHtml, icon: template.icon, tags: template.tags }); setTemplatesOpen(false); }} />}
    </div>
  );
}

function BookMark() { return <FileText size={12} aria-hidden="true" />; }

export function WorkspaceTrash({ docs, onRestore }: { docs: Doc[]; onRestore: (id: string) => void }) {
  return (
    <div className="cn-home">
      <header className="cn-topbar"><div className="cn-breadcrumb"><span>我的工作空间</span><ChevronRight size={13} /><strong>回收站</strong></div><span className="cn-header-caption">{docs.length} 篇文档</span></header>
      <div className="cn-home-content">
        <header className="cn-home-intro"><div><h1>回收站</h1><p className="cn-home-description">移除的文档保留在这里，你可以随时恢复。</p></div></header>
        {docs.length ? <div className="cn-trash-list">{docs.map((doc) => <div key={doc.id} className="cn-trash-row"><PageIcon icon={doc.icon} /><div><strong>{docDisplayTitle(doc)}</strong><small>最后更新 {updatedLabel(doc.updatedAt)}</small></div><button className="cn-button" onClick={() => onRestore(doc.id)}><RotateCcw size={14} />恢复</button></div>)}</div> : <div className="cn-home-empty"><Trash2 size={28} /><h3>回收站是空的</h3><p>删除的文档会出现在这里，重要内容仍有找回的余地。</p></div>}
      </div>
    </div>
  );
}

function TemplateChooser({ onClose, onChoose }: { onClose: () => void; onChoose: (id: string) => void }) {
  const modal = useModalA11y<HTMLElement>({ open: true, onClose });
  return <div className="cn-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section ref={modal} className="cn-template-modal" role="dialog" aria-modal="true" aria-labelledby="template-heading" tabIndex={-1}><header><div><h2 id="template-heading">从一份好模板开始</h2><p>选好结构，把注意力留给内容。</p></div><button className="cn-icon-button" onClick={onClose} aria-label="关闭模板选择"><X size={18} /></button></header><div className="cn-template-grid">{documentTemplates.map((template) => <button key={template.id} onClick={() => onChoose(template.id)}><PageIcon icon={template.icon} size="md" /><strong>{template.title}</strong><p>{template.description}</p><ArrowUpRight size={15} /></button>)}</div></section></div>;
}
