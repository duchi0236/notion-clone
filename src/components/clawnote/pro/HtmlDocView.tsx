"use client";

import { useRef, useState } from "react";
import { Code2, Eye, Link2, Maximize2, Sparkles, Upload } from "lucide-react";
import { ensureSentinel, stripSentinel, urlToFullHtml } from "@/lib/html-doc";

// 整页 HTML 文档视图：预览（沙箱 iframe，保留 CSS/JS 交互）/ 源码（可编辑）。
export function HtmlDocView({ html, onChange }: { html: string; onChange: (html: string) => void }) {
  const [tab, setTab] = useState<"preview" | "source">("preview");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const srcDoc = stripSentinel(html);

  const openFull = () => {
    const w = window.open("", "_blank");
    if (w) { w.document.open(); w.document.write(srcDoc); w.document.close(); }
  };

  const embedUrl = () => {
    const url = window.prompt("输入要内嵌的网址：", "https://");
    if (url && /^https?:\/\//i.test(url)) onChange(urlToFullHtml(url));
  };

  const importFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onChange(ensureSentinel(String(reader.result || "")));
    reader.readAsText(file);
    e.target.value = "";
  };

  const aiGenerate = async () => {
    const prompt = window.prompt("描述你想要的页面（AI 生成整页 HTML）：", "");
    if (!prompt) return;
    setBusy(true);
    try {
      const res = await fetch("/api/ai/generate-html", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (data?.html) onChange(data.html);
      if (data?.warning) alert(`已用占位模板（模型调用失败）：${data.warning}`);
    } catch (e) {
      alert(`生成失败：${(e as Error).message}`);
    } finally { setBusy(false); }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center gap-2">
        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
          <button
            onClick={() => setTab("preview")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ${tab === "preview" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
          >
            <Eye className="h-4 w-4" /> 预览
          </button>
          <button
            onClick={() => setTab("source")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ${tab === "source" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
          >
            <Code2 className="h-4 w-4" /> 源码
          </button>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-slate-500 hover:bg-slate-100" title="导入 .html 文件">
            <Upload className="h-4 w-4" /> 导入
          </button>
          <button onClick={embedUrl} className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-slate-500 hover:bg-slate-100" title="内嵌网址">
            <Link2 className="h-4 w-4" /> 网址
          </button>
          <button onClick={aiGenerate} disabled={busy} className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-indigo-600 hover:bg-indigo-50 disabled:opacity-50" title="AI 生成整页 HTML">
            <Sparkles className="h-4 w-4" /> {busy ? "生成中…" : "AI 生成"}
          </button>
          <button onClick={openFull} className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-slate-500 hover:bg-slate-100" title="在新标签页全屏打开">
            <Maximize2 className="h-4 w-4" /> 全屏
          </button>
        </div>
        <input ref={fileRef} type="file" accept=".html,.htm,text/html" className="hidden" onChange={importFile} />
      </div>

      {tab === "preview" ? (
        <iframe
          title="html-document"
          className="min-h-[70vh] w-full flex-1 rounded-xl border border-slate-200 bg-white"
          sandbox="allow-scripts allow-popups allow-forms allow-modals"
          srcDoc={srcDoc}
        />
      ) : (
        <textarea
          value={srcDoc}
          onChange={(e) => onChange(ensureSentinel(e.target.value))}
          spellCheck={false}
          className="min-h-[70vh] w-full flex-1 rounded-xl border border-slate-200 bg-slate-950 p-4 font-mono text-[13px] leading-relaxed text-slate-100 outline-none"
          placeholder="粘贴 / 编写完整 HTML（含 <style> 与 <script>）…"
        />
      )}
    </div>
  );
}
