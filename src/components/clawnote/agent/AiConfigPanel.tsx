"use client";

import { useEffect, useState } from "react";
import { Check, Film, ImageIcon, KeyRound, Loader2, Sparkles, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import { AI_PROVIDERS, AI_SKILLS } from "@/lib/ai-skills";

type MediaCapCfg = { provider: string; model: string; baseUrl: string; hasApiKey: boolean };

type Config = {
  provider: string;
  model: string;
  baseUrl: string;
  temperature: number;
  maxTokens: number;
  enabledSkills: string[];
  hasApiKey: boolean;
  mediaProviders?: Record<string, MediaCapCfg>;
};

// 媒体能力可选供应商（mock 为默认占位）
const MEDIA_PROVIDERS = [
  { id: "mock", name: "Mock 占位（默认）" },
  { id: "fal", name: "fal.ai（一 Key 多模型）" },
  { id: "kling", name: "可灵 Kling" },
  { id: "jimeng", name: "即梦 Jimeng" },
  { id: "runway", name: "Runway" },
  { id: "pika", name: "Pika" },
  { id: "luma", name: "Luma" },
  { id: "shotstack", name: "Shotstack（剪辑）" },
  { id: "custom", name: "自定义" },
];

const MEDIA_CAPS: { key: string; label: string; icon: React.ReactNode; hint: string }[] = [
  { key: "image", label: "文生图", icon: <ImageIcon className="h-4 w-4 text-slate-600" />, hint: "供 /AI 生成图片 使用" },
  { key: "video", label: "文生视频", icon: <Film className="h-4 w-4 text-slate-600" />, hint: "供 /AI 生成视频 使用" },
];

export function AiConfigPanel() {
  const [config, setConfig] = useState<Config | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [mediaKeys, setMediaKeys] = useState<Record<string, string>>({}); // 新输入的媒体 Key（写入用）
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadConfig = () => {
    setLoading(true);
    setLoadError(false);
    void fetch("/api/ai/config")
      .then((r) => r.json())
      .then((d) => {
        if (d?.config) setConfig(d.config);
        else setLoadError(true);
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!config) {
    if (loadError) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center text-sm text-slate-500">
          <p>加载 AI 配置失败，请检查网络后重试。</p>
          <button
            onClick={loadConfig}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 active:bg-slate-100"
          >
            重试
          </button>
        </div>
      );
    }
    return (
      <div className="flex h-full items-center justify-center text-slate-400">
        <Loader2 className={cn("h-5 w-5", loading && "animate-spin")} />
      </div>
    );
  }

  const provider = AI_PROVIDERS.find((p) => p.id === config.provider) ?? AI_PROVIDERS[0];
  const set = <K extends keyof Config>(k: K, v: Config[K]) => setConfig((c) => (c ? { ...c, [k]: v } : c));
  const setMediaCap = (cap: string, patch: Partial<MediaCapCfg>) =>
    setConfig((c) => {
      if (!c) return c;
      const cur = c.mediaProviders ?? {};
      const prev = cur[cap] ?? { provider: "mock", model: "", baseUrl: "", hasApiKey: false };
      return { ...c, mediaProviders: { ...cur, [cap]: { ...prev, ...patch } } };
    });
  const toggleSkill = (id: string) =>
    set("enabledSkills", config.enabledSkills.includes(id) ? config.enabledSkills.filter((s) => s !== id) : [...config.enabledSkills, id]);

  async function save() {
    if (!config) return;
    setSaving(true);
    setSaveError(false);
    const body: Record<string, unknown> = {
      provider: config.provider,
      model: config.model,
      baseUrl: config.baseUrl,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      enabledSkills: config.enabledSkills,
    };
    if (apiKey.trim()) body.apiKey = apiKey.trim();
    // 媒体能力：provider/model/baseUrl 总是带上；apiKey 仅在新输入时带（留空不覆盖）
    const media: Record<string, Partial<MediaCapCfg> & { apiKey?: string }> = {};
    for (const { key } of MEDIA_CAPS) {
      const cap = config.mediaProviders?.[key];
      const m: Partial<MediaCapCfg> & { apiKey?: string } = {
        provider: cap?.provider ?? "mock",
        model: cap?.model ?? "",
        baseUrl: cap?.baseUrl ?? "",
      };
      if (mediaKeys[key]?.trim()) m.apiKey = mediaKeys[key].trim();
      media[key] = m;
    }
    body.mediaProviders = media;
    const res = await fetch("/api/ai/config", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json()).catch(() => null);
    setSaving(false);
    if (res?.config) {
      setConfig(res.config);
      setApiKey("");
      setMediaKeys({});
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    } else {
      setSaveError(true);
      setTimeout(() => setSaveError(false), 4000);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-8 py-9">
      <h1 className="text-2xl font-bold">AI 配置</h1>
      <p className="mt-1.5 text-sm text-slate-500">配置对话使用的模型，以及助手可调用的技能工具。</p>

      <div className={cn("mt-4 rounded-xl border px-4 py-2.5 text-sm", config.provider === "none" ? "border-slate-200 bg-slate-50 text-slate-600" : "border-emerald-200 bg-emerald-50 text-emerald-700")}>
        {config.provider === "none"
          ? "当前使用内置规则助手（无需模型，可执行搜索 / 新建 / 总结）。"
          : `已配置模型：${provider.name}${config.model ? ` · ${config.model}` : ""}${config.hasApiKey ? "" : "（缺少 API Key）"}`}
      </div>

      {/* Model */}
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-4 flex items-center gap-2 font-semibold text-slate-800">
          <Sparkles className="h-4 w-4 text-slate-600" /> 模型
        </div>
        <div className="grid gap-4">
          <Field label="供应商">
            <select
              value={config.provider}
              onChange={(e) => {
                const nextProvider = e.target.value;
                const nextModels = AI_PROVIDERS.find((p) => p.id === nextProvider)?.models ?? [];
                // 新供应商若仍支持当前 model（或为自由输入型）则保留，避免误触静默丢值
                const keepModel = config.model && (nextModels.length === 0 || nextModels.includes(config.model));
                set("provider", nextProvider);
                if (!keepModel) set("model", "");
              }}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
            >
              {AI_PROVIDERS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>

          {config.provider !== "none" && (
            <>
              <Field label="模型">
                {provider.models.length > 0 ? (
                  <select value={config.model} onChange={(e) => set("model", e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400">
                    <option value="">选择模型…</option>
                    {provider.models.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                ) : (
                  <input value={config.model} onChange={(e) => set("model", e.target.value)} placeholder="模型 ID，如 my-model" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400" />
                )}
              </Field>

              <Field label="API Key" hint={config.hasApiKey ? "已配置（留空表示不修改）" : "尚未配置"}>
                <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 focus-within:border-slate-400">
                  <KeyRound className="h-4 w-4 text-slate-400" />
                  <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder={config.hasApiKey ? "••••••••（已保存）" : "sk-…"} className="flex-1 bg-transparent text-sm outline-none" />
                </div>
              </Field>

              {(config.provider === "custom" || config.provider === "openai") && (
                <Field label="Base URL" hint="兼容 OpenAI 的接口地址，可选">
                  <input value={config.baseUrl} onChange={(e) => set("baseUrl", e.target.value)} placeholder="https://api.example.com/v1" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400" />
                </Field>
              )}

              <div className="grid grid-cols-2 gap-4">
                <Field label={`温度 ${config.temperature.toFixed(1)}`}>
                  <input type="range" min={0} max={2} step={0.1} value={config.temperature} onChange={(e) => set("temperature", Number(e.target.value))} aria-label="温度" aria-valuetext={config.temperature.toFixed(1)} className="w-full accent-slate-900" />
                </Field>
                <Field label="最大 Tokens">
                  <input type="number" min={256} max={32000} step={256} value={config.maxTokens} onChange={(e) => set("maxTokens", Number(e.target.value))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400" />
                </Field>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Media generation */}
      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-1 flex items-center gap-2 font-semibold text-slate-800">
          <ImageIcon className="h-4 w-4 text-slate-600" /> 媒体生成
        </div>
        <p className="mb-4 text-xs text-slate-500">为文生图 / 文生视频分别配置供应商与 Key（默认 Mock 占位，可离线体验）。</p>
        <div className="space-y-5">
          {MEDIA_CAPS.map(({ key, label, icon, hint }) => {
            const cap = config.mediaProviders?.[key] ?? { provider: "mock", model: "", baseUrl: "", hasApiKey: false };
            const isMock = !cap.provider || cap.provider === "mock";
            return (
              <div key={key} className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-700">
                  {icon} {label}
                  <span className="font-normal text-xs text-slate-400">· {hint}</span>
                </div>
                <div className="grid gap-3">
                  <Field label="供应商">
                    <select
                      value={cap.provider || "mock"}
                      onChange={(e) => setMediaCap(key, { provider: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                    >
                      {MEDIA_PROVIDERS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </Field>
                  {!isMock && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="模型 / 端点" hint="可选">
                        <input value={cap.model} onChange={(e) => setMediaCap(key, { model: e.target.value })} placeholder="如 kling-v1 / gen3" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400" />
                      </Field>
                      <Field label="API Key" hint={cap.hasApiKey ? "已配置（留空不改）" : "尚未配置"}>
                        <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 focus-within:border-slate-400">
                          <KeyRound className="h-4 w-4 text-slate-400" />
                          <input
                            type="password"
                            value={mediaKeys[key] ?? ""}
                            onChange={(e) => setMediaKeys((m) => ({ ...m, [key]: e.target.value }))}
                            placeholder={cap.hasApiKey ? "••••••••（已保存）" : "粘贴 Key"}
                            className="flex-1 bg-transparent text-sm outline-none"
                          />
                        </div>
                      </Field>
                    </div>
                  )}
                  {isMock && <p className="text-xs text-slate-400">当前为占位演示；选择真实供应商并填 Key 后即生成真实{label.includes("视频") ? "视频" : "图片"}。</p>}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Skills */}
      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-4 flex items-center gap-2 font-semibold text-slate-800">
          <Wrench className="h-4 w-4 text-slate-600" /> 技能工具
        </div>
        <div className="space-y-1">
          {AI_SKILLS.map((s) => {
            const on = config.enabledSkills.includes(s.id);
            return (
              <div key={s.id} className="flex items-center justify-between rounded-xl px-2 py-2 hover:bg-slate-50">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
                    {s.name}
                    {!s.implemented && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700">即将支持</span>}
                  </div>
                  <div className="text-xs text-slate-500">{s.desc}</div>
                </div>
                <Switch checked={on} onChange={() => toggleSkill(s.id)} label={`${s.name}（${on ? "已启用" : "已关闭"}）`} />
              </div>
            );
          })}
        </div>
      </section>

      <div className="mt-5 flex items-center gap-3">
        <button onClick={() => void save()} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700 active:bg-slate-950 disabled:opacity-50">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : null}
          {saved ? "已保存" : "保存配置"}
        </button>
        <span role="status" aria-live="polite" className={cn("text-xs", saveError ? "text-rose-600" : "text-slate-400")}>
          {saveError ? "保存失败，请检查网络后重试。" : saved ? "配置已保存并即时生效。" : "配置即时生效；关闭的技能助手将不再执行。"}
        </span>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center justify-between text-xs font-medium text-slate-500">
        <span>{label}</span>
        {hint && <span className="font-normal text-slate-400">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

function Switch({ checked, onChange, label }: { checked: boolean; onChange: () => void; label?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      // 视觉轨道尺寸不变（h-5 w-9）；外层透明 padding 把触控热区扩到 ≥32px
      className="-m-1.5 flex shrink-0 items-center p-1.5"
    >
      <span className={cn("relative block h-5 w-9 rounded-full transition-colors", checked ? "bg-slate-900" : "bg-slate-200")}>
        <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all", checked ? "left-4" : "left-0.5")} />
      </span>
    </button>
  );
}
