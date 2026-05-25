"use client";

import { AlertCircle, Bot, CheckCircle2, Download, Eye, Info, LockKeyhole, MoreHorizontal, Pencil, RefreshCcw, Save, Share2, Star, Trash2, Users } from "lucide-react";
import { useState } from "react";
import { NotionGradeEditor } from "@/components/editor/notion-grade/NotionGradeEditor";
import { CollaborativeEditor } from "@/components/editor/collaboration/CollaborativeEditor";
import { AdvancedDocumentPreview } from "./AdvancedDocumentPreview";
import { DocumentToc } from "./DocumentToc";
import { DocumentTree } from "./DocumentTree";
import { DocumentSidePanel } from "./DocumentSidePanel";
import { DocumentShareDialog } from "./DocumentShareDialog";
import { DocumentImportExportDialog } from "./DocumentImportExportDialog";
import { DocumentPermissionDialog } from "./DocumentPermissionDialog";
import { TemplatePickerDialog } from "./TemplatePickerDialog";
import { htmlToText } from "./document-utils";
import { useDocumentMode } from "./useDocumentMode";

type SidePanelMode = "meta" | "ai" | null;
type ModalMode = "share" | "markdown" | "permission" | "template" | null;
type ContentMode = "edit" | "preview" | "collab";

function SaveIndicator({ status, error, lastSavedAt, onRetry }: { status: string; error?: string; lastSavedAt?: string | null; onRetry: () => void }) {
  if (status === "error") {
    return <button onClick={onRetry} className="ml-2 inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-1 text-xs font-medium text-red-600"><AlertCircle className="h-3 w-3" />保存失败，重试</button>;
  }
  if (status === "saving" || status === "dirty") {
    return <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-600"><RefreshCcw className="h-3 w-3 animate-spin" />保存中</span>;
  }
  return <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-600"><CheckCircle2 className="h-3 w-3" />已保存{lastSavedAt ? ` ${new Date(lastSavedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}</span>;
}

export default function DocumentOnlyApp() {
  const store = useDocumentMode();
  const doc = store.selected;
  const [sidePanel, setSidePanel] = useState<SidePanelMode>(null);
  const [modal, setModal] = useState<ModalMode>(null);
  const [contentMode, setContentMode] = useState<ContentMode>("edit");

  async function createFromTemplate(templateId: string) {
    await store.createDocument(null, templateId);
    setModal(null);
  }

  return (
    <div className="flex min-h-screen bg-white text-slate-900">
      <DocumentTree tree={store.tree} selectedId={store.selectedId} query={store.query} onQueryChange={store.setQuery} onSelect={store.setSelectedId} onCreate={() => setModal("template")} onMove={(id, parentId) => void store.moveDocument(id, parentId)} recentDocuments={store.recentDocuments} pinnedDocuments={store.pinnedDocuments} />
      <DocumentToc toc={store.toc} />

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-slate-100 bg-white/95 px-8 backdrop-blur">
          <div className="min-w-0 flex items-center gap-2 text-sm text-slate-500">
            <span>文档</span><span>/</span><span className="truncate text-slate-800">{doc?.title ?? "Untitled"}</span>
            <SaveIndicator status={store.saveStatus} error={store.saveError} lastSavedAt={store.lastSavedAt} onRetry={store.retrySave} />
            {store.aiMessage && <span className="ml-2 text-xs text-blue-600">{store.aiMessage}</span>}
          </div>
          <div className="flex items-center gap-2">
            <div className="mr-1 flex rounded-xl border border-slate-200 p-0.5">
              <button onClick={() => setContentMode("edit")} className={`rounded-lg px-2 py-1 text-xs ${contentMode === "edit" ? "bg-slate-900 text-white" : "text-slate-500"}`}><Pencil className="mr-1 inline h-3 w-3" />编辑</button>
              <button onClick={() => setContentMode("preview")} className={`rounded-lg px-2 py-1 text-xs ${contentMode === "preview" ? "bg-slate-900 text-white" : "text-slate-500"}`}><Eye className="mr-1 inline h-3 w-3" />预览</button>
              <button onClick={() => setContentMode("collab")} className={`rounded-lg px-2 py-1 text-xs ${contentMode === "collab" ? "bg-blue-600 text-white" : "text-slate-500"}`}><Users className="mr-1 inline h-3 w-3" />协同</button>
            </div>
            {doc && <button onClick={() => store.togglePin(doc.id)} className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"><Star className={`mr-1 inline h-4 w-4 ${store.pinnedIds.includes(doc.id) ? "fill-amber-400 text-amber-400" : ""}`} />固定</button>}
            <button onClick={() => setSidePanel(sidePanel === "meta" ? null : "meta")} className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"><Info className="mr-1 inline h-4 w-4" />信息</button>
            <button onClick={() => setModal("share")} className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"><Share2 className="mr-1 inline h-4 w-4" />分享</button>
            <button onClick={() => setModal("markdown")} className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"><Download className="mr-1 inline h-4 w-4" />导入/导出</button>
            <button onClick={() => setModal("permission")} className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"><LockKeyhole className="mr-1 inline h-4 w-4" />权限</button>
            <button onClick={() => setSidePanel(sidePanel === "ai" ? null : "ai")} className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"><Bot className="mr-1 inline h-4 w-4" />AI</button>
            <button onClick={() => void store.deleteSelected()} className="rounded-xl border border-slate-200 p-1.5 text-red-500 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
            <button className="rounded-xl border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50"><MoreHorizontal className="h-4 w-4" /></button>
          </div>
        </header>

        {store.saveStatus === "error" && <div className="border-b border-red-100 bg-red-50 px-8 py-2 text-sm text-red-700">{store.saveError}</div>}

        <section className="mx-auto w-full max-w-5xl flex-1 px-10 py-6">
          {doc ? (
            <article>
              <div className="mb-5">
                <input value={doc.title} onChange={(event) => store.updateSelected({ title: event.target.value })} className="w-full border-0 bg-transparent text-4xl font-bold leading-tight text-slate-950 outline-none" placeholder="Untitled" />
                <div className="mt-3 flex flex-wrap items-center gap-3 border-b border-slate-100 pb-3 text-sm text-slate-500">
                  <span>{doc.icon || "📄"}</span><span>字数 {doc.contentText.length.toLocaleString()}</span><span>阅读约 {Math.max(1, Math.ceil(doc.contentText.length / 450))} 分钟</span>
                  {doc.tags?.slice(0, 4).map((tag) => <span key={tag} className="rounded-md bg-slate-100 px-2 py-1 text-slate-600">{tag}</span>)}
                  {contentMode === "collab" && <span className="rounded-md bg-emerald-50 px-2 py-1 text-emerald-700">多人实时协同</span>}
                </div>
              </div>
              <div className="document-only-editor">
                {contentMode === "edit" && <NotionGradeEditor content={doc.contentHtml} onChange={(html) => { const text = htmlToText(html); store.updateSelected({ contentHtml: html, contentText: text, summary: text.slice(0, 160) }); }} onAiCommand={(command) => store.askAi(command === "tasks" ? "task" : command)} />}
                {contentMode === "collab" && <CollaborativeEditor documentId={doc.id} content={doc.contentHtml} userName="Nana" onChange={(html, text) => { store.updateSelected({ contentHtml: html, contentText: text, summary: text.slice(0, 160) }); }} />}
                {contentMode === "preview" && <AdvancedDocumentPreview html={doc.contentHtml} />}
              </div>
            </article>
          ) : <div className="rounded-3xl border border-dashed border-slate-200 p-12 text-center"><p className="text-slate-500">暂无文档</p><button onClick={() => setModal("template")} className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-sm text-white">新建文档</button></div>}
        </section>

        <footer className="border-t border-slate-100 px-8 py-3 text-xs text-slate-400"><Save className="mr-1 inline h-3 w-3" />自动保存已开启，失败时会保留页面内容并提示重试</footer>
      </main>

      {doc && sidePanel && <DocumentSidePanel documentId={doc.id} mode={sidePanel} onClose={() => setSidePanel(null)} onAskAi={(mode) => void store.askAi(mode)} onRestored={() => void store.reloadSelected()} />}
      {doc && modal === "share" && <DocumentShareDialog documentId={doc.id} title={doc.title} onClose={() => setModal(null)} />}
      {doc && modal === "markdown" && <DocumentImportExportDialog documentId={doc.id} title={doc.title} onClose={() => setModal(null)} onImported={() => void store.reloadAll()} />}
      {doc && modal === "permission" && <DocumentPermissionDialog documentId={doc.id} onClose={() => setModal(null)} onSaved={() => void store.reloadSelected()} />}
      {modal === "template" && <TemplatePickerDialog onClose={() => setModal(null)} onSelect={(templateId) => void createFromTemplate(templateId)} />}
    </div>
  );
}
