"use client";

import { Bot, Clock3, Download, Eye, LockKeyhole, MoreHorizontal, Pencil, Save, Share2, Trash2 } from "lucide-react";
import { useState } from "react";
import { NotionGradeEditor } from "@/components/editor/notion-grade/NotionGradeEditor";
import { AdvancedDocumentPreview } from "./AdvancedDocumentPreview";
import { DocumentToc } from "./DocumentToc";
import { DocumentTree } from "./DocumentTree";
import { DocumentSidePanel } from "./DocumentSidePanel";
import { DocumentShareDialog } from "./DocumentShareDialog";
import { DocumentImportExportDialog } from "./DocumentImportExportDialog";
import { DocumentPermissionDialog } from "./DocumentPermissionDialog";
import { htmlToText } from "./document-utils";
import { useDocumentMode } from "./useDocumentMode";

type SidePanelMode = "meta" | "ai" | null;
type ModalMode = "share" | "markdown" | "permission" | null;

type ContentMode = "edit" | "preview";

export default function DocumentOnlyApp() {
  const store = useDocumentMode();
  const doc = store.selected;
  const [sidePanel, setSidePanel] = useState<SidePanelMode>(null);
  const [modal, setModal] = useState<ModalMode>(null);
  const [contentMode, setContentMode] = useState<ContentMode>("edit");

  return (
    <div className="flex min-h-screen bg-white text-slate-900">
      <DocumentTree
        tree={store.tree}
        selectedId={store.selectedId}
        onSelect={store.setSelectedId}
        onCreate={() => void store.createDocument()}
        onMove={(id, parentId) => void store.moveDocument(id, parentId)}
      />

      <DocumentToc toc={store.toc} />

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-slate-100 bg-white/95 px-8 backdrop-blur">
          <div className="min-w-0 flex items-center gap-2 text-sm text-slate-500">
            <span>产品中心</span>
            <span>/</span>
            <span>OpenClaw 产品方案</span>
            <span>/</span>
            <span className="truncate text-slate-800">{doc?.title ?? "Untitled"}</span>
            {store.saving ? <span className="ml-2 text-xs text-amber-600">保存中...</span> : <span className="ml-2 text-xs text-emerald-600">已保存</span>}
            {store.aiMessage && <span className="ml-2 text-xs text-blue-600">{store.aiMessage}</span>}
          </div>
          <div className="flex items-center gap-2">
            <div className="mr-1 flex rounded-xl border border-slate-200 p-0.5">
              <button onClick={() => setContentMode("edit")} className={`rounded-lg px-2 py-1 text-xs ${contentMode === "edit" ? "bg-slate-900 text-white" : "text-slate-500"}`}>
                <Pencil className="mr-1 inline h-3 w-3" />编辑
              </button>
              <button onClick={() => setContentMode("preview")} className={`rounded-lg px-2 py-1 text-xs ${contentMode === "preview" ? "bg-slate-900 text-white" : "text-slate-500"}`}>
                <Eye className="mr-1 inline h-3 w-3" />预览
              </button>
            </div>
            <button onClick={() => setModal("share")} className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50">
              <Share2 className="mr-1 inline h-4 w-4" />分享
            </button>
            <button onClick={() => setModal("markdown")} className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50">
              <Download className="mr-1 inline h-4 w-4" />导入/导出
            </button>
            <button onClick={() => setModal("permission")} className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50">
              <LockKeyhole className="mr-1 inline h-4 w-4" />权限
            </button>
            <button onClick={() => setSidePanel(sidePanel === "meta" ? null : "meta")} className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50">
              <Clock3 className="mr-1 inline h-4 w-4" />历史/评论
            </button>
            <button onClick={() => setSidePanel(sidePanel === "ai" ? null : "ai")} className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50">
              <Bot className="mr-1 inline h-4 w-4" />AI 插件
            </button>
            <button onClick={() => void store.deleteSelected()} className="rounded-xl border border-slate-200 p-1.5 text-red-500 hover:bg-red-50">
              <Trash2 className="h-4 w-4" />
            </button>
            <button className="rounded-xl border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>
        </header>

        <section className="mx-auto w-full max-w-5xl flex-1 px-10 py-10">
          {doc ? (
            <article>
              <div className="mb-8">
                <input
                  value={doc.title}
                  onChange={(event) => store.updateSelected({ title: event.target.value })}
                  className="w-full border-0 bg-transparent text-5xl font-bold tracking-tight text-slate-950 outline-none"
                  placeholder="Untitled"
                />
                <div className="mt-5 flex flex-wrap items-center gap-5 border-b border-slate-100 pb-5 text-sm text-slate-500">
                  <span>创建者 Nana</span>
                  <span>字数 {doc.contentText.length.toLocaleString()}</span>
                  <span>阅读时长 约 {Math.max(1, Math.ceil(doc.contentText.length / 450))} 分钟</span>
                  <span className="rounded-md bg-blue-50 px-2 py-1 text-blue-700">Notion 级编辑器</span>
                </div>
              </div>

              <div className="document-only-editor">
                {contentMode === "edit" ? (
                  <NotionGradeEditor
                    content={doc.contentHtml}
                    onChange={(html) => {
                      const text = htmlToText(html);
                      store.updateSelected({ contentHtml: html, contentText: text, summary: text.slice(0, 160) });
                    }}
                    onTextChange={(text) => store.updateSelected({ contentText: text, summary: text.slice(0, 160) })}
                    onAiCommand={(command) => store.askAi(command === "tasks" ? "task" : command)}
                  />
                ) : (
                  <AdvancedDocumentPreview html={doc.contentHtml} />
                )}
              </div>
            </article>
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-200 p-12 text-center">
              <p className="text-slate-500">暂无文档</p>
              <button onClick={() => void store.createDocument()} className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-sm text-white">
                新建文档
              </button>
            </div>
          )}
        </section>

        <footer className="border-t border-slate-100 px-8 py-3 text-xs text-slate-400">
          <Save className="mr-1 inline h-3 w-3" />文档功能独立可用，AI 知识库作为可选外挂层。
        </footer>
      </main>

      {doc && sidePanel && (
        <DocumentSidePanel
          documentId={doc.id}
          mode={sidePanel}
          onClose={() => setSidePanel(null)}
          onAskAi={(mode) => void store.askAi(mode)}
          onRestored={() => void store.reloadSelected()}
        />
      )}

      {doc && modal === "share" && <DocumentShareDialog documentId={doc.id} title={doc.title} onClose={() => setModal(null)} />}
      {doc && modal === "markdown" && <DocumentImportExportDialog documentId={doc.id} title={doc.title} onClose={() => setModal(null)} onImported={() => void store.reloadAll()} />}
      {doc && modal === "permission" && <DocumentPermissionDialog documentId={doc.id} onClose={() => setModal(null)} onSaved={() => void store.reloadSelected()} />}
    </div>
  );
}
