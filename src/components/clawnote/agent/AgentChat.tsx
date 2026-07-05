"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, Check, Copy, FileText, Plus, RotateCcw, Search, Sparkles, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "../pro/api";
import { sanitizeSvg } from "@/lib/sanitize-svg";
import { useReducedMotion } from "@/hooks/useReducedMotion";

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
  error?: boolean;
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
  // 用户是否仍贴在底部：主动上滑离开底部时停止自动跟随。
  const followRef = useRef(true);
  const reducedMotion = useReducedMotion();

  const scrollToEnd = (force = false) => {
    const el = scrollRef.current;
    if (!el) return;
    if (!force && !followRef.current) return;
    el.scrollTo({ top: el.scrollHeight, behavior: reducedMotion ? "auto" : "smooth" });
  };

  // 监听滚动，记录用户是否接近底部（用于流式逐字时不强拽底）。
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      followRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 64;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // 新消息进出时回到底部（明确动作，强制跟随）。
  useEffect(() => {
    followRef.current = true;
    scrollToEnd(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, sending]);

  // auto-grow textarea
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }, [input]);

  async function runRequest(content: string, assistantId: string) {
    setSending(true);
    const res = await api<ChatResult>("/api/ai/chat", { method: "POST", body: JSON.stringify({ message: content }) }).catch(() => null);
    setSending(false);
    if (!res) {
      setMessages((m) => [
        ...m,
        { id: assistantId, role: "assistant", content: "助手暂时无法回复，请检查网络后重试。", error: true },
      ]);
      return;
    }
    setMessages((m) => [
      ...m,
      {
        id: assistantId,
        role: "assistant",
        content: res.reply ?? "（助手暂时无法回复，请稍后再试）",
        results: res.results,
        createdDoc: res.createdDoc,
        streaming: true,
      },
    ]);
  }

  async function send(text: string) {
    const content = text.trim();
    if (!content || sending) return;
    lastUserRef.current = content;
    setMessages((m) => [...m, { id: `u_${Date.now()}`, role: "user", content }]);
    setInput("");
    await runRequest(content, `a_${Date.now()}`);
    // 发送完成后焦点归还输入框，便于连续提问。
    requestAnimationFrame(() => taRef.current?.focus());
  }

  // 重新生成 / 失败重试：不再 push 一条 user，移除最后一条 assistant 后重新请求。
  async function regenerate() {
    const content = lastUserRef.current.trim();
    if (!content || sending) return;
    setMessages((m) => {
      const next = [...m];
      for (let i = next.length - 1; i >= 0; i--) {
        if (next[i].role === "assistant") {
          next.splice(i, 1);
          break;
        }
      }
      return next;
    });
    await runRequest(content, `a_${Date.now()}`);
    requestAnimationFrame(() => taRef.current?.focus());
  }

  function markDone(id: string) {
    setMessages((m) => m.map((msg) => (msg.id === id ? { ...msg, streaming: false } : msg)));
  }

  // 流式打字期间「停止」：立即完成当前 assistant 的逐字。
  const streamingId = messages.find((m) => m.streaming)?.id ?? null;
  const empty = messages.length === 0;

  return (
    <div className="flex h-full flex-col bg-white">
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
                    onClick={() => void send(s.text)}
                    disabled={sending}
                    className="group rounded-2xl border border-slate-200 bg-white p-3.5 text-left transition-all hover:border-slate-300 hover:shadow-sm active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
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
                  <AssistantMessage key={m.id} message={m} onOpenDoc={onOpenDoc} onTick={() => scrollToEnd()} onDone={() => markDone(m.id)} onRetry={() => void regenerate()} reducedMotion={reducedMotion} />
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
                  if (!sending) void send(input);
                }
              }}
              rows={1}
              disabled={sending}
              placeholder={sending ? "助手回复中…" : "发消息给工作区助手…"}
              className="min-h-[26px] flex-1 resize-none border-0 bg-transparent py-1 text-[15px] leading-7 outline-none focus:ring-0 placeholder:text-slate-400 disabled:opacity-60"
            />
            {streamingId ? (
              <button
                onClick={() => markDone(streamingId)}
                aria-label="停止"
                title="停止"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white transition-all hover:bg-slate-700"
              >
                <Square className="h-[15px] w-[15px] fill-current" />
              </button>
            ) : (
              <button
                onClick={() => void send(input)}
                disabled={!input.trim() || sending}
                aria-label="发送"
                title="发送"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white transition-all hover:bg-slate-700 disabled:scale-90 disabled:bg-slate-200 disabled:text-slate-400"
              >
                <ArrowUp className="h-[18px] w-[18px]" />
              </button>
            )}
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
  reducedMotion,
}: {
  message: Message;
  onOpenDoc?: (id: string) => void;
  onTick: () => void;
  onDone: () => void;
  onRetry: () => void;
  reducedMotion: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const clipboardOk = typeof navigator !== "undefined" && !!navigator.clipboard;
  const showExtras = !message.streaming;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setCopyFailed(false);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopyFailed(true);
      setTimeout(() => setCopyFailed(false), 2000);
    }
  };

  // 错误气泡：错误色 + 「重试」，重试复用最后一条 user 不再 push。
  if (message.error) {
    return (
      <div className="clawnote-msg-in flex gap-3">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-slate-800 to-slate-950 text-white">
          <Sparkles className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">
            <span>{message.content}</span>
            <button
              onClick={onRetry}
              className="inline-flex items-center gap-1 rounded-md border border-rose-300 bg-white px-2 py-0.5 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-100 active:bg-rose-200"
            >
              <RotateCcw className="h-3 w-3" /> 重试
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="clawnote-msg-in group flex gap-3">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-slate-800 to-slate-950 text-white">
        <Sparkles className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[15px] leading-7 text-slate-800">
          {message.streaming ? (
            <Typewriter text={message.content} onTick={onTick} onDone={onDone} reducedMotion={reducedMotion} />
          ) : (
            <RichContent text={message.content} onTick={onTick} />
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
          <div className="mt-1.5 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100">
            <ActionBtn
              title={copyFailed ? "复制失败" : copied ? "已复制" : "复制"}
              ariaLabel={copyFailed ? "复制失败" : copied ? "已复制" : "复制回复"}
              onClick={() => void copy()}
              disabled={!clipboardOk}
            >
              {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
            </ActionBtn>
            <ActionBtn title="重新生成" ariaLabel="重新生成回复" onClick={onRetry}>
              <RotateCcw className="h-3.5 w-3.5" />
            </ActionBtn>
            {(copied || copyFailed) && (
              <span role="status" className="sr-only">
                {copyFailed ? "复制失败" : "已复制到剪贴板"}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ActionBtn({
  children,
  onClick,
  title,
  ariaLabel,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  ariaLabel?: string;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={ariaLabel ?? title}
      disabled={disabled}
      className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 active:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
    >
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
function Typewriter({ text, onTick, onDone, reducedMotion }: { text: string; onTick: () => void; onDone: () => void; reducedMotion: boolean }) {
  const [len, setLen] = useState(0);
  useEffect(() => {
    // 尊重 reduced-motion：直接整段呈现，跳过逐字。
    if (reducedMotion) {
      setLen(text.length);
      onTick();
      onDone();
      return;
    }
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
  }, [text, reducedMotion]);
  return <span className="clawnote-caret whitespace-pre-wrap">{text.slice(0, len)}</span>;
}

// ---- 富内容渲染（类 Claude Code）：围栏代码块 / SVG / HTML / Markdown ----

type ContentBlock =
  | { type: "code"; lang: string; content: string }
  | { type: "svg"; content: string }
  | { type: "html"; content: string }
  | { type: "image"; src: string; alt: string }
  | { type: "md"; content: string };

// 仅允许网络图与内联 data:image，过滤 javascript: 等
function isSafeImgUrl(u: string) {
  return /^(https?:\/\/|data:image\/)/i.test(u.trim());
}

// 把文本切成内容块：先抽围栏 ```lang ...```，文本段里再抽裸 <svg>…</svg> 与 <img …>。
function parseBlocks(text: string): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  const pushText = (t: string) => {
    if (!t.trim()) return;
    const re = /<svg[\s\S]*?<\/svg>|<img\b[^>]*>/gi;
    let lt = 0;
    let sm: RegExpExecArray | null;
    while ((sm = re.exec(t))) {
      const tag = sm[0];
      let block: ContentBlock | null = null;
      if (/^<svg/i.test(tag)) {
        block = { type: "svg", content: tag };
      } else {
        const src = /\bsrc\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1] ?? "";
        const alt = /\balt\s*=\s*["']([^"']*)["']/i.exec(tag)?.[1] ?? "";
        if (isSafeImgUrl(src)) block = { type: "image", src, alt };
      }
      // 仅对可渲染的标签切割；正文里只是「提到」的 <img> 文字原样保留
      if (!block) continue;
      const before = t.slice(lt, sm.index);
      if (before.trim()) blocks.push({ type: "md", content: before });
      blocks.push(block);
      lt = sm.index + tag.length;
    }
    const rest = t.slice(lt);
    if (rest.trim()) blocks.push({ type: "md", content: rest });
  };

  const fence = /```([\w+-]*)\n?([\s\S]*?)```/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = fence.exec(text))) {
    pushText(text.slice(last, m.index));
    const lang = (m[1] || "").toLowerCase();
    const content = m[2].replace(/\n$/, "");
    if (lang === "svg" || /^\s*<svg[\s>]/.test(content)) blocks.push({ type: "svg", content });
    else if (lang === "html") blocks.push({ type: "html", content });
    else blocks.push({ type: "code", lang, content });
    last = m.index + m[0].length;
  }
  pushText(text.slice(last));
  return blocks;
}

function RichContent({ text, onTick }: { text: string; onTick?: () => void }) {
  const blocks = useMemo(() => parseBlocks(text), [text]);
  return (
    <div className="space-y-2.5">
      {blocks.map((b, i) => {
        if (b.type === "code") return <CodeBlock key={i} lang={b.lang} content={b.content} />;
        if (b.type === "svg") return <ChatSvg key={i} content={b.content} />;
        if (b.type === "html") return <ChatHtml key={i} content={b.content} />;
        if (b.type === "image") return <ChatImage key={i} src={b.src} alt={b.alt} onLoad={onTick} />;
        return <Markdown key={i} text={b.content} />;
      })}
    </div>
  );
}

function CodeBlock({ lang, content }: { lang: string; content: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#0d1117]">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-1.5">
        <span className="font-mono text-[11px] uppercase tracking-wide text-slate-400">{lang || "code"}</span>
        <button
          onClick={() => {
            navigator.clipboard?.writeText(content);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-slate-400 transition-colors hover:bg-white/10 hover:text-slate-100"
        >
          {copied ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
          {copied ? "已复制" : "复制"}
        </button>
      </div>
      <pre className="overflow-x-auto px-4 py-3 text-[13px] leading-6">
        <code className="font-mono text-slate-100">{content}</code>
      </pre>
    </div>
  );
}

function ChatSvg({ content }: { content: string }) {
  const safe = useMemo(() => sanitizeSvg(content), [content]);
  if (!safe) return <CodeBlock lang="svg" content={content} />;
  return (
    <div
      className="flex justify-center rounded-xl border border-slate-200 bg-white p-4 [&_svg]:h-auto [&_svg]:max-h-[440px] [&_svg]:max-w-full"
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  );
}

function ChatImage({ src, alt, onLoad }: { src: string; alt: string; onLoad?: () => void }) {
  const [broken, setBroken] = useState(false);
  const [loaded, setLoaded] = useState(false);
  if (!isSafeImgUrl(src) || broken) return null;
  return (
    <figure className="flex flex-col items-center gap-1.5">
      {/* 占位骨架：加载完成前保持最小高度，避免图片到位后把视图顶离底部 */}
      <div className="relative w-full">
        {!loaded && <div className="h-40 w-full animate-pulse rounded-xl border border-slate-200 bg-slate-100" />}
        {/* 模型生成 / 引用的图片；仅允许 http(s) 与 data:image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onLoad={() => {
            setLoaded(true);
            onLoad?.();
          }}
          onError={() => setBroken(true)}
          className={cn(
            "mx-auto max-h-[440px] max-w-full rounded-xl border border-slate-200 object-contain",
            loaded ? "block" : "hidden",
          )}
        />
      </div>
      {alt && <figcaption className="text-xs text-slate-400">{alt}</figcaption>}
    </figure>
  );
}

function ChatHtml({ content }: { content: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <iframe
        title="chat-html"
        sandbox="allow-scripts allow-popups"
        srcDoc={`<!doctype html><meta charset="utf-8"><style>html,body{margin:0}body{padding:10px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC",sans-serif;font-size:14px;color:#0f172a}img{max-width:100%}</style>${content}`}
        className="h-72 w-full border-0 bg-white"
      />
    </div>
  );
}

// 安全 Markdown（React 节点，不用 innerHTML）：标题 / 有序无序列表 / 引用 / 分割线 / 表格 / 段落。
function Markdown({ text }: { text: string }) {
  const lines = text.split("\n");
  const blocks: React.ReactNode[] = [];
  let ul: string[] = [];
  let ol: string[] = [];
  let quote: string[] = [];
  let table: string[] = [];

  const flushUl = (k: string) => {
    if (!ul.length) return;
    const items = ul;
    ul = [];
    blocks.push(
      <ul key={k} className="my-1 space-y-1 pl-1">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2">
            <span className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-slate-400" />
            <span>{inline(item)}</span>
          </li>
        ))}
      </ul>,
    );
  };
  const flushOl = (k: string) => {
    if (!ol.length) return;
    const items = ol;
    ol = [];
    blocks.push(
      <ol key={k} className="my-1 space-y-1 pl-1">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2">
            <span className="mt-0.5 min-w-[1.1rem] text-right text-xs font-semibold text-slate-400">{i + 1}.</span>
            <span>{inline(item)}</span>
          </li>
        ))}
      </ol>,
    );
  };
  const flushQuote = (k: string) => {
    if (!quote.length) return;
    const items = quote;
    quote = [];
    blocks.push(
      <blockquote key={k} className="my-1 border-l-2 border-slate-300 pl-3 text-slate-600">
        {items.map((q, i) => (
          <p key={i}>{inline(q)}</p>
        ))}
      </blockquote>,
    );
  };
  const flushTable = (k: string) => {
    if (table.length < 2) {
      // 不足以成表 → 当普通段落
      table.forEach((t, i) => blocks.push(<p key={`${k}_${i}`} className="my-0.5">{inline(t)}</p>));
      table = [];
      return;
    }
    const rows = table;
    table = [];
    const cells = (row: string) =>
      row.replace(/^\s*\|/, "").replace(/\|\s*$/, "").split("|").map((c) => c.trim());
    const head = cells(rows[0]);
    const body = rows.slice(2).map(cells); // rows[1] 是分隔行
    blocks.push(
      <div key={k} className="my-1.5 overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50">
              {head.map((h, i) => (
                <th key={i} className="border-b border-slate-200 px-3 py-1.5 text-left font-semibold text-slate-700">{inline(h)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {body.map((r, ri) => (
              <tr key={ri} className="border-b border-slate-100 last:border-0">
                {r.map((c, ci) => (
                  <td key={ci} className="px-3 py-1.5 text-slate-700">{inline(c)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>,
    );
  };
  const flushAll = (k: string) => {
    flushUl(`ul${k}`);
    flushOl(`ol${k}`);
    flushQuote(`q${k}`);
    flushTable(`t${k}`);
  };

  lines.forEach((raw, i) => {
    const line = raw.trimEnd();
    const isTableRow = /^\s*\|.*\|\s*$/.test(line);
    if (isTableRow) {
      flushUl(`ul${i}`);
      flushOl(`ol${i}`);
      flushQuote(`q${i}`);
      table.push(line);
      return;
    }
    if (table.length) flushTable(`t${i}`);

    const img = /^\s*!\[([^\]]*)\]\(([^)]+)\)\s*$/.exec(line);
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    const bullet = /^\s*[•\-*]\s+(.*)$/.exec(line);
    const ordered = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    const bq = /^\s*>\s?(.*)$/.exec(line);
    const hr = /^\s*(?:---|\*\*\*|___)\s*$/.test(line);

    if (img && isSafeImgUrl(img[2])) {
      flushAll(`${i}`);
      blocks.push(<ChatImage key={`img${i}`} src={img[2]} alt={img[1]} />);
    } else if (h) {
      flushAll(`${i}`);
      const level = h[1].length;
      const sz = level <= 1 ? "text-lg" : level === 2 ? "text-base" : "text-[15px]";
      blocks.push(<p key={`h${i}`} className={cn("mt-2 mb-0.5 font-semibold text-slate-900", sz)}>{inline(h[2])}</p>);
    } else if (bullet) {
      flushOl(`ol${i}`); flushQuote(`q${i}`);
      ul.push(bullet[1]);
    } else if (ordered) {
      flushUl(`ul${i}`); flushQuote(`q${i}`);
      ol.push(ordered[1]);
    } else if (bq) {
      flushUl(`ul${i}`); flushOl(`ol${i}`);
      quote.push(bq[1]);
    } else if (hr) {
      flushAll(`${i}`);
      blocks.push(<hr key={`hr${i}`} className="my-2.5 border-slate-200" />);
    } else {
      flushAll(`${i}`);
      if (line.trim()) blocks.push(<p key={`p${i}`} className="my-0.5">{inline(line)}</p>);
    }
  });
  flushAll("end");
  return <>{blocks}</>;
}

// 行内：![图](url) / **粗体** / `代码` / [文字](链接)
function inline(text: string): React.ReactNode {
  const parts = text.split(/(!\[[^\]]*\]\([^)]+\)|\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g);
  return parts.map((p, i) => {
    const img = /^!\[([^\]]*)\]\(([^)]+)\)$/.exec(p);
    if (img && isSafeImgUrl(img[2])) {
      // eslint-disable-next-line @next/next/no-img-element
      return <img key={i} src={img[2]} alt={img[1]} className="my-1 inline-block max-h-60 max-w-full rounded-lg border border-slate-200 align-middle" />;
    }
    if (/^\*\*[^*]+\*\*$/.test(p)) return <strong key={i} className="font-semibold text-slate-900">{p.slice(2, -2)}</strong>;
    if (/^`[^`]+`$/.test(p)) return <code key={i} className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[13px] text-rose-600">{p.slice(1, -1)}</code>;
    const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(p);
    if (link) {
      const href = link[2];
      const safeHref = /^(https?:|mailto:|\/)/i.test(href) ? href : "#";
      return (
        <a key={i} href={safeHref} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline decoration-blue-300 underline-offset-2 hover:text-blue-700">
          {link[1]}
        </a>
      );
    }
    return <Fragment key={i}>{p}</Fragment>;
  });
}

function Dot({ delay = "0s" }: { delay?: string }) {
  return <span className="h-2 w-2 animate-bounce rounded-full bg-slate-300" style={{ animationDelay: delay }} />;
}
