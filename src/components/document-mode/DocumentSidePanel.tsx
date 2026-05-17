"use client";

import { Bot, Clock3, MessageSquare, X } from "lucide-react";
import { DocumentMetaPanel } from "@/components/clawnote/pro/DocumentMetaPanel";

type PanelMode = "meta" | "ai";

export function DocumentSidePanel({
  documentId,
  mode,
  onClose,
  onAskAi,
  onRestored,
}: {
  documentId: string;
  mode: PanelMode;
  onClose: () => void;
  onAskAi: (mode: "summary" | "task" | "memory" | "search") => void;
  onRestored?: () => void;
}) {
  return (
    <aside className="h-screen w-[420px] overflow-auto border-l border-slate-200 bg-white shadow-xl">
      <div className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-slate-100 bg-white px-5">
        <div className="flex items-center gap-2 font-semibold">
          {mode === "meta" ? <Clock3 className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
          {mode === "meta" ? "历史与评论" : "AI 插件"}
        </div>
        <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
          <X className="h-4 w-4" />
        </button>
      </div>

      {mode === "meta" ? (
        <div className="p-5">
          <DocumentMetaPanel documentId={documentId} onRestored={onRestored} />
        </div>
      ) : (
        <div className="space-y-4 p-5">
          <div className="rounded-2xl bg-violet-50 p-4 text-sm text-violet-900">
            AI 是可选外挂能力，不影响文档独立使用。AI 生成内容默认进入草稿/建议流。
          </div>
          <div className="grid gap-3">
            <Action title="总结文档" desc="生成摘要，不修改正文" onClick={() => onAskAi("summary")} />
            <Action title="提取任务" desc="从当前文档生成任务草稿" onClick={() => onAskAi("task")} />
            <Action title="写入 Memory" desc="生成待审核长期记忆" onClick={() => onAskAi("memory")} />
            <Action title="查找相关内容" desc="基于知识库索引检索引用片段" onClick={() => onAskAi("search")} />
          </div>
        </div>
      )}
    </aside>
  );
}

function Action({ title, desc, onClick }: { title: string; desc: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="rounded-2xl border border-slate-200 bg-white p-4 text-left hover:border-violet-300 hover:bg-violet-50">
      <div className="font-medium text-slate-900">{title}</div>
      <div className="mt-1 text-sm text-slate-500">{desc}</div>
    </button>
  );
}
