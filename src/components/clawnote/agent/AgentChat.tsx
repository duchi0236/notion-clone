"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUp,
  Ban,
  Check,
  CheckCircle2,
  ChevronRight,
  FileSearch,
  LoaderCircle,
  RotateCcw,
  Sparkles,
  Square,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

type AgentMessage = {
  id: string;
  role: "USER" | "ASSISTANT" | "SYSTEM" | "TOOL";
  content: string;
  jobId?: string | null;
};

type AgentStep = {
  id: string;
  sequence: number;
  title: string;
  toolName?: string | null;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "SKIPPED";
};

type Approval = {
  id: string;
  summary: string;
  action: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED";
};

type AgentJob = {
  id: string;
  title: string;
  status: string;
  steps: AgentStep[];
  approvals: Approval[];
  changeSets: Array<{ id: string; title: string; revertedAt?: string | null }>;
  result?: { text?: string } | null;
  error?: { message?: string } | null;
};

type Conversation = {
  id: string;
  title: string;
  messages: AgentMessage[];
  jobs: AgentJob[];
};

const TERMINAL = new Set(["COMPLETED", "FAILED", "CANCELLED"]);
const STATUS_LABELS: Record<string, string> = {
  QUEUED: "等待执行",
  PLANNING: "正在规划",
  WAITING_APPROVAL: "等待确认",
  RUNNING: "正在执行",
  WAITING_INPUT: "等待补充信息",
  VERIFYING: "正在验证",
  WAITING_REVIEW: "等待复核",
  COMPLETED: "已完成",
  FAILED: "执行失败",
  CANCELLED: "已取消",
};

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? `请求失败 (${response.status})`);
  return data as T;
}

export function AgentChat({ onOpenDoc: _onOpenDoc }: { onOpenDoc?: (id: string) => void }) {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const activeJob = useMemo(
    () => conversation?.jobs.find((job) => !TERMINAL.has(job.status)) ?? null,
    [conversation],
  );
  const visibleJob = activeJob ?? (conversation?.jobs[0]?.status === "FAILED" ? conversation.jobs[0] : null);

  async function loadConversation(id: string) {
    const data = await request<{ conversation: Conversation }>(`/api/ai/conversations/${id}`);
    setConversation(data.conversation);
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const list = await request<{ conversations: Array<{ id: string }> }>("/api/ai/conversations");
        const id = list.conversations[0]?.id
          ?? (await request<{ conversation: { id: string } }>("/api/ai/conversations", {
            method: "POST",
            body: JSON.stringify({ title: "新对话" }),
          })).conversation.id;
        if (!cancelled) await loadConversation(id);
      } catch (reason) {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "无法载入 AI 工作台");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!activeJob) return;
    const source = new EventSource(`/api/agent-jobs/${activeJob.id}/events`);
    source.addEventListener("job.updated", (event) => {
      const payload = JSON.parse((event as MessageEvent).data) as { job: AgentJob };
      setConversation((current) => current ? {
        ...current,
        jobs: current.jobs.map((job) => job.id === payload.job.id ? payload.job : job),
      } : current);
      if (TERMINAL.has(payload.job.status) && conversation?.id) {
        void loadConversation(conversation.id);
        source.close();
      }
    });
    source.onerror = () => source.close();
    return () => source.close();
  }, [activeJob?.id, conversation?.id]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [conversation?.messages.length, conversation?.jobs, sending]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || !conversation || sending) return;
    setSending(true);
    setError("");
    setInput("");
    try {
      const created = await request<{ message: AgentMessage; job: AgentJob }>(
        `/api/ai/conversations/${conversation.id}/messages`,
        { method: "POST", body: JSON.stringify({ content }) },
      );
      setConversation((current) => current ? {
        ...current,
        messages: [...current.messages, created.message],
        jobs: [{ ...created.job, steps: [], approvals: [], changeSets: [] }, ...current.jobs],
      } : current);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "发送失败");
      setInput(content);
    } finally {
      setSending(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }

  async function act(url: string) {
    setError("");
    try {
      await request(url, { method: "POST" });
      if (conversation) await loadConversation(conversation.id);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "操作失败");
    }
  }

  const empty = !conversation?.messages.length;

  return (
    <div className="cn-agent flex h-full min-h-0 flex-col bg-white">
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        <div className={cn("mx-auto w-full max-w-3xl px-5", empty ? "flex min-h-full items-center" : "py-8")}>
          {loading ? (
            <div className="flex w-full items-center justify-center gap-2 text-sm text-slate-500">
              <LoaderCircle className="h-4 w-4 animate-spin" /> 正在恢复对话
            </div>
          ) : empty ? (
            <Welcome onSelect={(text) => void send(text)} disabled={!conversation || sending} />
          ) : (
            <div className="w-full space-y-6">
              {conversation?.messages.map((message) => (
                <div key={message.id} className={message.role === "USER" ? "flex justify-end" : "flex gap-3"}>
                  {message.role !== "USER" && (
                    <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-white">
                      <Sparkles className="h-4 w-4" />
                    </span>
                  )}
                  <div className={cn(
                    "max-w-[82%] whitespace-pre-wrap text-[15px] leading-7",
                    message.role === "USER"
                      ? "rounded-3xl rounded-br-lg bg-slate-100 px-4 py-2.5 text-slate-800"
                      : "pt-0.5 text-slate-800",
                  )}>
                    {message.content}
                  </div>
                </div>
              ))}
              {visibleJob && (
                <JobCard
                  job={visibleJob}
                  onApprove={(id) => void act(`/api/approvals/${id}/approve`)}
                  onReject={(id) => void act(`/api/approvals/${id}/reject`)}
                  onCancel={() => void act(`/api/agent-jobs/${visibleJob.id}/cancel`)}
                  onContinue={() => void act(`/api/agent-jobs/${visibleJob.id}/continue`)}
                  onAccept={() => void act(`/api/agent-jobs/${visibleJob.id}/accept-result`)}
                />
              )}
              {!activeJob && conversation?.jobs[0]?.status === "COMPLETED" && (
                <CompletedActions
                  job={conversation.jobs[0]}
                  onRevert={() => void act(`/api/agent-jobs/${conversation.jobs[0].id}/revert`)}
                />
              )}
            </div>
          )}
        </div>
      </div>

      <div className="px-5 pb-5 pt-2">
        <div className="mx-auto w-full max-w-3xl">
          {error && <div className="mb-2 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</div>}
          <div className="cn-agent-composer flex items-end gap-2 rounded-[26px] border border-slate-200 bg-white px-4 py-2.5 shadow-[0_2px_16px_rgba(15,23,42,0.06)] focus-within:border-slate-300">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void send(input);
                }
              }}
              rows={1}
              disabled={loading || sending}
              placeholder={activeJob ? "Agent 在后台工作，你仍可发送新的委托…" : "描述你希望 AI 完成的工作…"}
              className="max-h-40 min-h-[28px] flex-1 resize-none bg-transparent py-1 text-[15px] leading-7 outline-none placeholder:text-slate-400"
            />
            <button
              onClick={() => void send(input)}
              disabled={!input.trim() || sending || loading}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-950 text-white hover:bg-slate-700 disabled:bg-slate-200 disabled:text-slate-400"
              aria-label="发送"
            >
              {sending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-[18px] w-[18px]" />}
            </button>
          </div>
          <p className="mt-2 text-center text-[11px] text-slate-400">
            对话会持久保存 · 写入先预览并按风险审批 · 页面关闭后任务继续执行
          </p>
        </div>
      </div>
    </div>
  );
}

function Welcome({ onSelect, disabled }: { onSelect: (text: string) => void; disabled: boolean }) {
  const suggestions = [
    ["搜索并总结", "查找本周项目文档，给我一份带来源的进展总结", FileSearch],
    ["提取任务", "从最近的会议纪要中提取任务，生成修改提案", CheckCircle2],
    ["规划日程", "查看我的未完成任务和日历，预览本周工作安排", Sparkles],
  ] as const;
  return (
    <div className="w-full -translate-y-8">
      <div className="mb-7 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-sm">
          <Sparkles className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">AI 工作台</h1>
        <p className="mt-2 text-sm text-slate-500">把目标交给 Agent。它会查询工作区、制定步骤、请求必要审批，并留下可撤销的变更记录。</p>
      </div>
      <div className="grid gap-2.5 sm:grid-cols-3">
        {suggestions.map(([title, text, Icon]) => (
          <button key={title} onClick={() => onSelect(text)} disabled={disabled} className="rounded-2xl border border-slate-200 p-4 text-left hover:border-slate-300 hover:shadow-sm disabled:opacity-50">
            <Icon className="mb-3 h-5 w-5 text-slate-600" />
            <span className="block text-sm font-medium text-slate-900">{title}</span>
            <span className="mt-1 block text-xs leading-5 text-slate-500">{text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function JobCard({
  job,
  onApprove,
  onReject,
  onCancel,
  onContinue,
  onAccept,
}: {
  job: AgentJob;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onCancel: () => void;
  onContinue: () => void;
  onAccept: () => void;
}) {
  const pending = job.approvals?.find((approval) => approval.status === "PENDING");
  return (
    <section className="ml-10 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/70">
      <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
          {job.status === "WAITING_APPROVAL" ? <Square className="h-3.5 w-3.5 fill-amber-400 text-amber-500" /> : <LoaderCircle className="h-4 w-4 animate-spin text-slate-500" />}
          {STATUS_LABELS[job.status] ?? job.status}
        </div>
        <div className="flex items-center gap-3">
          {job.status === "WAITING_REVIEW" && job.changeSets?.length > 0 ? (
            <button onClick={onAccept} className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-900">
              <CheckCircle2 className="h-3.5 w-3.5" /> 验收完成
            </button>
          ) : ["WAITING_REVIEW", "WAITING_INPUT", "FAILED"].includes(job.status) && (
            <button onClick={onContinue} className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 hover:text-slate-950">
              <RotateCcw className="h-3.5 w-3.5" /> 复核后继续
            </button>
          )}
          {!TERMINAL.has(job.status) && (
          <button onClick={onCancel} className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-rose-600">
            <Ban className="h-3.5 w-3.5" /> 取消 Agent 工作
          </button>
          )}
        </div>
      </header>
      <div className="space-y-2 px-4 py-3">
        {job.steps?.map((step) => (
          <div key={step.id} className="flex items-center gap-2 text-xs text-slate-600">
            {step.status === "COMPLETED" ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : step.status === "FAILED" ? <X className="h-3.5 w-3.5 text-rose-600" /> : <ChevronRight className="h-3.5 w-3.5" />}
            <span>{step.title}</span>
            {step.toolName && <code className="ml-auto text-[10px] text-slate-400">{step.toolName}</code>}
          </div>
        ))}
        {!job.steps?.length && <p className="text-xs text-slate-500">任务已进入后台队列，正在等待 Worker 领取。</p>}
      </div>
      {pending && (
        <div className="border-t border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-xs font-medium text-amber-900">需要你的确认</p>
          <p className="mt-1 text-xs leading-5 text-amber-800">{pending.summary}</p>
          <div className="mt-3 flex gap-2">
            <button onClick={() => onApprove(pending.id)} className="rounded-lg bg-slate-950 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700">批准并继续</button>
            <button onClick={() => onReject(pending.id)} className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100">拒绝</button>
          </div>
        </div>
      )}
    </section>
  );
}

function CompletedActions({ job, onRevert }: { job: AgentJob; onRevert: () => void }) {
  const hasLiveChangeSet = job.changeSets?.some((item) => !item.revertedAt);
  if (!hasLiveChangeSet) return null;
  return (
    <div className="ml-10 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
      <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" /> 本次修改已记录，可整体撤销</span>
      <button onClick={onRevert} className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 font-medium shadow-sm hover:bg-emerald-100">
        <RotateCcw className="h-3.5 w-3.5" /> 撤销
      </button>
    </div>
  );
}
