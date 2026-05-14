"use client";

import { Trash2 } from "lucide-react";
import { ClawTipTapEditor } from "@/components/editor/ClawTipTapEditor";
import type { Doc } from "./types";
import { htmlToText, summarize } from "./api";

export function DocumentPanel({
  doc,
  updateDoc,
  deleteDoc,
  askAi,
}: {
  doc?: Doc;
  updateDoc: (patch: Partial<Doc>) => void;
  deleteDoc: () => void;
  askAi: (mode: "summary" | "task" | "memory" | "search") => void;
}) {
  if (!doc) return <div className="p-8 text-slate-500">暂无文档，点击新建开始。</div>;

  return (
    <div className="mx-auto max-w-5xl p-8">
      <div className="mb-6 flex justify-between">
        <div>
          <button className="mb-3 text-6xl">{doc.icon}</button>
          <input
            value={doc.title}
            onChange={(event) => updateDoc({ title: event.target.value })}
            className="w-full bg-transparent text-4xl font-bold outline-none"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {doc.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-violet-50 px-3 py-1 text-xs text-violet-700">#{tag}</span>
            ))}
          </div>
        </div>
        <button onClick={deleteDoc} className="h-10 rounded-xl border border-slate-200 p-2 text-red-500">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <ClawTipTapEditor
        content={doc.html}
        onChange={(html) => {
          const text = htmlToText(html);
          updateDoc({ html, text, summary: summarize(text) });
        }}
        onTextChange={(text) => updateDoc({ text, summary: summarize(text) })}
        onAiCommand={(command) => askAi(command === "tasks" ? "task" : command)}
      />
    </div>
  );
}
