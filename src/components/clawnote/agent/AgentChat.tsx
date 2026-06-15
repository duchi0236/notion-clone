"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { ArrowUp, Check, Copy, FileText, Plus, RotateCcw, Search, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "../pro/api";

type ChatResult = {
  reply: string;
  results?: { id: string; title: string; snippet?: string }[];
  createdDoc?: { id: string; title: string };
};

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  results?: ChatResult["results"];
  createdDoc?: ChatResult["createdDoc"];
  streaming?: boolean;
};

const SUGGESTIONS = [
  { icon: <Search className="h-4 w-4" />, title: "搜索文档", desc: "在工作区里查找内容", text: "搜索 项目计划" },
  { icon: <Plus className="h-4 w-4" />, title: "新建文档", desc: "快速创建一篇笔记", text: "新建文档 周会纪要" },
  { icon: <Sparkles className="h-4 w-4" />, title: "总结内容", desc: "概括最近编辑的文档", text: "总结" },
];

export function AgentChat({ onOpenDoc }: { onOpenDoc?: (id: string) => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const lastUserRef = useRef<string>("");

  const scrollToEnd = () => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  useEffect(scrollToEnd, [messages.length, sending]);

  // auto-grow textarea
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "0px";
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }, [input]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || sending) return;
    lastUserRef.current = content;
    setMessages((m) => [...m, { id: `u_${Date.now()}`, role: "user", content }]);
    setInput("");
    setSending(true);
    const res = await api<ChatResult>("/api/ai/chat", { method: "POST", body: JSON.stringify({ message: content }) });
    setSending(false);
    setMessages((m) => [
      ...m,
      {
        id: `a_${Date.now()}`,
        role: "assistant",
        content: res?.reply ?? "（助手暂时无法回复，请稍后再试）",
        results: res?.results,
        createdDoc: res?.createdDoc,
        streaming: true,
      },
    ]);
  }

  function markDone(id: string) {
    setMessages((m) => m.map((msg) => (msg.id === id ? { ...msg, streaming: false } : msg)));
  }

  const empty = messages.length === 0;

  return (
    <div className="flex h-screen flex-col bg-white">
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        <div className={cn("mx-auto w-full max-w-3xl px-5", empty ? "flex h-full flex-col justify-center" : "py-8")}>
          {empty ? (
            <div className="-mt-12">
              <div className="mb-7 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-800 to-slate-950 text-white shadow-sm">
                  <Sparkles className="h-6 w-6" />
                </div>
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900">嗨，我是工作区助手</h1>
                <p className="mt-1.5 text-sm text-slate-500">帮你在 ClawNote 里搜索、新建和总结文档。试试下面的指令，或直接开始输入。</p>
              </div>
              <div className="grid gap-2.5 sm:grid-cols-3">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s.text}
                    onClick={() => send(s.text)}
                    className="group rounded-2xl border border-slate-200 bg-white p-3.5 text-left transition-all hover:border-slate-300 hover:shadow-sm"
                  >
                    <span className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition-colors group-hover:bg-slate-900 group-hover:text-white">
                      {s.icon}
                    </span>
                    <span className="block text-sm font-medium text-slate-800">{s.title}</span>
                    <span className="mt-0.5 block text-xs text-slate-500">{s.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-7">
              {messages.map((m) =>
                m.role === "user" ? (
                  <div key={m.id} className="clawnote-msg-in flex justify-end">
                    <div className="max-w-[78%] whitespace-pre-wrap rounded-3xl rounded-br-lg bg-slate-100 px-4 py-2.5 text-[15px] leading-7 text-slate-800">
                      {m.content}
                    </div>
                  </div>
                ) : (
                  <AssistantMessage key={m.id} message={m} onOpenDoc={onOpenDoc} onTick={scrollToEnd} onDone={() => markDone(m.id)} onRetry={() => send(lastUserRef.current)} />
                ),
              )}
              {sending && (
                <div className="clawnote-msg-in flex items-center gap-1.5 text-slate-400">
                  <Dot /> <Dot delay="0.15s" /> <Dot delay="0.3s" />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Composer */}
      <div className="px-5 pb-5 pt-1">
        <div className="mx-auto w-full max-w-3xl">
          <div className="flex items-end gap-2 rounded-[26px] border border-slate-200 bg-white px-4 py-2.5 shadow-[0_2px_16px_rgba(15,23,42,0.06)] transition-colors focus-within:border-slate-300">
            <textarea
              ref={taRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send(input);
                }
              }}
              rows={1}
              placeholder="发消息给工作区助手…"
              className="max-h-40 min-h-[26px] flex-1 resize-none bg-transparent py-1 text-[15px] leading-7 outline-none placeholder:text-slate-400"
            />
            <button
              onClick={() => void send(input)}
              disabled={!input.trim() || sending}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white transition-all hover:bg-slate-700 disabled:scale-90 disabled:bg-slate-200 disabled:text-slate-400"
            >
              <ArrowUp className="h-[18px] w-[18px]" />
            </button>
          </div>
          <p className="mt-2 text-center text-[11px] text-slate-400">助手可在工作区内执行搜索 / 新建 / 总结 · Enter 发送，Shift+Enter 换行</p>
        </div>
      </div>
    </div>
  );
}

function AssistantMessage({
  message,
  onOpenDoc,
  onTick,
  onDone,
  onRetry,
}: {
  message: Message;
  onOpenDoc?: (id: string) => void;
  onTick: () => void;
  onDone: () => void;
  onRetry: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const showExtras = !message.streaming;

  return (
    <div className="clawnote-msg-in group flex gap-3">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-slate-800 to-slate-950 text-white">
        <Sparkles className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[15px] leading-7 text-slate-800">
          {message.streaming ? (
            <Typewriter text={message.content} onTick={onTick} onDone={onDone} />
          ) : (
            <Markdown text={message.content} />
          )}
        </div>

        {showExtras && (message.results?.length || message.createdDoc) && (
          <div className="mt-2.5 space-y-1.5">
            {message.createdDoc && <DocCard id={message.createdDoc.id} title={message.createdDoc.title} onOpenDoc={onOpenDoc} created />}
            {message.results?.map((r) => (
              <DocCard key={r.id} id={r.id} title={r.title} snippet={r.snippet} onOpenDoc={onOpenDoc} />
            ))}
          </div>
        )}

        {showExtras && (
          <div className="mt-1.5 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <ActionBtn
              title="复制"
              onClick={() => {
                navigator.clipboard?.writeText(message.content);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
            >
              {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
            </ActionBtn>
            <ActionBtn title="重新生成" onClick={onRetry}>
              <RotateCcw className="h-3.5 w-3.5" />
            </ActionBtn>
          </div>
        )}
      </div>
    </div>
  );
}

function ActionBtn({ children, onClick, title }: { children: React.ReactNode; onClick: () => void; title: string }) {
  return (
    <button onClick={onClick} title={title} className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700">
      {children}
    </button>
  );
}

function DocCard({ id, title, snippet, created, onOpenDoc }: { id: string; title: string; snippet?: string; created?: boolean; onOpenDoc?: (id: string) => void }) {
  return (
    <button
      onClick={() => onOpenDoc?.(id)}
      className="flex w-full items-start gap-2.5 rounded-xl border border-slate-200 bg-white p-3 text-left transition-all hover:border-slate-300 hover:shadow-sm"
    >
      <FileText className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 truncate text-sm font-medium text-slate-800">
          {title}
          {created && <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] text-green-700">新建</span>}
        </span>
        {snippet && <span className="mt-0.5 block truncate text-xs text-slate-500">{snippet}</span>}
      </span>
    </button>
  );
}

// Progressive reveal driven by elapsed wall-clock time (not tick count), so it
// always completes in ~`duration` regardless of how the browser throttles timers
// (requestAnimationFrame pauses when hidden; setInterval clamps to ~1s). Smooth
// in the foreground, and robust when the tab is backgrounded.
function Typewriter({ text, onTick, onDone }: { text: string; onTick: () => void; onDone: () => void }) {
  const [len, setLen] = useState(0);
  useEffect(() => {
    const duration = Math.min(1400, Math.max(350, text.length * 12));
    const start = performance.now();
    const timer = setInterval(() => {
      const progress = Math.min(1, (performance.now() - start) / duration);
      setLen(Math.ceil(text.length * progress));
      onTick();
      if (progress >= 1) {
        clearInterval(timer);
        onDone();
      }
    }, 24);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);
  return <span className="clawnote-caret whitespace-pre-wrap">{text.slice(0, len)}</span>;
}

// Lightweight, safe markdown: paragraphs, bullet lists, and **bold** (rendered as
// React nodes — no innerHTML).
function Markdown({ text }: { text: string }) {
  const lines = text.split("\n");
  const blocks: React.ReactNode[] = [];
  let list: string[] = [];
  const flush = (key: string) => {
    if (!list.length) return;
    blocks.push(
      <ul key={key} className="my-1 space-y-1 pl-1">
        {list.map((item, i) => (
          <li key={i} className="flex gap-2">
            <span className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-slate-400" />
            <span>{inline(item)}</span>
          </li>
        ))}
      </ul>,
    );
    list = [];
  };
  lines.forEach((raw, i) => {
    const line = raw.trimEnd();
    const m = /^\s*[•\-*]\s+(.*)$/.exec(line);
    if (m) {
      list.push(m[1]);
    } else {
      flush(`l${i}`);
      if (line.trim()) blocks.push(<p key={`p${i}`} className="my-0.5">{inline(line)}</p>);
    }
  });
  flush("lend");
  return <>{blocks}</>;
}

function inline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    /^\*\*[^*]+\*\*$/.test(p) ? <strong key={i} className="font-semibold text-slate-900">{p.slice(2, -2)}</strong> : <Fragment key={i}>{p}</Fragment>,
  );
}

function Dot({ delay = "0s" }: { delay?: string }) {
  return <span className="h-2 w-2 animate-bounce rounded-full bg-slate-300" style={{ animationDelay: delay }} />;
}
