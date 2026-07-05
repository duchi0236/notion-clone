"use client";

import { Bot, Sparkles, X } from "lucide-react";
import { useState } from "react";

const presets = [
  { id: "outline", title: "生成大纲", prompt: "请基于当前主题生成一份结构化文章大纲。" },
  { id: "summary", title: "总结内容", prompt: "请总结上方内容，并提炼关键结论。" },
  { id: "tasks", title: "提取任务", prompt: "请把这段内容转成待办事项清单。" },
  { id: "rewrite", title: "润色改写", prompt: "请把这段内容改写得更清晰、更专业。" },
];

export function AiBlockDialog({
  onClose,
  onInsert,
}: {
  onClose: () => void;
  onInsert: (html: string) => void;
}) {
  const [prompt, setPrompt] = useState(presets[0].prompt);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");

  async function generate() {
    setLoading(true);
    setResult("");
    try {
      const res = await fetch("/api/agent/create-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction: prompt, mode: "insert-block" }),
      });
      const data = await res.json().catch(() => ({}));
      const text = data.draft?.content ?? data.content ?? data.text ?? `AI 草稿：${prompt}`;
      setResult(String(text));
    } catch {
      setResult(`AI 草稿：${prompt}`);
    } finally {
      setLoading(false);
    }
  }

  function insert() {
    const content = result || prompt;
    onInsert(`<div class="notion-callout"><span>🤖</span><p>${escapeHtml(content)}</p></div>`);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/20 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900"><Bot className="h-5 w-5 text-blue-600" />AI Block</h2>
            <p className="mt-1 text-sm text-slate-500">生成内容后作为一个块插入当前文档。</p>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {presets.map((item) => (
            <button key={item.id} onClick={() => setPrompt(item.prompt)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm hover:border-blue-300 hover:bg-blue-50">{item.title}</button>
          ))}
        </div>

        <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} className="h-28 w-full rounded-2xl border border-slate-200 p-4 text-sm outline-none focus:border-blue-300" />

        {result && <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm leading-7 text-slate-700 whitespace-pre-wrap">{result}</div>}

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={generate} disabled={loading} className="rounded-xl bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-60"><Sparkles className="mr-1 inline h-4 w-4" />{loading ? "生成中..." : "生成"}</button>
          <button onClick={insert} className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700">插入</button>
        </div>
      </div>
    </div>
  );
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
