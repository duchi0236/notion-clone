"use client";

import { Clock3, MessageSquare, MoreHorizontal, Share2, Star } from "lucide-react";
import { ClawTipTapEditor } from "@/components/editor/ClawTipTapEditor";
import type { DocumentRecord } from "./document-types";
import { htmlToText } from "./document-utils";

export function DocumentEditorShell({
  document,
  onChange,
}: {
  document?: DocumentRecord;
  onChange: (patch: Partial<DocumentRecord>) => void;
}) {
  if (!document) {
    return <main className="flex h-screen flex-1 items-center justify-center bg-white text-sm text-slate-500">请选择或新建文档</main>;
  }

  return (
    <main className="flex h-screen min-w-0 flex-1 flex-col bg-white">
      <header className="flex h-14 items-center justify-between border-b border-slate-100 px-8">
        <div className="min-w-0 truncate text-sm text-slate-500">产品中心 / OpenClaw 产品方案 / {document.title}</div>
        <div className="flex items-center gap-2">
          <button className="rounded-lg px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100"><Share2 className="mr-1 inline h-4 w-4" />分享</button>
          <button className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><Star className="h-4 w-4" /></button>
          <button className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><Clock3 className="h-4 w-4" /></button>
          <button className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><MessageSquare className="h-4 w-4" /></button>
          <button className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><MoreHorizontal className="h-4 w-4" /></button>
        </div>
      </header>

      <section className="flex-1 overflow-auto">
        <article className="mx-auto max-w-4xl px-10 py-10">
          <input
            value={document.title}
            onChange={(event) => onChange({ title: event.target.value })}
            className="mb-4 w-full bg-transparent text-5xl font-bold tracking-tight text-slate-950 outline-none"
          />
          <div className="mb-8 flex items-center gap-6 border-b border-slate-100 pb-5 text-sm text-slate-500">
            <span>创建者 Nana</span>
            <span>字数 {document.contentText.length.toLocaleString()}</span>
            <span>状态 {document.status ?? "编辑中"}</span>
          </div>
          <ClawTipTapEditor
            content={document.contentHtml}
            onChange={(html) => onChange({ contentHtml: html, contentText: htmlToText(html) })}
            onTextChange={(text) => onChange({ contentText: text })}
          />
        </article>
      </section>
    </main>
  );
}
