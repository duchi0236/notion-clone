"use client";

import { useEffect, useState } from "react";
import { Check, Film, ImageIcon, KeyRound, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { AI_PROVIDERS } from "@/lib/ai-skills";
import { Select } from "@/components/ui/Select";

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
      <h1 className="text-2xl font-bold">模型与媒体</h1>
      <p className="mt-1.5 text-sm text-slate-500">配置工作区助手使用的语言模型，以及图片、视频生成能力。</p>

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
            <Select
              value={config.provider}
              ariaLabel="模型供应商"
              onChange={(nextProvider) => {
                const nextModels = AI_PROVIDERS.find((p) => p.id === nextProvider)?.models ?? [];
                // 新供应商若仍支持当前 model（或为自由输入型）则保留，避免误触静默丢值
                const keepModel = config.model && (nextModels.length === 0 || nextModels.includes(config.model));
                set("provider", nextProvider);
                if (!keepModel) set("model", "");
              }}
              options={AI_PROVIDERS.map((p) => ({
                value: p.id,
                label: p.name,
                description: p.id === "none" ? "无需 API Key，可使用基础工作区能力" : undefined,
              }))}
            />
          </Field>

          {config.provider !== "none" && (
            <>
              <Field label="模型">
                {provider.models.length > 0 ? (
                  <Select
                    value={config.model}
                    onChange={(model) => set("model", model)}
                    ariaLabel="语言模型"
                    placeholder="选择模型…"
                    options={provider.models.map((model) => ({ value: model, label: model }))}
                  />
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
                    <Select
                      value={cap.provider || "mock"}
                      onChange={(nextProvider) => setMediaCap(key, { provider: nextProvider })}
                      ariaLabel={`${label}供应商`}
                      options={MEDIA_PROVIDERS.map((p) => ({ value: p.id, label: p.name }))}
                    />
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

      <div className="mt-5 flex items-center gap-3">
        <button onClick={() => void save()} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700 active:bg-slate-950 disabled:opacity-50">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : null}
          {saved ? "已保存" : "保存配置"}
        </button>
        <span role="status" aria-live="polite" className={cn("text-xs", saveError ? "text-rose-600" : "text-slate-400")}>
          {saveError ? "保存失败，请检查网络后重试。" : saved ? "配置已保存并即时生效。" : "模型与媒体配置保存在当前工作区。"}
        </span>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="block">
      <span className="mb-1 flex items-center justify-between text-xs font-medium text-slate-500">
        <span>{label}</span>
        {hint && <span className="font-normal text-slate-400">{hint}</span>}
      </span>
      {children}
    </div>
  );
}
