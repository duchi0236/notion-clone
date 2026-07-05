"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { Bot, Check, Copy, ExternalLink, Globe, Lock, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDismiss } from "@/hooks/useDismiss";

type ShareState = {
  isPublished: boolean;
  agentReadable: boolean;
  agentWritable: boolean;
  publicUrl: string | null;
};

export function SharePopover({
  documentId,
  onClose,
  onPublishedChange,
  triggerRef,
}: {
  documentId: string;
  onClose: () => void;
  onPublishedChange?: (published: boolean) => void;
  /** 触发按钮 ref；传入后点击触发按钮不会与「点外部关闭」冲突，由父级 toggle 统一收口。 */
  triggerRef?: RefObject<HTMLElement | null>;
}) {
  const [state, setState] = useState<ShareState | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void fetch(`/api/share/${documentId}`)
      .then((r) => r.json())
      .then((d) => d.share && setState({
        isPublished: d.share.isPublished,
        agentReadable: d.share.agentReadable,
        agentWritable: d.share.agentWritable,
        publicUrl: d.share.publicUrl,
      }))
      .catch(() => setState({ isPublished: false, agentReadable: true, agentWritable: false, publicUrl: null }));
  }, [documentId]);

  // Esc + 点外部关闭；把触发按钮纳入白名单，避免点触发按钮关→父级再 toggle 重开的闪烁。
  useDismiss({ open: true, onClose, refs: triggerRef ? [ref, triggerRef] : [ref] });

  // 打开时把焦点送入弹层首个控件
  useEffect(() => {
    const first = ref.current?.querySelector<HTMLElement>(
      'button, [href], input, [tabindex]:not([tabindex="-1"])',
    );
    first?.focus();
  }, []);

  async function patch(next: Partial<ShareState>) {
    if (!state) return;
    const prev = state;
    const merged = { ...state, ...next };
    // recompute publicUrl locally so the link appears immediately on publish
    if (next.isPublished !== undefined) {
      merged.publicUrl = next.isPublished ? `${window.location.origin}/share/${documentId}` : null;
      onPublishedChange?.(next.isPublished);
    }
    setState(merged);
    setError("");
    const res = await fetch(`/api/share/${documentId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    if (!res?.share) {
      // 失败回滚乐观更新并提示
      setState(prev);
      if (next.isPublished !== undefined) onPublishedChange?.(prev.isPublished);
      setError("保存失败，请重试");
      return;
    }
    if (res.share.isPublished !== undefined) {
      onPublishedChange?.(res.share.isPublished);
    }
  }

  function copyLink() {
    if (!state?.publicUrl) return;
    navigator.clipboard?.writeText(state.publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const published = state?.isPublished ?? false;

  return (
    <div ref={ref} role="dialog" aria-label="分享" className="absolute right-0 top-10 z-50 w-80 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl">
      <div className="flex items-center justify-between px-2.5 py-2">
        <span className="text-sm font-semibold text-slate-800">分享</span>
        <button onClick={onClose} aria-label="关闭" className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {error && (
        <div role="status" aria-live="polite" className="mx-2.5 mb-1 rounded-md bg-rose-50 px-2 py-1 text-xs text-rose-600">
          {error}
        </div>
      )}

      {/* Publish to web */}
      <div className="rounded-xl px-2.5 py-2">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm text-slate-700">
            {published ? <Globe className="h-4 w-4 text-emerald-600" /> : <Lock className="h-4 w-4 text-slate-400" />}
            发布到网络
          </span>
          <Switch label="发布到网络" checked={published} onChange={(v) => void patch({ isPublished: v })} />
        </div>
        <p className="mt-1 pl-6 text-xs text-slate-400">
          {published ? "任何拿到链接的人都可只读访问。" : "开启后生成一个公开只读链接。"}
        </p>

        {published && state?.publicUrl && (
          <div className="mt-2.5 flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5">
            <input
              readOnly
              value={state.publicUrl}
              onFocus={(e) => e.currentTarget.select()}
              onClick={(e) => e.currentTarget.select()}
              className="min-w-0 flex-1 bg-transparent text-xs text-slate-600 outline-none"
            />
            <button onClick={copyLink} className="flex h-6 items-center gap-1 rounded-md bg-slate-900 px-2 text-[11px] text-white hover:bg-slate-700">
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copied ? "已复制" : "复制"}
            </button>
            <a href={state.publicUrl} target="_blank" rel="noreferrer" aria-label="在新标签打开公开链接" className="flex h-6 w-6 items-center justify-center rounded-md text-slate-500 hover:bg-slate-200" title="在新标签打开">
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        )}
      </div>

      <div className="my-1 border-t border-slate-100" />

      {/* Agent access */}
      <div className="px-2.5 py-2">
        <div className="mb-1.5 flex items-center gap-2 text-xs font-medium text-slate-400">
          <Bot className="h-3.5 w-3.5" /> Agent 访问
        </div>
        <Row label="允许 Agent 读取" checked={state?.agentReadable ?? true} onChange={(v) => void patch({ agentReadable: v })} />
        <Row label="允许 Agent 写入" desc="写入仍进入提案与审计链路" checked={state?.agentWritable ?? false} onChange={(v) => void patch({ agentWritable: v })} />
      </div>
    </div>
  );
}

function Row({ label, desc, checked, onChange }: { label: string; desc?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="min-w-0">
        <span className="block text-sm text-slate-700">{label}</span>
        {desc && <span className="block text-[11px] text-slate-400">{desc}</span>}
      </span>
      <Switch label={label} checked={checked} onChange={onChange} />
    </div>
  );
}

function Switch({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn("relative h-5 w-9 shrink-0 rounded-full transition-colors", checked ? "bg-slate-900" : "bg-slate-200")}
    >
      <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all", checked ? "left-4" : "left-0.5")} />
    </button>
  );
}
